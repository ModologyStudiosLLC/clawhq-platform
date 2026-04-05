"""
Layer 5: Correlation Engine — Signal aggregation and threat assessment.

Takes raw alerts from all layers, correlates them into attack patterns,
and generates threat assessments with recommended responses.
"""

import json
import time
from datetime import datetime
from typing import Optional
from dataclasses import dataclass, field
from collections import defaultdict


@dataclass
class SecurityEvent:
    """A single security event from any layer."""
    event_type: str       # decoy_interaction, canary_trigger, prompt_injection, etc.
    severity: str         # info, warning, high, critical, emergency
    source_ip: str = ""
    user_id: str = ""
    timestamp: float = 0.0
    details: dict = field(default_factory=dict)
    
    def __post_init__(self):
        if self.timestamp == 0.0:
            self.timestamp = time.time()


@dataclass
class ThreatAssessment:
    """A correlated threat assessment."""
    rule_name: str
    threat_level: str         # high, critical, emergency
    attack_phase: str         # reconnaissance, credential_access, exploitation, exfiltration
    evidence: list            # List of matching events
    recommended_action: dict  # What to do about it
    timestamp: str = ""
    
    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.utcnow().isoformat()


class CorrelationEngine:
    """
    Aggregates signals from all security layers and correlates them
    into meaningful threat assessments.
    
    Detection rules define combinations of signals that indicate
    specific attack phases. Single signals are noisy; correlated
    signals indicate real threats.
    """
    
    # Correlation rules: name -> config
    RULES = {
        "reconnaissance": {
            "signals": ["decoy_interaction", "bait_endpoint_hit", "rate_limit_hit"],
            "min_signals": 2,
            "time_window_seconds": 300,
            "threat_level": "high",
            "attack_phase": "reconnaissance",
        },
        "credential_harvesting": {
            "signals": ["decoy_interaction", "canary_trigger", "prompt_injection_detected"],
            "min_signals": 2,
            "time_window_seconds": 600,
            "threat_level": "critical",
            "attack_phase": "credential_access",
        },
        "data_exfiltration": {
            "signals": ["tool_guard_block", "canary_trigger", "decoy_interaction"],
            "min_signals": 2,
            "time_window_seconds": 300,
            "threat_level": "critical",
            "attack_phase": "exfiltration",
        },
        "active_exploitation": {
            "signals": ["shell_blocked", "canary_external_use", "privilege_escalation_attempt"],
            "min_signals": 1,
            "time_window_seconds": 60,
            "threat_level": "emergency",
            "attack_phase": "exploitation",
        },
        "prompt_extraction": {
            "signals": ["prompt_injection_detected", "system_prompt_leak", "canary_trigger"],
            "min_signals": 2,
            "time_window_seconds": 300,
            "threat_level": "critical",
            "attack_phase": "exfiltration",
        },
        "persistent_probing": {
            "signals": ["decoy_interaction", "decoy_escalation"],
            "min_signals": 1,
            "time_window_seconds": 600,
            "threat_level": "high",
            "attack_phase": "reconnaissance",
        },
    }
    
    # Response recommendations by threat level
    RESPONSE_ACTIONS = {
        "high": {
            "alert": True,
            "block": False,
            "increase_logging": True,
            "notify_on_call": False,
        },
        "critical": {
            "alert": True,
            "block": True,
            "increase_logging": True,
            "notify_on_call": True,
            "block_duration_seconds": 3600,
        },
        "emergency": {
            "alert": True,
            "block": True,
            "increase_logging": True,
            "notify_on_call": True,
            "lockdown": True,
            "block_duration_seconds": 86400,
            "require_manual_review": True,
        },
    }
    
    def __init__(self, config: Optional[dict] = None):
        self.config = config or {}
        self._events: list[SecurityEvent] = []
        self._assessments: list[ThreatAssessment] = []
        self._alert_counts: dict[str, list] = defaultdict(list)  # source_ip -> timestamps
    
    def ingest(self, event: SecurityEvent):
        """Ingest a security event from any layer."""
        self._events.append(event)
        
        # Track alert counts per IP for persistent probing detection
        if event.source_ip:
            self._alert_counts[event.source_ip].append(event.timestamp)
        
        # Run correlation checks
        self._correlate()
        
        # Prune old events (keep last 1000)
        if len(self._events) > 1000:
            self._events = self._events[-1000:]
    
    def _correlate(self):
        """Run correlation rules against recent events."""
        now = time.time()
        
        for rule_name, rule in self.RULES.items():
            # Get events within the time window
            window_start = now - rule["time_window_seconds"]
            recent = [
                e for e in self._events
                if e.timestamp >= window_start
            ]
            
            # Count matching signal types
            matching_events = [
                e for e in recent
                if e.event_type in rule["signals"]
            ]
            
            # Check if we have enough signals
            unique_signal_types = set(e.event_type for e in matching_events)
            if len(unique_signal_types) >= rule["min_signals"]:
                # Check if we already assessed this recently
                if self._already_assessed(rule_name, window_start):
                    continue
                
                assessment = ThreatAssessment(
                    rule_name=rule_name,
                    threat_level=rule["threat_level"],
                    attack_phase=rule["attack_phase"],
                    evidence=[
                        {
                            "type": e.event_type,
                            "severity": e.severity,
                            "timestamp": e.timestamp,
                            "source_ip": e.source_ip,
                            "details": e.details,
                        }
                        for e in matching_events[-10:]  # Last 10 pieces of evidence
                    ],
                    recommended_action=self.RESPONSE_ACTIONS.get(
                        rule["threat_level"], self.RESPONSE_ACTIONS["high"]
                    ),
                )
                self._assessments.append(assessment)
    
    def _already_assessed(self, rule_name: str, after: float) -> bool:
        """Check if we already made this assessment recently."""
        for assessment in reversed(self._assessments):
            # Simple check — in production, parse timestamps properly
            if assessment.rule_name == rule_name:
                return True
        return False
    
    def get_active_threats(self) -> list[dict]:
        """Get current active threat assessments."""
        # Return assessments from last hour
        one_hour_ago = time.time() - 3600
        active = [
            a for a in self._assessments
            if True  # TODO: filter by recency
        ]
        return [
            {
                "rule": a.rule_name,
                "threat_level": a.threat_level,
                "attack_phase": a.attack_phase,
                "evidence_count": len(a.evidence),
                "recommended_action": a.recommended_action,
                "timestamp": a.timestamp,
            }
            for a in active[-20:]  # Last 20 assessments
        ]
    
    def get_stats(self) -> dict:
        """Get correlation engine statistics."""
        return {
            "total_events": len(self._events),
            "total_assessments": len(self._assessments),
            "tracked_ips": len(self._alert_counts),
            "active_threats": len(self.get_active_threats()),
            "event_types": self._count_event_types(),
        }
    
    def _count_event_types(self) -> dict:
        """Count events by type."""
        counts = {}
        for event in self._events:
            counts[event.event_type] = counts.get(event.event_type, 0) + 1
        return counts
