/**
 * CreatorCore Suite — Analytics Module
 */

window.AnalyticsModule = {
  data: {
    revenue: {
      daily: [420, 380, 510, 470, 530, 620, 580, 490, 610, 720, 680, 550, 730, 810, 760, 690, 820, 910, 870, 790, 930, 1020, 980, 880, 1050, 1130, 1080, 960, 1100, 1200],
      monthly: [8200, 9100, 10300, 9800, 11200, 12500, 11800, 13100, 14200, 13500, 15100, 12847],
      sources: [
        { name: 'YouTube AdSense', amount: 4200, pct: 32.7, change: 15.2 },
        { name: 'Sponsorships', amount: 3800, pct: 29.6, change: 22.1 },
        { name: 'Course Sales', amount: 2100, pct: 16.3, change: 8.4 },
        { name: 'Merchandise', amount: 1500, pct: 11.7, change: -3.2 },
        { name: 'Affiliate', amount: 847, pct: 6.6, change: 31.5 },
        { name: 'Memberships', amount: 400, pct: 3.1, change: 45.8 }
      ]
    },
    audience: {
      total: 34200,
      newThisMonth: 2840,
      demographics: { '18-24': 22, '25-34': 38, '35-44': 24, '45-54': 11, '55+': 5 },
      topLocations: ['United States', 'United Kingdom', 'Canada', 'Australia', 'Germany'],
      growth: [1200, 1450, 1680, 1920, 2100, 2340, 2580, 2800, 3100, 2840, 3200, 2840]
    },
    content: {
      total: 247,
      byType: { Videos: 89, Posts: 72, Stories: 48, Threads: 22, Newsletters: 16 },
      topPerforming: [
        { title: 'How I Built a 6-Figure Creator Business', views: 284000, engagement: 8.2 },
        { title: 'AI Tools Every Creator Needs in 2026', views: 192000, engagement: 7.8 },
        { title: 'The Future of Content Monetization', views: 156000, engagement: 6.9 },
        { title: 'Day in the Life of a Full-Time Creator', views: 134000, engagement: 9.1 },
        { title: 'Why I Switched to Long-Form Content', views: 98000, engagement: 5.4 }
      ]
    },
    automation: {
      tasksAutomated: 12847,
      timeSaved: '48.2 hours',
      costSaved: '$2,340',
      activeWorkflows: 14,
      workflows: [
        { name: 'Auto-Generate Blog from Video', runs: 89, success: 97.8, lastRun: '2h ago' },
        { name: 'Cross-Post to All Platforms', runs: 234, success: 99.1, lastRun: '45m ago' },
        { name: 'Weekly Analytics Report', runs: 12, success: 100, lastRun: '3d ago' },
        { name: 'Comment Sentiment Analysis', runs: 1456, success: 98.4, lastRun: '12m ago' },
        { name: 'Thumbnail A/B Testing', runs: 45, success: 95.6, lastRun: '1d ago' },
        { name: 'Email Sequence Automation', runs: 342, success: 99.7, lastRun: '1h ago' },
        { name: 'Social Listening Alerts', runs: 2890, success: 99.2, lastRun: '5m ago' }
      ]
    }
  },

  renderChart(type, data) {
    const maxVal = Math.max(...data);
    return data.map((val, i) => {
      const height = (val / maxVal) * 200;
      return `<div class="chart-bar-group">
        <div class="chart-bar" style="height:${height}px" title="${val.toLocaleString()}"></div>
        <div class="chart-label">${i + 1}</div>
      </div>`;
    }).join('');
  },

  renderRevenueTable() {
    return this.data.revenue.sources.map(s => `
      <tr>
        <td class="source-name">${s.name}</td>
        <td class="amount">$${s.amount.toLocaleString()}</td>
        <td>${s.pct}%</td>
        <td style="color:${s.change >= 0 ? 'var(--success)' : 'var(--danger)'}">${s.change >= 0 ? '+' : ''}${s.change}%</td>
      </tr>
    `).join('');
  },

  renderTopContent() {
    return this.data.content.topPerforming.map((c, i) => `
      <tr>
        <td style="color:var(--text-muted);font-weight:600;width:30px;">${i + 1}</td>
        <td class="source-name">${c.title}</td>
        <td>${c.views.toLocaleString()}</td>
        <td style="color:var(--success)">${c.engagement}%</td>
      </tr>
    `).join('');
  },

  renderWorkflowList() {
    return this.data.automation.workflows.map(w => `
      <tr>
        <td class="source-name">${w.name}</td>
        <td>${w.runs}</td>
        <td style="color:${w.success >= 98 ? 'var(--success)' : w.success >= 95 ? 'var(--warning)' : 'var(--danger)'}">${w.success}%</td>
        <td style="color:var(--text-muted)">${w.lastRun}</td>
      </tr>
    `).join('');
  },

  initDashboard() {
    const chartEl = document.getElementById('revenue-chart');
    if (chartEl) chartEl.innerHTML = this.renderChart('revenue', this.data.revenue.daily);

    const tableEl = document.getElementById('revenue-sources-table');
    if (tableEl) tableEl.innerHTML = this.renderRevenueTable();
  }
};
