/**
 * presence.js — Live Online Counter Subscriber with Debounce and Smooth Animations
 * 
 * Subscribes to SocketClient 'presence' events and updates DOM elements:
 *   #online-count  — total connected players
 *   #in-game-count — players currently in a game
 */

import SocketClient from './socket-client.js';

let lastUpdate = null;
let updateTimeout = null;
let updateQueue = null;

function animateCount(el, newVal) {
  if (!el) return;
  const current = parseInt(el.textContent) || 0;
  if (current === newVal) return;

  // Let's do a smooth count animation
  const duration = 400; // ms
  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Lerp
    const currentVal = Math.floor(current + (newVal - current) * progress);
    el.textContent = currentVal;

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = newVal;
    }
  }

  requestAnimationFrame(tick);
}

function processPresenceUpdate(data) {
  lastUpdate = data;

  const countEl   = document.getElementById('online-count');
  const inGameEl  = document.getElementById('in-game-count');
  const inLobbyEl = document.getElementById('in-lobby-count');

  animateCount(countEl,   data.total  || 0);
  animateCount(inGameEl,  data.inGame  || 0);
  animateCount(inLobbyEl, data.inLobby || 0);
}

function debouncedPresenceUI(data) {
  // Batch/debounce updates over 500ms
  updateQueue = data;
  if (updateTimeout) return;

  updateTimeout = setTimeout(() => {
    if (updateQueue) {
      processPresenceUpdate(updateQueue);
      updateQueue = null;
    }
    updateTimeout = null;
  }, 500);
}

// ── Init ─────────────────────────────────────────────────────────────────────
export function initPresence() {
  // Update immediately from cached value
  const initial = {
    total:   SocketClient.getOnlineCount(),
    inLobby: SocketClient.getInLobbyCount(),
    inGame:  SocketClient.getInGameCount(),
  };
  processPresenceUpdate(initial);

  // Subscribe to future updates
  SocketClient.onPresence(debouncedPresenceUI);
}

export default initPresence;
