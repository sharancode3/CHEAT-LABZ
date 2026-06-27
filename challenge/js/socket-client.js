/**
 * socket-client.js — Singleton Socket.IO Client for CHEAT LABZ Challenge Mode
 *
 * One connection per page session.
 * Provides a clean, event-based API for all challenge mode pages/games.
 *
 * Usage:
 *   import SocketClient from './socket-client.js';
 *   SocketClient.createRoom('multiplayer-snake', 2, {});
 *   SocketClient.onRoomUpdate(room => updateLobbyUI(room));
 */

// ── Backend URL ──────────────────────────────────────────────────────────────
// Change this to your Railway/Render URL before deploying to production.
// For local dev: 'http://localhost:4000'
const SERVER_URL = window.CHALLENGE_SERVER_URL || 'http://localhost:4000';

// ── Connection State ─────────────────────────────────────────────────────────
const STATE = {
  CONNECTING: 'connecting',
  CONNECTED:  'connected',
  DISCONNECTED: 'disconnected',
  FAILED: 'failed',
};

let socket = null;
let connectionState = STATE.CONNECTING;
let onlineCount = 0;
let inLobbyCount = 0;
let inGameCount = 0;

// Registered callbacks
const callbacks = {
  gameState:   [],
  roomUpdate:  [],
  roomJoined:  [],
  roomCreated: [],
  roomError:   [],
  presence:    [],
  countdown:   [],
  gameStart:   [],
  gameAction:  [],
  gameEnded:   [],
  gameRecap:   [],
  playerJoined: [],
  playerLeft:  [],
  matchFound:  [],
  matchSearch: [],
  identity:    [],
  challengeReceived: [],
};

function emit(event, ...args) {
  for (const cb of (callbacks[event] || [])) {
    try { cb(...args); } catch (e) { console.error(`[SocketClient] Callback error on "${event}":`, e); }
  }
}

// ── Status Indicator ─────────────────────────────────────────────────────────
function updateStatusIndicator(state) {
  const indicator = document.getElementById('sc-status-indicator');
  if (!indicator) return;

  const configs = {
    [STATE.CONNECTING]:   { color: '#ffd93d', text: 'Connecting...' },
    [STATE.CONNECTED]:    { color: '#00d4aa', text: 'Connected' },
    [STATE.DISCONNECTED]: { color: '#ffd93d', text: 'Reconnecting...' },
    [STATE.FAILED]:       { color: '#ff6b6b', text: 'Connection lost — refresh to reconnect' },
  };

  const cfg = configs[state] || configs[STATE.CONNECTING];
  indicator.style.background = cfg.color;
  indicator.title = cfg.text;

  const label = document.getElementById('sc-status-label');
  if (label) label.textContent = cfg.text;
}

function injectStatusIndicator() {
  if (document.getElementById('sc-status-indicator')) return;
  const div = document.createElement('div');
  div.id = 'sc-status-wrap';
  div.style.cssText = `
    position: fixed; bottom: 16px; left: 16px; z-index: 9000;
    display: flex; align-items: center; gap: 6px;
    font-family: 'JetBrains Mono', monospace; font-size: 10px;
    color: #94A3B8; pointer-events: none;
  `;
  div.innerHTML = `
    <div id="sc-status-indicator" style="
      width: 8px; height: 8px; border-radius: 50%;
      background: #ffd93d; transition: background 0.3s;
    "></div>
    <span id="sc-status-label">Connecting...</span>
  `;
  document.body.appendChild(div);
}

// ── Connect ──────────────────────────────────────────────────────────────────
function connect() {
  if (typeof io === 'undefined') {
    console.error('[SocketClient] Socket.IO client not loaded. Include the CDN script.');
    return;
  }

  socket = io(SERVER_URL, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 10000,
  });

  // Connection lifecycle
  socket.on('connect', () => {
    connectionState = STATE.CONNECTED;
    updateStatusIndicator(STATE.CONNECTED);
    console.log('[SocketClient] Connected:', socket.id);
  });

  socket.on('disconnect', (reason) => {
    connectionState = STATE.DISCONNECTED;
    updateStatusIndicator(STATE.DISCONNECTED);
    console.log('[SocketClient] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[SocketClient] Connection error:', err.message);
    updateStatusIndicator(STATE.DISCONNECTED);
  });

  socket.io.on('reconnect_failed', () => {
    connectionState = STATE.FAILED;
    updateStatusIndicator(STATE.FAILED);
    console.error('[SocketClient] Reconnection failed after max attempts.');
  });

  // ── Server Events ────────────────────────────────────────────────────────
  socket.on('player:identity', (data) => {
    emit('identity', data);
    // Auto-save to localStorage if no identity exists yet
    try {
      const stored = JSON.parse(localStorage.getItem('cheatLabz_player_identity') || 'null');
      if (!stored) {
        localStorage.setItem('cheatLabz_player_identity', JSON.stringify({
          displayName: data.displayName,
          color: data.color,
          created: Date.now(),
          totalGamesPlayed: 0,
          wins: 0,
          losses: 0,
          previousOpponents: [],
        }));
      }
    } catch (e) {}
  });

  socket.on('presence:update', (data) => {
    onlineCount  = data.total || 0;
    inLobbyCount = data.inLobby || 0;
    inGameCount  = data.inGame || 0;
    emit('presence', data);
  });

  socket.on('room:created',  (data) => emit('roomCreated', data));
  socket.on('room:joined',   (data) => emit('roomJoined', data));
  socket.on('room:updated',  (data) => emit('roomUpdate', data.room || data));
  socket.on('room:error',    (data) => emit('roomError', data));
  socket.on('room:countdown',(data) => emit('countdown', data));
  socket.on('room:player-joined', (data) => emit('playerJoined', data));
  socket.on('room:player-left',   (data) => emit('playerLeft', data));

  socket.on('game:start',    (data) => emit('gameStart', data));
  socket.on('game:state',    (data) => emit('gameState', data.state || data));
  socket.on('game:action',   (data) => emit('gameAction', data));
  socket.on('game:ended',    (data) => emit('gameEnded', data));
  socket.on('game:recap',    (data) => emit('gameRecap', data));

  socket.on('matchmaking:found',     (data) => emit('matchFound', data));
  socket.on('matchmaking:searching', (data) => emit('matchSearch', data));

  socket.on('challenge:received', (data) => emit('challengeReceived', data));
}

// ── Public API ───────────────────────────────────────────────────────────────
const SocketClient = {
  // Lifecycle
  init() {
    injectStatusIndicator();

    // Send saved display name if available
    const identity = SocketClient.getSavedIdentity();
    connect();

    // After connect, send saved name to server
    if (identity?.displayName) {
      this.on('identity', () => {
        socket?.emit('player:rename', { name: identity.displayName });
      });
    }
  },

  getSavedIdentity() {
    try {
      return JSON.parse(localStorage.getItem('cheatLabz_player_identity') || 'null');
    } catch { return null; }
  },

  updateSavedIdentity(updates) {
    try {
      const current = SocketClient.getSavedIdentity() || {};
      localStorage.setItem('cheatLabz_player_identity', JSON.stringify({ ...current, ...updates }));
    } catch (e) {}
  },

  // Room Operations
  createRoom(gameId, maxPlayers = 2, settings = {}) {
    socket?.emit('room:create', { gameId, maxPlayers, settings });
  },

  joinRoom(code, displayName) {
    socket?.emit('room:join', { code: code.toUpperCase().trim(), displayName });
  },

  leaveRoom(code) {
    socket?.emit('room:leave', { code });
  },

  markReady(code) {
    socket?.emit('room:ready', { code });
  },

  startGame(code) {
    socket?.emit('room:start', { code });
  },

  updateSettings(code, settings) {
    socket?.emit('room:settings', { code, settings });
  },

  // Game Operations
  sendAction(action, data, code) {
    socket?.emit('game:action', { code, action, data });
  },

  syncState(state, code) {
    socket?.emit('game:state-sync', { code, state });
  },

  endGame(code, results) {
    socket?.emit('game:end', { code, results });
  },

  requestRematch(code) {
    socket?.emit('game:rematch', { code });
  },

  // Matchmaking
  joinMatchmaking(gameId) {
    socket?.emit('matchmaking:join', { gameId });
  },

  cancelMatchmaking() {
    socket?.emit('matchmaking:cancel');
  },

  // Challenges
  sendChallenge(targetSocketId, gameId) {
    socket?.emit('challenge:invite', { targetSocketId, gameId });
  },

  acceptChallenge(fromSocketId, gameId) {
    socket?.emit('challenge:accept', { fromSocketId, gameId });
  },

  declineChallenge(fromSocketId) {
    socket?.emit('challenge:decline', { fromSocketId });
  },

  // Rename
  rename(name) {
    socket?.emit('player:rename', { name });
    SocketClient.updateSavedIdentity({ displayName: name });
  },

  // Presence
  getOnlineCount() { return onlineCount; },
  getInLobbyCount() { return inLobbyCount; },
  getInGameCount() { return inGameCount; },

  // Event Subscription Helpers
  on(event, cb) {
    if (!callbacks[event]) callbacks[event] = [];
    callbacks[event].push(cb);
    return () => SocketClient.off(event, cb);
  },

  off(event, cb) {
    if (callbacks[event]) {
      callbacks[event] = callbacks[event].filter(fn => fn !== cb);
    }
  },

  // Convenience shorthand listeners
  onGameState(cb)     { return SocketClient.on('gameState', cb); },
  onRoomUpdate(cb)    { return SocketClient.on('roomUpdate', cb); },
  onRoomJoined(cb)    { return SocketClient.on('roomJoined', cb); },
  onRoomCreated(cb)   { return SocketClient.on('roomCreated', cb); },
  onRoomError(cb)     { return SocketClient.on('roomError', cb); },
  onPresence(cb)      { return SocketClient.on('presence', cb); },
  onCountdown(cb)     { return SocketClient.on('countdown', cb); },
  onGameStart(cb)     { return SocketClient.on('gameStart', cb); },
  onGameEnded(cb)     { return SocketClient.on('gameEnded', cb); },
  onMatchFound(cb)    { return SocketClient.on('matchFound', cb); },
  onPlayerJoined(cb)  { return SocketClient.on('playerJoined', cb); },
  onPlayerLeft(cb)    { return SocketClient.on('playerLeft', cb); },
  onChallengeReceived(cb) { return SocketClient.on('challengeReceived', cb); },

  // Utilities
  get connected() { return connectionState === STATE.CONNECTED; },
  get socketId() { return socket?.id || null; },
  get state() { return connectionState; },
};

// Auto-init when loaded
window.SocketClient = SocketClient;
SocketClient.init();

export default SocketClient;
