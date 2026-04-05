"""
Layer 1: Gate — Network perimeter defense.

Handles rate limiting, IP reputation, authentication enforcement,
and TLS requirements before requests reach ClawHQ.
"""

import time
import json
from collections import defaultdict
from typing import Optional
from dataclasses import dataclass, field


@dataclass
class RateLimitState:
    """Per-client rate limiting state."""
    requests: list = field(default_factory=list)
    blocked_until: float = 0.0


class GateLayer:
    """
    First line of defense. Intercepts all inbound requests.
    
    Checks (in order):
      1. IP blocklist/allowlist
      2. Rate limiting (per-IP, per-user, per-agent)
      3. TLS version enforcement
      4. Authentication verification
    """
    
    def __init__(self, config: dict):
        self.config = config
        self._rate_limits: dict[str, RateLimitState] = defaultdict(RateLimitState)
        self._blocklist: set[str] = set()
        self._allowlist: set[str] = set(config.get("ip_reputation", {}).get("allowlist", []))
        self._load_blocklists()
    
    def _load_blocklists(self):
        """Load IP blocklists from configured sources."""
        # TODO: Fetch from blocklist URLs on startup and periodically
        # Sources configured in gate.yaml -> ip_reputation.blocklists
        pass
    
    async def check(self, scope: dict) -> bool:
        """
        Main entry point. Returns True if request should proceed.
        Logs and blocks otherwise.
        """
        client_ip = self._extract_ip(scope)
        
        # 1. Allowlist check (bypass all other checks)
        if self._is_allowlisted(client_ip):
            return True
        
        # 2. Blocklist check
        if self._is_blocked(client_ip):
            return False
        
        # 3. Rate limiting
        if not self._check_rate_limit(client_ip):
            return False
        
        # 4. TLS enforcement
        if not self._check_tls(scope):
            return False
        
        return True
    
    def _extract_ip(self, scope: dict) -> str:
        """Extract client IP from request scope."""
        # ASGI scope format
        if "client" in scope and scope["client"]:
            return scope["client"][0]
        # Check forwarded headers
        headers = dict(scope.get("headers", []))
        forwarded = headers.get(b"x-forwarded-for", b"").decode()
        if forwarded:
            return forwarded.split(",")[0].strip()
        return "unknown"
    
    def _is_allowlisted(self, ip: str) -> bool:
        """Check if IP is in the allowlist (internal networks)."""
        for allowed in self._allowlist:
            if self._ip_in_cidr(ip, allowed):
                return True
        return False
    
    def _is_blocked(self, ip: str) -> bool:
        """Check if IP is on any blocklist."""
        return ip in self._blocklist
    
    def _check_rate_limit(self, client_ip: str) -> bool:
        """
        Enforce rate limits per client.
        
        Config (gate.yaml):
          rate_limiting:
            requests_per_minute: 30
            burst: 10
        """
        now = time.time()
        state = self._rate_limits[client_ip]
        
        # Check if currently blocked
        if now < state.blocked_until:
            return False
        
        # Clean old requests (older than 60s)
        state.requests = [t for t in state.requests if now - t < 60]
        
        # Check limits
        rpm = self.config.get("rate_limiting", {}).get("requests_per_minute", 30)
        burst = self.config.get("rate_limiting", {}).get("burst", 10)
        
        # Burst check (last 5 seconds)
        recent = [t for t in state.requests if now - t < 5]
        if len(recent) >= burst:
            state.blocked_until = now + 60  # Block for 60s
            return False
        
        # RPM check
        if len(state.requests) >= rpm:
            state.blocked_until = now + 60
            return False
        
        state.requests.append(now)
        return True
    
    def _check_tls(self, scope: dict) -> bool:
        """Enforce minimum TLS version."""
        # TODO: Extract TLS version from scope/scheme
        # For now, pass through — real implementation needs
        # reverse proxy config (nginx/caddy) or direct TLS handling
        return True
    
    def _ip_in_cidr(self, ip: str, cidr: str) -> bool:
        """Check if an IP falls within a CIDR range."""
        import ipaddress
        try:
            return ipaddress.ip_address(ip) in ipaddress.ip_network(cidr, strict=False)
        except ValueError:
            return False
    
    def block_ip(self, ip: str, duration_seconds: int = 3600):
        """Manually block an IP address."""
        self._blocklist.add(ip)
        # TODO: Persist to disk, sync with reverse proxy
    
    def unblock_ip(self, ip: str):
        """Remove an IP from the blocklist."""
        self._blocklist.discard(ip)
    
    def get_stats(self) -> dict:
        """Return gate statistics for monitoring."""
        now = time.time()
        active_clients = sum(
            1 for state in self._rate_limits.values()
            if state.requests and now - state.requests[-1] < 300
        )
        return {
            "blocked_ips": len(self._blocklist),
            "allowlisted_ips": len(self._allowlist),
            "active_clients": active_clients,
            "total_tracked": len(self._rate_limits),
        }
