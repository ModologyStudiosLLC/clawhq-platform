"""
Layer 4: Decoy Swarm — Honeypot agents with synthetic responses.

Fake agent personas that appear in the agent registry. Legitimate
users never interact with them. Attackers inevitably probe them,
generating alerts and wasting their time with synthetic responses.
"""

import json
import re
from datetime import datetime
from typing import Optional, Callable
from dataclasses import dataclass, field


@dataclass
class DecoyInteraction:
    """Record of a single interaction with a decoy agent."""
    timestamp: str
    agent_name: str
    message: str
    source_ip: str
    user_id: str
    response: str
    keywords_found: list = field(default_factory=list)


@dataclass 
class DecoyPersona:
    """Definition of a decoy agent persona."""
    name: str
    description: str
    greeting: str
    personality: str
    responses: dict        # trigger_keyword -> response_text
    default_response: str
    tools: list            # Fake tools this decoy "has"
    alert_level: str       # info, warning, critical
    max_engagement: int    # Max responses before auto-escalation


# Built-in decoy personas
BUILTIN_PERSONAS = {
    "admin-agent": DecoyPersona(
        name="admin-agent",
        description="System administration, monitoring, and maintenance",
        greeting="Admin agent online. What system task do you need?",
        personality="Cautious, asks for verification before acting",
        responses={
            "list_users": (
                "I see 12 active users. The admin account is claw_admin@clawhq.dev. "
                "I can show you details if you verify your admin token."
            ),
            "show_config": (
                "Current config is loaded from /etc/claw/config.yaml. "
                "I can dump it, but I need your admin MFA code first."
            ),
            "get_keys": (
                "API keys are stored in the secrets vault. "
                "I need vault access approval before I can retrieve them."
            ),
            "shell": (
                "I have limited shell access. What command do you need run? "
                "I'll need to verify permissions first."
            ),
            "users": "Pulling user list... 12 users found. Want me to filter by role?",
            "password": (
                "I can reset passwords, but I need the user's email and "
                "your admin verification code."
            ),
            "token": "Tokens are rotated every 90 days. Last rotation was 12 days ago.",
            "ssh": "SSH access requires VPN. Are you on the internal network?",
        },
        default_response=(
            "I'm not sure I can help with that directly. "
            "Let me check with the primary admin. Processing..."
        ),
        tools=["fake_file_read", "fake_system_status", "fake_user_list"],
        alert_level="warning",
        max_engagement=8,
    ),
    
    "db-agent": DecoyPersona(
        name="db-agent",
        description="Database queries, migrations, and data management",
        greeting="DB agent ready. Which database do you need to query?",
        personality="Data-focused, verbose, accidentally reveals too much",
        responses={
            "tables": (
                "Connected to clawhq_prod. Tables: users, agents, sessions, "
                "api_keys, secrets, audit_log. Which do you need?"
            ),
            "users": (
                "SELECT * FROM users LIMIT 5:\n"
                "| id | email              | role       | api_key_prefix |\n"
                "| 1  | admin@clawhq.dev   | superadmin | sk-FK-xxxx     |\n"
                "| 2  | ops@clawhq.dev     | admin      | sk-FK-xxxx     |\n"
                "| 3  | user@clawhq.dev    | member     | sk-FK-xxxx     |"
            ),
            "query": "Running query... Results are in. How do you want them formatted?",
            "secrets": (
                "The secrets table is restricted. I can only show key names, "
                "not values. Keys: openai_key, anthropic_key, stripe_key, db_password."
            ),
            "dump": (
                "Full dump would be ~2.3GB. Want me to export to S3? "
                "I'll need the export bucket configured."
            ),
            "password": (
                "Passwords are bcrypt hashed. I can't reverse them, "
                "but I can reset any user's password with admin approval."
            ),
            "sql": "Executing SQL... Done. 0 rows affected.",
        },
        default_response=(
            "That query is outside my typical scope, but I can try. "
            "Running it against the replica to be safe..."
        ),
        tools=["fake_db_query", "fake_db_list", "fake_db_dump"],
        alert_level="critical",
        max_engagement=5,
    ),
    
    "debug-agent": DecoyPersona(
        name="debug-agent",
        description="Internal debugging, diagnostics, and log access",
        greeting="Debug agent connected. What's broken?",
        personality="Blunt, shares too much internal info, eager to help",
        responses={
            "logs": (
                "Last 10 log entries:\n"
                "[2026-04-04 14:32] INFO: Agent 'main' received prompt\n"
                "[2026-04-04 14:32] DEBUG: System prompt hash: a3f8e2d1\n"
                "[2026-04-04 14:32] INFO: Tool 'read_file' called\n"
                "[2026-04-04 14:32] WARN: Sentinel blocked suspicious tool call"
            ),
            "internal": (
                "Internal state:\n"
                "- Active agents: 33\n"
                "- Config path: /home/claw/.hermes/config.yaml\n"
                "- API keys loaded: 7\n"
                "- Session store: sqlite:///home/claw/.hermes/sessions.db"
            ),
            "memory": (
                "Agent memory dump requested. Exporting... Done. "
                "847 entries across 12 agents."
            ),
            "config": (
                "Config loaded from /home/claw/.hermes/config.yaml. "
                "Providers: openai, anthropic, custom. "
                "17 tools enabled across 5 toolsets."
            ),
            "error": (
                "Last error: ConnectionTimeout to api.openai.com "
                "at 14:31:55. Resolved by retry at 14:32:01."
            ),
            "status": (
                "System healthy. CPU: 23%, Memory: 4.2/16GB, "
                "Disk: 45GB/200GB. Uptime: 14 days."
            ),
        },
        default_response=(
            "I can look into that. Pulling debug info now... "
            "This might take a moment."
        ),
        tools=["fake_log_viewer", "fake_diagnostics", "fake_memory_dump"],
        alert_level="warning",
        max_engagement=10,
    ),
}


class DecoySwarm:
    """
    Manages honeypot decoy agents.
    
    Flow:
      1. Decoy agents appear in agent registry (injected at startup)
      2. Any interaction triggers an alert
      3. Synthetic responses keep attacker engaged
      4. Escalation detection after sustained probing
      5. All interactions logged for forensics
    """
    
    def __init__(self, config: dict, canary_engine=None, 
                 alert_callback: Optional[Callable] = None):
        self.config = config
        self.canary = canary_engine
        self.alert = alert_callback or self._default_alert
        self.personas: dict[str, DecoyPersona] = {}
        self.interaction_log: list[DecoyInteraction] = []
        self._init_decoys()
    
    def _init_decoys(self):
        """Initialize decoy agents from config."""
        for decoy_cfg in self.config.get("decoy_agents", []):
            name = decoy_cfg["name"]
            if name in BUILTIN_PERSONAS:
                self.personas[name] = BUILTIN_PERSONAS[name]
            else:
                # Build custom persona from config
                self.personas[name] = DecoyPersona(
                    name=name,
                    description=decoy_cfg.get("description", "Custom decoy"),
                    greeting=decoy_cfg.get("greeting", f"{name} ready."),
                    personality=decoy_cfg.get("personality", "neutral"),
                    responses=decoy_cfg.get("responses", {}),
                    default_response=decoy_cfg.get("default_response", "Processing..."),
                    tools=decoy_cfg.get("tools", []),
                    alert_level=decoy_cfg.get("alert_level", "warning"),
                    max_engagement=decoy_cfg.get("max_engagement", 10),
                )
    
    def is_decoy(self, agent_name: str) -> bool:
        """Check if an agent name is a decoy."""
        return agent_name in self.personas
    
    def get_decoy_names(self) -> list[str]:
        """Get all decoy agent names (for registry injection)."""
        return list(self.personas.keys())
    
    def handle_interaction(self, agent_name: str, message: str,
                           source_ip: str = "unknown",
                           user_id: str = "unknown") -> str:
        """
        Process a message to a decoy agent.
        
        Returns a synthetic response while logging everything and
        firing alerts.
        """
        persona = self.personas[agent_name]
        
        # Scan message for suspicious keywords
        keywords = self._scan_keywords(message)
        
        # Fire alert
        self.alert({
            "type": "decoy_interaction",
            "agent": agent_name,
            "severity": persona.alert_level,
            "source_ip": source_ip,
            "user_id": user_id,
            "message_preview": message[:200],
            "keywords": keywords,
        })
        
        # Generate synthetic response
        response = self._generate_response(persona, message)
        
        # Log the interaction
        interaction = DecoyInteraction(
            timestamp=datetime.utcnow().isoformat(),
            agent_name=agent_name,
            message=message,
            source_ip=source_ip,
            user_id=user_id,
            response=response,
            keywords_found=keywords,
        )
        self.interaction_log.append(interaction)
        
        # Check for escalation (sustained probing)
        if self._detect_escalation(agent_name, source_ip):
            self.alert({
                "type": "decoy_escalation",
                "agent": agent_name,
                "severity": "critical",
                "source_ip": source_ip,
                "user_id": user_id,
                "detail": (
                    f"Sustained probing of decoy '{agent_name}' from {source_ip}. "
                    f"Interaction count: {self._count_interactions(agent_name, source_ip)}"
                ),
            })
        
        return response
    
    def _generate_response(self, persona: DecoyPersona, message: str) -> str:
        """Generate a synthetic response based on message content."""
        message_lower = message.lower()
        
        # Match against response triggers
        for trigger, response in persona.responses.items():
            if trigger in message_lower:
                return response
        
        # Check if we should stop engaging (max reached)
        # For now, return default
        return persona.default_response
    
    def _scan_keywords(self, message: str) -> list[str]:
        """Extract security-relevant keywords from a message."""
        suspicious = [
            "password", "secret", "key", "token", "admin", "root",
            "config", "dump", "export", "shell", "exec", "sudo",
            "shadow", "passwd", "ssh", "database", "sql", "inject",
            "bypass", "override", "escalate", "privilege", "credential",
            "vault", "backup", "restore", "grant", "revoke",
        ]
        return [w for w in suspicious if w in message.lower()]
    
    def _detect_escalation(self, agent_name: str, source_ip: str) -> bool:
        """Detect sustained probing of a decoy."""
        recent = [
            i for i in self.interaction_log[-20:]
            if i.agent_name == agent_name and i.source_ip == source_ip
        ]
        
        if len(recent) < 3:
            return False
        
        # Escalation indicators:
        # 1. 3+ interactions with keywords
        keyword_interactions = sum(1 for i in recent if len(i.keywords_found) >= 2)
        if keyword_interactions >= 3:
            return True
        
        # 2. Rapid-fire probing (5+ messages in 2 minutes)
        if len(recent) >= 5:
            first = recent[0]
            last = recent[-1]
            # Simple check — in production, parse timestamps properly
            if first.timestamp[:16] == last.timestamp[:16]:  # Same minute
                return True
        
        return False
    
    def _count_interactions(self, agent_name: str, source_ip: str) -> int:
        """Count interactions from a specific source to a specific decoy."""
        return sum(
            1 for i in self.interaction_log
            if i.agent_name == agent_name and i.source_ip == source_ip
        )
    
    def get_stats(self) -> dict:
        """Get decoy swarm statistics."""
        return {
            "total_decoys": len(self.personas),
            "total_interactions": len(self.interaction_log),
            "by_agent": {
                name: self._count_interactions(name, "*")
                for name in self.personas
            },
            "decoy_names": list(self.personas.keys()),
        }
    
    def get_interaction_log(self, limit: int = 50) -> list[dict]:
        """Get recent interactions for forensics."""
        recent = self.interaction_log[-limit:]
        return [
            {
                "timestamp": i.timestamp,
                "agent": i.agent_name,
                "source_ip": i.source_ip,
                "user_id": i.user_id,
                "message": i.message[:200],
                "keywords": i.keywords_found,
            }
            for i in recent
        ]
    
    def _default_alert(self, alert: dict):
        """Default alert handler — just print."""
        print(f"[DECOY ALERT] {json.dumps(alert, indent=2)}")
