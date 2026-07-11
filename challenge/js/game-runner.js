/**
 * game-runner.js — Dynamic Canvas Match runner for Multiplayer Challenge Mode
 * 
 * Replaces the legacy MultiplayerContainer with clean DOM injection and
 * decentralized lifecycle execution via GameRunner.
 */

import SocketClient from './socket-client.js';
import { loadGame } from '/js/core/game-loader.js';
import { GameRunner } from '/js/core/game-runner.js';
import { Sound } from '/js/core/sound.js';

let currentRoom = null;
let activeGame = null;
let boundSocketHandlers = {};
let disconnectTimer = null;
let disconnectSeconds = 30;
let reactionCooldown = false;

// UI Overlay Elements
let mountPoint = null;
let hudLayer = null;
let reactionStrip = null;
let disconnectLayer = null;
let roundEndLayer = null;
let gameoverLayer = null;

async function launchGame(room) {
  currentRoom = room;
  const gameId = room.gameId;

  // Clean mount point
  const oldMount = document.getElementById('game-container-mount');
  if (oldMount) oldMount.remove();

  mountPoint = document.createElement('div');
  mountPoint.id = 'game-container-mount';
  mountPoint.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background-color: #060608;
    display: flex; flex-direction: column;
    font-family: 'DM Sans', sans-serif;
  `;
  document.body.appendChild(mountPoint);

  // Load game class
  const loadResult = await loadGame(gameId);
  if (!loadResult.success) {
    console.error('[GameRunner] Failed to load game:', loadResult.error);
    showCustomAlert('Failed to load game: ' + loadResult.error);
    exitGame();
    return;
  }

  const GameClass = loadResult.GameClass;
  const manifest = loadResult.manifest;

  // Build DOM Structure
  buildMultiplayerDOM(manifest);

  const canvas = document.createElement('canvas');
  // Set fallback logical dimensions
  canvas.width = GameClass.logicalWidth || 600;
  canvas.height = GameClass.logicalHeight || 600;
  canvas.style.display = 'block';
  canvas.style.margin = 'auto';
  canvas.style.borderRadius = '8px';
  canvas.style.border = '1px solid rgba(255,255,255,0.08)';
  canvas.style.backgroundColor = '#0e0e11';
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', `${manifest.name || 'Game'} Canvas`);
  canvas.tabIndex = 0;

  const canvasWrapper = mountPoint.querySelector('#canvas-wrapper');
  canvasWrapper.appendChild(canvas);

  try {
    activeGame = new GameClass(canvas, room, SocketClient.socketId, SocketClient);
    
    activeGame.container = {
      updateScore: (score) => {
        updateScore(score);
      },
      updateOpponentScore: (score) => {
        const el = hudLayer?.querySelector('#hud-opp-score');
        if (el) el.textContent = score.toLocaleString();
        const infoEl = document.getElementById('opp-info-score');
        if (infoEl) infoEl.textContent = score.toLocaleString();
      },
      audio: {
        play: (name) => {
          if (name === 'coin') Sound.playCoin();
          else if (name === 'damage' || name === 'hit') Sound.playDamage();
          else if (name === 'gameover') Sound.playGameOver();
          else Sound.playBlip();
        }
      }
    };

    // Wire HUD callbacks if game triggers them
    activeGame.onScoreChange = (score) => {
      updateScore(score);
    };

    GameRunner.start(activeGame, {
      room,
      mySocketId: SocketClient.socketId,
      socket: SocketClient
    });

    setupSocketBindings();
    setupKeyBindings();

    // Notify server ready
    SocketClient.socket?.emit('snake:ready', { code: room.code });
  } catch (err) {
    console.error('[GameRunner] Failed to initialize game:', err);
    showCustomAlert('Failed to start the game.');
    exitGame();
  }
}

function buildMultiplayerDOM(manifest) {
  const myColor = '#6c63ff';
  const oppColor = '#ff6b6b';
  const myNameStr = currentRoom ? currentRoom.players.find(p => p.socketId === SocketClient.socketId)?.displayName || 'You' : 'You';
  const opponent = currentRoom ? currentRoom.players.find(p => p.socketId !== SocketClient.socketId) : null;
  const oppNameStr = opponent?.displayName || 'Opponent';

  // Inject general styles
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    .mp-shell-wrapper {
      display: flex;
      width: 100%;
      height: 100%;
      position: relative;
    }
    .left-column {
      width: 62%;
      background: #0a0a0f;
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      border-right: 1px solid rgba(255,255,255,0.07);
    }
    .right-column {
      width: 38%;
      background: #111118;
      padding: 28px 24px;
      box-sizing: border-box;
      overflow-y: auto;
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 24px;
      height: 100%;
    }
    .mp-hud {
      height: 52px;
      background: rgba(10, 10, 15, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      z-index: 10;
      position: relative;
    }
    .hud-player-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .hud-color-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .hud-name {
      color: #fff;
      font-size: 14px;
      font-weight: bold;
    }
    .hud-score-display {
      font-family: 'JetBrains Mono', monospace;
      font-size: 24px;
      font-weight: bold;
      color: #fff;
    }
    .hud-vs {
      font-family: 'Press Start 2P', monospace;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.35);
    }
    .reaction-strip {
      display: flex;
      gap: 8px;
      justify-content: space-between;
    }
    .reaction-btn {
      flex: 1;
      padding: 8px 0;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 6px;
      cursor: pointer;
      font-size: 18px;
      transition: all 0.2s;
    }
    .reaction-btn:hover {
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.2);
    }
    .reaction-flying-icon {
      position: absolute;
      font-size: 24px;
      pointer-events: none;
      z-index: 9999;
      will-change: transform, opacity;
    }
    .overlay-layer {
      position: absolute;
      inset: 0;
      background: rgba(6, 6, 8, 0.9);
      display: none;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      z-index: 100;
    }
    .overlay-layer.active {
      display: flex;
    }
    .overlay-card {
      background: rgba(20, 20, 28, 0.96);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 32px;
      max-width: 380px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }
    .btn-action {
      background: #6c63ff;
      color: #fff;
      border: none;
      padding: 12px 24px;
      font-family: 'DM Sans', sans-serif;
      font-weight: bold;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      width: 100%;
      margin-top: 16px;
    }
    .btn-action:hover {
      filter: brightness(1.1);
    }
    .btn-secondary {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.8);
      margin-top: 10px;
    }
    .room-code-display {
      display: flex;
      gap: 6px;
    }
    .code-char {
      width: 32px;
      height: 36px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.03);
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      font-weight: bold;
      color: #fff;
    }
    .btn-copy-code {
      padding: 10px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      color: rgba(255,255,255,0.8);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    .btn-copy-code:hover {
      background: rgba(255,255,255,0.1);
      border-color: rgba(255,255,255,0.2);
      color: #fff;
    }
    .control-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 6px;
    }
    .key-cap {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      color: #fff;
      box-shadow: 0 1px 0 rgba(255,255,255,0.2);
    }
    .chevron-arrow {
      width: 10px;
      height: 10px;
      stroke: rgba(255,255,255,0.2);
      stroke-width: 2;
      fill: none;
    }
    .control-action {
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.7);
    }
  `;
  mountPoint.appendChild(styleEl);

  const shell = document.createElement('div');
  shell.className = 'mp-shell-wrapper';
  shell.innerHTML = `
    <!-- Left Column (62%) -->
    <div class="left-column">
      <!-- HUD Top -->
      <div class="mp-hud">
        <div class="hud-player-info">
          <button id="hud-leave-btn" style="padding: 6px 12px; font-family:'DM Sans',sans-serif; font-size:11px; font-weight:bold; color:rgba(255,255,255,0.6); background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:4px; cursor:pointer; transition: all 0.2s;">LEAVE</button>
          <div id="my-timer-mount" style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;"></div>
          <div class="hud-color-dot" style="background: ${myColor};"></div>
          <span class="hud-name">${myNameStr}</span>
          <span id="hud-my-dots" style="color: ${myColor}; font-size: 13px; margin-left: 6px;"></span>
        </div>
        <div style="display:flex; align-items:center; gap:20px;">
          <span class="hud-score-display" id="hud-my-score" style="color: ${myColor};">0</span>
          <span class="hud-vs">VS</span>
          <span class="hud-score-display" id="hud-opp-score" style="color: ${oppColor};">0</span>
        </div>
      </div>


      <!-- Canvas Wrapper -->
      <div id="canvas-wrapper" style="flex: 1; display: flex; align-items: center; justify-content: center; position: relative; padding: 16px;">
        <!-- Canvas will be appended dynamically -->
      </div>

      <!-- HUD Bottom Hint -->
      <div class="hud-bottom" style="height: 40px; background: rgba(10, 10, 15, 0.8); border-top: 1px solid rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center; font-size: 11px; color: rgba(255,255,255,0.4);">
        Use 1, 2, 3, 4 keys to trigger reactions!
      </div>
    </div>

    <!-- Right Column (38%) -->
    <div class="right-column">
      <!-- Game Identity -->
      <div class="block-1" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 4px;">MULTIPLAYER ARENA</div>
        <div style="font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 6px;">${manifest.name}</div>
        <div style="font-size: 13px; color: rgba(255,255,255,0.6);">${manifest.description}</div>
      </div>

      <!-- Room Code Section -->
      <div class="block-2" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 10px;">ROOM CODE</div>
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="room-code-display">
            ${Array.from(currentRoom?.code || '------').map(char => `
              <div class="code-char">${char}</div>
            `).join('')}
          </div>
          <button class="btn-copy-code" id="btn-copy-code" title="Copy Code">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
        </div>
      </div>

      <!-- Opponent Status & Info -->
      <div class="block-3" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 12px;">OPPONENT INFO</div>
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div id="opp-timer-mount" style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;"></div>
              <span style="font-size: 14px; font-weight: bold; color: #fff;">${oppNameStr}</span>
            </div>
            <div id="opp-connection-status" style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #00d4aa;">
              <div id="opp-status-dot" style="width: 8px; height: 8px; border-radius: 50%; background: #00d4aa; transition: background 0.3s;"></div>
              <span id="opp-status-text">Connected</span>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,0.6);">
            <span>Score</span>
            <span style="font-family: 'JetBrains Mono', monospace; font-weight: bold; color: ${oppColor};" id="opp-info-score">0</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: rgba(255,255,255,0.6);">
            <span>Rounds Win Tracker</span>
            <span id="hud-opp-dots" style="color: ${oppColor}; font-size: 13px;"></span>
          </div>
        </div>
      </div>

      <!-- Controls Panel -->
      <div class="block-4" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 10px;">HOW TO PLAY</div>
        <div id="controls-list-container" style="display: flex; flex-direction: column; gap: 8px;">
          <!-- Populated from manifest controls -->
        </div>
      </div>

      <!-- Reactions Emotes Panel -->
      <div class="block-5" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 16px;">
        <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 10px;">EXPRESS EMOTE</div>
        <div class="reaction-strip">
          <button class="reaction-btn" data-index="0">😤</button>
          <button class="reaction-btn" data-index="1">👏</button>
          <button class="reaction-btn" data-index="2">😂</button>
          <button class="reaction-btn" data-index="3">🤔</button>
        </div>
      </div>
    </div>
  `;
  mountPoint.appendChild(shell);

  // Bind HUD Layer references for runner updates
  hudLayer = shell.querySelector('.left-column');
  reactionStrip = shell.querySelector('.right-column');

  shell.querySelector('#hud-leave-btn').addEventListener('click', () => {
    showCustomConfirm('Leave the game? This counts as a forfeit.', () => {
      exitGame();
    });
  });

  // Bind copy button
  const copyBtn = shell.querySelector('#btn-copy-code');
  if (copyBtn && currentRoom) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(currentRoom.code).then(() => {
        const svg = copyBtn.innerHTML;
        copyBtn.innerHTML = `<span style="font-size:10px; font-weight:bold; color:#00d4aa;">COPIED!</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = svg;
        }, 1500);
      });
    });
  }

  // Populate controls
  const controlsContainer = shell.querySelector('#controls-list-container');
  if (controlsContainer) {
    const controls = manifest.controls || [
      { key: 'WASD / ARROWS', action: 'Move' },
      { key: 'SPACE', action: 'Action' }
    ];
    controlsContainer.innerHTML = controls.map(c => `
      <div class="control-row">
        <span class="key-cap">${c.key}</span>
        <svg class="chevron-arrow" viewBox="0 0 10 10">
          <polyline points="3,2 6,5 3,8"></polyline>
        </svg>
        <span class="control-action">${c.action}</span>
      </div>
    `).join('');
  }

  // Bind Reactions
  reactionStrip.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index, 10);
      triggerReaction(idx);
    });
  });

  // 4. Overlays (Disconnect, Round End, GameOver)
  disconnectLayer = document.createElement('div');
  disconnectLayer.className = 'overlay-layer';
  disconnectLayer.innerHTML = `
    <div class="overlay-card">
      <div style="font-family:'Press Start 2P',monospace; font-size:14px; color:#ef4444; margin-bottom:12px;">OPPONENT DISCONNECTED</div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:13px; color:rgba(255,255,255,0.6); margin-bottom: 24px;" id="dc-timer-text">Waiting for reconnection... [30]</div>
      <button class="btn-action" id="dc-wait-btn">WAIT</button>
      <button class="btn-action btn-secondary" id="dc-claim-btn" disabled style="opacity: 0.5; cursor: not-allowed;">CLAIM VICTORY</button>
    </div>
  `;
  mountPoint.appendChild(disconnectLayer);
  disconnectLayer.querySelector('#dc-wait-btn').addEventListener('click', () => {
    disconnectLayer.classList.remove('active');
  });
  disconnectLayer.querySelector('#dc-claim-btn').addEventListener('click', () => {
    SocketClient.socket?.emit('game:claim-victory');
  });

  roundEndLayer = document.createElement('div');
  roundEndLayer.className = 'overlay-layer';
  roundEndLayer.innerHTML = `
    <div class="overlay-card">
      <h2 style="font-family:'Press Start 2P',monospace; font-size:16px; margin-bottom:20px; color:#fff;" id="re-title">ROUND COMPLETE</h2>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px;">
        <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px;">
          <div style="font-size:11px; color:rgba(255,255,255,0.4);">YOU</div>
          <div style="font-family:'JetBrains Mono',monospace; font-size:28px; font-weight:bold; color:${myColor};" id="re-my-score">0</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px;">
          <div style="font-size:11px; color:rgba(255,255,255,0.4);">${oppNameStr.toUpperCase()}</div>
          <div style="font-family:'JetBrains Mono',monospace; font-size:28px; font-weight:bold; color:${oppColor};" id="re-opp-score">0</div>
        </div>
      </div>
      <div style="font-family:'Press Start 2P',monospace; font-size:10px; margin-bottom:20px;" id="re-winner-text"></div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:13px; color:rgba(255,255,255,0.5); margin-bottom:24px;" id="re-series-score">Series: 0 - 0</div>
      <div style="font-family:'Press Start 2P',monospace; font-size:9px; color:#00d4aa;" id="re-countdown">NEXT ROUND IN 3...</div>
    </div>
  `;
  mountPoint.appendChild(roundEndLayer);

  gameoverLayer = document.createElement('div');
  gameoverLayer.className = 'overlay-layer';
  gameoverLayer.innerHTML = `
    <div class="overlay-card">
      <h2 style="font-family:'Press Start 2P',monospace; font-size:18px; margin-bottom:24px; color:#fff;" class="go-title">MATCH OVER</h2>
      <div id="go-breakdown-container"></div>
      <button class="btn-action" id="go-retry-btn">REMATCH</button>
      <button class="btn-action btn-secondary" id="go-exit-btn">BACK TO LOBBY</button>
    </div>
  `;
  mountPoint.appendChild(gameoverLayer);
  gameoverLayer.querySelector('#go-exit-btn').addEventListener('click', exitGame);
}

function updateScore(scoreVal) {
  const el = hudLayer?.querySelector('#hud-my-score');
  if (el) el.textContent = scoreVal.toLocaleString();
}

function setupSocketBindings() {
  const socket = SocketClient.socket;
  if (!socket) return;

  const onUpdate = ({ room }) => {
    currentRoom = room;
    if (activeGame) activeGame.room = room;
    updateOpponentHUD();
  };

  const onAction = ({ socketId, action, data }) => {
    if (activeGame && typeof activeGame.onSocketMessage === 'function') {
      activeGame.onSocketMessage(action, data);
    }
  };

  const onDisconnect = ({ socketId }) => {
    const opp = currentRoom?.players.find(p => p.socketId !== SocketClient.socketId);
    if (opp && socketId === opp.socketId) {
      handleOpponentDisconnect();
    }
  };

  const onReconnect = ({ socketId }) => {
    const opp = currentRoom?.players.find(p => p.socketId !== SocketClient.socketId);
    if (opp && socketId === opp.socketId) {
      handleOpponentReconnect();
    }
  };

  const onGameOver = ({ winner, finalScores }) => {
    handleMatchOver(winner, finalScores);
  };

  const onRoundEnd = ({ roundWinner, scores, nextRound, seriesScore }) => {
    handleRoundEnd(roundWinner, scores, nextRound, seriesScore);
  };

  const onReaction = ({ senderId, index }) => {
    animateOpponentReaction(index);
  };

  // Track bindings to turn them off later
  socket.on('room:update', onUpdate);
  socket.on('game:action', onAction);
  socket.on('player:disconnected', onDisconnect);
  socket.on('player:reconnected', onReconnect);
  socket.on('game:over', onGameOver);
  socket.on('game:round-end', onRoundEnd);
  socket.on('game:reaction', onReaction);

  boundSocketHandlers = {
    'room:update': onUpdate,
    'game:action': onAction,
    'player:disconnected': onDisconnect,
    'player:reconnected': onReconnect,
    'game:over': onGameOver,
    'game:round-end': onRoundEnd,
    'game:reaction': onReaction
  };
}

function teardownSocketBindings() {
  const socket = SocketClient.socket;
  if (!socket) return;

  for (const [event, handler] of Object.entries(boundSocketHandlers)) {
    socket.off(event, handler);
  }
  boundSocketHandlers = {};
}

function setupKeyBindings() {
  const handleKey = (e) => {
    if (['1', '2', '3', '4'].includes(e.key) && GameRunner.isRunning) {
      e.preventDefault();
      const idx = parseInt(e.key, 10) - 1;
      triggerReaction(idx);
    }
  };
  document.addEventListener('keydown', handleKey);
  boundSocketHandlers._keyHandler = handleKey;
}

function teardownKeyBindings() {
  if (boundSocketHandlers._keyHandler) {
    document.removeEventListener('keydown', boundSocketHandlers._keyHandler);
  }
}

function updateOpponentHUD() {
  if (!currentRoom) return;

  const maxRounds = currentRoom.settings?.maxRounds || 3;
  const targetWins = Math.ceil(maxRounds / 2);
  const myDotsEl = hudLayer?.querySelector('#hud-my-dots');
  const oppDotsEl = document.getElementById('hud-opp-dots');

  // We can track round wins in currentRoom or series score.
  const opponent = currentRoom.players.find(p => p.socketId !== SocketClient.socketId);
  const myScore = activeGame?.roundWins?.me || 0;
  const oppScore = activeGame?.roundWins?.opponent || 0;

  if (myDotsEl) {
    myDotsEl.textContent = '●'.repeat(myScore) + '○'.repeat(Math.max(0, targetWins - myScore));
  }
  if (oppDotsEl) {
    oppDotsEl.textContent = '○'.repeat(Math.max(0, targetWins - oppScore)) + '●'.repeat(oppScore);
  }

  // Update Score in top HUD and side panel
  const oppScoreEl = hudLayer?.querySelector('#hud-opp-score');
  if (oppScoreEl) oppScoreEl.textContent = oppScore.toLocaleString();
  
  const oppInfoScoreEl = document.getElementById('opp-info-score');
  if (oppInfoScoreEl) oppInfoScoreEl.textContent = oppScore.toLocaleString();

  // Update opponent connection status in side panel
  const statusDot = document.getElementById('opp-status-dot');
  const statusText = document.getElementById('opp-status-text');
  const statusWrap = document.getElementById('opp-connection-status');
  if (opponent && statusDot && statusText) {
    const isConn = opponent.connected !== false;
    statusDot.style.background = isConn ? '#00d4aa' : '#ffd93d';
    statusText.textContent = isConn ? 'Connected' : 'Reconnecting...';
    if (statusWrap) statusWrap.style.color = isConn ? '#00d4aa' : '#ffd93d';
  }
}

function triggerReaction(index) {
  if (reactionCooldown) return;
  reactionCooldown = true;
  setTimeout(() => { reactionCooldown = false; }, 2000);

  SocketClient.socket?.emit('game:reaction', { index });
  animateMyReaction(index);
}

function animateMyReaction(index) {
  const emojis = ['😤', '👏', '😂', '🤔'];
  const el = document.createElement('span');
  el.className = 'reaction-flying-icon';
  el.textContent = emojis[index];
  el.style.left = '48px';
  el.style.top = '70px';
  mountPoint.appendChild(el);

  let pos = 48;
  let opacity = 1.0;
  const anim = () => {
    pos += 8;
    opacity -= 0.02;
    el.style.transform = `translateX(${pos}px)`;
    el.style.opacity = opacity;
    if (opacity > 0) {
      requestAnimationFrame(anim);
    } else {
      el.remove();
    }
  };
  requestAnimationFrame(anim);
}

function animateOpponentReaction(index) {
  const emojis = ['😤', '👏', '😂', '🤔'];
  const el = document.createElement('span');
  el.className = 'reaction-flying-icon';
  el.textContent = emojis[index];
  el.style.right = '48px';
  el.style.top = '70px';
  mountPoint.appendChild(el);

  let pos = 48;
  let opacity = 1.0;
  const anim = () => {
    pos += 8;
    opacity -= 0.02;
    el.style.transform = `translateX(-${pos}px)`;
    el.style.opacity = opacity;
    if (opacity > 0) {
      requestAnimationFrame(anim);
    } else {
      el.remove();
    }
  };
  requestAnimationFrame(anim);
}

function handleOpponentDisconnect() {
  disconnectSeconds = 30;
  disconnectLayer.classList.add('active');

  const timerText = disconnectLayer.querySelector('#dc-timer-text');
  const claimBtn = disconnectLayer.querySelector('#dc-claim-btn');

  if (timerText) timerText.textContent = `Waiting for reconnection... [${disconnectSeconds}]`;
  if (claimBtn) {
    claimBtn.disabled = true;
    claimBtn.style.opacity = '0.5';
    claimBtn.style.cursor = 'not-allowed';
  }

  if (activeGame && typeof activeGame.onOpponentDisconnect === 'function') {
    activeGame.onOpponentDisconnect();
  }

  if (disconnectTimer) clearInterval(disconnectTimer);
  disconnectTimer = setInterval(() => {
    disconnectSeconds--;
    if (timerText) timerText.textContent = `Waiting for reconnection... [${disconnectSeconds}]`;

    if (disconnectSeconds <= 20 && claimBtn) {
      claimBtn.disabled = false;
      claimBtn.style.opacity = '1';
      claimBtn.style.cursor = 'pointer';
    }

    if (disconnectSeconds <= 0) {
      clearInterval(disconnectTimer);
      SocketClient.socket?.emit('game:claim-victory');
    }
  }, 1000);
}

function handleOpponentReconnect() {
  if (disconnectTimer) {
    clearInterval(disconnectTimer);
    disconnectTimer = null;
  }
  disconnectLayer.classList.remove('active');
}

function handleRoundEnd(roundWinner, scores, nextRound, seriesScore) {
  GameRunner.stop(); // Temporarily pause loop

  const reMyScore = roundEndLayer.querySelector('#re-my-score');
  const reOppScore = roundEndLayer.querySelector('#re-opp-score');
  const reWinner = roundEndLayer.querySelector('#re-winner-text');
  const reSeries = roundEndLayer.querySelector('#re-series-score');
  const reCountdown = roundEndLayer.querySelector('#re-countdown');

  const opponent = currentRoom?.players.find(p => p.socketId !== SocketClient.socketId);
  const oppNameStr = opponent?.displayName || 'Opponent';

  if (reMyScore) reMyScore.textContent = scores[SocketClient.socketId] || 0;
  if (reOppScore) {
    const oppScore = Object.entries(scores).find(([sid]) => sid !== SocketClient.socketId)?.[1] || 0;
    reOppScore.textContent = oppScore;
  }

  const winnerName = roundWinner === SocketClient.socketId ? 'YOU' : oppNameStr;
  if (reWinner) {
    reWinner.textContent = `${winnerName.toUpperCase()} WINS THE ROUND!`;
    reWinner.style.color = roundWinner === SocketClient.socketId ? '#6c63ff' : '#ff6b6b';
  }

  // Update dots or scores locally
  if (activeGame) {
    if (!activeGame.roundWins) activeGame.roundWins = { me: 0, opponent: 0 };
    if (roundWinner === SocketClient.socketId) {
      activeGame.roundWins.me++;
    } else {
      activeGame.roundWins.opponent++;
    }
  }

  updateOpponentHUD();

  if (reSeries) reSeries.textContent = `Series: ${activeGame?.roundWins?.me || 0} - ${activeGame?.roundWins?.opponent || 0}`;

  roundEndLayer.classList.add('active');

  let countdown = 3;
  if (reCountdown) reCountdown.textContent = `NEXT ROUND IN ${countdown}...`;

  const interval = setInterval(() => {
    countdown--;
    if (reCountdown) reCountdown.textContent = `NEXT ROUND IN ${countdown}...`;
    if (countdown <= 0) {
      clearInterval(interval);
      roundEndLayer.classList.remove('active');
      
      // Re-init game for next round
      if (activeGame && typeof activeGame.init === 'function') {
        activeGame.init(activeGame.canvas, { room: currentRoom, mySocketId: SocketClient.socketId, socket: SocketClient });
      }
      GameRunner.start(activeGame, { room: currentRoom, mySocketId: SocketClient.socketId, socket: SocketClient });
    }
  }, 1000);
}

function handleMatchOver(winner, finalScores) {
  GameRunner.stop();
  Sound.playGameOver();

  const didIWin = winner === SocketClient.socketId;
  const goTitle = gameoverLayer.querySelector('.go-title');
  if (goTitle) {
    goTitle.textContent = didIWin ? 'MATCH VICTORY!' : 'MATCH DEFEAT';
    goTitle.style.color = didIWin ? '#00d4aa' : '#ef4444';
  }

  const myWins = activeGame?.roundWins?.me || 0;
  const oppWins = activeGame?.roundWins?.opponent || 0;

  const opponent = currentRoom?.players.find(p => p.socketId !== SocketClient.socketId);
  const oppNameStr = opponent?.displayName || 'Opponent';

  const container = gameoverLayer.querySelector('#go-breakdown-container');
  if (container) {
    container.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:24px; text-align:center;">
        <div style="background:rgba(255,255,255,0.02); padding:16px; border-radius:8px; border:1px solid rgba(255,255,255,0.04);">
          <div style="font-size:10px; color:rgba(255,255,255,0.4); margin-bottom:6px;">YOU</div>
          <div style="font-size:32px; font-weight:bold; color:#6c63ff">${myWins}</div>
        </div>
        <div style="background:rgba(255,255,255,0.02); padding:16px; border-radius:8px; border:1px solid rgba(255,255,255,0.04);">
          <div style="font-size:10px; color:rgba(255,255,255,0.4); margin-bottom:6px;">${oppNameStr.toUpperCase()}</div>
          <div style="font-size:32px; font-weight:bold; color:#ff6b6b">${oppWins}</div>
        </div>
      </div>
    `;
  }

  const retryBtn = gameoverLayer.querySelector('#go-retry-btn');
  if (retryBtn) {
    retryBtn.replaceWith(retryBtn.cloneNode(true));
    const newRetryBtn = gameoverLayer.querySelector('#go-retry-btn');
    newRetryBtn.addEventListener('click', () => {
      SocketClient.requestRematch(currentRoom.code);
      newRetryBtn.disabled = true;
      newRetryBtn.textContent = 'WAITING FOR OPPONENT...';
    });
  }

  gameoverLayer.classList.add('active');
}

function exitGame() {
  teardownSocketBindings();
  teardownKeyBindings();

  if (activeGame) {
    GameRunner.stop();
    activeGame = null;
  }

  if (disconnectTimer) {
    clearInterval(disconnectTimer);
    disconnectTimer = null;
  }

  document.getElementById('game-container-mount')?.remove();

  // Return to lobby sync state
  SocketClient.socket?.emit('room:sync', {});
}

export function initGameRunner() {
  SocketClient.onGameStart(({ room }) => {
    launchGame(room);
  });
}

function showCustomConfirm(message, onConfirm) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif;
  `;
  overlay.innerHTML = `
    <div style="background: #16161f; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 28px; width: 320px; text-align: center; color: #fff;">
      <h3 style="font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">Confirm Action</h3>
      <p style="font-size: 14px; color: rgba(240,240,248,0.55); margin: 0 0 24px 0; line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="confirm-yes" style="flex: 1; padding: 10px; background: #6c63ff; border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer;">CONFIRM</button>
        <button id="confirm-no" style="flex: 1; padding: 10px; background: transparent; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; color: #fff; cursor: pointer;">CANCEL</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const cleanUp = () => overlay.remove();
  overlay.querySelector('#confirm-yes').onclick = () => {
    cleanUp();
    onConfirm();
  };
  overlay.querySelector('#confirm-no').onclick = cleanUp;
  overlay.onclick = (e) => { if (e.target === overlay) cleanUp(); };
}

function showCustomAlert(message) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    font-family: 'DM Sans', sans-serif;
  `;
  overlay.innerHTML = `
    <div style="background: #16161f; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 28px; width: 320px; text-align: center; color: #fff;">
      <h3 style="font-size: 16px; margin: 0 0 12px 0; font-weight: 600;">Alert</h3>
      <p style="font-size: 14px; color: rgba(240,240,248,0.55); margin: 0 0 24px 0; line-height: 1.5;">${message}</p>
      <button id="alert-close" style="width: 100%; padding: 10px; background: #6c63ff; border: none; border-radius: 8px; color: #fff; font-weight: 600; cursor: pointer;">OK</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const cleanUp = () => overlay.remove();
  overlay.querySelector('#alert-close').onclick = cleanUp;
  overlay.onclick = (e) => { if (e.target === overlay) cleanUp(); };
}
