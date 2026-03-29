# ClawHQ Platform

**The command center for your OpenClaw ecosystem**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Website](https://img.shields.io/badge/Website-clawhqplatform.com-blue)](https://clawhqplatform.com)

## 🎯 Vision

Solve the fragmentation problem in the OpenClaw ecosystem by providing a unified dashboard that brings together Paperclip, Nerve, OpenFang, and other tools into a single, cohesive platform.

## ✨ Features

### Core (MVP)
- **Unified Dashboard**: Single view of all OpenClaw agents and their status
- **Cost Intelligence**: Real-time token usage tracking with budget alerts
- **Security Center**: Permission management and audit trails
- **Onboarding Wizards**: Guided setup for new OpenClaw users

### Planned
- **Agent Marketplace**: Discover and install new skills
- **Workflow Builder**: Visual automation for agent tasks
- **Team Collaboration**: Multi-user management and sharing
- **API Gateway**: Unified API for all OpenClaw services

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│               ClawHQ Platform                   │
│                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Frontend  │  │    API      │  │  Agent  │ │
│  │  (Next.js)  │  │ (FastAPI)   │  │  Proxy  │ │
│  └─────────────┘  └─────────────┘  └─────────┘ │
│          │              │              │        │
│  ┌───────▼──────────────▼──────────────▼──────┐ │
│  │            Service Integration Layer        │ │
│  └───────┬──────────────┬──────────────┬──────┘ │
│          │              │              │        │
│  ┌───────▼────┐  ┌─────▼─────┐  ┌─────▼─────┐  │
│  │  Paperclip │  │   Nerve   │  │ OpenFang  │  │
│  │   (3101)   │  │   (3080)  │  │   (8084)  │  │
│  └────────────┘  └───────────┘  └───────────┘  │
└─────────────────────────────────────────────────┘
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Python 3.10+
- OpenClaw running locally
- Docker (for optional containerized deployment)

### Installation
```bash
# Clone the repository
git clone https://github.com/ModologyStudiosLLC/clawhq-platform.git
cd clawhq-platform

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

## 📦 Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.10+
- **Database**: PostgreSQL (primary), Redis (caching)
- **Monitoring**: Langfuse, Prometheus, Grafana
- **Deployment**: Docker, Vercel (frontend), Railway/Render (backend)

## 🔧 Development

```bash
# Install dependencies
npm install
pip install -r requirements.txt

# Run development servers
npm run dev          # Frontend (localhost:3000)
python -m uvicorn api.main:app --reload  # Backend (localhost:8000)
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

- **Website**: [clawhqplatform.com](https://clawhqplatform.com)
- **Email**: hello@clawhqplatform.com
- **Twitter**: [@clawhqplatform](https://twitter.com/clawhqplatform)
- **Discord**: [OpenClaw Community](https://discord.com/invite/clawd)

## 🙏 Acknowledgments

- The OpenClaw community for inspiration and feedback
- Paperclip, Nerve, and OpenFang teams for building amazing tools
- All contributors and early adopters

---

Built with ❤️ by [Modology Studios](https://modology.studios)