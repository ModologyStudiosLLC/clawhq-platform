# syntax=docker/dockerfile:1.7
# Clawhip — daemon-first Discord/Slack notification router
# Installs the prebuilt binary and runs the daemon on port 25294.

FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install clawhip binary
RUN curl --proto '=https' --tlsv1.2 -LsSf \
    https://github.com/Yeachan-Heo/clawhip/releases/latest/download/clawhip-installer.sh \
    | sh && \
    # Move binary to a standard PATH location
    mv /root/.cargo/bin/clawhip /usr/local/bin/clawhip 2>/dev/null || \
    mv ~/.local/bin/clawhip /usr/local/bin/clawhip 2>/dev/null || \
    true

# Fallback: build from source if installer didn't produce the binary
RUN if ! command -v clawhip > /dev/null 2>&1; then \
    apt-get update && apt-get install -y --no-install-recommends \
        build-essential pkg-config libssl-dev git \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal \
    && . /root/.cargo/env \
    && cargo install clawhip \
    && mv /root/.cargo/bin/clawhip /usr/local/bin/clawhip \
    && rm -rf /var/lib/apt/lists/* /root/.cargo/registry; \
fi

# Config directory
RUN mkdir -p /etc/clawhip /var/lib/clawhip

# Copy entrypoint that renders config from env vars at startup
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Clawhip daemon listens on this port
EXPOSE 25294

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -sf http://127.0.0.1:25294/health || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
