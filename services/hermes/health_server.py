"""
Thin health/status HTTP server for Hermes Agent.
Exposes /health and /status so ClawHQ dashboard can query the service.
Runs on port 4300 alongside the hermes gateway process.
"""

import os
import json
import subprocess
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Hermes Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

HERMES_HOME = Path(os.environ.get("HERMES_HOME", "/opt/data"))
START_TIME = datetime.utcnow().isoformat()


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
    """Infer active channels from configured tokens in environment."""
    channels = []
    if os.environ.get("TELEGRAM_BOT_TOKEN"):
        channels.append("telegram")
    if os.environ.get("DISCORD_BOT_TOKEN"):
        channels.append("discord")
    if os.environ.get("SLACK_BOT_TOKEN"):
        channels.append("slack")
    return channels


def get_model() -> str:
    """Return the configured model from env or config."""
    return os.environ.get("HERMES_MODEL", "anthropic/claude-sonnet-4-6")


def get_session_count() -> int:
    """Count active session files."""
    try:
        sessions_dir = HERMES_HOME / "sessions"
        if not sessions_dir.exists():
            return 0
        return len(list(sessions_dir.glob("*.json")))
    except Exception:
        return 0


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
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4300, log_level="warning")
