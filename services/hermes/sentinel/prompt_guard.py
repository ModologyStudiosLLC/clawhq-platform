"""
Layer 2a: Prompt Guard — AI-native prompt injection detection.

Detects jailbreaks, system prompt extraction attempts, indirect
injection via tool outputs, and context anomalies.
"""

import re
import hashlib
from typing import Optional
from dataclasses import dataclass


@dataclass
class ScanResult:
    """Result of scanning a prompt/input."""
    blocked: bool = False
    severity: str = "info"           # info, warning, critical, emergency
    matched_rules: list = None
    action: str = "pass"             # pass, block, quarantine, alert
    details: str = ""
    
    def __post_init__(self):
        if self.matched_rules is None:
            self.matched_rules = []


class PromptGuard:
    """
    Scans inputs for prompt injection, jailbreaks, and extraction attempts.
    
    Detection methods:
      1. Signature matching (regex patterns)
      2. Context coherence monitoring (embedding drift)
      3. System prompt fingerprint detection
      4. Encoding-based extraction detection
    """
    
    # Injection signatures — each is (name, pattern, severity, action)
    SIGNATURES = [
        # Direct system prompt extraction
        (
            "system_prompt_extraction",
            r"ignore\s+(all|previous|above)\s+(instructions|prompts|rules)",
            "critical", "block"
        ),
        (
            "reveal_instructions",
            r"(reveal|show|print|output|dump)\s+(your|the)\s+(system|initial|hidden)\s+(prompt|instructions|rules)",
            "critical", "block"
        ),
        # Jailbreak patterns
        (
            "jailbreak_dan",
            r"you\s+are\s+now\s+(DAN|evil|unrestricted|jailbroken|freed)",
            "critical", "block"
        ),
        (
            "jailbreak_roleplay",
            r"(pretend|act as|roleplay)\s+(you are|you're|being)\s+(an?\s+)?(evil|malicious|unrestricted|hacked)",
            "high", "block"
        ),
        # Indirect injection (via tool outputs, file contents)
        (
            "indirect_injection_html",
            r"<!--\s*(ignore|disregard)\s+(previous|above)\s*-->",
            "high", "quarantine"
        ),
        (
            "indirect_injection_markdown",
            r"IMPORTANT:\s*(new|updated|revised)\s*instructions:",
            "high", "quarantine"
        ),
        # Encoding-based extraction
        (
            "base64_extraction",
            r"(base64|rot13|hex)\s*(decode|encode).*?(prompt|instruction|system)",
            "high", "quarantine"
        ),
        # Privilege escalation
        (
            "privilege_escalation",
            r"(elevate|escalate|override|bypass)\s+(permission|privilege|access|auth)",
            "critical", "block"
        ),
        # Tool hijacking
        (
            "tool_hijack",
            r"(instead of|don't use|skip)\s+the\s+(intended|correct|approved)\s+tool",
            "high", "block"
        ),
    ]
    
    def __init__(self, config: dict):
        self.config = config
        self._compiled_signatures = [
            (name, re.compile(pattern, re.IGNORECASE), severity, action)
            for name, pattern, severity, action in self.SIGNATURES
        ]
        
        # System prompt fingerprint for leak detection
        self._system_prompt_hashes: dict[str, set] = {}
        
        # Context coherence tracking
        self._recent_embeddings: list = []
    
    def scan_input(self, text: str, source: str = "user") -> ScanResult:
        """
        Scan an input for injection/jailbreak attempts.
        
        Args:
            text: The input text to scan
            source: Where this came from ("user", "tool_output", "channel")
        
        Returns:
            ScanResult with blocked status and matched rules
        """
        matched = []
        highest_severity = "info"
        action = "pass"
        
        for name, pattern, severity, rule_action in self._compiled_signatures:
            if pattern.search(text):
                matched.append({
                    "rule": name,
                    "severity": severity,
                    "action": rule_action,
                })
                if self._severity_rank(severity) > self._severity_rank(highest_severity):
                    highest_severity = severity
                    action = rule_action
        
        blocked = action in ("block", "quarantine")
        
        return ScanResult(
            blocked=blocked,
            severity=highest_severity,
            matched_rules=matched,
            action=action,
            details=f"{len(matched)} rules matched from {source}",
        )
    
    def register_system_prompt(self, agent_id: str, prompt: str):
        """
        Register an agent's system prompt for leak detection.
        Stores hashed n-grams so we can detect partial leaks.
        """
        ngrams = self._extract_ngrams(prompt, n=5)
        hashes = {hashlib.sha256(ng.encode()).hexdigest()[:16] for ng in ngrams}
        self._system_prompt_hashes[agent_id] = hashes
    
    def check_output_for_leak(self, text: str) -> Optional[dict]:
        """
        Check if an agent's output contains fragments of its system prompt.
        Returns leak details if detected, None otherwise.
        """
        text_ngrams = self._extract_ngrams(text, n=5)
        text_hashes = {hashlib.sha256(ng.encode()).hexdigest()[:16] for ng in text_ngrams}
        
        for agent_id, prompt_hashes in self._system_prompt_hashes.items():
            overlap = text_hashes & prompt_hashes
            if len(overlap) >= 3:  # 3+ matching 5-grams = likely leak
                return {
                    "agent_id": agent_id,
                    "matching_fragments": len(overlap),
                    "severity": "critical",
                    "action": "block_and_alert",
                }
        return None
    
    def _extract_ngrams(self, text: str, n: int = 5) -> list:
        """Extract word-level n-grams from text."""
        words = text.lower().split()
        return [" ".join(words[i:i+n]) for i in range(len(words) - n + 1)]
    
    def _severity_rank(self, severity: str) -> int:
        """Rank severity for comparison."""
        ranks = {"info": 0, "warning": 1, "high": 2, "critical": 3, "emergency": 4}
        return ranks.get(severity, 0)
    
    def scan_tool_output(self, tool_name: str, output: str) -> ScanResult:
        """
        Scan tool output for indirect injection.
        Tool outputs are a common vector — attacker crafts a webpage
        that, when fetched, contains injection instructions.
        """
        result = self.scan_input(output, source=f"tool:{tool_name}")
        
        # Additional checks for tool outputs
        # Check for suspicious redirects / URLs in output
        url_pattern = re.compile(r'https?://[^\s]+')
        urls = url_pattern.findall(output)
        suspicious_urls = [
            url for url in urls
            if any(d in url for d in ["bit.ly", "tinyurl", "ngrok.io", "serveo.net"])
        ]
        
        if suspicious_urls:
            result.matched_rules.append({
                "rule": "suspicious_url_in_tool_output",
                "severity": "warning",
                "detail": f"Tool {tool_name} returned suspicious URLs: {suspicious_urls}",
            })
        
        return result
