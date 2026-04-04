/**
 * CreatorCore Suite — SPA Router
 * Hash-based routing with template loading
 */

class Router {
  constructor() {
    this.routes = {};
    this.currentRoute = null;
    this.beforeEach = null;
    this.afterEach = null;
  }

  register(path, config) {
    this.routes[path] = config;
  }

  async navigate(path) {
    window.location.hash = path;
  }

  async resolve() {
    const hash = window.location.hash.slice(1) || '/';
    const path = hash.split('?')[0];

    // Find matching route
    let route = this.routes[path];
    let params = {};

    if (!route) {
      // Try parameterized routes
      for (const [pattern, config] of Object.entries(this.routes)) {
        const paramNames = [];
        const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
          paramNames.push(name);
          return '([^/]+)';
        });
        const regex = new RegExp(`^${regexStr}$`);
        const match = path.match(regex);
        if (match) {
          route = config;
          paramNames.forEach((name, i) => {
            params[name] = match[i + 1];
          });
          break;
        }
      }
    }

    if (!route) {
      route = this.routes['/'] || { template: 'templates/dashboard.html' };
    }

    if (this.beforeEach) {
      const canProceed = await this.beforeEach(route, path);
      if (!canProceed) return;
    }

    this.currentRoute = path;
    this.updateActiveNav(path);

    const content = document.getElementById('app-content');
    if (!content) return;

    // Show loading
    content.innerHTML = `
      <div class="loading-screen">
        <div class="loading-cc" style="width:48px;height:48px;font-size:18px;">CC</div>
        <div class="loading-text">Loading...</div>
      </div>`;

    try {
      if (route.template) {
        const response = await fetch(route.template);
        if (!response.ok) throw new Error(`Template not found: ${route.template}`);
        const html = await response.text();
        content.innerHTML = html;
      } else if (route.render) {
        content.innerHTML = route.render(params);
      }

      if (route.afterRender) {
        route.afterRender(params);
      }

      if (this.afterEach) {
        this.afterEach(route, path);
      }
    } catch (error) {
      console.error('Route error:', error);
      content.innerHTML = `
        <div class="page-container">
          <div class="page-header">
            <h1 class="page-title">Page Not Found</h1>
            <p class="page-subtitle">The page you're looking for doesn't exist.</p>
          </div>
          <a href="#/" class="btn btn-primary">Go to Dashboard</a>
        </div>`;
    }
  }

  updateActiveNav(path) {
    document.querySelectorAll('.nav-item').forEach(item => {
      const route = item.getAttribute('data-route');
      if (route === path || (route && path.startsWith(route) && route !== '/')) {
        item.classList.add('active');
      } else if (route === '/' && path === '/') {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  init() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  }
}

window.CreatorRouter = new Router();
