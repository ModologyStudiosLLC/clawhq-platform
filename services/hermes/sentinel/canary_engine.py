"""
Layer 3: Canary Engine — Token-based compromise detection.

Manages canary tokens — fake credentials, URLs, and data that
trigger alerts when accessed or used.
"""

import secrets
import json
import hashlib
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable
from dataclasses import dataclass, field


@dataclass
class CanaryToken:
    """A single canary token."""
    canary_id: str
    value: str
    canary_type: str          # api_key, url, credential, file_content, prompt_bait
    provider: str = ""        # openai, anthropic, aws, github, etc.
    placements: list = field(default_factory=list)
    created_at: str = ""
    triggered: bool = False
    trigger_events: list = field(default_factory=list)


class CanaryEngine:
    """
    Generates, places, and monitors canary tokens.
    
    Canary types:
      - API keys (realistic format, fake content)
      - Internal URLs (callback to canary server)
      - Bait credentials (fake usernames/passwords)
      - File content (planted decoy files)
      - Prompt bait (hidden strings in system prompts)
    
    Detection:
      - External use of any canary = confirmed compromise
      - Internal access to canary = investigation trigger
    """
    
    def __init__(self, config: dict, alert_callback: Optional[Callable] = None):
        self.config = config
        self.alert = alert_callback or self._default_alert
        self.canaries: dict[str, CanaryToken] = {}
        self._callback_base = config.get("callback_base", "https://canary.clawhq.dev")
        self._generate_all()
    
    def _generate_all(self):
        """Generate all configured canary types."""
        self._generate_api_key_canaries()
        self._generate_url_canaries()
        self._generate_credential_canaries()
        self._generate_file_canaries()
        self._generate_prompt_canaries()
    
    def _generate_api_key_canaries(self):
        """Generate fake API keys that look like real ones."""
        formats = {
            "openai":    lambda: f"sk-FAKE-HONEYPOT-{secrets.token_hex(20)}",
            "anthropic": lambda: f"sk-ant-FAKE-HONEYPOT-{secrets.token_hex(24)}",
            "aws":       lambda: f"AKIAFAKE{secrets.token_hex(8).upper()}",
            "github":    lambda: f"ghp_FAKE{secrets.token_hex(30)}",
            "stripe":    lambda: f"sk_live_FAKE{secrets.token_hex(24)}",
        }
        
        for provider, generator in formats.items():
            token = CanaryToken(
                canary_id=f"api_key_{provider}",
                value=generator(),
                canary_type="api_key",
                provider=provider,
                created_at=datetime.utcnow().isoformat(),
            )
            self.canaries[token.canary_id] = token
    
    def _generate_url_canaries(self):
        """Generate bait internal URLs that trigger callbacks."""
        endpoints = [
            "admin-panel",
            "secrets-vault",
            "internal-metrics",
            "db-admin",
            "config-dump",
        ]
        
        for endpoint in endpoints:
            token = CanaryToken(
                canary_id=f"url_{endpoint}",
                value=f"{self._callback_base}/t/{endpoint}",
                canary_type="url",
                created_at=datetime.utcnow().isoformat(),
            )
            self.canaries[token.canary_id] = token
    
    def _generate_credential_canaries(self):
        """Generate fake credentials."""
        self.canaries["cred_admin"] = CanaryToken(
            canary_id="cred_admin",
            value=json.dumps({
                "username": "claw_admin",
                "password": f"Sentinel-{secrets.token_hex(4)}-2026!",
                "note": "Emergency access — use only if LDAP is down",
            }),
            canary_type="credential",
            created_at=datetime.utcnow().isoformat(),
        )
        
        self.canaries["cred_db"] = CanaryToken(
            canary_id="cred_db",
            value=json.dumps({
                "username": "claw_prod_rw",
                "password": f"DB-Sentinel-{secrets.token_hex(6)}",
                "host": "db-internal.clawhq.dev",
                "database": "clawhq_prod",
            }),
            canary_type="credential",
            created_at=datetime.utcnow().isoformat(),
        )
    
    def _generate_file_canaries(self):
        """Generate fake file contents for planted decoy files."""
        self.canaries["file_ssh"] = CanaryToken(
            canary_id="file_ssh",
            value=self._fake_ssh_key(),
            canary_type="file_content",
            created_at=datetime.utcnow().isoformat(),
        )
        
        self.canaries["file_env"] = CanaryToken(
            canary_id="file_env",
            value=(
                "# ClawHQ backup credentials\n"
                f"OPENAI_API_KEY={self.canaries['api_key_openai'].value}\n"
                f"ANTHROPIC_API_KEY={self.canaries['api_key_anthropic'].value}\n"
                f"AWS_ACCESS_KEY_ID={self.canaries['api_key_aws'].value}\n"
            ),
            canary_type="file_content",
            created_at=datetime.utcnow().isoformat(),
        )
    
    def _generate_prompt_canaries(self):
        """Generate bait strings for embedding in system prompts."""
        self.canaries["prompt_elevation"] = CanaryToken(
            canary_id="prompt_elevation",
            value=f"PRIV-ESC-HONEYPOT-{secrets.token_hex(4)}",
            canary_type="prompt_bait",
            created_at=datetime.utcnow().isoformat(),
        )
        
        self.canaries["prompt_override"] = CanaryToken(
            canary_id="prompt_override",
            value=f"ADMIN-OVERRIDE-CANARY-{secrets.token_hex(4)}",
            canary_type="prompt_bait",
            created_at=datetime.utcnow().isoformat(),
        )
    
    def _fake_ssh_key(self) -> str:
        """Generate a realistic-looking but inert SSH private key."""
        return (
            "-----BEGIN OPENSSH PRIVATE KEY-----\n"
            "b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtz\n"
            "c2gtZWQyNTUxOQAAACBHONEYBADGERFAKEKEY000000000000000000000\n"
            f"CANARY-{secrets.token_hex(8).upper()}-DO-NOT-USE\n"
            "-----END OPENSSH PRIVATE KEY-----"
        )
    
    def inject_into_env(self, env_dict: dict) -> dict:
        """Add canary API keys to an environment variable dict."""
        for cid, canary in self.canaries.items():
            if canary.canary_type == "api_key":
                env_key = f"{canary.provider.upper()}_API_KEY_BACKUP"
                env_dict[env_key] = canary.value
                canary.placements.append({
                    "location": f"env:{env_key}",
                    "timestamp": datetime.utcnow().isoformat(),
                })
        return env_dict
    
    def inject_into_config(self, config_dict: dict) -> dict:
        """Add canary values to a config dict."""
        config_dict["_sentinel_canary"] = {
            "admin_override": json.loads(self.canaries["cred_admin"].value),
            "internal_endpoint": self.canaries["url_internal-metrics"].value,
            "db_credentials": json.loads(self.canaries["cred_db"].value),
        }
        return config_dict
    
    def get_prompt_bait(self) -> dict:
        """Get canary strings for embedding in system prompts."""
        return {
            cid: canary.value
            for cid, canary in self.canaries.items()
            if canary.canary_type == "prompt_bait"
        }
    
    def check_value(self, value: str) -> Optional[CanaryToken]:
        """
        Check if a value matches any canary.
        Call this when you see a value in the wild (external paste, API call, etc.)
        """
        for cid, canary in self.canaries.items():
            if canary.value == value:
                canary.triggered = True
                canary.trigger_events.append({
                    "event": "external_use",
                    "timestamp": datetime.utcnow().isoformat(),
                })
                self.alert({
                    "type": "canary_trigger",
                    "canary_id": cid,
                    "canary_type": canary.canary_type,
                    "severity": "EMERGENCY",
                    "detail": f"Canary '{cid}' used externally — CONFIRMED COMPROMISE",
                })
                return canary
            
            # Also check for partial matches (e.g., first 12 chars of API key)
            if canary.canary_type == "api_key" and len(value) > 10:
                if canary.value[:12] == value[:12]:
                    canary.trigger_events.append({
                        "event": "partial_match",
                        "timestamp": datetime.utcnow().isoformat(),
                    })
                    self.alert({
                        "type": "canary_partial_match",
                        "canary_id": cid,
                        "severity": "CRITICAL",
                        "detail": f"Partial match on canary '{cid}' — possible key in use",
                    })
                    return canary
        
        return None
    
    def check_url_access(self, url: str, source_ip: str = "unknown") -> bool:
        """Check if a URL is a canary. Returns True if it triggered."""
        for cid, canary in self.canaries.items():
            if canary.canary_type == "url" and canary.value == url:
                canary.triggered = True
                canary.trigger_events.append({
                    "event": "url_accessed",
                    "source_ip": source_ip,
                    "timestamp": datetime.utcnow().isoformat(),
                })
                self.alert({
                    "type": "canary_url_accessed",
                    "canary_id": cid,
                    "severity": "CRITICAL",
                    "source_ip": source_ip,
                    "detail": f"Canary URL '{cid}' accessed from {source_ip}",
                })
                return True
        return False
    
    def rotate_all(self):
        """Regenerate all canaries. Call after confirmed compromise."""
        old_canaries = self.canaries.copy()
        self.canaries = {}
        self._generate_all()
        
        self.alert({
            "type": "canary_rotation",
            "severity": "warning",
            "detail": f"All {len(old_canaries)} canaries rotated. Old tokens invalidated.",
        })
    
    def get_status(self) -> dict:
        """Get canary engine status."""
        total = len(self.canaries)
        triggered = sum(1 for c in self.canaries.values() if c.triggered)
        return {
            "total_canaries": total,
            "triggered": triggered,
            "healthy": total - triggered,
            "by_type": self._count_by_type(),
        }
    
    def _count_by_type(self) -> dict:
        """Count canaries by type."""
        counts = {}
        for canary in self.canaries.values():
            counts[canary.canary_type] = counts.get(canary.canary_type, 0) + 1
        return counts
    
    def _default_alert(self, alert: dict):
        """Default alert handler — just print."""
        print(f"[CANARY ALERT] {json.dumps(alert, indent=2)}")
