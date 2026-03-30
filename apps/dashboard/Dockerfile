FROM node:22-alpine AS base

# ── Dependencies ──────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Builder ───────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_OPENCLAW_URL
ARG NEXT_PUBLIC_PAPERCLIP_URL
ARG NEXT_PUBLIC_OPENFANG_URL
ARG NEXT_PUBLIC_HERMES_URL

ENV NEXT_PUBLIC_OPENCLAW_URL=$NEXT_PUBLIC_OPENCLAW_URL
ENV NEXT_PUBLIC_PAPERCLIP_URL=$NEXT_PUBLIC_PAPERCLIP_URL
ENV NEXT_PUBLIC_OPENFANG_URL=$NEXT_PUBLIC_OPENFANG_URL
ENV NEXT_PUBLIC_HERMES_URL=$NEXT_PUBLIC_HERMES_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Runner ────────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3500
ENV PORT=3500
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
