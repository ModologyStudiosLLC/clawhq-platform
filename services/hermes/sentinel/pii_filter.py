"""
PII Filter — redacts personally identifiable information before it
leaves the ClawHQ boundary (to LLMs, tools, or outbound channels).

Called on:
  - Inbound user messages
  - Tool outputs (web_fetch, file_read, etc.)
  - Outbound channel posts (before Slack/Discord delivery)

Modes (per-agent or global in sentinel.yaml):
  redact   — replace matched PII with [TYPE] token (default)
  block    — reject the payload, return error
  log_only — pass through, only log what was found
"""

import re
import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger("sentinel.pii_filter")


@dataclass
class PIIMatch:
    type: str       # EMAIL, PHONE, SSN, etc.
    token: str      # replacement token e.g. [EMAIL]
    count: int = 0  # how many were found


@dataclass
class PIIResult:
    text: str                    # possibly-redacted text
    redacted: bool               # was anything changed?
    blocked: bool                # was the payload blocked?
    matches: list[PIIMatch] = field(default_factory=list)
    details: str = ""

    def summary(self) -> str:
        if not self.matches:
            return "no PII detected"
        parts = [f"{m.count}×{m.type}" for m in self.matches if m.count > 0]
        return "redacted: " + ", ".join(parts)


# ---------------------------------------------------------------------------
# Pattern registry
# Each entry: (type_label, compiled_regex, replacement_token)
# Order matters — more specific patterns should come first.
# ---------------------------------------------------------------------------

def _build_patterns() -> list[tuple[str, re.Pattern, str]]:
    return [
        # Credit card — 13-19 digits, optional separators (before generic number)
        (
            "CREDIT_CARD",
            re.compile(
                r"\b(?:4[0-9]{12}(?:[0-9]{3})?|"           # Visa
                r"5[1-5][0-9]{14}|"                          # MC
                r"3[47][0-9]{13}|"                           # Amex
                r"6(?:011|5[0-9]{2})[0-9]{12}|"             # Discover
                r"(?:\d[ -]?){13,16})\b"
            ),
            "[CREDIT_CARD]",
        ),
        # US SSN: 123-45-6789 or 123 45 6789
        (
            "SSN",
            re.compile(r"\b(?!000|666|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b"),
            "[SSN]",
        ),
        # Email
        (
            "EMAIL",
            re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"),
            "[EMAIL]",
        ),
        # US phone: (555) 123-4567, 555-123-4567, +1-555-123-4567, etc.
        (
            "PHONE",
            re.compile(
                r"(?:\+?1[-.\s]?)?"
                r"(?:\(?\d{3}\)?[-.\s]?)"
                r"\d{3}[-.\s]?\d{4}\b"
            ),
            "[PHONE]",
        ),
        # US passport: starts with letter, 8 digits
        (
            "PASSPORT",
            re.compile(r"\b[A-Z]{1,2}[0-9]{6,9}\b"),
            "[PASSPORT]",
        ),
        # IP address (v4)
        (
            "IP_ADDRESS",
            re.compile(
                r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}"
                r"(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
            ),
            "[IP_ADDRESS]",
        ),
        # API keys / tokens — high-entropy hex/base64 strings (16+ chars)
        # Common prefixes: sk-, rk_, ghp_, xoxb-, ya29.
        (
            "API_KEY",
            re.compile(
                r"\b(?:"
                r"sk[-_][a-zA-Z0-9]{20,}|"       # OpenAI / Stripe style
                r"rk_(?:live|test)_[a-zA-Z0-9]{20,}|"
                r"ghp_[a-zA-Z0-9]{36}|"           # GitHub PAT
                r"xoxb-[0-9]+-[a-zA-Z0-9]+|"      # Slack bot token
                r"ya29\.[a-zA-Z0-9_\-]{60,}|"     # Google OAuth
                r"[a-fA-F0-9]{32,}"               # Generic hex secrets
                r")\b"
            ),
            "[API_KEY]",
        ),
        # Bank account routing number (US ABA, 9 digits)
        (
            "BANK_ROUTING",
            re.compile(r"\b[0-9]{9}\b"),
            "[BANK_ROUTING]",
        ),
        # ZIP code (US 5-digit or ZIP+4) — low specificity, last
        (
            "ZIP_CODE",
            re.compile(r"\b\d{5}(?:-\d{4})?\b"),
            "[ZIP_CODE]",
        ),
    ]


_PATTERNS = _build_patterns()

# Types that trigger block mode even in redact mode (configurable override)
HIGH_RISK_TYPES = {"SSN", "CREDIT_CARD", "BANK_ROUTING", "API_KEY"}


class PIIFilter:
    """
    Scans and optionally redacts PII from text payloads.

    Config keys (from sentinel.yaml pii_filter section):
      enabled: bool            — master switch
      mode: redact|block|log_only
      block_on_high_risk: bool — block SSN/CC/keys even in redact mode
      skip_types: [ZIP_CODE]   — types to never act on
      outbound_strict: bool    — stricter mode for channel posts
    """

    def __init__(self, config: dict):
        self.enabled = config.get("enabled", True)
        self.mode = config.get("mode", "redact")
        self.block_on_high_risk = config.get("block_on_high_risk", True)
        self.skip_types = set(config.get("skip_types", ["ZIP_CODE"]))
        self.outbound_strict = config.get("outbound_strict", True)

    def scan(self, text: str) -> list[PIIMatch]:
        """Return a list of PII types found without modifying text."""
        found: dict[str, PIIMatch] = {}
        for pii_type, pattern, token in _PATTERNS:
            if pii_type in self.skip_types:
                continue
            matches = pattern.findall(text)
            if matches:
                found[pii_type] = PIIMatch(type=pii_type, token=token, count=len(matches))
        return list(found.values())

    def process(self, text: str, source: str = "unknown", strict: bool = False) -> PIIResult:
        """
        Scan and process text according to configured mode.

        Args:
            text:   Input text to process
            source: Context label for logging ("user", "tool:web_fetch", "channel:slack")
            strict: Override to block mode (used for outbound_strict)

        Returns:
            PIIResult with (possibly redacted) text and match details
        """
        if not self.enabled:
            return PIIResult(text=text, redacted=False, blocked=False)

        matches = self.scan(text)
        if not matches:
            return PIIResult(text=text, redacted=False, blocked=False)

        effective_mode = self.mode
        if strict and self.outbound_strict:
            effective_mode = "block" if any(m.type in HIGH_RISK_TYPES for m in matches) else "redact"

        # High-risk override
        has_high_risk = any(m.type in HIGH_RISK_TYPES for m in matches)
        if self.block_on_high_risk and has_high_risk:
            effective_mode = "block"

        if effective_mode == "block":
            types = [m.type for m in matches]
            logger.warning(
                "pii_filter: BLOCKED payload from %s — contains %s",
                source, ", ".join(types)
            )
            return PIIResult(
                text=text,
                redacted=False,
                blocked=True,
                matches=matches,
                details=f"blocked: high-risk PII detected ({', '.join(types)})",
            )

        if effective_mode == "log_only":
            types = [m.type for m in matches]
            logger.info(
                "pii_filter: PII detected (log_only) from %s — %s",
                source, ", ".join(f"{m.count}×{m.type}" for m in matches)
            )
            return PIIResult(
                text=text,
                redacted=False,
                blocked=False,
                matches=matches,
                details=f"log_only: {', '.join(types)}",
            )

        # Redact mode — replace in place
        redacted = text
        for pii_type, pattern, token in _PATTERNS:
            if pii_type in self.skip_types:
                continue
            redacted = pattern.sub(token, redacted)

        # Log redactions (types only, never the values)
        logger.info(
            "pii_filter: redacted from %s — %s",
            source,
            ", ".join(f"{m.count}×{m.type}" for m in matches),
        )

        return PIIResult(
            text=redacted,
            redacted=True,
            blocked=False,
            matches=matches,
            details=f"redacted: {', '.join(m.type for m in matches)}",
        )

    def process_inbound(self, text: str, source: str = "user") -> PIIResult:
        """Convenience wrapper for inbound user/channel messages."""
        return self.process(text, source=source, strict=False)

    def process_tool_output(self, tool_name: str, text: str) -> PIIResult:
        """Convenience wrapper for tool output (web_fetch, file_read, etc.)."""
        return self.process(text, source=f"tool:{tool_name}", strict=False)

    def process_outbound(self, channel: str, text: str) -> PIIResult:
        """
        Convenience wrapper for outbound channel posts.
        Applies outbound_strict if configured.
        """
        return self.process(text, source=f"channel:{channel}", strict=True)
