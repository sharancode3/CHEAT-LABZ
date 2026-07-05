/**
 * Storage Manager
 * Handles all localStorage reads and writes using the 'cheatLabz_' namespace.
 */

const NAMESPACE = 'cheatLabz_';

export const Storage = {
  /**
   * Get a value from local storage
   * @param {string} key 
   * @param {*} defaultValue 
   * @returns {*}
   */
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(NAMESPACE + key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage', e);
      return defaultValue;
    }
  },

  /**
   * Set a value in local storage
   * @param {string} key 
   * @param {*} value 
   */
  set(key, value) {
    try {
      localStorage.setItem(NAMESPACE + key, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing to localStorage', e);
    }
  },

  /**
   * Remove a value from local storage
   * @param {string} key 
   */
  remove(key) {
    try {
      localStorage.removeItem(NAMESPACE + key);
    } catch (e) {
      console.error('Error removing from localStorage', e);
    }
  },

  /**
   * Clear all cheatLabz data from local storage
   */
  clearAll() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(NAMESPACE)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      console.error('Error clearing localStorage', e);
    }
  }
};

export function getStreak() {
  return Storage.get('streak', { current: 0, longest: 0, lastVisit: '', totalDays: 0 });
}

export function getCoins() {
  return Storage.get('coins', { total: 0, allTimeEarned: 0, history: [] });
}

export function formatCoins(n) {
  if (n >= 1000) return (n/1000).toFixed(1) + 'k';
  return n.toString();
}

export function showCoinAnimation(amount) {
  const coinDisplay = document.querySelector('.coin-display');
  if (!coinDisplay) return;

  const rect = coinDisplay.getBoundingClientRect();
  const el = document.createElement('div');
  el.textContent = `+${amount}`;
  el.style.position = 'fixed';
  el.style.left = `${rect.left + 24}px`;
  el.style.top = `${rect.top}px`;
  el.style.color = '#ffd93d';
  el.style.fontFamily = "'DM Sans', sans-serif";
  el.style.fontSize = '16px';
  el.style.fontWeight = 'bold';
  el.style.zIndex = '99999';
  el.style.pointerEvents = 'none';
  el.style.transition = 'all 1.5s ease-out';
  
  document.body.appendChild(el);
  
  // Trigger animation after next tick
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(-40px)';
    el.style.opacity = '0';
  });
  
  setTimeout(() => {
    el.remove();
  }, 1600);
}

export function showStreakNotification(streakCount, bonus) {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.top = '-80px';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';
  el.style.background = 'linear-gradient(90deg, #6c63ff, #00d4aa)';
  el.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  el.style.padding = '12px 24px';
  el.style.borderRadius = '30px';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.gap = '10px';
  el.style.zIndex = '999999';
  el.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.5)';
  el.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  
  el.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-flame" style="filter: drop-shadow(0 0 5px #ff6b6b);"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"></path></svg>
    <div style="font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: bold; color: #fff;">
      Day ${streakCount} Streak! <span style="color: #ffd93d; font-family: 'JetBrains Mono', monospace;">+${bonus} AP</span>
    </div>
  `;
  
  document.body.appendChild(el);
  
  // Slide down
  setTimeout(() => {
    el.style.top = '24px';
  }, 100);
  
  // Slide back up after 3s
  setTimeout(() => {
    el.style.top = '-80px';
    setTimeout(() => el.remove(), 600);
  }, 3100);
}

async function syncCurrencyWithSupabase() {
  const uid = localStorage.getItem('cheatLabz_uid');
  if (!uid) return;

  const coinsObj = getCoins();
  const streakObj = getStreak();

  const API_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_URL) || 'http://localhost:4000';
  try {
    await fetch(`${API_URL}/api/currency/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,
        coins: coinsObj.total,
        streak: streakObj.current,
        lastSeen: streakObj.lastVisit || new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn('[Supabase] Currency sync failed:', e);
  }
}

export function awardCoins(amount, reason) {
  const data = getCoins();
  data.total += amount;
  data.allTimeEarned += amount;
  data.history.unshift({
    reason,
    amount,
    date: new Date().toISOString().slice(0, 10)
  });
  data.history = data.history.slice(0, 50); // keep last 50
  Storage.set('coins', data);
  showCoinAnimation(amount); // visual feedback
  
  // Update navbar if visible
  const coinEl = document.getElementById('coin-count');
  if (coinEl) {
    coinEl.textContent = formatCoins(data.total);
  }

  // Sync to database
  syncCurrencyWithSupabase();
}

export function checkStreak() {
  const today = new Date().toISOString().slice(0, 10);
  const data = getStreak();
  
  if (data.lastVisit === today) {
    return;
  }
  
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  
  if (data.lastVisit === yesterday) {
    data.current = (data.current || 0) + 1;
    data.longest = Math.max(data.current, data.longest || 0);
    // Award streak bonus coins
    let bonus = 10;
    if (data.current === 3) bonus = 30;
    else if (data.current === 7) bonus = 70;
    else if (data.current === 14) bonus = 140;
    else if (data.current === 30) bonus = 300;
    else bonus = Math.min(data.current * 10, 100);

    awardCoins(bonus, `Day ${data.current} streak!`);
    
    data.lastVisit = today;
    data.totalDays = (data.totalDays || 0) + 1;
    Storage.set('streak', data);

    if (data.current > 1) {
      showStreakNotification(data.current, bonus);
    }
  } else {
    data.current = 1;
    data.lastVisit = today;
    data.totalDays = (data.totalDays || 0) + 1;
    Storage.set('streak', data);
    awardCoins(5, 'Day 1 streak!');
  }

  // Sync to database
  syncCurrencyWithSupabase();
}

export function isGameLocked(gameId) {
  const LOCKED_GAMES = {
    'beat-drop': 200,
    'pixel-dodge': 150,
    'astro-strider': 300
  };
  if (LOCKED_GAMES[gameId] !== undefined) {
    const unlocked = Storage.get(`unlocked_${gameId}`);
    return unlocked !== true;
  }
  return false;
}

// Export functions to global scope for script compatibility
window.getStreak = getStreak;
window.getCoins = getCoins;
window.formatCoins = formatCoins;
window.awardCoins = awardCoins;
window.checkStreak = checkStreak;
window.isGameLocked = isGameLocked;

window.Storage = Storage; // Make available globally if needed by older scripts
