/**
 * CreatorCore Suite — Settings Module
 */

window.SettingsModule = {
  currentTab: 'general',

  tabs: ['general', 'agents', 'integrations', 'notifications', 'billing'],

  render() {
    return `
      <div class="settings-layout">
        <div class="settings-nav">
          ${this.tabs.map(tab => `
            <button class="settings-nav-item ${tab === this.currentTab ? 'active' : ''}"
                    onclick="SettingsModule.switchTab('${tab}')">
              ${tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          `).join('')}
        </div>
        <div class="settings-panel" id="settings-content">
          ${this.renderTab(this.currentTab)}
        </div>
      </div>`;
  },

  switchTab(tab) {
    this.currentTab = tab;
    const panel = document.getElementById('settings-content');
    if (panel) panel.innerHTML = this.renderTab(tab);
    document.querySelectorAll('.settings-nav-item').forEach(el => {
      el.classList.toggle('active', el.textContent.trim().toLowerCase() === tab);
    });
  },

  renderTab(tab) {
    switch (tab) {
      case 'general': return this.renderGeneral();
      case 'agents': return this.renderAgents();
      case 'integrations': return this.renderIntegrations();
      case 'notifications': return this.renderNotifications();
      case 'billing': return this.renderBilling();
      default: return '<p>Settings not found</p>';
    }
  },

  renderGeneral() {
    return `
      <div class="settings-section">
        <h3 class="settings-section-title">Appearance</h3>
        <p class="settings-section-desc">Customize how CreatorCore Suite looks and feels.</p>
        <div class="form-group">
          <label class="form-label">Theme</label>
          <select class="form-select" style="max-width:200px;">
            <option value="dark" selected>Dark (Obsidian)</option>
            <option value="midnight">Midnight</option>
            <option value="charcoal">Charcoal</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Accent Color</label>
          <div style="display:flex;gap:8px;">
            <div style="width:32px;height:32px;border-radius:50%;background:#7c3aed;cursor:pointer;border:2px solid white;box-shadow:0 0 0 2px var(--accent-primary);"></div>
            <div style="width:32px;height:32px;border-radius:50%;background:#3b82f6;cursor:pointer;"></div>
            <div style="width:32px;height:32px;border-radius:50%;background:#10b981;cursor:pointer;"></div>
            <div style="width:32px;height:32px;border-radius:50%;background:#f59e0b;cursor:pointer;"></div>
            <div style="width:32px;height:32px;border-radius:50%;background:#ec4899;cursor:pointer;"></div>
          </div>
        </div>
      </div>
      <div class="settings-section">
        <h3 class="settings-section-title">Profile</h3>
        <p class="settings-section-desc">Your public creator profile information.</p>
        <div class="form-group">
          <label class="form-label">Display Name</label>
          <input type="text" class="form-input" value="Creator" style="max-width:300px;">
        </div>
        <div class="form-group">
          <label class="form-label">Creator Tagline</label>
          <input type="text" class="form-input" placeholder="e.g., AI-Powered Content Creator" style="max-width:400px;">
          <p class="form-hint">Shown on your public profile and marketplace listings.</p>
        </div>
        <button class="btn btn-primary">Save Changes</button>
      </div>`;
  },

  renderAgents() {
    const agents = window.CreatorState.get('dashboard.agents');
    return `
      <div class="settings-section">
        <h3 class="settings-section-title">Agent Configuration</h3>
        <p class="settings-section-desc">Enable, disable, and configure your AI agents.</p>
        ${agents.map(agent => `
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">${agent.icon} ${agent.name}</div>
              <div class="toggle-desc">${agent.status === 'active' ? 'Active' : 'Syncing'} · ${agent.metrics.tasks.toLocaleString()} tasks completed</div>
            </div>
            <div class="toggle-switch ${agent.status !== 'disabled' ? 'active' : ''}" onclick="this.classList.toggle('active')"></div>
          </div>
        `).join('')}
      </div>
      <div class="settings-section">
        <h3 class="settings-section-title">Global Agent Settings</h3>
        <p class="settings-section-desc">Settings that apply to all agents.</p>
        <div class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-label">AI Assist</div>
            <div class="toggle-desc">Let agents suggest improvements to your content</div>
          </div>
          <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
        </div>
        <div class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-label">Auto-Learning</div>
            <div class="toggle-desc">Allow agents to learn from your content style and preferences</div>
          </div>
          <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
        </div>
        <div class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-label">Cross-Agent Communication</div>
            <div class="toggle-desc">Allow agents to share context and collaborate on tasks</div>
          </div>
          <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
        </div>
      </div>`;
  },

  renderIntegrations() {
    const integrations = [
      { name: 'YouTube', icon: '▶', connected: true, desc: 'Channel analytics, video publishing, comment management' },
      { name: 'Instagram', icon: '📷', connected: true, desc: 'Post scheduling, story management, DM automation' },
      { name: 'TikTok', icon: '♪', connected: true, desc: 'Video publishing, trend tracking, analytics' },
      { name: 'Twitter / X', icon: '𝕏', connected: true, desc: 'Tweet scheduling, thread creation, engagement tracking' },
      { name: 'Substack', icon: '✉', connected: false, desc: 'Newsletter publishing, subscriber management' },
      { name: 'Patreon', icon: '♦', connected: true, desc: 'Membership tiers, exclusive content, patron analytics' },
      { name: 'Stripe', icon: '$', connected: true, desc: 'Payment processing, revenue tracking, invoicing' },
      { name: 'Shopify', icon: '⬡', connected: false, desc: 'Merch store management, inventory sync, order fulfillment' }
    ];

    return `
      <div class="settings-section">
        <h3 class="settings-section-title">Connected Platforms</h3>
        <p class="settings-section-desc">Manage your connected platforms and data sources.</p>
        ${integrations.map(int => `
          <div class="toggle-row">
            <div class="toggle-info">
              <div class="toggle-label">${int.icon} ${int.name}</div>
              <div class="toggle-desc">${int.desc}</div>
            </div>
            <button class="btn ${int.connected ? 'btn-secondary' : 'btn-primary'}" style="min-width:100px;">
              ${int.connected ? 'Connected ✓' : 'Connect'}
            </button>
          </div>
        `).join('')}
      </div>`;
  },

  renderNotifications() {
    return `
      <div class="settings-section">
        <h3 class="settings-section-title">Notification Preferences</h3>
        <p class="settings-section-desc">Choose how and when you want to be notified.</p>
        <div class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-label">Push Notifications</div>
            <div class="toggle-desc">Real-time alerts on your devices</div>
          </div>
          <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
        </div>
        <div class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-label">Email Digests</div>
            <div class="toggle-desc">Daily summary of agent activity and analytics</div>
          </div>
          <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
        </div>
        <div class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-label">Revenue Alerts</div>
            <div class="toggle-desc">Notifications when revenue milestones are hit</div>
          </div>
          <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
        </div>
        <div class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-label">Agent Reports</div>
            <div class="toggle-desc">Weekly performance reports from your agents</div>
          </div>
          <div class="toggle-switch" onclick="this.classList.toggle('active')"></div>
        </div>
        <div class="toggle-row">
          <div class="toggle-info">
            <div class="toggle-label">Trend Alerts</div>
            <div class="toggle-desc">Notified when Trend Scout finds opportunities</div>
          </div>
          <div class="toggle-switch active" onclick="this.classList.toggle('active')"></div>
        </div>
      </div>`;
  },

  renderBilling() {
    return `
      <div class="settings-section">
        <h3 class="settings-section-title">Current Plan</h3>
        <p class="settings-section-desc">You are on the CreatorCore Pro plan.</p>
        <div class="card" style="max-width:400px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <span style="font-family:var(--font-display);font-size:18px;font-weight:700;">Pro Plan</span>
            <span class="card-badge live">Active</span>
          </div>
          <div style="font-size:28px;font-weight:700;font-family:var(--font-display);margin-bottom:4px;">$49<span style="font-size:14px;color:var(--text-muted);font-weight:400;">/month</span></div>
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">Billed monthly. Next billing: Apr 15, 2026</p>
          <div style="font-size:13px;color:var(--text-secondary);line-height:2;">
            ✓ All 12 AI Agents<br>
            ✓ Unlimited content generation<br>
            ✓ All platform integrations<br>
            ✓ Advanced analytics<br>
            ✓ Priority support
          </div>
        </div>
      </div>
      <div class="settings-section">
        <h3 class="settings-section-title">Usage This Month</h3>
        <p class="settings-section-desc">Track your usage against plan limits.</p>
        <div class="form-group">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <label class="form-label" style="margin:0;">AI Agent Tasks</label>
            <span style="font-size:13px;color:var(--text-muted);">12,847 / Unlimited</span>
          </div>
          <div style="height:6px;background:var(--bg-primary);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:65%;background:linear-gradient(90deg,var(--accent-primary),var(--accent-secondary));border-radius:3px;"></div>
          </div>
        </div>
        <div class="form-group">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <label class="form-label" style="margin:0;">Content Generated</label>
            <span style="font-size:13px;color:var(--text-muted);">247 / Unlimited</span>
          </div>
          <div style="height:6px;background:var(--bg-primary);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:42%;background:linear-gradient(90deg,var(--success),#34d399);border-radius:3px;"></div>
          </div>
        </div>
        <div class="form-group">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <label class="form-label" style="margin:0;">Storage</label>
            <span style="font-size:13px;color:var(--text-muted);">48.2 GB / 100 GB</span>
          </div>
          <div style="height:6px;background:var(--bg-primary);border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:48%;background:linear-gradient(90deg,var(--warning),#fbbf24);border-radius:3px;"></div>
          </div>
        </div>
      </div>`;
  }
};
