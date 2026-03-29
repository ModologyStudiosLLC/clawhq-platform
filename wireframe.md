# ClawHQ Platform Wireframe

## Dashboard Overview

### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│  Header: Logo + Search + User Menu + Notifications         │
├─────────────────────────────────────────────────────────────┤
│  Sidebar:                                                  │
│  • Dashboard (active)                                      │
│  • Agents                                                  │
│  • Cost Intelligence                                       │
│  • Security Center                                         │
│  • Onboarding                                              │
│  • Marketplace                                             │
│  • Settings                                                │
├─────────────────────────────────────────────────────────────┤
│  Main Content:                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────────┐ │
│  │  System Health  │ │  Active Agents  │ │  Cost Today  │ │
│  │  • Paperclip: ✅│ │  • 5 Running    │ │  • $12.45    │ │
│  │  • Nerve: ✅    │ │  • 2 Idle       │ │  • 23% ↓     │ │
│  │  • OpenFang: ⚠️ │ │  • 1 Error      │ │  • Budget OK │ │
│  └─────────────────┘ └─────────────────┘ └──────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Recent Activity                                    │ │
│  │  • Agent "Felix" completed task (2 min ago)        │ │
│  │  • Cost alert: Project X exceeded budget           │ │
│  │  • New skill installed: LinkedIn Automation        │ │
│  │  • Security: Unusual login detected                │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────┐ ┌─────────────────┐                │
│  │  Quick Actions  │ │  System Stats   │                │
│  │  • Add Agent    │ │  • CPU: 45%     │                │
│  │  • View Reports │ │  • Memory: 2.3G │                │
│  │  • Run Audit    │ │  • Uptime: 7d   │                │
│  │  • Invite Team  │ │  • Requests: 1k │                │
│  └─────────────────┘ └─────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

## Key Screens

### 1. Dashboard (Home)
- **Purpose**: At-a-glance overview of entire OpenClaw ecosystem
- **Key Metrics**: 
  - System health status (Paperclip, Nerve, OpenFang)
  - Active agent count and status
  - Daily/weekly cost tracking
  - Recent activity feed
  - Quick action buttons

### 2. Agents Management
- **List View**: All agents with status, last activity, cost
- **Detail View**: Agent configuration, logs, performance metrics
- **Add Agent**: Wizard for connecting new agents (Paperclip, custom, etc.)

### 3. Cost Intelligence
- **Cost Dashboard**: Spend by agent, project, time period
- **Budget Alerts**: Set and manage budget limits
- **Forecasting**: Predict future spend based on trends
- **Export**: CSV/PDF reports for accounting

### 4. Security Center
- **Access Logs**: Who accessed what and when
- **Permission Management**: Role-based access control
- **Audit Trail**: Complete history of system changes
- **Compliance**: GDPR, SOC2, etc. reporting

### 5. Onboarding Wizards
- **Step-by-step guides**: 
  1. Connect first agent
  2. Set up cost tracking
  3. Configure security
  4. Invite team members
- **Progress tracking**: Visual completion indicators

### 6. Marketplace
- **Skill Discovery**: Browse, search, filter skills
- **Installation**: One-click install with dependencies
- **Ratings & Reviews**: Community feedback
- **Updates**: Notifications for skill updates

## Design System

### Colors
- **Primary**: #3B82F6 (Blue - trust, technology)
- **Secondary**: #10B981 (Green - success, growth)
- **Accent**: #8B5CF6 (Purple - creativity, AI)
- **Background**: #F9FAFB (Light gray)
- **Surface**: #FFFFFF (White cards)
- **Text**: #111827 (Dark gray)

### Typography
- **Headings**: Inter, 600 weight
- **Body**: Inter, 400 weight
- **Code**: JetBrains Mono, 400 weight

### Components
- **Cards**: Rounded corners (8px), subtle shadow
- **Buttons**: Primary (filled), Secondary (outline), Ghost (text)
- **Navigation**: Sidebar with active state indicators
- **Tables**: Clean, sortable, with hover states
- **Charts**: Simple, color-coded, with tooltips

## User Flow

1. **First Visit** → Onboarding wizard
2. **Dashboard** → System overview
3. **Add Agent** → Connect Paperclip/Nerve/OpenFang
4. **Configure** → Set budgets, security, notifications
5. **Daily Use** → Monitor, manage, optimize

## Responsive Design
- **Desktop**: Full sidebar + main content
- **Tablet**: Collapsible sidebar
- **Mobile**: Bottom navigation + focused views

## Accessibility
- **WCAG 2.1 AA** compliance
- **Keyboard navigation** support
- **Screen reader** optimized
- **Color contrast** checked