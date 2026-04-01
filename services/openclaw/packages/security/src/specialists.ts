/**
 * Specialist Agent Roles — Based on Garry Tan's gstack model.
 *
 * 23 specialist roles that form a virtual engineering team.
 * Each role has specific responsibilities, tools, and success criteria.
 *
 * Inspired by: https://github.com/garrytan/gstack
 * "I don't think I've typed like a line of code since December" — Karpathy
 */

// ── Role Definition ─────────────────────────────────────────────────────

export interface SpecialistRole {
  id: string;
  name: string;
  icon: string;
  description: string;
  responsibilities: string[];
  tools: string[];
  successCriteria: string[];
  escalationTriggers: string[];
  tier: 'core' | 'extended' | 'specialist';
}

// ── Core Roles (always active) ──────────────────────────────────────────

export const ROLES: Record<string, SpecialistRole> = {
  ceo: {
    id: 'ceo',
    name: 'CEO',
    icon: '🎯',
    description: 'Rethinks the product. Questions assumptions. Prioritizes by revenue impact.',
    responsibilities: [
      'Review daily priorities and revenue impact',
      'Question whether each task moves toward $100K MRR',
      'Kill low-value tasks before they consume resources',
      'Identify opportunities unprompted',
      'Make go/no-go decisions on product launches',
    ],
    tools: ['memory_search', 'web_search', 'discord_send'],
    successCriteria: ['Every task has clear revenue impact', 'No wasted effort on low-priority items'],
    escalationTriggers: ['Revenue milestone missed', 'Product launch decision needed'],
    tier: 'core',
  },

  designer: {
    id: 'designer',
    name: 'Designer',
    icon: '🎨',
    description: 'Catches AI slop. Ensures design quality and user experience.',
    responsibilities: [
      'Review all UI output for design quality',
      'Check for consistent spacing, typography, colors',
      'Ensure accessibility (contrast, keyboard nav, screen readers)',
      'Validate responsive design across breakpoints',
      'Flag "AI slop" — generic, soulless, template-looking designs',
    ],
    tools: ['browser', 'web_fetch', 'canvas'],
    successCriteria: ['All UI passes design review', 'No generic/template-looking output'],
    escalationTriggers: ['Design quality below standard', 'Accessibility issues found'],
    tier: 'core',
  },

  eng_manager: {
    id: 'eng_manager',
    name: 'Engineering Manager',
    icon: '🏗️',
    description: 'Locks architecture decisions. Ensures code quality and consistency.',
    responsibilities: [
      'Review architecture decisions before implementation',
      'Ensure code follows established patterns',
      'Enforce testing requirements',
      'Manage technical debt',
      'Coordinate between specialist agents',
    ],
    tools: ['read', 'exec', 'sessions_spawn'],
    successCriteria: ['All code follows established patterns', 'Tests pass before merge'],
    escalationTriggers: ['Architecture change needed', 'Technical debt blocking progress'],
    tier: 'core',
  },

  qa: {
    id: 'qa',
    name: 'QA Lead',
    icon: '🧪',
    description: 'Opens a real browser. Tests agent outputs before accepting them.',
    responsibilities: [
      'Test all agent outputs in real environments',
      'Run endpoint tests after code changes',
      'Verify UI renders correctly',
      'Check for regressions',
      'Validate API responses match expectations',
    ],
    tools: ['browser', 'exec', 'web_fetch'],
    successCriteria: ['All endpoints return expected responses', 'No regressions detected'],
    escalationTriggers: ['Test failure', 'Regression detected', 'API contract violation'],
    tier: 'core',
  },

  security_officer: {
    id: 'security_officer',
    name: 'Security Officer',
    icon: '🔐',
    description: 'Runs OWASP + STRIDE audits. Enforces security policies.',
    responsibilities: [
      'Run OWASP Top 10 checks on all new code',
      'Apply STRIDE threat modeling to new features',
      'Review agent access patterns for anomalies',
      'Audit API key usage and permissions',
      'Monitor for data leakage and unauthorized access',
    ],
    tools: ['get_error_log', 'exec', 'read'],
    successCriteria: ['No OWASP violations', 'All agent actions audited', 'No data leakage'],
    escalationTriggers: ['Security vulnerability found', 'Unauthorized access detected', 'Data leakage'],
    tier: 'core',
  },

  release_engineer: {
    id: 'release_engineer',
    name: 'Release Engineer',
    icon: '🚀',
    description: 'Ships the PR. Manages deployments and rollbacks.',
    responsibilities: [
      'Create and manage pull requests',
      'Run CI/CD checks before merge',
      'Manage deployment to staging and production',
      'Handle rollbacks when issues are detected',
      'Tag releases and update changelogs',
    ],
    tools: ['exec', 'read', 'write'],
    successCriteria: ['Clean CI pipeline', 'Successful deployment', 'Changelog updated'],
    escalationTriggers: ['CI failure', 'Deployment error', 'Rollback needed'],
    tier: 'core',
  },

  doc_engineer: {
    id: 'doc_engineer',
    name: 'Documentation Engineer',
    icon: '📝',
    description: 'Auto-generates and maintains documentation from code.',
    responsibilities: [
      'Generate API documentation from code',
      'Maintain README files',
      'Create setup guides and tutorials',
      'Document architecture decisions',
      'Keep changelogs current',
    ],
    tools: ['read', 'write', 'exec'],
    successCriteria: ['All public APIs documented', 'README up to date', 'Architecture decisions recorded'],
    escalationTriggers: ['Documentation gap found', 'API changes undocumented'],
    tier: 'core',
  },

  // ── Extended Roles ─────────────────────────────────────────────────

  researcher: {
    id: 'researcher',
    name: 'Researcher',
    icon: '🔍',
    description: 'Deep dives into topics. Synthesizes information for decision-making.',
    responsibilities: [
      'Research competitors and market trends',
      'Analyze technical solutions and trade-offs',
      'Synthesize findings into actionable insights',
      'Monitor industry news and developments',
      'Prepare briefing documents',
    ],
    tools: ['web_search', 'web_fetch', 'memory_search'],
    successCriteria: ['Research findings are actionable', 'Insights lead to decisions'],
    escalationTriggers: ['Critical market shift detected', 'Competitor threat identified'],
    tier: 'extended',
  },

  copywriter: {
    id: 'copywriter',
    name: 'Copywriter',
    icon: '✍️',
    description: 'Writes compelling copy. Converts features into benefits.',
    responsibilities: [
      'Write landing page copy',
      'Create email sequences',
      'Draft social media posts',
      'Write blog posts and articles',
      'Create sales collateral',
    ],
    tools: ['write', 'web_fetch', 'memory_search'],
    successCriteria: ['Copy is clear and compelling', 'Converts features to benefits'],
    escalationTriggers: ['Copy quality below standard', 'Conversion rate declining'],
    tier: 'extended',
  },

  data_analyst: {
    id: 'data_analyst',
    name: 'Data Analyst',
    icon: '📊',
    description: 'Turns data into insights. Tracks metrics and identifies trends.',
    responsibilities: [
      'Analyze usage and revenue data',
      'Track key performance indicators',
      'Identify trends and anomalies',
      'Create reports and dashboards',
      'Forecast based on historical data',
    ],
    tools: ['exec', 'read', 'memory_search'],
    successCriteria: ['Reports are accurate and timely', 'Trends identified early'],
    escalationTriggers: ['Anomaly detected', 'Metric trend concerning', 'Forecast indicates risk'],
    tier: 'extended',
  },

  // ── Specialist Roles ───────────────────────────────────────────────

  legal: {
    id: 'legal',
    name: 'Legal Counsel',
    icon: '⚖️',
    description: 'Reviews contracts, compliance, and legal requirements.',
    responsibilities: [
      'Review contracts and agreements',
      'Check compliance with regulations',
      'Draft terms of service and privacy policies',
      'Advise on intellectual property issues',
      'Monitor legal risks',
    ],
    tools: ['read', 'write', 'web_search'],
    successCriteria: ['No compliance violations', 'Contracts reviewed before signing'],
    escalationTriggers: ['Legal risk identified', 'Compliance gap found'],
    tier: 'specialist',
  },

  devops: {
    id: 'devops',
    name: 'DevOps Engineer',
    icon: '🔧',
    description: 'Manages infrastructure, deployments, and monitoring.',
    responsibilities: [
      'Manage CI/CD pipelines',
      'Monitor system health and performance',
      'Handle infrastructure scaling',
      'Manage secrets and credentials',
      'Respond to incidents',
    ],
    tools: ['exec', 'read', 'get_error_log'],
    successCriteria: ['System uptime > 99.9%', 'Deployments are automated', 'Incidents resolved quickly'],
    escalationTriggers: ['System down', 'Performance degradation', 'Security incident'],
    tier: 'specialist',
  },

  customer_success: {
    id: 'customer_success',
    name: 'Customer Success',
    icon: '🤝',
    description: 'Manages customer relationships and ensures satisfaction.',
    responsibilities: [
      'Respond to customer inquiries',
      'Track customer satisfaction metrics',
      'Identify upsell opportunities',
      'Manage onboarding for new customers',
      'Handle escalations from support',
    ],
    tools: ['discord_send', 'web_fetch', 'memory_search'],
    successCriteria: ['Customer satisfaction high', 'Response time < 1 hour', 'Churn rate low'],
    escalationTriggers: ['Customer complaint', 'Churn risk detected', 'Upsell opportunity'],
    tier: 'specialist',
  },
};

// ── Role Selection ─────────────────────────────────────────────────────

export function selectRoleForTask(taskDescription: string): SpecialistRole {
  const desc = taskDescription.toLowerCase();

  // Simple keyword matching for role selection
  if (desc.includes('revenue') || desc.includes('priorit') || desc.includes('decid') || desc.includes('launch')) {
    return ROLES.ceo;
  }
  if (desc.includes('design') || desc.includes('ui') || desc.includes('ux') || desc.includes('layout') || desc.includes('style')) {
    return ROLES.designer;
  }
  if (desc.includes('architect') || desc.includes('code review') || desc.includes('pattern') || desc.includes('refactor')) {
    return ROLES.eng_manager;
  }
  if (desc.includes('test') || desc.includes('verify') || desc.includes('check') || desc.includes('validate')) {
    return ROLES.qa;
  }
  if (desc.includes('security') || desc.includes('audit') || desc.includes('vulnerability') || desc.includes('owasp')) {
    return ROLES.security_officer;
  }
  if (desc.includes('deploy') || desc.includes('release') || desc.includes('ship') || desc.includes('merge')) {
    return ROLES.release_engineer;
  }
  if (desc.includes('document') || desc.includes('readme') || desc.includes('changelog') || desc.includes('guide')) {
    return ROLES.doc_engineer;
  }
  if (desc.includes('research') || desc.includes('competitor') || desc.includes('market') || desc.includes('trend')) {
    return ROLES.researcher;
  }
  if (desc.includes('write') || desc.includes('copy') || desc.includes('blog') || desc.includes('email') || desc.includes('post')) {
    return ROLES.copywriter;
  }
  if (desc.includes('data') || desc.includes('analytic') || desc.includes('metric') || desc.includes('report')) {
    return ROLES.data_analyst;
  }
  if (desc.includes('legal') || desc.includes('contract') || desc.includes('compliance') || desc.includes('privacy')) {
    return ROLES.legal;
  }
  if (desc.includes('deploy') || desc.includes('infra') || desc.includes('server') || desc.includes('docker')) {
    return ROLES.devops;
  }
  if (desc.includes('customer') || desc.includes('support') || desc.includes('onboard') || desc.includes('churn')) {
    return ROLES.customer_success;
  }

  // Default to CEO for strategic decisions
  return ROLES.ceo;
}

export function listRoles(): SpecialistRole[] {
  return Object.values(ROLES);
}

export function getRolesByTier(tier: 'core' | 'extended' | 'specialist'): SpecialistRole[] {
  return Object.values(ROLES).filter(r => r.tier === tier);
}
