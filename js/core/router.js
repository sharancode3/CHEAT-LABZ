/**
 * js/core/router.js
 *
 * SPA Router relying exclusively on HTML5 History API (pushState, replaceState, popstate).
 * Features zero full-page refreshes, dynamic DOM view swapping, and dynamic HUD injection.
 */

import { GameRunner } from './game-runner.js';

const DEFAULT_ROUTES = new Map();

function normalizePath(pathname) {
  let clean = pathname.replace(/\/+/g, '/').replace(/\/$/, '');
  if (!clean.startsWith('/')) {
    clean = '/' + clean;
  }
  return clean;
}

function resolveTarget(target) {
  if (typeof target === 'string') {
    return { path: target, state: null };
  }
  if (target && typeof target === 'object') {
    return {
      path: target.path || '/',
      state: target.state ?? null,
    };
  }
  return { path: '/', state: null };
}

export function registerRoute(path, handler) {
  DEFAULT_ROUTES.set(normalizePath(path), handler);
}

export function unregisterRoute(path) {
  DEFAULT_ROUTES.delete(normalizePath(path));
}

export function getCurrentPath() {
  if (typeof window === 'undefined') {
    return '/';
  }
  return normalizePath(window.location.pathname);
}

// Global active view loader (Pure SPA)
export async function loadView(urlPath) {
  // If active game, destroy it
  if (GameRunner) {
    GameRunner.stop();
  }
  if (window.closeGameModal) {
    window.closeGameModal();
  }

  try {
    const res = await fetch(urlPath);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const htmlText = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    // Update document title
    document.title = doc.title;

    // Swap body content except kept elements
    const bodyChildren = Array.from(document.body.children);
    const toRemove = bodyChildren.filter(child => {
      const id = child.id;
      if (id === 'navbar-mount' || id === 'game-modal' || id === 'connection-overlay' || id === 'navigation-hud-panel') return false;
      if (child.tagName === 'SCRIPT') return false;
      return true;
    });
    toRemove.forEach(el => el.remove());

    // Insert new children
    const newBodyChildren = Array.from(doc.body.children);
    newBodyChildren.forEach(child => {
      const id = child.id;
      if (id === 'navbar-mount' || id === 'game-modal' || id === 'connection-overlay' || id === 'navigation-hud-panel') return;
      document.body.appendChild(child);
    });

    // Update active state in navbar
    updateNavbarActive(urlPath);

    // Inject HUD if needed
    injectNavigationHUD();

    // Re-execute scripts dynamically
    const scripts = Array.from(doc.querySelectorAll('script'));
    for (const script of scripts) {
      const newScript = document.createElement('script');
      if (script.src) {
        const cleanSrc = script.src.split('?')[0];
        newScript.src = cleanSrc + '?t=' + Date.now();
        newScript.type = script.type || 'text/javascript';
        document.body.appendChild(newScript);
      } else {
        newScript.textContent = script.textContent;
        document.body.appendChild(newScript);
      }
    }

    // Re-bind link interceptors
    bindLinkInterceptors();

    // Trigger router callback if any
    const normalized = normalizePath(urlPath);
    const handler = resolveRoute(normalized);
    if (handler) handler(normalized);

  } catch (err) {
    console.error(`[Router] Failed to load view: ${urlPath}`, err);
  }
}

function updateNavbarActive(urlPath) {
  const currentPath = urlPath.split('/').pop() || 'index.html';
  const links = document.querySelectorAll('.navbar a, .mobile-nav-links a, .challenge-nav a, .nav-links a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href) return;
    const linkPath = href.split('/').pop();
    if (linkPath === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

function injectNavigationHUD() {
  const currentPath = window.location.pathname;
  if (currentPath === '/' || currentPath.endsWith('index.html') && !currentPath.includes('challenge')) {
    // Home screen, remove HUD
    document.getElementById('navigation-hud-panel')?.remove();
    return;
  }

  let hud = document.getElementById('navigation-hud-panel');
  if (!hud) {
    hud = document.createElement('div');
    hud.id = 'navigation-hud-panel';
    hud.style.cssText = `
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 99999;
      display: flex;
      gap: 8px;
      pointer-events: auto;
    `;
    document.body.appendChild(hud);
  }

  hud.innerHTML = `
    <button id="hud-nav-home" style="
      background: rgba(10, 10, 15, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 8px 14px;
      color: #fff;
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.2s;
    ">
      🏠 HOME
    </button>
    <button id="hud-nav-back" style="
      background: rgba(10, 10, 15, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 8px;
      padding: 8px 14px;
      color: #fff;
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.2s;
    ">
      ↩ LOBBY
    </button>
  `;

  const btnHome = hud.querySelector('#hud-nav-home');
  const btnBack = hud.querySelector('#hud-nav-back');

  [btnHome, btnBack].forEach(btn => {
    btn.onmouseover = () => btn.style.borderColor = 'rgba(255, 255, 255, 0.25)';
    btn.onmouseout = () => btn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
  });

  btnHome.onclick = () => {
    window.history.pushState(null, '', '/index.html');
    loadView('/index.html');
  };

  btnBack.onclick = () => {
    const dest = window.location.pathname.includes('/challenge') ? '/challenge/index.html' : '/games.html';
    window.history.pushState(null, '', dest);
    loadView(dest);
  };
}

export function bindLinkInterceptors() {
  const links = document.querySelectorAll('a');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript:')) return;
    
    link.onclick = (e) => {
      e.preventDefault();
      const current = window.location.pathname;
      if (current !== href) {
        window.history.pushState(null, '', href);
        loadView(href);
      }
    };
  });
}

export function navigate(target, { replace = false } = {}) {
  const { path, state } = resolveTarget(target);
  if (typeof window === 'undefined') {
    return path;
  }

  const nextPath = normalizePath(path);
  if (replace) {
    window.history.replaceState(state, '', nextPath);
  } else {
    window.history.pushState(state, '', nextPath);
  }
  loadView(nextPath);
  return nextPath;
}

export function resolveRoute(path = getCurrentPath()) {
  return DEFAULT_ROUTES.get(normalizePath(path)) || null;
}

export function startRouter(defaultPath = '/') {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('popstate', () => {
    loadView(window.location.pathname);
  });

  // Bind links on initial DOM load
  bindLinkInterceptors();
  injectNavigationHUD();

  // Load the initial view
  loadView(window.location.pathname);

  return () => {};
}

export default {
  registerRoute,
  unregisterRoute,
  getCurrentPath,
  navigate,
  resolveRoute,
  startRouter,
};
