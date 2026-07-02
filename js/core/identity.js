const API_URL = import.meta.env?.VITE_SOCKET_URL || 'http://localhost:4000';

async function fetchWithRetry(url, options = {}, retries = 5, delay = 1000) {
  try {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    return await res.json();
  } catch (e) {
    if (retries > 0) {
      console.warn(`[Identity] Fetch failed. Retrying in ${delay}ms... (${retries} left)`, e);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 1.5);
    }
    throw e;
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
    try {
      const data = await fetchWithRetry(`${API_URL}/api/identity/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, displayName: name })
      });
      return data;
    } catch (e) {
      console.error('[Identity] Register to backend failed:', e);
      throw e;
    }
  },

  async validateOrRecreate() {
    const uid = this.getUID();
    const name = this.getDisplayName();
    if (!uid) return false;

    try {
      const data = await fetchWithRetry(`${API_URL}/api/identity/validate?uid=${encodeURIComponent(uid)}`);
      if (!data.exists) {
        // Recreate missing record
        await this.registerWithBackend(uid, name);
      } else if (data.displayName !== name) {
        // Sync name if changed out of band
        localStorage.setItem('cheatLabz_displayName', data.displayName);
      }
      return true;
    } catch (e) {
      console.error('[Identity] Validate exception:', e);
      return true; // Fallback to let player play offline/locally if connection fails
    }
  }
};
