/**
 * presence.js — Live Online Counter Subscriber
 * 
 * Subscribes to SocketClient 'presence' events and updates DOM elements:
 *   #online-count  — total connected players
 *   #in-game-count — players currently in a game
 */

import SocketClient from './socket-client.js';

let lastUpdate = null;

function animateCount(el, newVal) {
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === newVal) return;

  // Quick number tick animation
  el.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
  el.style.transform = 'translateY(-4px)';
  el.style.opacity = '0';

  setTimeout(() => {
    el.textContent = newVal;
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
  }, 200);
}

function updatePresenceUI({ total, inLobby, inGame }) {
  lastUpdate = { total, inLobby, inGame };

  const countEl   = document.getElementById('online-count');
  const inGameEl  = document.getElementById('in-game-count');
  const inLobbyEl = document.getElementById('in-lobby-count');

  animateCount(countEl,   total  || 0);
  animateCount(inGameEl,  inGame  || 0);
  animateCount(inLobbyEl, inLobby || 0);
}

// ── Init ─────────────────────────────────────────────────────────────────────
export function initPresence() {
  // Update immediately from cached value
  updatePresenceUI({
    total:   SocketClient.getOnlineCount(),
    inLobby: SocketClient.getInLobbyCount(),
    inGame:  SocketClient.getInGameCount(),
  });

  // Subscribe to future updates
  SocketClient.onPresence(updatePresenceUI);
}

export default initPresence;
