"""
ClawHQ Sentinel — Multi-layer security for AI agent platforms.

Layers:
  1. Gate        — Rate limiting, IP reputation, auth
  2. Sentinel    — Prompt guard + tool guard (AI-native)
  3. Canary      — Token-based compromise detection
  4. Decoy Swarm — Honeypot agents with synthetic responses
  5. Detect      — Correlation engine + anomaly detection
  6. Shield      — Auto-response, block, alert, forensics
"""

__version__ = "0.1.0"

from sentinel.gate import GateLayer
from sentinel.prompt_guard import PromptGuard
from sentinel.tool_guard import ToolGuard
from sentinel.canary_engine import CanaryEngine
from sentinel.decoy_swarm import DecoySwarm
from sentinel.detector import CorrelationEngine
from sentinel.shield import ShieldLayer
from sentinel.middleware import SentinelMiddleware

__all__ = [
    "GateLayer",
    "PromptGuard",
    "ToolGuard",
    "CanaryEngine",
    "DecoySwarm",
    "CorrelationEngine",
    "ShieldLayer",
    "SentinelMiddleware",
]
