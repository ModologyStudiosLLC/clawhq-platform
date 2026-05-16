#!/usr/bin/env bash
# Clawhip entrypoint — writes config.toml from env vars, then starts the daemon.
set -euo pipefail

CONFIG_DIR="${CLAWHIP_CONFIG_DIR:-/etc/clawhip}"
CONFIG_FILE="$CONFIG_DIR/config.toml"

mkdir -p "$CONFIG_DIR"

# ── Build config.toml from environment ───────────────────────────────────────

cat > "$CONFIG_FILE" <<TOML
# Generated at container start — edit via ClawHQ env vars, not this file.

[daemon]
bind = "0.0.0.0:25294"
log_level = "${CLAWHIP_LOG_LEVEL:-info}"

TOML

# Discord provider (bot token preferred over webhook)
if [ -n "${CLAWHIP_DISCORD_TOKEN:-}" ]; then
  cat >> "$CONFIG_FILE" <<TOML
[providers.discord]
token = "${CLAWHIP_DISCORD_TOKEN}"
default_channel = "${CLAWHIP_DISCORD_CHANNEL_ID:-}"

TOML
fi
# Note: webhook-only mode uses per-route webhook fields (no provider block needed)

# Slack provider (webhook)
if [ -n "${CLAWHIP_SLACK_WEBHOOK:-}" ]; then
  cat >> "$CONFIG_FILE" <<TOML
[providers.slack]
webhook_url = "${CLAWHIP_SLACK_WEBHOOK}"

TOML
fi

# GitHub event source
if [ -n "${CLAWHIP_GITHUB_TOKEN:-}" ]; then
  cat >> "$CONFIG_FILE" <<TOML
[sources.github]
token = "${CLAWHIP_GITHUB_TOKEN}"
repos = [${CLAWHIP_GITHUB_REPOS:-}]

TOML
fi

# Routes — send every session/agent lifecycle event to the default Discord channel
if [ -n "${CLAWHIP_DISCORD_TOKEN:-}" ] || [ -n "${CLAWHIP_DISCORD_WEBHOOK:-}" ]; then
  SINK="discord"

  if [ -n "${CLAWHIP_DISCORD_TOKEN:-}" ]; then
    cat >> "$CONFIG_FILE" <<TOML
[[routes]]
event   = "session.*"
sink    = "discord"
channel = "${CLAWHIP_DISCORD_CHANNEL_ID:-}"

[[routes]]
event   = "git.commit"
sink    = "discord"
channel = "${CLAWHIP_DISCORD_CHANNEL_ID:-}"

[[routes]]
event   = "github.*"
sink    = "discord"
channel = "${CLAWHIP_DISCORD_CHANNEL_ID:-}"

[[routes]]
event   = "tmux.keyword"
sink    = "discord"
channel = "${CLAWHIP_DISCORD_CHANNEL_ID:-}"

TOML
  else
    cat >> "$CONFIG_FILE" <<TOML
[[routes]]
event   = "session.*"
sink    = "discord"
webhook = "${CLAWHIP_DISCORD_WEBHOOK}"

[[routes]]
event   = "git.commit"
sink    = "discord"
webhook = "${CLAWHIP_DISCORD_WEBHOOK}"

[[routes]]
event   = "github.*"
sink    = "discord"
webhook = "${CLAWHIP_DISCORD_WEBHOOK}"

[[routes]]
event   = "tmux.keyword"
sink    = "discord"
webhook = "${CLAWHIP_DISCORD_WEBHOOK}"

TOML
  fi
fi

echo "[clawhip] Config written to $CONFIG_FILE"

# Clawhip requires at least one delivery provider. If none are configured,
# start a minimal sleep-loop health stub so the container stays up without
# crashing (tokens can be added later via .env without a rebuild).
if [ -z "${CLAWHIP_DISCORD_TOKEN:-}" ] && [ -z "${CLAWHIP_DISCORD_WEBHOOK:-}" ] && [ -z "${CLAWHIP_SLACK_WEBHOOK:-}" ]; then
  echo "[clawhip] No delivery providers configured — running in stub mode. Set CLAWHIP_DISCORD_TOKEN, CLAWHIP_DISCORD_WEBHOOK, or CLAWHIP_SLACK_WEBHOOK to enable."
  # Sleep forever — the health check curl on port 25294 will fail (unhealthy)
  # but the container stays up. Configure CLAWHIP_DISCORD_TOKEN to activate.
  exec sleep infinity
fi

exec clawhip start --config "$CONFIG_FILE"
