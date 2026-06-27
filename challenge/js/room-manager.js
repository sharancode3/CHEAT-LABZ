/**
 * room-manager.js — Room Creation & Join Orchestration
 *
 * Handles the full flow:
 *   - CREATE: game selection → SocketClient.createRoom → redirect to lobby
 *   - JOIN: TEAMCODE input → validate → SocketClient.joinRoom → redirect to lobby
 *   - Error handling with inline UI feedback
 */

import SocketClient from './socket-client.js';

// ────────────────────────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────────────────────────
let selectedGameId   = null;
let selectedMaxPlayers = 2;
let pendingCreateSettings = {};

// ────────────────────────────────────────────────────────────────────────────
// Room Events — wire once
// ────────────────────────────────────────────────────────────────────────────
SocketClient.onRoomCreated(({ code, room }) => {
  console.log('[RoomManager] Room created:', code);
  navigateToLobby(code, room.gameId);
});

SocketClient.onRoomJoined(({ room }) => {
  console.log('[RoomManager] Room joined:', room.code);
  navigateToLobby(room.code, room.gameId);
});

SocketClient.onRoomError(({ message }) => {
  console.warn('[RoomManager] Room error:', message);
  showJoinError(message);
});

// ── Matchmaking found → go to lobby ─────────────────────────────────────────
SocketClient.onMatchFound(({ code, room }) => {
  console.log('[RoomManager] Match found:', code);
  navigateToLobby(code, room.gameId);
});

// ────────────────────────────────────────────────────────────────────────────
// Navigation
// ────────────────────────────────────────────────────────────────────────────
function navigateToLobby(code, gameId) {
  const params = new URLSearchParams({ code, game: gameId || '' });
  window.location.href = `lobby.html?${params.toString()}`;
}

// ────────────────────────────────────────────────────────────────────────────
// CREATE ROOM flow
// ────────────────────────────────────────────────────────────────────────────
export function createRoom(gameId, maxPlayers = 2, settings = {}) {
  selectedGameId = gameId;
  selectedMaxPlayers = maxPlayers;
  pendingCreateSettings = settings;

  if (!SocketClient.connected) {
    showGlobalError('Not connected to server. Please wait...');
    return;
  }

  SocketClient.createRoom(gameId, maxPlayers, settings);
}

// ────────────────────────────────────────────────────────────────────────────
// JOIN ROOM flow
// ────────────────────────────────────────────────────────────────────────────
export function joinRoom(code, displayName) {
  const cleaned = (code || '').toUpperCase().trim();

  if (cleaned.length !== 6) {
    showJoinError('Code must be exactly 6 characters.');
    shakeInput();
    return;
  }

  if (!SocketClient.connected) {
    showJoinError('Not connected to server. Please wait...');
    return;
  }

  clearJoinError();
  SocketClient.joinRoom(cleaned, displayName);
}

// ────────────────────────────────────────────────────────────────────────────
// Matchmaking
// ────────────────────────────────────────────────────────────────────────────
export function joinMatchmaking(gameId) {
  if (!SocketClient.connected) {
    showGlobalError('Not connected to server. Please wait...');
    return;
  }
  SocketClient.joinMatchmaking(gameId);
}

export function cancelMatchmaking() {
  SocketClient.cancelMatchmaking();
}

// ────────────────────────────────────────────────────────────────────────────
// UI Helpers
// ────────────────────────────────────────────────────────────────────────────
function showJoinError(message) {
  const el = document.getElementById('join-error');
  if (el) {
    el.textContent = message;
    el.style.display = 'block';
  }
  shakeInput();
}

function clearJoinError() {
  const el = document.getElementById('join-error');
  if (el) {
    el.textContent = '';
    el.style.display = 'none';
  }
}

function shakeInput() {
  const input = document.getElementById('teamcode-input');
  if (!input) return;
  input.classList.remove('shake');
  void input.offsetWidth; // trigger reflow
  input.classList.add('shake');
  setTimeout(() => input.classList.remove('shake'), 600);
}

function showGlobalError(message) {
  const toast = document.createElement('div');
  toast.className = 'challenge-toast challenge-toast--error';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ────────────────────────────────────────────────────────────────────────────
// TEAMCODE Input Setup
// ────────────────────────────────────────────────────────────────────────────
export function initTeamcodeInput() {
  const input = document.getElementById('teamcode-input');
  const btn   = document.getElementById('join-btn');

  if (!input || !btn) return;

  input.addEventListener('input', () => {
    input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    clearJoinError();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') attemptJoin();
  });

  btn.addEventListener('click', attemptJoin);

  function attemptJoin() {
    const identity = SocketClient.getSavedIdentity();
    joinRoom(input.value, identity?.displayName);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Game Selection Modal
// ────────────────────────────────────────────────────────────────────────────
export function showGameSelectModal(onSelect) {
  const modal = document.getElementById('game-select-modal');
  if (!modal) return;
  modal.style.display = 'flex';

  const cards = modal.querySelectorAll('[data-game-id]');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const gameId = card.dataset.gameId;
      const maxPlayers = parseInt(card.dataset.maxPlayers) || 2;
      modal.style.display = 'none';
      onSelect(gameId, maxPlayers);
    });
  });

  const closeBtn = modal.querySelector('.modal-close');
  if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
}

export default { createRoom, joinRoom, joinMatchmaking, cancelMatchmaking, initTeamcodeInput, showGameSelectModal };
