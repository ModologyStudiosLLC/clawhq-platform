# ClawHQ

The unified AI agent platform. OpenClaw + OpenFang + Paperclip + Hermes, under one roof.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/clawhq?label=Discord&logo=discord)](https://discord.gg/clawhq)
[![Docs](https://img.shields.io/badge/docs-clawhq.com-69daff)](https://docs.clawhq.com)

## What's inside

| Service | What it does |
|---|---|
| **OpenClaw** | Agent gateway — 20+ messaging channels, skills, WebSocket |
| **OpenFang** | Agent OS — autonomous hands, security, 27 LLM providers |
| **Paperclip** | Orchestration — agent teams, org charts, cost control |
| **Hermes** | Conversational AI — persistent memory, skills, and long-term context |
| **Dashboard** | ClawHQ UI — unified control plane for all services |

## Self-host in 2 minutes

**Requirements:** Docker 24+, Docker Compose v2, 4GB RAM

```bash
git clone https://github.com/ModologyStudiosLLC/clawhq-platform
cd clawhq-platform
./install.sh
```

Opens at `http://localhost:3500`.

> First build compiles OpenFang from Rust source — takes 5-10 minutes once, then cached.

Full setup guide: [docs.clawhq.com/quickstart](https://docs.clawhq.com/quickstart)

## Manual setup

```bash
cp .env.example .env
# fill in .env
docker compose up -d
```

## Update

```bash
git pull
docker compose up -d --build
```

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
| **Executive Assistant** | Calendar, inbox triage, travel, meeting prep, and expense tracking |
| **Competitor Intel** | Monitor competitor pricing, job posts, GitHub, and social — weekly digest |
| **Deal Room** | Prospect research, personalized outreach, pre-call briefings, CRM logging |

```bash
# Install a pack
cp packs/weekly-briefing.yaml ~/.clawhq/packs/
docker compose restart paperclip
```

Or from the dashboard: **Packs → Install**.

## Architecture

```
clawhq-platform/
├── apps/
│   └── dashboard/     Next.js control plane
├── services/
│   ├── openclaw/      Agent gateway (git subtree)
│   ├── openfang/      Agent OS, Rust (git subtree)
│   ├── paperclip/     Orchestration (git subtree)
│   └── hermes/        Conversational AI + memory (git subtree)
├── templates/         Community agent templates
├── docker-compose.yml
├── install.sh
└── .env.example
```

## Key Features

**Sentinel — built-in security**
- Prompt injection detection — blocks jailbreak attempts before they reach your agents
- PII filtering — strips emails, phone numbers, SSNs, and card numbers from inputs and outputs
- Toxicity guardrails — configurable content policy enforcement
- Rate limiting — per-agent request and token limits
- Audit logging — every agent action tracked with full context

Full docs: [clawhqplatform.com/docs/guides/sentinel](https://clawhqplatform.com/docs/guides/sentinel)

**Model Router**
- Route tasks to the right model automatically — Opus for complex reasoning, Haiku for fast ops
- Works with Anthropic, OpenAI, Groq, Gemini, DeepSeek, and local Ollama
- Per-agent model overrides and budget caps

**Security (packages/security)**
- Agent sandboxing — filesystem traversal + dangerous command blocking
- Audit logging — every agent action tracked to SQLite
- Rate limiting — per-agent token/cost/request limits
- Scoped API keys — per-agent credentials with permissions
- Cost tracking — per-agent budgets, 12 model pricing, waste detection

**Cost Optimization**
- Transparent proxy for Anthropic + OpenAI APIs
- Per-model, per-session, per-agent cost tracking
- Budget enforcement with 80% warning / 100% block
- Waste detection — "You're using Opus for tasks Haiku could handle"
- Model recommendations per task type

## Community

- [Docs](https://docs.clawhq.com) — guides, reference, agent templates
- [Discord](https://discord.gg/clawhq) — get help, share agents, chat with the team
- [Discussions](https://github.com/ModologyStudiosLLC/clawhq-platform/discussions) — ideas, Q&A, show and tell
- [Contributing](CONTRIBUTING.md) — submit templates, report bugs, open PRs

## License

MIT — see [LICENSE](LICENSE)
