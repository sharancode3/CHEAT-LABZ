/**
 * js/core/router.js
 *
 * SPA Router relying exclusively on HTML5 History API.
 * Supports Component-based mounting, route params, and navigation guards.
 */

class Router {
  constructor() {
    this.routes = [];
    this.currentComponent = null;
    this.currentPath = null;
    this.container = null;
    this.guards = [];
    this.isNavigating = false;
  }

  /**
   * Initializes the router and binds the popstate event.
   * @param {HTMLElement} container - The DOM element where pages will be mounted.
   */
  start(container) {
    this.container = container;
    
    // Listen to browser back/forward buttons
    window.addEventListener('popstate', async (e) => {
      // popstate means URL already changed. If guard fails, we must revert URL.
      const targetPath = window.location.pathname;
      
      const canLeave = await this.runGuards();
      if (!canLeave) {
        // Revert URL change since guard rejected
        history.pushState(null, '', this.currentPath);
        return;
      }
      
      await this.loadRoute(targetPath);
    });

    // Intercept all link clicks globally
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;
      
      const href = link.getAttribute('href');
      // Ignore external links, anchors, javascript links
      if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:')) {
        return;
      }

      // Ignore links that open in new tabs
      if (link.target === '_blank') return;
      
      e.preventDefault();
      this.navigate(href);
    });

    // Load initial route
    this.loadRoute(window.location.pathname);
  }

  /**
   * Registers a path pattern to a component class.
   * @param {string} pathPattern - E.g., '/', '/games', '/lobby/:code'
   * @param {class} ComponentClass - A class with mount() and unmount()
   */
  register(pathPattern, ComponentClass) {
    // Convert path pattern to regex to match URL and extract params
    // e.g. /lobby/:code -> regex: ^\/lobby\/([^\/]+)$, keys: ['code']
    const keys = [];
    const regexPath = pathPattern.replace(/:([^\/]+)/g, (_, keyName) => {
      keys.push(keyName);
      return '([^\\/]+)';
    });
    const regex = new RegExp(`^${regexPath}\\/?$`);

    this.routes.push({
      pattern: pathPattern,
      regex,
      keys,
      ComponentClass
    });
  }

  /**
   * Adds a navigation guard.
   * @param {Function} checkFunction - Returns boolean or Promise<boolean>
   * @returns {Function} Function to remove the guard
   */
  addGuard(checkFunction) {
    this.guards.push(checkFunction);
    return () => {
      this.guards = this.guards.filter(g => g !== checkFunction);
    };
  }

  async runGuards() {
    for (const guard of this.guards) {
      const canProceed = await guard();
      if (!canProceed) return false;
    }
    return true;
  }

  /**
   * Navigates to a new path.
   * @param {string} path 
   */
  async navigate(path) {
    if (this.isNavigating) return;
    this.isNavigating = true;

    if (this.currentPath === path) {
      this.isNavigating = false;
      return;
    }

    const canLeave = await this.runGuards();
    if (!canLeave) {
      this.isNavigating = false;
      return;
    }

    window.history.pushState(null, '', path);
    await this.loadRoute(path);
    this.isNavigating = false;
  }

  /**
   * Replaces current history entry.
   * @param {string} path 
   */
  async replace(path) {
    window.history.replaceState({}, '', path);
    this.loadRoute(path).finally(() => {
      this.isNavigating = false;
    });
  }

  /**
   * Navigates back.
   */
  back() {
    window.history.back();
  }

  /**
   * Matches path to a route and mounts the component.
   */
    async loadRoute(fullPath) {
    let match = null;
    let params = {};

    // Strip query string and hash for matching
    const path = fullPath.split('?')[0].split('#')[0];

    for (const route of this.routes) {
      const res = path.match(route.regex);
      if (res) {
        match = route;
        route.keys.forEach((key, index) => {
          params[key] = res[index + 1];
        });
        break;
      }
    }

    if (!match) {
      console.warn(`[Router] No route matched for path: ${path}`);
      // Fallback to home if no route matches
      this.replace('/');
      return;
    }

    // Unmount current component
    if (this.currentComponent) {
      if (typeof this.currentComponent.unmount === 'function') {
        try {
          await this.currentComponent.unmount();
        } catch (err) {
          console.error('[Router] Error unmounting component:', err);
        }
      }
    }

    // Clear container
    if (this.container) {
      this.container.innerHTML = '';
    }

    // Mount new component
    this.currentPath = path;
    this.currentComponent = new match.ComponentClass();
    
    try {
      await this.currentComponent.mount(params, this.container);
    } catch (err) {
      console.error('[Router] Error mounting component:', err);
    }
  }
}

const router = new Router();
export default router;
