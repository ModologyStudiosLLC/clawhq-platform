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

**Security (packages/security)**
- Agent sandboxing — filesystem traversal + dangerous command blocking
- Audit logging — every agent action tracked to SQLite
- Rate limiting — per-agent token/cost/request limits
- Scoped API keys — per-agent credentials with permissions
- Cost tracking — per-agent budgets, 12 model pricing, waste detection

**Cost Optimization (via ClawCost integration)**
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
