#!/usr/bin/env bash
set -euo pipefail

HERMES_HOME="${HERMES_HOME:-/opt/data}"

# ── Bootstrap data dirs ─────────────────────────────────────────────────────
mkdir -p \
  "${HERMES_HOME}/cron" \
  "${HERMES_HOME}/sessions" \
  "${HERMES_HOME}/logs" \
  "${HERMES_HOME}/memory" \
  "${HERMES_HOME}/skills"

# ── Write .env if not present ────────────────────────────────────────────────
if [ ! -f "${HERMES_HOME}/.env" ]; then
  cat > "${HERMES_HOME}/.env" << EOF
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
OPENAI_API_KEY=${OPENAI_API_KEY:-}
GROQ_API_KEY=${GROQ_API_KEY:-}
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN:-}
DISCORD_BOT_TOKEN=${DISCORD_BOT_TOKEN:-}
SLACK_BOT_TOKEN=${SLACK_BOT_TOKEN:-}
SLACK_APP_TOKEN=${SLACK_APP_TOKEN:-}
HERMES_MODEL=${HERMES_MODEL:-anthropic/claude-sonnet-4-6}
EOF
fi

# ── Write minimal config if not present ─────────────────────────────────────
if [ ! -f "${HERMES_HOME}/config.yaml" ]; then
  cat > "${HERMES_HOME}/config.yaml" << EOF
model: ${HERMES_MODEL:-anthropic/claude-sonnet-4-6}
terminal:
  type: local
context_compression:
  enabled: true
  threshold: 0.85
memory:
  enabled: true
  max_chars: 50000
EOF
fi

# ── Start health server in background ────────────────────────────────────────
echo "[hermes] Starting health server on :4300"
python3 /opt/health_server.py &
HEALTH_PID=$!

# ── Start hermes gateway ─────────────────────────────────────────────────────
echo "[hermes] Starting gateway"
cd /opt/hermes
export HERMES_HOME
hermes gateway start 2>&1 | tee "${HERMES_HOME}/logs/gateway.log" &
GATEWAY_PID=$!

# ── Wait for either process to exit ─────────────────────────────────────────
wait -n $HEALTH_PID $GATEWAY_PID 2>/dev/null || true
echo "[hermes] A process exited. Shutting down."
kill $HEALTH_PID $GATEWAY_PID 2>/dev/null || true
