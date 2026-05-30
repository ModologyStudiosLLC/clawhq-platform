# ─── Hermes Agent — Nous Research ──────────────────────────────────────────
# Installs hermes-agent from source and runs in headless gateway mode.
# A thin Python health server exposes /health and /status on port 4300
# so ClawHQ dashboard can query its state.

FROM debian:bookworm-slim

# ── System deps ─────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv \
      git curl ripgrep ffmpeg \
      gcc g++ make \
      ca-certificates \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── Install uv (fast Python package manager) ───────────────────────────────
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.cargo/bin:/root/.local/bin:$PATH"

# ── Clone hermes-agent ──────────────────────────────────────────────────────
WORKDIR /opt/hermes
RUN git clone --depth 1 https://github.com/NousResearch/hermes-agent.git .

# ── Install Python deps ─────────────────────────────────────────────────────
RUN uv venv /opt/venv && \
    uv pip install --python /opt/venv/bin/python -e "." && \
    uv pip install --python /opt/venv/bin/python \
      "discord.py>=2.0" "python-telegram-bot>=20.0" "slack-sdk>=3.0"

ENV PATH="/opt/venv/bin:$PATH"
ENV HERMES_HOME=/opt/data
ENV HERMES_ALLOW_ROOT_GATEWAY=1

# ── Health server ────────────────────────────────────────────────────────────
COPY health_server.py /opt/health_server.py
COPY sentinel/ /opt/sentinel/
RUN uv pip install --python /opt/venv/bin/python fastapi uvicorn[standard] pyyaml

# ── Coordination skills ──────────────────────────────────────────────────────
# These skills let Hermes delegate tasks to OpenFang agents and trigger
# Paperclip workflows. Copied to HERMES_HOME/skills/ at startup.
COPY skills/ /opt/skills/

# ── Startup ──────────────────────────────────────────────────────────────────
COPY start.sh /opt/start.sh
RUN chmod +x /opt/start.sh

VOLUME ["/opt/data"]
EXPOSE 4300

ENTRYPOINT ["/opt/start.sh"]
