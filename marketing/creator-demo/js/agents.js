/**
 * CreatorCore Suite — Agent Module
 */

window.AgentModule = {
  renderAgentGrid() {
    const agents = window.CreatorState.get('dashboard.agents');
    return agents.map(agent => `
      <div class="agent-card" onclick="AgentModule.showDetail('${agent.id}')">
        <div class="agent-card-header">
          <div class="agent-icon ${agent.color}">${agent.icon}</div>
          <div>
            <div class="agent-name">${agent.name}</div>
            <div class="agent-role">${agent.id.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
          </div>
        </div>
        <div class="agent-desc">${agent.desc}</div>
        <div class="agent-meta">
          <div class="agent-status">
            <div class="status-indicator ${agent.status}"></div>
            <span style="color: var(--text-muted); font-size: 12px;">${agent.status === 'active' ? 'Active' : agent.status === 'syncing' ? 'Syncing' : 'Idle'}</span>
          </div>
          <a class="agent-actions" onclick="event.stopPropagation(); AgentModule.showDetail('${agent.id}')">View Details →</a>
        </div>
      </div>
    `).join('');
  },

  showDetail(agentId) {
    const agents = window.CreatorState.get('dashboard.agents');
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    const existing = document.querySelector('.agent-detail-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'agent-detail-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    overlay.innerHTML = `
      <div class="agent-detail-panel">
        <div class="agent-detail-header">
          <div style="display:flex;align-items:center;gap:14px;">
            <div class="agent-icon ${agent.color}" style="width:50px;height:50px;font-size:24px;">${agent.icon}</div>
            <div>
              <h2 style="font-family:var(--font-display);font-size:20px;font-weight:700;margin-bottom:2px;">${agent.name}</h2>
              <div style="display:flex;align-items:center;gap:6px;">
                <div class="status-indicator ${agent.status}" style="width:6px;height:6px;border-radius:50%;background:${agent.status === 'active' ? 'var(--success)' : agent.status === 'syncing' ? 'var(--warning)' : 'var(--text-muted)'}"></div>
                <span style="font-size:13px;color:var(--text-muted);">${agent.status === 'active' ? 'Active & Running' : agent.status === 'syncing' ? 'Syncing Data' : 'Idle'}</span>
              </div>
            </div>
          </div>
          <button class="agent-detail-close" onclick="this.closest('.agent-detail-overlay').remove()">✕</button>
        </div>
        <div class="agent-detail-body">
          <h3>Overview</h3>
          <p>${agent.desc}</p>

          <h3>Capabilities</h3>
          <ul class="capability-list">
            ${agent.capabilities.map(c => `<li>${c}</li>`).join('')}
          </ul>

          <h3>Performance Metrics</h3>
          <div class="metric-row"><span class="label">Total Tasks</span><span class="value">${agent.metrics.tasks.toLocaleString()}</span></div>
          <div class="metric-row"><span class="label">Success Rate</span><span class="value" style="color:var(--success)">${agent.metrics.success}%</span></div>
          <div class="metric-row"><span class="label">Avg Response Time</span><span class="value">${agent.metrics.avgTime}</span></div>
          <div class="metric-row"><span class="label">Uptime (30d)</span><span class="value">99.9%</span></div>
          <div class="metric-row"><span class="label">Cost (30d)</span><span class="value">$${(agent.metrics.tasks * 0.002).toFixed(2)}</span></div>
        </div>
        <div class="agent-detail-footer">
          <button class="btn btn-secondary" onclick="this.closest('.agent-detail-overlay').remove()">Close</button>
          <button class="btn btn-primary">Configure Agent</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
  }
};
