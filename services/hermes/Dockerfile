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
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -e ".[telegram,discord,slack]" || \
    /opt/venv/bin/pip install -e "."

ENV PATH="/opt/venv/bin:$PATH"
ENV HERMES_HOME=/opt/data

# ── Health server ────────────────────────────────────────────────────────────
COPY health_server.py /opt/health_server.py
RUN /opt/venv/bin/pip install fastapi uvicorn[standard]

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
