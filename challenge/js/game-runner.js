/**
 * game-runner.js — Post-Lobby Game Loader
 *
 * Listens for game:start → dynamically loads the right game module
 * → injects fullscreen overlay → manages disconnection handling.
 */

import SocketClient from './socket-client.js';

// Map gameId → ES module path
const GAME_MODULES = {
  'rock-paper-scissors': '../games/rps.js',
  'tic-tac-toe':         '../games/tictactoe.js',
  'reflex-duel':         '../games/reflex-duel.js',
  'word-duel':           '../games/word-duel.js',
  'multiplayer-snake':   '../games/snake-arena.js',
};

let activeGame     = null;
let disconnectTimer = null;

// ── Build Game Overlay DOM ────────────────────────────────────────────────────
function buildOverlay(room) {
  // Remove existing overlay if any
  document.getElementById('game-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'game-overlay';
  overlay.className = 'game-overlay';

  const myId   = SocketClient.getMySocketId();
  const me     = room.players.find(p => p.socketId === myId);
  const others = room.players.filter(p => p.socketId !== myId);
  const opp    = others[0]; // primary opponent for HUD

  overlay.innerHTML = `
    <div class="game-hud">
      <div class="hud-players">
        <div class="hud-player">
          <div class="hud-dot" style="background: ${me?.color || '#6c63ff'}"></div>
          <span class="hud-name">${escHtml(me?.displayName || 'You')}</span>
        </div>
        <span class="hud-vs">VS</span>
        <div class="hud-player">
          <div class="hud-dot" style="background: ${opp?.color || '#ff6b6b'}"></div>
          <span class="hud-name">${escHtml(opp?.displayName || 'Opponent')}</span>
        </div>
      </div>
      <div class="hud-scores" id="hud-scores" style="font-family:'Press Start 2P',monospace;font-size:14px;color:#fff;">0 — 0</div>
      <div class="hud-round" id="hud-round">ROUND 1</div>
      <button class="hud-back" id="hud-back-btn" title="Leave game">LEAVE</button>
    </div>

    <div class="game-canvas-wrap" id="game-canvas-wrap">
      <!-- Game canvas injected here by game module -->

      <!-- Disconnect overlay -->
      <div class="disconnect-overlay" id="disconnect-overlay">
        <div class="disconnect-title">OPPONENT DISCONNECTED</div>
        <div class="disconnect-sub">Waiting for reconnection...</div>
        <div class="disconnect-timer" id="disconnect-timer">30</div>
        <div style="display:flex;gap:12px;margin-top:16px;">
          <button class="btn-rematch" id="wait-btn">KEEP WAITING</button>
          <button class="btn-lobby"   id="leave-btn">LEAVE</button>
        </div>
      </div>

      <!-- Result overlay -->
      <div class="game-result-overlay" id="result-overlay">
        <div class="result-title" id="result-title">GAME OVER</div>
        <div class="result-sub"  id="result-sub"></div>
        <div class="result-btns" id="result-btns">
          <button class="btn-rematch" id="rematch-btn">REMATCH</button>
          <button class="btn-lobby"   id="to-lobby-btn">BACK TO LOBBY</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('active'));

  // Leave button
  overlay.querySelector('#hud-back-btn').addEventListener('click', () => {
    if (confirm('Leave the game? This counts as a forfeit.')) exitGame();
  });

  // Leave from disconnect screen
  overlay.querySelector('#leave-btn').addEventListener('click', exitGame);
  overlay.querySelector('#wait-btn').addEventListener('click', () => {
    overlay.querySelector('#disconnect-overlay').classList.remove('active');
    clearDisconnectTimer();
  });

  // Rematch
  overlay.querySelector('#rematch-btn').addEventListener('click', () => {
    SocketClient.emit('room:rematch', { code: room.code });
    overlay.querySelector('#result-overlay').classList.remove('active');
    // Reset game if same room
  });
  overlay.querySelector('#to-lobby-btn').addEventListener('click', exitGame);

  return overlay;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── HUD Helpers ───────────────────────────────────────────────────────────────
export function updateHudScores(myScore, oppScore) {
  const el = document.getElementById('hud-scores');
  if (el) el.textContent = `${myScore} — ${oppScore}`;
}

export function updateHudRound(text) {
  const el = document.getElementById('hud-round');
  if (el) el.textContent = text;
}

export function showResult(outcome, subtitle) {
  const overlay = document.getElementById('result-overlay');
  const title   = document.getElementById('result-title');
  const sub     = document.getElementById('result-sub');
  if (!overlay) return;
  title.textContent = outcome; // 'YOU WIN!', 'YOU LOSE', 'DRAW'
  title.className   = 'result-title ' + (outcome === 'YOU WIN!' ? 'win' : outcome === 'DRAW' ? 'draw' : 'lose');
  sub.textContent   = subtitle || '';
  overlay.classList.add('active');
}

// ── Disconnect Handling ───────────────────────────────────────────────────────
function startDisconnectTimer() {
  let remaining = 30;
  const timerEl = document.getElementById('disconnect-timer');
  const overlay = document.getElementById('disconnect-overlay');
  if (overlay) overlay.classList.add('active');

  disconnectTimer = setInterval(() => {
    remaining--;
    if (timerEl) timerEl.textContent = remaining;
    if (remaining <= 0) {
      clearDisconnectTimer();
      exitGame();
    }
  }, 1000);
}

function clearDisconnectTimer() {
  if (disconnectTimer) {
    clearInterval(disconnectTimer);
    disconnectTimer = null;
  }
  document.getElementById('disconnect-overlay')?.classList.remove('active');
}

// ── Load + Launch Game ────────────────────────────────────────────────────────
async function launchGame(room) {
  const gameId = room.gameId;
  const modulePath = GAME_MODULES[gameId];

  if (!modulePath) {
    console.warn(`[GameRunner] No client module for gameId: ${gameId}`);
    return;
  }

  const overlay = buildOverlay(room);
  const canvasWrap = overlay.querySelector('#game-canvas-wrap');

  try {
    const module = await import(modulePath);
    const GameClass = module.default;
    const canvas = document.createElement('canvas');
    canvasWrap.insertBefore(canvas, canvasWrap.firstChild);

    activeGame = new GameClass(canvas, room, SocketClient.getMySocketId(), SocketClient);
    await activeGame.init();
  } catch (err) {
    console.error('[GameRunner] Failed to load game module:', err);
    overlay.querySelector('#result-title').textContent = 'LOAD ERROR';
    overlay.querySelector('#result-sub').textContent = 'Could not start the game.';
    overlay.querySelector('#result-overlay').classList.add('active');
  }
}

function exitGame() {
  clearDisconnectTimer();
  if (activeGame?.destroy) activeGame.destroy();
  activeGame = null;
  document.getElementById('game-overlay')?.remove();
  // Return to lobby state
  SocketClient.emit('room:sync', {});
}

// ── Socket Event Bindings ─────────────────────────────────────────────────────
export function initGameRunner() {
  SocketClient.on('game:start', ({ room }) => {
    launchGame(room);
  });

  SocketClient.on('player:disconnected', ({ socketId, displayName }) => {
    // Someone in our room disconnected
    const inGame = !!document.getElementById('game-overlay');
    if (!inGame) return;
    startDisconnectTimer();
  });

  SocketClient.on('player:reconnected', ({ socketId }) => {
    clearDisconnectTimer();
  });

  SocketClient.on('game:over', ({ winner, finalScores }) => {
    const myId = SocketClient.getMySocketId();
    if (winner === myId)      showResult('YOU WIN!', 'Congratulations!');
    else if (winner === null) showResult('DRAW', 'Nobody wins this time.');
    else                      showResult('YOU LOSE', 'Better luck next round.');
  });
}
