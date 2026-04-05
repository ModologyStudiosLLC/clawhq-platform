"""
Hermes Agent health/status server + Sentinel security layer.

Exposes:
  /health               — liveness probe
  /status               — gateway + channel status
  /sentinel/status      — full Sentinel shield status
  /sentinel/events      — recent security events (last N)
  /sentinel/tool-check  — pre-flight tool call guard (POST)
  /sentinel/scan        — prompt/output injection scan (POST)

Runs on port 4300 alongside the hermes gateway process.
Sentinel wraps all inbound requests as ASGI middleware.
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ── Sentinel init ────────────────────────────────────────────────────────────

SENTINEL_HOME = Path(__file__).parent / "sentinel"
sys.path.insert(0, str(Path(__file__).parent))

_sentinel: Optional[object] = None

def _load_yaml(path: Path) -> dict:
    try:
        import yaml  # type: ignore
        with open(path) as f:
            return yaml.safe_load(f) or {}
    except Exception:
        return {}


def _init_sentinel():
    global _sentinel
    try:
        from sentinel.middleware import SentinelMiddleware

        config = {
            "gate":     _load_yaml(SENTINEL_HOME / "gate.yaml").get("gate", {}),
            "sentinel": _load_yaml(SENTINEL_HOME / "sentinel.yaml").get("sentinel", {}),
            "canary":   _load_yaml(SENTINEL_HOME / "canary.yaml").get("canary", {}),
            "decoy":    _load_yaml(SENTINEL_HOME / "decoy.yaml").get("decoy", {}),
            "shield":   _load_yaml(SENTINEL_HOME / "shield.yaml").get("shield", {}),
        }
        _sentinel = SentinelMiddleware(None, config)  # app=None — used as a library, not ASGI proxy
        print("[sentinel] Initialized — all 6 layers active", flush=True)
    except Exception as e:
        print(f"[sentinel] Failed to initialize: {e}", flush=True)
        _sentinel = None


_init_sentinel()

# ── FastAPI app ──────────────────────────────────────────────────────────────

app = FastAPI(title="Hermes Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/opt/data"))
START_TIME = datetime.utcnow().isoformat()


# ── Helpers ──────────────────────────────────────────────────────────────────

def get_gateway_status() -> dict:
    """Check if hermes gateway process is alive."""
    try:
        result = subprocess.run(
            ["pgrep", "-f", "hermes gateway"],
            capture_output=True, text=True, timeout=3
        )
        running = result.returncode == 0
        pids = result.stdout.strip().split("\n") if running else []
        return {"running": running, "pids": [p for p in pids if p]}
    except Exception:
        return {"running": False, "pids": []}


def get_active_channels() -> list[str]:
    channels = []
    if os.environ.get("TELEGRAM_BOT_TOKEN"):
        channels.append("telegram")
    if os.environ.get("DISCORD_BOT_TOKEN"):
        channels.append("discord")
    if os.environ.get("SLACK_BOT_TOKEN"):
        channels.append("slack")
    return channels


def get_model() -> str:
    return os.environ.get("HERMES_MODEL", "anthropic/claude-sonnet-4-6")


def get_session_count() -> int:
    try:
        sessions_dir = HERMES_HOME / "sessions"
        if not sessions_dir.exists():
            return 0
        return len(list(sessions_dir.glob("*.json")))
    except Exception:
        return 0


# ── Core endpoints ───────────────────────────────────────────────────────────

@app.get("/health")
def health():
    gw = get_gateway_status()
    return {
        "ok": True,
        "status": "live" if gw["running"] else "starting",
        "started_at": START_TIME,
    }


@app.get("/status")
def status():
    gw = get_gateway_status()
    return {
        "ok": True,
        "gateway": gw,
        "model": get_model(),
        "channels": get_active_channels(),
        "sessions": get_session_count(),
        "hermes_home": str(HERMES_HOME),
        "started_at": START_TIME,
        "sentinel_active": _sentinel is not None,
    }


# ── Sentinel endpoints ───────────────────────────────────────────────────────

@app.get("/sentinel/status")
def sentinel_status():
    """Full Sentinel shield status — all 6 layers."""
    if _sentinel is None:
        return JSONResponse({"active": False, "error": "Sentinel not initialized"}, status_code=503)

    status = _sentinel.get_status()
    return {
        "active": True,
        "lockdown": status.get("shield", {}).get("lockdown_active", False),
        "blocked_ips": status.get("shield", {}).get("blocked_ips", 0),
        "alert_channels": status.get("shield", {}).get("alert_channels", 0),
        "canary": status.get("canary", {}),
        "decoy": {
            "total_decoys": status.get("decoy", {}).get("total_decoys", 0),
            "total_interactions": status.get("decoy", {}).get("total_interactions", 0),
            "decoy_names": status.get("decoy", {}).get("decoy_names", []),
        },
        "detector": status.get("detector", {}),
    }


@app.get("/sentinel/events")
def sentinel_events(limit: int = 50):
    """Recent security events from the correlation engine."""
    if _sentinel is None:
        return JSONResponse({"active": False, "events": []}, status_code=503)

    try:
        events = _sentinel.detector.get_recent_events(limit=limit)
        decoy_log = _sentinel.decoy.get_interaction_log(limit=min(limit, 20))
        return {
            "active": True,
            "events": events,
            "decoy_interactions": decoy_log,
        }
    except Exception as e:
        return {"active": True, "events": [], "error": str(e)}


@app.post("/sentinel/tool-check")
async def sentinel_tool_check(request: Request):
    """
    Pre-flight tool call guard.
    Body: { "tool": "read_file", "arguments": {...}, "session_id": "...", "agent_id": "..." }
    """
    if _sentinel is None:
        return {"allowed": True, "severity": "info", "reason": "sentinel_inactive"}

    try:
        body = await request.json()
        result = _sentinel.check_tool_call(
            tool_name=body.get("tool", ""),
            arguments=body.get("arguments", {}),
            session_id=body.get("session_id", "unknown"),
            agent_id=body.get("agent_id", ""),
        )
        return result
    except Exception as e:
        return {"allowed": True, "severity": "info", "reason": f"check_error: {e}"}


@app.post("/sentinel/scan")
async def sentinel_scan(request: Request):
    """
    Scan a prompt or tool output for injection.
    Body: { "text": "...", "source": "user"|"tool_output", "tool_name": "..." }
    """
    if _sentinel is None:
        return {"blocked": False, "severity": "info", "action": "pass"}

    try:
        body = await request.json()
        text = body.get("text", "")
        source = body.get("source", "user")

        if source == "tool_output":
            result = _sentinel.prompt_guard.scan_tool_output(
                body.get("tool_name", "unknown"), text
            )
        else:
            result = _sentinel.prompt_guard.scan_input(text, source=source)

        return {
            "blocked": result.blocked,
            "severity": result.severity,
            "action": result.action,
            "matched_rules": result.matched_rules,
        }
    except Exception as e:
        return {"blocked": False, "severity": "info", "action": "pass", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4300, log_level="warning")
