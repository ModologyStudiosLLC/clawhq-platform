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
elif [ -n "${CLAWHIP_DISCORD_WEBHOOK:-}" ]; then
  cat >> "$CONFIG_FILE" <<TOML
[providers.discord_webhook]
url = "${CLAWHIP_DISCORD_WEBHOOK}"

TOML
fi

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
  [ -n "${CLAWHIP_DISCORD_WEBHOOK:-}" ] && SINK="discord_webhook"

  cat >> "$CONFIG_FILE" <<TOML
[[routes]]
event  = "session.*"
sink   = "${SINK}"
channel = "${CLAWHIP_DISCORD_CHANNEL_ID:-}"

[[routes]]
event  = "git.commit"
sink   = "${SINK}"
channel = "${CLAWHIP_DISCORD_CHANNEL_ID:-}"

[[routes]]
event  = "github.*"
sink   = "${SINK}"
channel = "${CLAWHIP_DISCORD_CHANNEL_ID:-}"

[[routes]]
event  = "tmux.keyword"
sink   = "${SINK}"
channel = "${CLAWHIP_DISCORD_CHANNEL_ID:-}"

TOML
fi

echo "[clawhip] Config written to $CONFIG_FILE"

exec clawhip daemon --config "$CONFIG_FILE"
