# ClawHQ Dashboard

The command center for your OpenClaw agent ecosystem. Built with Next.js 14 App Router.

## Features

### Core Pages
| Page | Description |
|---|---|
| **Home** | Live digest — agent statuses, recent activity, uptime, top-level metrics |
| **Team** | Agent directory, per-agent settings, model assignments, and capabilities |
| **Capabilities** | Enable/disable individual hand plugins (tools agents can use) |
| **Hermes** | Autonomous cognitive agent — status, active channels, session count |
| **Channels** | Connect messaging platforms: Telegram, Discord, Slack, WhatsApp, Signal, Teams, and more |
| **Activity** | Unified event log across all agents with type + status filters |
| **Services** | Docker service management with real-time log streaming (SSE) |
| **Health** | Service health checks with sparklines and uptime indicators |
| **Tunnels** | Tailscale + Cloudflare Tunnel configuration |
| **Budget** | Token usage and estimated cost breakdown by agent |
| **SSO** | WorkOS-powered directory sync and single sign-on |
| **Sandbox** | seccomp security policy enforcement per agent |
| **Settings** | Model Router, MCP integrations, security level, channel tokens, budget caps |
| **Deploy** | Railway, Vercel, and self-hosted deployment controls |

### MCP Integrations (Settings → Integrations tab)

**Infrastructure (Tier 1)**
- **Filesystem** — Read/write local files
- **Memory** — Persistent key-value store across sessions
- **PostgreSQL** — Query and manage databases
- **Brave Search** — Web search via Brave Search API

**Productivity & Dev Tools (Tier 2)**
- **GitHub** — Repos, issues, PRs, code search (PAT)
- **Slack** — Read channels, post messages (Bot token)
- **Notion** — Read/write pages and databases (Integration token)
- **Linear** — Issues, projects, roadmaps (API key)
- **Google Drive** — Files and search (Service account JSON)

All credentials stored locally at `~/.clawhq/integrations.json`. Test buttons verify live connectivity.

### Model Router (Settings → Model Router tab)
- Per-task-type model assignment (code, research, summary, creative, chat)
- Budget fallback threshold — auto-downgrade to cheaper model
- Self-learning mode — records outcomes to `~/.openclaw/model-router-stats.json`
- Ollama routing for fully local inference

### Theme
Light and dark mode with system-preference default. Toggle in the top-right header. Preference persists to `localStorage`.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + CSS custom properties design system
- **Charts**: Recharts
- **Icons**: Lucide React
- **Auth**: WorkOS AuthKit (`@workos-inc/authkit-nextjs`)

## Getting Started

```bash
cd apps/dashboard
npm install
cp .env.example .env.local   # fill in WORKOS_CLIENT_ID, WORKOS_API_KEY, etc.
npm run dev -- --port 3500
```

Open [http://localhost:3500](http://localhost:3500).

## Backend

The dashboard is a thin UI layer over the OpenClaw gateway. All `/api/*` routes either:
- Read from `~/.openclaw/` config files directly (agents, integrations, settings)
- Proxy to the OpenClaw gateway at `http://localhost:8008`

No separate backend process needed beyond OpenClaw itself.

## Project Structure

```
apps/dashboard/
├── app/
│   ├── (dashboard)/          # Authenticated pages (layout with sidebar)
│   │   ├── home/
│   │   ├── team/
│   │   ├── capabilities/
│   │   ├── hermes/
│   │   ├── channels/
│   │   ├── activity/
│   │   ├── services/
│   │   ├── health/
│   │   ├── tunnels/
│   │   ├── budget/
│   │   ├── sso/
│   │   ├── sandbox/
│   │   ├── settings/
│   │   └── deploy/
│   ├── api/                  # API routes
│   │   ├── agents/
│   │   ├── integrations/     # MCP integration CRUD + test handlers
│   │   ├── metrics/
│   │   ├── hermes/
│   │   ├── hands/
│   │   ├── settings/
│   │   └── workspace/
│   ├── globals.css           # Design tokens (@theme block)
│   ├── icon.svg              # Favicon (claw mark)
│   └── layout.tsx
└── components/
    ├── layout/               # Sidebar, header, theme toggle
    ├── dashboard/            # Home page widgets
    ├── team/                 # Agent directory + settings modal
    ├── capabilities/         # Hand enable/disable cards
    ├── hermes/               # Hermes status panel
    ├── channels/             # Channel wizard + panel
    ├── activity/             # Event log
    ├── services/             # Docker service cards + log drawer
    ├── health/               # Health check grid
    ├── tunnels/              # Tunnel config
    ├── budget/               # Cost chart + breakdown
    ├── sso/                  # WorkOS SSO panel
    ├── sandbox/              # seccomp policy panel
    ├── settings/             # Tabbed settings (model router, MCP, etc.)
    └── deploy/               # Deployment panel
```

## Environment Variables

```env
# WorkOS auth
WORKOS_CLIENT_ID=
WORKOS_API_KEY=
WORKOS_REDIRECT_URI=http://localhost:3500/auth/callback

# OpenClaw gateway (optional override)
OPENCLAW_GATEWAY_URL=http://localhost:8008
```

## License

Proprietary — © 2026 Modology Studios, LLC
