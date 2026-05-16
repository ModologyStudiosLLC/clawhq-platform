# OpenClaw gateway container — installs from npm so `docker compose build`
# always fetches the published release without needing source updates.
#
# To pin a specific version:
#   docker build --build-arg OPENCLAW_VERSION=2026.4.9 .
ARG OPENCLAW_VERSION=latest

FROM node:24-bookworm-slim

ARG OPENCLAW_VERSION

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      procps hostname curl git lsof openssl && \
    rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@${OPENCLAW_VERSION}

# Workspace and config directories owned by the non-root node user
RUN mkdir -p /home/node/.openclaw/workspace /home/node/.openclaw/devices && \
    chown -R node:node /home/node

ENV NODE_ENV=production

USER node

HEALTHCHECK --interval=3m --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:18789/healthz').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["openclaw", "gateway", "--allow-unconfigured"]
