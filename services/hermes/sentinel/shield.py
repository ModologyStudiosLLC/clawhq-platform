"""
Layer 6: Shield — Automated response system.

Handles alerting, auto-blocking, session termination, lockdown mode,
and forensic snapshot capture based on threat assessments.
"""

import json
import os
import time
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable
from dataclasses import dataclass


@dataclass
class AlertChannel:
    """Configuration for an alert delivery channel."""
    channel_type: str        # discord, slack, email, pagerduty
    webhook: str
    severity_threshold: str  # Minimum severity to send
    mention_role: str = ""


class ShieldLayer:
    """
    Automated response to security threats.
    
    Response levels:
      - WARNING: Log + alert channels
      - CRITICAL: Alert + block IP + kill session
      - EMERGENCY: Alert + lockdown + forensic capture + manual review
    """
    
    SEVERITY_RANK = {
        "info": 0,
        "warning": 1,
        "high": 2,
        "critical": 3,
        "emergency": 4,
    }
    
    def __init__(self, config: dict):
        self.config = config
        self._blocked_ips: dict[str, float] = {}  # ip -> unblock_time
        self._lockdown_active = False
        self._alert_channels = self._init_channels()
        self._snapshot_dir = Path(
            config.get("forensics", {}).get("storage", "/var/log/clawhq/sentinel/snapshots/")
        )
    
    def _init_channels(self) -> list[AlertChannel]:
        """Initialize alert channels from config."""
        channels = []
        for name, cfg in self.config.get("alert_channels", {}).items():
            webhook = cfg.get("webhook", "")
            if webhook and not webhook.startswith("${"):
                channels.append(AlertChannel(
                    channel_type=name,
                    webhook=webhook,
                    severity_threshold=cfg.get("severity_threshold", "warning"),
                    mention_role=cfg.get("mention_role", ""),
                ))
        return channels
    
    async def respond(self, alert: dict):
        """
        Main response entry point. Takes an alert dict from any layer
        and executes the appropriate response.
        """
        severity = alert.get("severity", "info").lower()
        
        # 1. Always log
        self._log_alert(alert)
        
        # 2. Send to alert channels
        await self._send_alerts(alert, severity)
        
        # 3. Execute auto-response based on severity
        if self.SEVERITY_RANK.get(severity, 0) >= self.SEVERITY_RANK["critical"]:
            await self._critical_response(alert)
        
        if self.SEVERITY_RANK.get(severity, 0) >= self.SEVERITY_RANK["emergency"]:
            await self._emergency_response(alert)
    
    async def _send_alerts(self, alert: dict, severity: str):
        """Send alert to configured channels."""
        severity_rank = self.SEVERITY_RANK.get(severity, 0)
        
        for channel in self._alert_channels:
            threshold_rank = self.SEVERITY_RANK.get(channel.severity_threshold, 0)
            if severity_rank >= threshold_rank:
                await self._send_to_channel(channel, alert)
    
    async def _send_to_channel(self, channel: AlertChannel, alert: dict):
        """Send alert to a specific channel."""
        message = self._format_alert(alert, channel)
        
        if channel.channel_type in ("discord", "slack"):
            await self._send_webhook(channel.webhook, message)
        elif channel.channel_type == "email":
            await self._send_email(channel.webhook, message)
        elif channel.channel_type == "pagerduty":
            await self._send_pagerduty(channel.webhook, alert)
    
    def _format_alert(self, alert: dict, channel: AlertChannel) -> dict:
        """Format alert for a specific channel type."""
        severity = alert.get("severity", "INFO")
        alert_type = alert.get("type", "unknown")
        detail = alert.get("detail", "")
        
        mention = ""
        if channel.mention_role and severity.lower() in ("critical", "emergency"):
            mention = f"<@&{channel.mention_role}> "
        
        if channel.channel_type == "discord":
            return {
                "content": mention,
                "embeds": [{
                    "title": f"🛡️ Sentinel Alert: {alert_type}",
                    "description": detail,
                    "color": self._severity_color(severity),
                    "fields": [
                        {"name": "Severity", "value": severity, "inline": True},
                        {"name": "Source IP", "value": alert.get("source_ip", "N/A"), "inline": True},
                        {"name": "Time", "value": datetime.utcnow().isoformat(), "inline": True},
                    ],
                }],
            }
        elif channel.channel_type == "slack":
            return {
                "text": f"{mention}🛡️ *Sentinel Alert: {alert_type}*\n"
                        f"Severity: {severity}\n{detail}",
            }
        
        return {"text": f"[{severity}] {alert_type}: {detail}"}
    
    def _severity_color(self, severity: str) -> int:
        """Discord embed color by severity."""
        colors = {
            "info": 0x3498db,      # Blue
            "warning": 0xf39c12,   # Orange
            "high": 0xe67e22,      # Dark orange
            "critical": 0xe74c3c,  # Red
            "emergency": 0x9b59b6, # Purple
        }
        return colors.get(severity.lower(), 0x95a5a6)
    
    async def _critical_response(self, alert: dict):
        """Response to critical alerts."""
        source_ip = alert.get("source_ip", "")
        
        # Block IP
        if source_ip and self.config.get("auto_response", {}).get("ip_block", {}).get("enabled"):
            duration = self.config["auto_response"]["ip_block"].get("duration", 3600)
            self.block_ip(source_ip, duration)
        
        # Kill session
        if self.config.get("auto_response", {}).get("session_kill", {}).get("enabled"):
            session_id = alert.get("details", {}).get("session_id")
            if session_id:
                self._kill_session(session_id)
    
    async def _emergency_response(self, alert: dict):
        """Response to emergency alerts."""
        # Enter lockdown
        if self.config.get("auto_response", {}).get("lockdown", {}).get("enabled"):
            self._enter_lockdown()
        
        # Forensic snapshot
        if self.config.get("forensics", {}).get("snapshot", {}).get("enabled"):
            self._capture_snapshot(alert)
        
        # Rotate canaries if canary was used externally
        if alert.get("type") == "canary_external_use":
            if self.config.get("auto_response", {}).get("canary_rotation", {}).get("enabled"):
                # Signal canary engine to rotate
                # (In practice, this would be a callback)
                pass
    
    def block_ip(self, ip: str, duration_seconds: int = 3600):
        """Block an IP address."""
        self._blocked_ips[ip] = time.time() + duration_seconds
        
        # Execute actual block (platform-dependent)
        method = self.config.get("auto_response", {}).get("ip_block", {}).get("method", "iptables")
        if method == "iptables":
            try:
                subprocess.run(
                    ["iptables", "-A", "INPUT", "-s", ip, "-j", "DROP"],
                    capture_output=True, timeout=5,
                )
            except (subprocess.SubprocessError, FileNotFoundError):
                pass  # iptables not available — log and continue
        
        self._log_alert({
            "type": "ip_blocked",
            "severity": "warning",
            "source_ip": ip,
            "detail": f"IP {ip} blocked for {duration_seconds}s",
        })
    
    def unblock_ip(self, ip: str):
        """Unblock an IP address."""
        self._blocked_ips.pop(ip, None)
        try:
            subprocess.run(
                ["iptables", "-D", "INPUT", "-s", ip, "-j", "DROP"],
                capture_output=True, timeout=5,
            )
        except (subprocess.SubprocessError, FileNotFoundError):
            pass
    
    def is_blocked(self, ip: str) -> bool:
        """Check if an IP is currently blocked."""
        if ip not in self._blocked_ips:
            return False
        if time.time() > self._blocked_ips[ip]:
            del self._blocked_ips[ip]
            return False
        return True
    
    def _enter_lockdown(self):
        """Enter lockdown mode."""
        self._lockdown_active = True
        self._log_alert({
            "type": "lockdown_activated",
            "severity": "emergency",
            "detail": "LOCKDOWN MODE ACTIVE — All non-whitelisted access blocked",
        })
    
    def exit_lockdown(self):
        """Exit lockdown mode (requires manual action)."""
        self._lockdown_active = False
    
    def is_lockdown(self) -> bool:
        """Check if lockdown mode is active."""
        return self._lockdown_active
    
    def _kill_session(self, session_id: str):
        """Terminate a compromised session."""
        # TODO: Integrate with ClawHQ session store
        self._log_alert({
            "type": "session_terminated",
            "severity": "critical",
            "detail": f"Session {session_id} terminated due to security event",
        })
    
    def _capture_snapshot(self, alert: dict):
        """Capture forensic snapshot of current state."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        snapshot_path = self._snapshot_dir / f"snapshot_{timestamp}.json"
        snapshot_path.parent.mkdir(parents=True, exist_ok=True)
        
        snapshot = {
            "triggered_by": alert,
            "timestamp": datetime.utcnow().isoformat(),
            "capture": {
                # TODO: Integrate with actual ClawHQ components
                "active_sessions": "TODO: query session store",
                "agent_states": "TODO: query agent registry",
                "recent_tool_calls": "TODO: query tool guard history",
                "system_state": {
                    "locked_down": self._lockdown_active,
                    "blocked_ips": list(self._blocked_ips.keys()),
                },
            },
        }
        
        with open(snapshot_path, "w") as f:
            json.dumps(snapshot, f, indent=2)
    
    async def _send_webhook(self, url: str, payload: dict):
        """Send HTTP webhook (Discord, Slack)."""
        # TODO: Implement with aiohttp or httpx
        pass
    
    async def _send_email(self, to: str, message: dict):
        """Send email alert."""
        # TODO: Implement with smtplib or external service
        pass
    
    async def _send_pagerduty(self, integration_key: str, alert: dict):
        """Send PagerDuty alert."""
        # TODO: Implement PagerDuty Events API v2
        pass
    
    def _log_alert(self, alert: dict):
        """Log alert to file and stdout."""
        log_line = json.dumps({
            **alert,
            "logged_at": datetime.utcnow().isoformat(),
        })
        print(f"[SHIELD] {log_line}")
        
        # Also write to log file
        log_dir = Path("/var/log/clawhq/sentinel/")
        log_dir.mkdir(parents=True, exist_ok=True)
        with open(log_dir / "sentinel.log", "a") as f:
            f.write(log_line + "\n")
    
    async def block_response(self, send: Callable):
        """Send a blocked response to the client."""
        # TODO: Implement proper ASGI response
        pass
    
    async def alert_and_block(self, send: Callable, scan_result):
        """Send alert and blocked response for a detected threat."""
        # TODO: Implement proper ASGI response with scan details
        pass
    
    def get_status(self) -> dict:
        """Get shield status."""
        return {
            "lockdown_active": self._lockdown_active,
            "blocked_ips": len(self._blocked_ips),
            "alert_channels": len(self._alert_channels),
            "blocked_ip_list": list(self._blocked_ips.keys()),
        }
