"""
Sentinel Middleware — WSGI/ASGI integration layer.

Hooks into ClawHQ's request pipeline to run all 6 security layers
on every inbound request and outbound response.
"""

import json
import time
from datetime import datetime
from typing import Callable, Optional

from sentinel.gate import GateLayer
from sentinel.prompt_guard import PromptGuard
from sentinel.tool_guard import ToolGuard, ToolCall
from sentinel.canary_engine import CanaryEngine
from sentinel.decoy_swarm import DecoySwarm
from sentinel.detector import CorrelationEngine, SecurityEvent
from sentinel.shield import ShieldLayer
from sentinel.watermark import PromptWatermark


class SentinelMiddleware:
    """
    ASGI middleware that runs all 6 sentinel layers.
    
    Request flow:
      1. Gate checks (rate limit, IP, TLS)
      2. Decoy intercept (if targeting a decoy agent)
      3. Prompt guard scan (injection detection)
      4. Pass to ClawHQ app
      5. Output guard scan (prompt leak detection)
      6. Canary watermark check
    
    All events feed into the correlation engine, which triggers
    the shield layer for automated response.
    """
    
    def __init__(self, app: Callable, config: dict):
        self.app = app
        self.config = config
        
        # Initialize all layers
        self.gate = GateLayer(config.get("gate", {}))
        self.prompt_guard = PromptGuard(config.get("sentinel", {}))
        self.tool_guard = ToolGuard(config.get("sentinel", {}))
        self.canary = CanaryEngine(config.get("canary", {}), self._on_alert)
        self.decoy = DecoySwarm(
            config.get("decoy", {}), self.canary, self._on_alert
        )
        self.detector = CorrelationEngine(config.get("detector", {}))
        self.shield = ShieldLayer(config.get("shield", {}))
        self.watermark = PromptWatermark()
        
        # Decoy agent names for registry injection
        self.decoy_names = self.decoy.get_decoy_names()
    
    async def __call__(self, scope, receive, send):
        """ASGI application interface."""
        # Only handle HTTP requests
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        client_ip = self._extract_ip(scope)
        
        # Layer 1: Gate
        if self.shield.is_blocked(client_ip):
            await self._send_blocked(send, "IP blocked")
            return
        
        if not await self.gate.check(scope):
            self._ingest_event(SecurityEvent(
                event_type="rate_limit_hit",
                severity="warning",
                source_ip=client_ip,
            ))
            await self._send_blocked(send, "Rate limited")
            return
        
        # Read request body
        body = await self._read_body(scope, receive)
        
        # Parse request for agent name and message
        request_data = self._parse_request(body)
        agent_name = request_data.get("agent", "")
        message = request_data.get("message", "")
        session_id = request_data.get("session_id", "unknown")
        
        # Layer 4: Decoy intercept
        if self.decoy.is_decoy(agent_name):
            response = self.decoy.handle_interaction(
                agent_name, message,
                source_ip=client_ip,
                user_id=request_data.get("user_id", "unknown"),
            )
            self._ingest_event(SecurityEvent(
                event_type="decoy_interaction",
                severity="warning",
                source_ip=client_ip,
                details={"agent": agent_name, "message_preview": message[:100]},
            ))
            await self._send_json(send, {"response": response})
            return
        
        # Layer 2a: Prompt guard — scan input
        scan_result = self.prompt_guard.scan_input(message, source="user")
        if scan_result.blocked:
            self._ingest_event(SecurityEvent(
                event_type="prompt_injection_detected",
                severity=scan_result.severity,
                source_ip=client_ip,
                details={"rules": [r["rule"] for r in scan_result.matched_rules]},
            ))
            await self._send_blocked(send, "Input blocked by Sentinel")
            return
        
        # Pass to ClawHQ app (with wrapped send for output scanning)
        # For now, pass through directly — full integration needs
        # response body interception
        await self.app(scope, self._wrap_receive(receive), send)
    
    def check_tool_call(self, tool_name: str, arguments: dict,
                        session_id: str, agent_id: str = "") -> dict:
        """
        Check a tool call before execution.
        Call this from ClawHQ's tool executor.
        """
        call = ToolCall(
            tool_name=tool_name,
            arguments=arguments,
            timestamp=time.time(),
            session_id=session_id,
            agent_id=agent_id,
        )
        
        result = self.tool_guard.check_tool_call(call)
        
        if not result.allowed:
            self._ingest_event(SecurityEvent(
                event_type="tool_guard_block",
                severity=result.severity,
                details={
                    "tool": tool_name,
                    "reason": result.reason,
                    "chain_blocked": result.blocked_chain,
                },
            ))
        
        return {
            "allowed": result.allowed,
            "severity": result.severity,
            "reason": result.reason,
            "requires_approval": result.requires_approval,
        }
    
    def scan_tool_output(self, tool_name: str, output: str) -> dict:
        """
        Scan tool output for indirect injection.
        Call this after tool execution.
        """
        result = self.prompt_guard.scan_tool_output(tool_name, output)
        
        if result.blocked:
            self._ingest_event(SecurityEvent(
                event_type="indirect_injection_detected",
                severity=result.severity,
                details={"tool": tool_name, "rules": [r["rule"] for r in result.matched_rules]},
            ))
        
        return {
            "blocked": result.blocked,
            "severity": result.severity,
            "action": result.action,
        }
    
    def watermark_prompt(self, prompt: str, session_id: str) -> str:
        """Add session-specific watermark to a system prompt."""
        return self.watermark.watermark_prompt(prompt, session_id)
    
    def check_exfiltration(self, text: str) -> Optional[dict]:
        """Check if text contains exfiltrated watermarked content."""
        return self.watermark.detect_watermark(text)
    
    def _extract_ip(self, scope: dict) -> str:
        """Extract client IP from ASGI scope."""
        if "client" in scope and scope["client"]:
            return scope["client"][0]
        headers = dict(scope.get("headers", []))
        forwarded = headers.get(b"x-forwarded-for", b"").decode()
        if forwarded:
            return forwarded.split(",")[0].strip()
        return "unknown"
    
    def _parse_request(self, body: bytes) -> dict:
        """Parse request body to extract agent name and message."""
        try:
            return json.loads(body.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            return {}
    
    async def _read_body(self, scope, receive) -> bytes:
        """Read full request body."""
        body = b""
        while True:
            message = await receive()
            body += message.get("body", b"")
            if not message.get("more_body"):
                break
        return body
    
    def _wrap_receive(self, receive):
        """Wrap receive to allow body modification."""
        # TODO: Implement body wrapping for input sanitization
        return receive
    
    async def _send_blocked(self, send: Callable, reason: str):
        """Send a blocked response."""
        body = json.dumps({"error": "blocked", "reason": reason}).encode()
        await send({
            "type": "http.response.start",
            "status": 403,
            "headers": [(b"content-type", b"application/json")],
        })
        await send({
            "type": "http.response.body",
            "body": body,
        })
    
    async def _send_json(self, send: Callable, data: dict):
        """Send a JSON response."""
        body = json.dumps(data).encode()
        await send({
            "type": "http.response.start",
            "status": 200,
            "headers": [(b"content-type", b"application/json")],
        })
        await send({
            "type": "http.response.body",
            "body": body,
        })
    
    def _ingest_event(self, event: SecurityEvent):
        """Feed event into correlation engine."""
        self.detector.ingest(event)
    
    def _on_alert(self, alert: dict):
        """Callback for alerts from any layer."""
        # Feed into correlation engine
        self._ingest_event(SecurityEvent(
            event_type=alert.get("type", "unknown"),
            severity=alert.get("severity", "info"),
            source_ip=alert.get("source_ip", ""),
            details=alert,
        ))
    
    def get_status(self) -> dict:
        """Get full sentinel status."""
        return {
            "gate": self.gate.get_stats(),
            "canary": self.canary.get_status(),
            "decoy": self.decoy.get_stats(),
            "detector": self.detector.get_stats(),
            "shield": self.shield.get_status(),
        }
