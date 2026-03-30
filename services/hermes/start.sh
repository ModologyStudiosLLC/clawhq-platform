#!/usr/bin/env bash
set -euo pipefail

HERMES_HOME="${HERMES_HOME:-/opt/data}"
OPENFANG_URL="${OPENFANG_INTERNAL_URL:-http://openfang:4200}"
PAPERCLIP_URL="${PAPERCLIP_INTERNAL_URL:-http://paperclip:3100}"

# ── Bootstrap data dirs ─────────────────────────────────────────────────────
mkdir -p \
  "${HERMES_HOME}/cron" \
  "${HERMES_HOME}/sessions" \
  "${HERMES_HOME}/logs" \
  "${HERMES_HOME}/memory" \
  "${HERMES_HOME}/skills"

# ── Copy coordination skills into Hermes skills directory ────────────────────
# These allow Hermes to delegate tasks to OpenFang agents and trigger
# Paperclip workflows. Skills are re-copied on every start so they stay
# up to date when the container image is rebuilt.
cp /opt/skills/delegate_to_agent.py "${HERMES_HOME}/skills/delegate_to_agent.py"
cp /opt/skills/query_paperclip.py   "${HERMES_HOME}/skills/query_paperclip.py"

# ── Write .env if not present ────────────────────────────────────────────────
# Always rewrite so env changes (new API keys) take effect on restart.
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
# Bridge URLs — used by the delegation and Paperclip skills
OPENFANG_INTERNAL_URL=${OPENFANG_URL}
PAPERCLIP_INTERNAL_URL=${PAPERCLIP_URL}
EOF

# ── Write config if not present ──────────────────────────────────────────────
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
skills:
  directory: ${HERMES_HOME}/skills
  autoload: true
EOF
fi

# ── Start health server in background ────────────────────────────────────────
echo "[hermes] Starting health server on :4300"
python3 /opt/health_server.py &
HEALTH_PID=$!

# ── Start hermes gateway ─────────────────────────────────────────────────────
echo "[hermes] Starting gateway (brain mode — OpenFang: ${OPENFANG_URL}, Paperclip: ${PAPERCLIP_URL})"
cd /opt/hermes
export HERMES_HOME
export OPENFANG_INTERNAL_URL="${OPENFANG_URL}"
export PAPERCLIP_INTERNAL_URL="${PAPERCLIP_URL}"
hermes gateway start 2>&1 | tee "${HERMES_HOME}/logs/gateway.log" &
GATEWAY_PID=$!

# ── Wait for either process to exit ─────────────────────────────────────────
wait -n $HEALTH_PID $GATEWAY_PID 2>/dev/null || true
echo "[hermes] A process exited. Shutting down."
kill $HEALTH_PID $GATEWAY_PID 2>/dev/null || true
