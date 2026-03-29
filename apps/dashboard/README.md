# ClawHQ Platform - Frontend

Next.js dashboard for the ClawHQ Platform - The command center for your OpenClaw ecosystem.

## Features

- **Real-time Agent Monitoring**: Track status, uptime, and costs of all OpenClaw agents
- **Cost Intelligence**: Detailed cost breakdown by agent, model, and time period
- **System Alerts**: Real-time notifications for budget thresholds, agent issues, and security events
- **Quick Actions**: One-click operations for common tasks
- **Responsive Design**: Works on desktop, tablet, and mobile

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI, Lucide React icons
- **Charts**: Recharts
- **State Management**: React hooks
- **API Client**: Fetch API

## Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ModologyStudiosLLC/clawhq-platform.git
cd clawhq-platform/frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Backend Integration

The frontend expects a backend running on `http://localhost:8000` with the following endpoints:

- `GET /api/agents` - List of agents with status
- `GET /api/costs` - Cost metrics and breakdown
- `GET /api/alerts` - System alerts and notifications

## Project Structure

```
frontend/
├── app/                    # Next.js app router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── components/            # React components
│   ├── Dashboard.tsx     # Main dashboard
│   ├── StatCard.tsx      # Statistic cards
│   ├── AgentList.tsx     # Agent status list
│   ├── CostChart.tsx     # Cost visualization
│   ├── AlertPanel.tsx    # Alert management
│   └── QuickActions.tsx  # Quick action buttons
├── public/               # Static assets
└── package.json         # Dependencies
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Code Style

- Use TypeScript for type safety
- Follow React hooks best practices
- Use Tailwind CSS for styling
- Keep components small and focused
- Write meaningful component and variable names

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in Vercel
3. Configure environment variables
4. Deploy automatically on push

### Self-hosted

1. Build the project:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=ClawHQ Platform
NEXT_PUBLIC_VERSION=1.0.0
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

Proprietary - © 2026 Modology Studios, LLC

## Support

- Documentation: [docs.clawhqplatform.com](https://docs.clawhqplatform.com)
- Community: [Discord](https://discord.gg/clawd)
- Issues: [GitHub Issues](https://github.com/ModologyStudiosLLC/clawhq-platform/issues)