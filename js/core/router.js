const DEFAULT_ROUTES = new Map();

function normalizePath(pathname) {
  return pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
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

  const route = window.location.hash.replace(/^#/, '');
  return normalizePath(route || window.location.pathname);
}

export function navigate(target, { replace = false } = {}) {
  const { path, state } = resolveTarget(target);

  if (typeof window === 'undefined') {
    return path;
  }

  const nextPath = normalizePath(path);
  const nextHash = `#${nextPath}`;

  if (replace) {
    window.location.replace(nextHash);
  } else {
    window.location.hash = nextPath;
  }

  if (state != null) {
    window.history.replaceState(state, '', nextHash);
  }

  return nextPath;
}

export function resolveRoute(path = getCurrentPath()) {
  return DEFAULT_ROUTES.get(normalizePath(path)) || null;
}

export function startRouter(defaultPath = '/') {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const syncRoute = () => {
    const current = getCurrentPath() || defaultPath;
    const handler = resolveRoute(current) || resolveRoute(defaultPath);
    if (handler) {
      handler(current);
    }
  };

  window.addEventListener('hashchange', syncRoute);
  window.addEventListener('load', syncRoute, { once: true });
  syncRoute();

  return () => {
    window.removeEventListener('hashchange', syncRoute);
  };
}

export default {
  registerRoute,
  unregisterRoute,
  getCurrentPath,
  navigate,
  resolveRoute,
  startRouter,
};
