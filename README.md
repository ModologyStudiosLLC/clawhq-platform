# ClawHQ

The unified AI agent platform. OpenClaw + OpenFang + Paperclip, under one roof.

## What's inside

| Service | What it does |
|---|---|
| **OpenClaw** | Agent gateway — 20+ messaging channels, skills, WebSocket |
| **OpenFang** | Agent OS — autonomous hands, security, 27 LLM providers |
| **Paperclip** | Orchestration — agent teams, org charts, cost control |
| **Dashboard** | ClawHQ UI — unified control plane for all three |

## Self-host in 2 minutes

**Requirements:** Docker 24+, Docker Compose v2, 4GB RAM

```bash
git clone https://github.com/ModologyStudiosLLC/clawhq-platform
cd clawhq-platform
./install.sh
```

Opens at `http://localhost:3500`.

> First build compiles OpenFang from Rust source — takes 5-10 minutes once, then cached.

## Hosted version

Don't want to manage infrastructure? [modologystudios.com](https://modologystudios.com) runs it for you.

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
│   └── paperclip/     Orchestration (git subtree)
├── docker-compose.yml
├── install.sh
└── .env.example
```

## License

ClawHQ dashboard: MIT
OpenClaw: MIT
OpenFang: MIT
Paperclip: MIT
