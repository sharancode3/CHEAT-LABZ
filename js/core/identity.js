import { CONFIG } from './config.js';

async function tryFetch(url, options = {}) {
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    const text = await res.text();
    // Guard: server might return HTML (index.html fallback) instead of JSON
    if (text.trim().startsWith('<')) return null;
    return JSON.parse(text);
  } catch (e) {
    // Silently fail — backend identity APIs are optional
    return null;
  }
}

export const Identity = {
  getUID() {
    return localStorage.getItem('cheatLabz_uid');
  },
  
  getDisplayName() {
    return localStorage.getItem('cheatLabz_displayName') || 'Player';
  },

  setIdentity(uid, name) {
    localStorage.setItem('cheatLabz_uid', uid);
    localStorage.setItem('cheatLabz_displayName', name);
  },

  generateUID() {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback secure string generator
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    // Convert to hex string
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },

  async registerWithBackend(uid, name) {
    return await tryFetch(`${CONFIG.SOCKET_URL}/api/identity/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, displayName: name })
    });
  },

  async validateOrRecreate() {
    const uid = this.getUID();
    const name = this.getDisplayName();
    if (!uid) return false;

    const data = await tryFetch(`${CONFIG.SOCKET_URL}/api/identity/validate?uid=${encodeURIComponent(uid)}`);
    if (!data) return true; // Backend unavailable — let the player play locally

    if (!data.exists) {
      await this.registerWithBackend(uid, name);
    } else {
      if (data.displayName !== name) {
        localStorage.setItem('cheatLabz_displayName', data.displayName);
      }
      if (typeof data.coins === 'number') {
        const coinsObj = localStorage.getItem('cheatLabz_coins')
          ? JSON.parse(localStorage.getItem('cheatLabz_coins'))
          : { total: 0, allTimeEarned: 0, history: [] };
        coinsObj.total = data.coins;
        localStorage.setItem('cheatLabz_coins', JSON.stringify(coinsObj));
        const coinEl = document.getElementById('coin-count');
        if (coinEl) coinEl.textContent = data.coins;
      }
      if (typeof data.streak === 'number') {
        const streakObj = localStorage.getItem('cheatLabz_streak')
          ? JSON.parse(localStorage.getItem('cheatLabz_streak'))
          : { current: 0, longest: 0, lastVisit: '', totalDays: 0 };
        streakObj.current = data.streak;
        localStorage.setItem('cheatLabz_streak', JSON.stringify(streakObj));
      }
    }
    return true;
  }
};
