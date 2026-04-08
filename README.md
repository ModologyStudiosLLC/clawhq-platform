# ClawHQ

The unified AI agent control plane. OpenClaw + OpenFang + Paperclip + Hermes, under one roof.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/clawhq?label=Discord&logo=discord)](https://discord.gg/clawhq)
[![Docs](https://img.shields.io/badge/docs-clawhq.com-69daff)](https://docs.clawhq.com)

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

Full setup guide: [docs.clawhq.com/quickstart](https://docs.clawhq.com/quickstart)

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

The dashboard shows a badge in the top-right corner when your running instance is behind `main`. See [Updating ClawHQ](https://docs.clawhq.com/docs/updating) for the full runbook.

## Dashboard

14 pages covering every aspect of your agent fleet:

| Page | What it does |
|---|---|
| **Home** | Live agent status, metrics digest, recommendations |
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
- PII filtering — strips emails, phone numbers, SSNs, and card numbers
- Toxicity guardrails — configurable content policy enforcement
- Rate limiting — per-agent request and token limits
- Seccomp sandboxing — blocks dangerous syscalls at the OS level
- Audit logging — immutable append-only log of all configuration changes

**MCP Integrations** — connect agents to external tools in one click:
- Tier 1: Filesystem, Memory, PostgreSQL, Brave Search
- Tier 2: GitHub, Slack, Notion, Linear, Google Drive

**Exploration Mode** — per-session read-only mode for OpenClaw agents. `/explore on` filters all mutating tools (write, exec, bash, message, etc.) from the agent's available tool list without changing any config.

**Cost Controls** — per-agent token budgets, monthly spending caps, provider-level caps, budget threshold alerts via Slack webhook.

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

**Pro packs** — [clawhqplatform.com/packs](https://clawhqplatform.com/packs)

| Pack | What it does |
|---|---|
| **Creator Suite** | 12-agent content system — scripting, scheduling, repurposing, analytics |
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

## Community

- [Docs](https://docs.clawhq.com) — guides, reference, agent templates
- [Discord](https://discord.gg/clawhq) — get help, share agents, chat with the team
- [Discussions](https://github.com/ModologyStudiosLLC/clawhq-platform/discussions) — ideas, Q&A, show and tell
- [Contributing](CONTRIBUTING.md) — submit templates, report bugs, open PRs

## License

MIT — see [LICENSE](LICENSE)
