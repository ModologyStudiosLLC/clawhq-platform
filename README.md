# ClawHQ

The unified AI agent control plane. OpenClaw + OpenFang + Paperclip + Hermes, under one roof.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-clawhqplatform.com-69daff)](https://clawhqplatform.com/docs/introduction)

## What's inside

| Service | What it does |
|---|---|
| **OpenClaw** | Agent gateway — 20+ messaging channels, skills, WebSocket, exploration mode |
| **OpenFang** | Agent OS — autonomous hands, security, 27 LLM providers |
| **Paperclip** | Orchestration — agent teams, org charts, cost control |
| **Hermes** | Conversational AI — persistent memory, skills, and long-term context |
| **Dashboard** | ClawHQ UI — unified control plane for all services |

## Self-host in 2 minutes

**Requirements:** Docker 24+, Docker Compose v2, 4 GB RAM

```bash
git clone https://github.com/ModologyStudiosLLC/clawhq-platform
cd clawhq-platform
./install.sh
```

Opens at `http://localhost:3500`.

> First build compiles OpenFang from Rust source — takes 5–10 minutes once, then cached.

Full setup guide: [clawhqplatform.com/docs/quickstart](https://clawhqplatform.com/docs/quickstart)

## Manual setup

```bash
cp .env.example .env
# fill in .env
docker compose up -d
```

## Updating

```bash
git pull
docker compose build --build-arg CLAWHQ_GIT_SHA=$(git rev-parse HEAD) dashboard
docker compose up -d
```

The dashboard shows a badge in the top-right corner when your running instance is behind `main`. See [Updating ClawHQ](https://clawhqplatform.com/docs/updating) for the full runbook.

## Dashboard

14 pages covering every aspect of your agent fleet:

| Page | What it does |
|---|---|
| **Home** | Live agent status, metrics digest, recommendations |
| **Chat** | General chat shell — pick any agent from a dropdown and message it directly |
| **Team** | Per-agent chat, settings, and tool configuration |
| **Capabilities** | What your agents can do |
| **Channels** | Discord, Slack, Telegram, WhatsApp setup |
| **Activity** | Live WebSocket event feed of agent activity |
| **Analytics** | Per-agent token spend and cost over time |
| **Budget** | Monthly budget, provider caps, spend by agent |
| **Health** | Real-time service health with sparklines and uptime |
| **Services** | Docker service management with SSE log streaming |
| **Orchestration** | DAG-based multi-agent workflow coordination |
| **Routing** | Model router configuration and self-learning stats |
| **Security** | Sentinel — prompt injection, PII, toxicity, rate limits |
| **Tunnels** | Tailscale VPN + Cloudflare Tunnel profiles |
| **SSO** | WorkOS directory sync and SAML/OIDC |
| **Settings** | General, agents, budget, integrations, model router, packs, notifications, API keys |
| **Deploy** | One-click deploy to Railway, Render, or DigitalOcean |

## Key Features

**Model Router** — routes tasks to the right model automatically based on task type, budget, and self-learned success rates. Supports Anthropic, OpenAI, Groq, Gemini, DeepSeek, Ollama, and 20+ more providers. Falls back to cheaper models when budget threshold is reached.

**Sentinel** — 6-layer built-in security:
- Prompt injection detection — blocks jailbreak attempts before they reach agents
- PII filtering — strips emails, phone numbers, SSNs, API keys, and card numbers from inbound messages, tool outputs, and outbound channel posts. Modes: redact (default), block, log_only. High-risk types (SSN, CC, API keys) always force-block.
- Toxicity guardrails — configurable content policy enforcement
- Rate limiting — per-agent request and token limits
- Seccomp sandboxing — blocks dangerous syscalls at the OS level
- Audit logging — immutable append-only log of all configuration changes

**Platform Security** — defence-in-depth across the full stack:
- Authentication middleware — all API routes require a valid WorkOS session; returns 401 JSON (no browser redirect)
- Credentials encrypted at rest — integration tokens stored with AES-256-GCM, keyed from `BETTER_AUTH_SECRET`
- Rate limiting — 200 req/min standard, 20 req/min on sensitive routes (keys, bridge, packs)
- Bridge HMAC — Paperclip → dashboard bridge verified with SHA-256 HMAC (`CLAWHQ_BRIDGE_SECRET`)
- Body size cap — 1 MB enforced at both Caddy and middleware layers
- CORS lockdown — `Access-Control-Allow-Origin` locked to `CLAWHQ_DOMAIN`

**MCP Integrations** — connect agents to external tools in one click:
- Tier 1: Filesystem, Memory, PostgreSQL, Brave Search
- Tier 2: GitHub, Slack, Notion, Linear, Google Drive

**Exploration Mode** — per-session read-only mode for OpenClaw agents. `/explore on` filters all mutating tools (write, exec, bash, message, etc.) from the agent's available tool list without changing any config.

**Cost Controls** — per-agent token budgets, monthly spending caps, provider-level caps, budget threshold alerts via Slack webhook.

**Per-tool analytics** — every tool call is timed and recorded (success/failure, duration). `GET /api/tool-stats` returns the last 24h of per-tool success rates sorted by error count. Surfaced in the analytics dashboard alongside token spend.

**Escalation on failure** — when all LLM fallbacks are exhausted or an agent hits the max iterations limit, OpenFang fires a Slack and/or Discord webhook immediately. Set `CLAWHQ_SLACK_WEBHOOK` / `CLAWHQ_DISCORD_WEBHOOK` in your `.env` to enable.

**API Keys** — generate scoped `chq_*` API keys for embedding ClawHQ agents in your own products. Keys are stored as SHA-256 hashes; plaintext shown only once on creation.

**Update Checker** — the dashboard header compares your deployed commit SHA against `main` via GitHub API and shows what's changed.

## Agent Packs

Pre-configured agent bundles. Install in one command, ready to work.

**Free packs**

| Pack | What it does |
|---|---|
| **Data Analyst** | CSV, JSON, and database → charts, tables, and statistical summaries |
| **Weekly Briefing** | Friday morning digest of Slack, GitHub, Linear, and email |
| **Content Engine** | Draft LinkedIn, Twitter, newsletters, and blog outlines from raw notes |
| **Reddit Intel** | Weekly Reddit monitoring — sentiment analysis, competitor mentions, Discord reports |
| **Code Review** | Paste code or name a file — severity-rated review (Critical/Warning/Suggestion) in any channel |
| **Paid Ads Manager** | Google, Meta, LinkedIn, Twitter/X campaigns — copy, targeting, creative briefs, ROAS/CPA |
| **Support Builder** | Rough notes and tickets → polished FAQ pages and help articles, gap analysis |
**Pro packs ($9/mo)** — [clawhqplatform.com/packs](https://clawhqplatform.com/packs)

| Pack | What it does |
|---|---|
| **Creator Suite** | 12-agent content system — scripting, scheduling, repurposing, analytics |
| **Proposal Generator** | Client proposals and SOWs with scope, pricing tables, T&Cs, kill fee, change orders |
| **Competitor Intel** | Helmer's 7 Powers teardowns — vulnerability map, attack brief, quarterly re-audit diffs |
| **Reskilling** | Workforce augmentation and AI reskilling programs — 6 agents, 5 packs, 4 workflows |
| **Trades Library** | Field service and skilled trades — estimates, scheduling, job completion |
| **Landing Foundry** | 9-agent landing page pipeline — copy, design brief, A/B variants, SEO |
| **Coding Agents** | Code review, incident response, sprint planning, PR triage |
| **Executive Assistant** | Calendar, inbox triage, travel, meeting prep, and expense tracking |
| **Deal Room** | Prospect research, personalized outreach, pre-call briefings, CRM logging |

Install from the dashboard: **Settings → Packs**, or copy a YAML file to `~/.clawhq/packs/` and restart Paperclip.

## Architecture

```
clawhq-platform/
├── apps/
│   └── dashboard/      Next.js 15 control plane
├── services/
│   ├── openclaw/       Agent gateway (TypeScript)
│   ├── openfang/       Agent OS (Rust)
│   ├── paperclip/      Orchestration (TypeScript)
│   └── hermes/         Conversational AI + memory (Python)
├── packs/              Agent pack YAML definitions
├── guides/             Mintlify documentation source
├── templates/          Community agent templates
├── docker-compose.yml
├── install.sh
└── .env.example
```

## Roadmap

| Status | Item |
|--------|------|
| Shipped | Usage/cost analytics, audit log, budget alerts, API key management, update checker |
| Shipped | MCP Tier 1 + Tier 2 integrations (Filesystem, Postgres, GitHub, Slack, Notion, Linear, Drive) |
| Shipped | Model router with task-type detection, budget fallback, and self-learning |
| Shipped | Agent health notifications, Tailscale + Cloudflare Tunnel profiles |
| Shipped | Auth middleware, AES-256-GCM credential encryption, rate limiting, HMAC bridge, CORS |
| Shipped | PII filter — redacts/blocks PII across inbound messages, tool outputs, and channel posts |
| Shipped | Per-tool error tracking — success rate, avg duration, error count per tool via /api/tool-stats |
| Shipped | Escalation-on-failure — Slack/Discord webhook when all LLM fallbacks exhausted |
| Planned | Team management / RBAC — admin/member/viewer roles, invite by email |
| Planned | PWA — installable dashboard on iOS/Android, responsive sidebar, offline fallback |

## Community

- [Docs](https://clawhqplatform.com/docs/introduction) — guides, reference, agent templates
- [Discussions](https://github.com/ModologyStudiosLLC/clawhq-platform/discussions) — ideas, Q&A, show and tell
- [Contributing](CONTRIBUTING.md) — submit templates, report bugs, open PRs

## License

MIT — see [LICENSE](LICENSE)
