/**
 * CreatorCore Suite — Main Application
 */

(function() {
  'use strict';

  const router = window.CreatorRouter;

  // === Route Definitions ===

  // Dashboard
  router.register('/', {
    template: 'templates/dashboard.html',
    afterRender() {
      const grid = document.getElementById('agents-grid');
      if (grid) grid.innerHTML = window.AgentModule.renderAgentGrid();
      animateCounters();
    }
  });

  // Tools
  router.register('/tools', {
    template: 'templates/tools/tools-main.html',
    afterRender() { initToolsSection(); }
  });

  router.register('/tools/generator', {
    template: 'templates/tools/tool-generator.html',
    afterRender() { initContentGenerator(); }
  });

  router.register('/tools/strategy', {
    template: 'templates/tools/tool-strategy.html',
    afterRender() { initStrategyEngine(); }
  });

  // Analytics
  router.register('/analytics', {
    template: 'templates/analytics/analytics-main.html',
    afterRender() { initAnalyticsMain(); }
  });

  router.register('/analytics/dashboard', {
    template: 'templates/analytics/analytics-dashboard.html',
    afterRender() { initAnalyticsDashboard(); }
  });

  router.register('/analytics/revenue', {
    template: 'templates/analytics/analytics-revenue.html',
    afterRender() { initRevenueAnalytics(); }
  });

  router.register('/analytics/audience', {
    template: 'templates/analytics/analytics-audience.html',
    afterRender() { initAudienceAnalytics(); }
  });

  router.register('/analytics/content', {
    template: 'templates/analytics/analytics-content.html',
    afterRender() { initContentAnalytics(); }
  });

  router.register('/analytics/automation', {
    template: 'templates/analytics/analytics-automation.html',
    afterRender() { initAutomationMetrics(); }
  });

  // Settings
  router.register('/settings', {
    template: 'templates/settings/settings-main.html',
    afterRender() {
      const panel = document.getElementById('settings-render');
      if (panel) panel.innerHTML = window.SettingsModule.render();
    }
  });

  // Creator Studio
  router.register('/creator', {
    template: 'templates/creator/creator-main.html',
    afterRender() { initCreatorMain(); }
  });

  router.register('/creator/ip', {
    template: 'templates/creator/creator-ip-management.html',
    afterRender() { initIPManagement(); }
  });

  router.register('/creator/licensing', {
    template: 'templates/creator/creator-licensing.html',
    afterRender() { initLicensing(); }
  });

  router.register('/creator/portfolio', {
    template: 'templates/creator/creator-portfolio.html',
    afterRender() { initPortfolio(); }
  });

  router.register('/creator/analytics', {
    template: 'templates/creator/creator-analytics.html',
    afterRender() { initCreatorAnalytics(); }
  });

  // Discover
  router.register('/discover', {
    template: 'templates/discover/discover-main.html',
    afterRender() { initDiscoverMain(); }
  });

  router.register('/discover/marketplace', {
    template: 'templates/discover/discover-marketplace.html',
    afterRender() { initMarketplace(); }
  });

  router.register('/discover/trending', {
    template: 'templates/discover/discover-trending.html',
    afterRender() { initTrending(); }
  });

  router.register('/discover/studio-connect', {
    template: 'templates/discover/discover-studio-connect.html',
    afterRender() { initStudioConnect(); }
  });

  // Collaborate
  router.register('/collaborate', {
    template: 'templates/collaborate/collaborate-main.html',
    afterRender() { initCollaborateMain(); }
  });

  router.register('/collaborate/projects', {
    template: 'templates/collaborate/collaborate-projects.html',
    afterRender() { initProjects(); }
  });

  router.register('/collaborate/workspace', {
    template: 'templates/collaborate/collaborate-workspace.html',
    afterRender() { initWorkspace(); }
  });

  router.register('/collaborate/network', {
    template: 'templates/collaborate/collaborate-network.html',
    afterRender() { initNetwork(); }
  });

  // === Initialize App ===

  document.addEventListener('DOMContentLoaded', () => {
    // Load footer
    const footerContainer = document.getElementById('footer-container');
    if (footerContainer) {
      fetch('templates/footer.html')
        .then(r => r.text())
        .then(html => { footerContainer.innerHTML = html; })
        .catch(() => {});
    }

    // Init router
    router.init();
  });

  // === Shared Functions ===

  window.animateCounters = function() {
    document.querySelectorAll('[data-count]').forEach(el => {
      const target = parseInt(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const duration = 1000;
      const start = performance.now();

      function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(target * eased);
        el.textContent = prefix + current.toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(update);
      }
      requestAnimationFrame(update);
    });
  };

  window.initToolsSection = function() {
    document.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', () => {
        const route = card.dataset.route;
        if (route) window.location.hash = route;
      });
    });
  };

  window.initContentGenerator = function() {
    const form = document.getElementById('generator-form');
    const output = document.getElementById('generator-output');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('content-type')?.value || 'blog';
      const topic = document.getElementById('content-topic')?.value || 'AI and creativity';
      const tone = document.getElementById('content-tone')?.value || 'professional';

      if (output) {
        output.style.display = 'block';
        output.innerHTML = `
          <div style="padding:20px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
              <div class="loading-cc" style="width:24px;height:24px;font-size:10px;">CC</div>
              <span style="color:var(--text-muted);font-size:13px;">Generating ${type} content...</span>
            </div>
          </div>`;

        setTimeout(() => {
          output.innerHTML = `
            <div style="padding:20px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <span style="font-weight:600;font-size:14px;">Generated Content</span>
                <div style="display:flex;gap:8px;">
                  <button class="btn btn-secondary" style="font-size:12px;padding:4px 12px;">Copy</button>
                  <button class="btn btn-primary" style="font-size:12px;padding:4px 12px;">Publish</button>
                </div>
              </div>
              <div style="background:var(--bg-primary);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:20px;font-size:14px;line-height:1.8;color:var(--text-secondary);">
                <h3 style="color:var(--text-primary);font-family:var(--font-display);margin-bottom:12px;">The Future of ${topic}: A ${tone.charAt(0).toUpperCase() + tone.slice(1)} Perspective</h3>
                <p style="margin-bottom:12px;">In an era where technology reshapes how we create and consume content, understanding the intersection of ${topic} has never been more critical.</p>
                <p style="margin-bottom:12px;">As creators, we stand at a crossroads. The tools available to us today would have seemed like science fiction just a decade ago. Yet with great power comes great responsibility — and great opportunity.</p>
                <p>Here are the key trends shaping the landscape...</p>
                <div style="margin-top:16px;padding:12px;background:var(--accent-subtle);border-radius:var(--radius-sm);border-left:3px solid var(--accent-primary);">
                  <span style="font-size:12px;color:var(--accent-primary);font-weight:500;">✦ Content Generator · Brand Voice: 98% match · SEO Score: 87/100</span>
                </div>
              </div>
            </div>`;
        }, 2000);
      }
    });
  };

  window.initStrategyEngine = function() {
    // Strategy engine initialization
  };

  window.initAnalyticsMain = function() {
    const tabs = document.querySelectorAll('.analytics-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  };

  window.initAnalyticsDashboard = function() {
    const chartEl = document.getElementById('revenue-chart');
    if (chartEl) {
      const data = window.AnalyticsModule.data.revenue.daily;
      const maxVal = Math.max(...data);
      chartEl.innerHTML = data.map((val, i) => {
        const height = (val / maxVal) * 200;
        return `<div class="chart-bar-group">
          <div class="chart-bar" style="height:${height}px" title="$${val}"></div>
          <div class="chart-label">${i + 1}</div>
        </div>`;
      }).join('');
    }

    const tableEl = document.getElementById('revenue-sources-table');
    if (tableEl) tableEl.innerHTML = window.AnalyticsModule.renderRevenueTable();
  };

  window.initRevenueAnalytics = function() {
    const tableEl = document.getElementById('revenue-sources-detailed');
    if (tableEl) tableEl.innerHTML = window.AnalyticsModule.renderRevenueTable();
  };

  window.initAudienceAnalytics = function() {};

  window.initContentAnalytics = function() {
    const tableEl = document.getElementById('top-content-table');
    if (tableEl) tableEl.innerHTML = window.AnalyticsModule.renderTopContent();
  };

  window.initAutomationMetrics = function() {
    const tableEl = document.getElementById('workflows-table');
    if (tableEl) tableEl.innerHTML = window.AnalyticsModule.renderWorkflowList();
  };

  window.initCreatorMain = function() {};

  window.initIPManagement = function() {};

  window.initLicensing = function() {};

  window.initPortfolio = function() {};

  window.initCreatorAnalytics = function() {};

  window.initDiscoverMain = function() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });
  };

  window.initMarketplace = function() {};

  window.initTrending = function() {};

  window.initStudioConnect = function() {};

  window.initCollaborateMain = function() {};

  window.initProjects = function() {};

  window.initWorkspace = function() {};

  window.initNetwork = function() {};

})();
