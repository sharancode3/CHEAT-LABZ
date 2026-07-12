import { CONFIG } from './config.js';

class SocketClientSingleton {
  constructor() {
    this.socket = null;
    this.sessionToken = this.getOrGenerateSessionToken();
    this.callbacks = new Map(); // owner (string) -> Map<event, Set<callback>>
    this.statusBar = null;
    this.connectionStartTime = 0;
    this.wakeTimer = null;
    this.state = 'DISCONNECTED';
  }

  getOrGenerateSessionToken() {
    let token = localStorage.getItem('cheatLabz_sessionToken');
    if (!token) {
      token = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now();
      localStorage.setItem('cheatLabz_sessionToken', token);
    }
    return token;
  }

  initStatusBar() {
    if (this.statusBar) return;
    this.statusBar = document.createElement('div');
    this.statusBar.id = 'socket-status-bar';
    this.statusBar.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 10px;
      line-height: 10px;
      text-align: center;
      font-size: 9px;
      font-family: 'Inter', sans-serif;
      z-index: 999;
      transform: translateY(100%);
      transition: transform 0.3s ease, background 0.3s ease, color 0.3s ease;
      background: var(--bg-card, #1e1e2a);
      color: var(--muted, #8888a8);
      border-top: 1px solid var(--border-subtle, #2a2a3a);
    `;
    document.body.appendChild(this.statusBar);
  }

  updateStatusBar(state, message = '', type = 'info') {
    this.initStatusBar();
    this.state = state;

    if (state === 'CONNECTED') {
      this.statusBar.style.transform = 'translateY(100%)';
      return;
    }

    this.statusBar.style.transform = 'translateY(0)';
    this.statusBar.textContent = message;

    if (type === 'warning') {
      this.statusBar.style.background = '#423300';
      this.statusBar.style.color = '#ffd700';
      this.statusBar.style.borderTopColor = '#b39700';
    } else if (type === 'error') {
      this.statusBar.style.background = '#4a0f0f';
      this.statusBar.style.color = '#ff6b6b';
      this.statusBar.style.borderTopColor = '#b32424';
    } else {
      this.statusBar.style.background = 'var(--bg-card, #1e1e2a)';
      this.statusBar.style.color = 'var(--muted, #8888a8)';
      this.statusBar.style.borderTopColor = 'var(--border-subtle, #2a2a3a)';
    }
  }

  connect() {
    if (this.socket || !window.io) return;

    this.updateStatusBar('CONNECTING', 'Connecting...');
    this.connectionStartTime = Date.now();

    this.wakeTimer = setTimeout(() => {
      if (this.state === 'CONNECTING') {
        this.updateStatusBar('CONNECTING', 'Waking up servers... This takes ~30s on first connect.');
      }
    }, 5000);

    this.socket = window.io(CONFIG.SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
      transports: ['websocket', 'polling'],
      query: {
        sessionToken: this.sessionToken
      }
    });

    this.socket.on('connect', () => {
      clearTimeout(this.wakeTimer);
      this.updateStatusBar('CONNECTED');
      // Send reconnect event immediately
      this.socket.emit('player:reconnect', { sessionToken: this.sessionToken });
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[SOCKET] Connect error:', err.message);
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      this.updateStatusBar('RECONNECTING', `Reconnecting... (attempt \${attempt}/10)`, 'warning');
    });

    this.socket.io.on('reconnect_failed', () => {
      this.updateStatusBar('FAILED', 'Connection lost. Refresh to reconnect.', 'error');
    });

    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to reconnect manually
        this.updateStatusBar('FAILED', 'Disconnected by server. Refresh to reconnect.', 'error');
      } else {
        // else the socket will automatically try to reconnect
        this.updateStatusBar('CONNECTING', 'Connection lost. Reconnecting...', 'warning');
      }
    });
    
    // Internal generic listener to route to owners
    this.socket.onAny((event, ...args) => {
      for (const [owner, eventMap] of this.callbacks.entries()) {
        const callbacks = eventMap.get(event);
        if (callbacks) {
          for (const cb of callbacks) {
            cb(...args);
          }
        }
      }
    });
  }

  on(event, callback, owner = 'global') {
    if (!this.callbacks.has(owner)) {
      this.callbacks.set(owner, new Map());
    }
    const eventMap = this.callbacks.get(owner);
    if (!eventMap.has(event)) {
      eventMap.set(event, new Set());
    }
    eventMap.get(event).add(callback);
  }

  off(event, callback) {
    for (const [owner, eventMap] of this.callbacks.entries()) {
      if (eventMap.has(event)) {
        eventMap.get(event).delete(callback);
      }
    }
  }

  offAll(owner) {
    if (this.callbacks.has(owner)) {
      this.callbacks.delete(owner);
      if (CONFIG.ENV === 'development') {
        console.log(`[SOCKET] Cleaned up all listeners for \${owner}`);
      }
    }
  }

  emit(event, data) {
    if (!this.socket) return;
    if (CONFIG.ENV === 'development') {
      console.log(`[SOCKET EMIT] \${event}`, data);
    }
    this.socket.emit(event, data);
  }

  once(event, callback, owner = 'global') {
    const wrappedCallback = (...args) => {
      callback(...args);
      this.off(event, wrappedCallback);
    };
    this.on(event, wrappedCallback, owner);
  }
}

export const SocketClient = new SocketClientSingleton();
