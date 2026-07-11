/**
 * js/ui/game-modal.js
 * Rebuilds the authoritative two-column Game Modal UI and overlays.
 */

import { loadGame } from '../core/game-loader.js';
import { Runner } from '../core/runner.js';
import { Input } from '../core/input.js';
import { GAMES } from '../core/game-manifest.js';
import { Storage } from '../core/storage.js';
import { GAME_ICONS } from '../../assets/icons/game-icons.js';

let activeGameInstance = null;
let currentActiveGameId = null;
let currentSelectedLevel = 1;
let gameTimeStart = 0;

const LEVEL_DESCRIPTIONS = [
  "Get a feel for the mechanics. Mistakes are forgiven.",
  "Slightly faster pace. Focus on fundamentals.",
  "Introduction of moving obstacles. Stay alert.",
  "Speed increases. Reaction time is key.",
  "Midway point. Precision is now required.",
  "Complex patterns emerge. Memorize safe zones.",
  "No room for hesitation. Move with purpose.",
  "Elite speed. One mistake costs a life.",
  "Brutal gauntlet. Only the best survive.",
  "The ultimate test. Flawless execution required."
];

function getGameIcon(gameId) {
  return GAME_ICONS[gameId] || GAME_ICONS['default'] || '🎮';
}

function getRecord(gameId) {
  const saved = Storage.get(gameId, null);
  if (saved && typeof saved === 'object') {
    return saved;
  }
  if (typeof saved === 'number') {
    return { score: saved, runs: 1, history: [saved], highestLevel: 1 };
  }
  return { score: 0, runs: 0, history: [], highestLevel: 1 };
}

function saveStats(gameId, score, level) {
  const record = getRecord(gameId);
  record.runs++;
  record.score = Math.max(record.score, score);
  record.highestLevel = Math.max(record.highestLevel, level);
  record.history.push(score);
  Storage.set(gameId, record);
}

function injectStyles(accent) {
  let styleEl = document.getElementById('game-modal-custom-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'game-modal-custom-styles';
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
    .game-modal-shell {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      background-color: #060608;
      transform: translateY(100%);
      transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .game-modal-shell.active {
      transform: translateY(0);
    }
    .left-column {
      width: 62%;
      background: #0a0a0f;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .left-column canvas {
      display: block;
      background: transparent;
      outline: none;
    }
    .right-column {
      width: 38%;
      background: #111118;
      border-left: 1px solid rgba(255, 255, 255, 0.07);
      padding: 28px 24px;
      box-sizing: border-box;
      overflow-y: auto;
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .right-column::-webkit-scrollbar {
      width: 4px;
    }
    .right-column::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
    }
    .right-column::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.25);
    }

    /* HUD overlays */
    .hud-top {
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 48px;
      background: linear-gradient(#000000cc, transparent);
      z-index: 10;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 20px;
    }
    .hud-top .hud-level {
      position: absolute;
      left: 20px;
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.4);
    }
    .hud-top .hud-score {
      font-family: 'JetBrains Mono', monospace;
      font-size: 18px;
      color: #fff;
    }
    .hud-bottom {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 36px;
      background: linear-gradient(transparent, #000000cc);
      z-index: 10;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
    }
    .hud-bottom .hud-lives {
      display: flex;
      gap: 6px;
    }
    .hud-bottom .hud-lives .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      border: 1.5px solid rgba(255, 255, 255, 0.5);
      background: transparent;
      box-sizing: border-box;
    }
    .hud-bottom .hud-lives .dot.filled {
      background: #fff;
      border-color: #fff;
    }
    .hud-bottom .hud-pause-hint {
      font-family: 'DM Sans', sans-serif;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.25);
    }

    /* Right Panel elements */
    .close-btn {
      position: absolute;
      top: 20px;
      right: 20px;
      background: transparent;
      border: none;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 200ms;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      z-index: 20;
    }
    .close-btn:hover {
      opacity: 0.9;
    }
    .close-btn svg {
      width: 16px;
      height: 16px;
      stroke: #fff;
      stroke-width: 2;
    }

    /* Blocks */
    .block-title {
      font-family: 'DM Sans', sans-serif;
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255, 255, 255, 0.35);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .block-title::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255, 255, 255, 0.08);
    }

    /* Block 1 Identity */
    .identity-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .identity-icon {
      font-size: 36px;
      line-height: 1;
      color: ${accent};
    }
    .identity-names {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .identity-name {
      font-family: 'DM Sans', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: #fff;
    }
    .identity-category {
      font-family: 'DM Sans', sans-serif;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      color: ${accent};
    }
    .identity-desc {
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      color: rgba(255, 255, 255, 0.55);
      line-height: 1.65;
      margin-top: 10px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    /* Block 2 Record */
    .record-row {
      display: flex;
      width: 100%;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      padding: 12px 0;
    }
    .record-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      border-right: 1px solid rgba(255, 255, 255, 0.07);
    }
    .record-item:last-child {
      border-right: none;
    }
    .record-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 9px;
      color: rgba(255, 255, 255, 0.35);
      letter-spacing: 0.1em;
    }
    .record-val {
      font-family: 'DM Sans', sans-serif;
      font-size: 17px;
      font-weight: 600;
      color: #fff;
    }

    /* Block 3 Level Selector */
    .level-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .level-btn {
      width: 44px;
      height: 44px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.07);
      background: rgba(255, 255, 255, 0.03);
      color: rgba(255, 255, 255, 0.25);
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 120ms ease;
    }
    .level-btn.played {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.65);
    }
    .level-btn.played::after {
      content: '';
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
    }
    .level-btn.cleared {
      background: rgba(var(--accent-rgb, 0, 212, 170), 0.1);
      border: 1px solid rgba(var(--accent-rgb, 0, 212, 170), 0.25);
      color: ${accent};
    }
    .level-btn.cleared .checkmark {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 8px;
      height: 8px;
      fill: none;
      stroke: ${accent};
      stroke-width: 2.5;
    }
    .level-btn.selected {
      background: rgba(var(--accent-rgb, 0, 212, 170), 0.18);
      border: 2px solid ${accent};
      color: #fff;
      transform: scale(1.06);
    }
    .level-desc-text {
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      font-style: italic;
      color: rgba(255, 255, 255, 0.45);
      line-height: 1.5;
      min-height: 36px;
      transition: opacity 120ms ease;
    }

    /* Block 4 How to Play */
    .controls-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .control-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .key-cap {
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-bottom: 2px solid rgba(255, 255, 255, 0.18);
      border-radius: 4px;
      min-width: 28px;
      height: 24px;
      padding: 2px 6px;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #fff;
    }
    .chevron-arrow {
      width: 8px;
      height: 8px;
      fill: none;
      stroke: rgba(255, 255, 255, 0.3);
      stroke-width: 2.5;
    }
    .control-action {
      font-family: 'DM Sans', sans-serif;
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
    }

    /* Block 5 Start Button */
    .start-btn {
      width: 100%;
      height: 50px;
      border-radius: 8px;
      background: ${accent};
      color: #fff;
      border: none;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: brightness 150ms ease, transform 80ms ease;
    }
    .start-btn:hover {
      brightness: 1.08; /* brightness handled via filter */
      filter: brightness(108%);
    }
    .start-btn:active {
      transform: scale(0.97);
    }
    .start-btn.running {
      opacity: 0.6;
      pointer-events: none;
      cursor: not-allowed;
    }

    /* Overlays */
    .overlay-card {
      width: 300px;
      background: rgba(10, 10, 15, 0.94);
      backdrop-filter: blur(16px) saturate(150%);
      -webkit-backdrop-filter: blur(16px) saturate(150%);
      border: 1px solid rgba(255, 255, 255, 0.09);
      border-radius: 12px;
      padding: 28px 24px;
      box-sizing: border-box;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.88);
      opacity: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      transition: all 240ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .overlay-card.active {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    .overlay-title {
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: rgba(255, 255, 255, 0.4);
      margin-bottom: 8px;
    }
    .overlay-val {
      font-family: 'DM Sans', sans-serif;
      font-size: 36px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }
    .overlay-score {
      font-family: 'JetBrains Mono', monospace;
      font-size: 20px;
      color: ${accent};
      margin-bottom: 20px;
    }
    .overlay-line {
      width: 100%;
      height: 1px;
      background: rgba(255, 255, 255, 0.07);
      margin: 16px 0;
    }
    .overlay-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'DM Sans', sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: ${accent};
      margin-top: 8px;
    }
    .overlay-badge::before {
      content: '';
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: ${accent};
    }
    .overlay-btn {
      width: 100%;
      height: 44px;
      border-radius: 8px;
      background: ${accent};
      color: #fff;
      border: none;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .overlay-row-btns {
      display: flex;
      gap: 12px;
      width: 100%;
    }
    .overlay-btn-retry {
      flex: 1;
      height: 42px;
      border-radius: 7px;
      background: ${accent};
      color: #fff;
      border: none;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .overlay-btn-levels {
      flex: 1;
      height: 42px;
      border-radius: 7px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      font-family: 'DM Sans', sans-serif;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
  `;
}

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 212, 170';
}

export function launchGameModal(gameId) {
  currentActiveGameId = gameId;
  const game = GAMES.find(g => g.id === gameId);
  if (!game) return;

  const accent = game.accentColor || '#00d4aa';
  const rgb = hexToRgb(accent);
  document.documentElement.style.setProperty('--accent-rgb', rgb);

  injectStyles(accent);

  let modal = document.getElementById('game-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'game-modal';
    document.body.appendChild(modal);
  }
  
  modal.className = 'game-modal-shell';
  modal.innerHTML = `
    <!-- Left Column (62%) -->
    <div class="left-column">
      <!-- HUD Top -->
      <div class="hud-top">
        <div class="hud-level" id="hud-level-label">LEVEL 1</div>
        <div class="hud-score" id="hud-score-label">0</div>
      </div>

      <!-- Canvas Wrapper -->
      <div id="canvas-container" style="position:relative;">
        <canvas id="game-canvas"></canvas>
      </div>

      <!-- HUD Bottom -->
      <div class="hud-bottom">
        <div class="hud-lives" id="hud-lives-container">
          <div class="dot filled"></div>
          <div class="dot filled"></div>
          <div class="dot filled"></div>
        </div>
        <div class="hud-pause-hint">P to pause</div>
      </div>

      <!-- Overlays Container -->
      <div id="overlay-mount" style="position:absolute; inset:0; pointer-events:none; z-index:40;"></div>
    </div>

    <!-- Right Column (38%) -->
    <div class="right-column">
      <!-- Close Button -->
      <button class="close-btn" id="modal-close-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <!-- BLOCK 1: Game Identity -->
      <div class="block-1">
        <div class="identity-row">
          <div class="identity-icon">${getGameIcon(gameId)}</div>
          <div class="identity-names">
            <div class="identity-name">${game.name}</div>
            <div class="identity-category">${game.category || 'ARCADE'}</div>
          </div>
        </div>
        <div class="identity-desc">${game.description || ''}</div>
      </div>

      <!-- BLOCK 2: Your Record -->
      <div class="block-2">
        <div class="block-title">Your Record</div>
        <div class="record-row" id="record-row-container">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- BLOCK 3: Level Selector -->
      <div class="block-3">
        <div class="block-title">Select Level</div>
        <div class="level-grid" id="level-buttons-grid">
          <!-- 10 level buttons -->
        </div>
        <div class="level-desc-text" id="level-desc-box">
          Select a level to view its criteria.
        </div>
      </div>

      <!-- BLOCK 4: Controls Diagram -->
      <div class="block-4">
        <div class="block-title">How To Play</div>
        <div class="controls-list" id="controls-list-container">
          <!-- Populated from game config controls -->
        </div>
      </div>

      <!-- BLOCK 5: Start Button -->
      <div class="block-5">
        <button class="start-btn" id="game-start-btn">START — LEVEL 1</button>
      </div>
    </div>
  `;

  // Bind close buttons
  modal.querySelector('#modal-close-btn').addEventListener('click', closeGameModal);

  // Set selected level
  const record = getRecord(gameId);
  currentSelectedLevel = record.highestLevel || 1;

  // Build blocks
  renderRecordBlock(gameId);
  renderLevelGrid(gameId);
  renderControlsBlock(game);
  updateStartButtonText();

  // Slide modal up
  requestAnimationFrame(() => {
    modal.classList.add('active');
  });

  // Bind start button
  modal.querySelector('#game-start-btn').addEventListener('click', () => {
    startGame(gameId, currentSelectedLevel);
  });

  setupModalEvents();
}

function updateStartButtonText() {
  const btn = document.getElementById('game-start-btn');
  if (btn) {
    btn.innerText = `START — LEVEL ${currentSelectedLevel}`;
  }
}

function renderRecordBlock(gameId) {
  const record = getRecord(gameId);
  const container = document.getElementById('record-row-container');
  if (!container) return;

  const bestVal = record.score > 0 ? record.score : '—';
  const runsVal = record.runs > 0 ? record.runs : '—';
  const levelVal = record.highestLevel > 1 ? record.highestLevel : '—';

  container.innerHTML = `
    <div class="record-item">
      <div class="record-label">BEST</div>
      <div class="record-val">${bestVal}</div>
    </div>
    <div class="record-item">
      <div class="record-label">RUNS</div>
      <div class="record-val">${runsVal}</div>
    </div>
    <div class="record-item">
      <div class="record-label">TOP LEVEL</div>
      <div class="record-val">${levelVal}</div>
    </div>
  `;
}

function renderLevelGrid(gameId) {
  const record = getRecord(gameId);
  const grid = document.getElementById('level-buttons-grid');
  if (!grid) return;

  grid.innerHTML = '';

  for (let l = 1; l <= 10; l++) {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.innerText = l;

    // Played state
    if (l <= record.highestLevel) {
      btn.classList.add('played');
    }
    
    // Cleared state (completed if highestLevel is greater than l)
    if (l < record.highestLevel) {
      btn.classList.add('cleared');
      btn.innerHTML += `
        <svg class="checkmark" viewBox="0 0 10 10">
          <polyline points="2.5,5 4.5,7 7.5,3"></polyline>
        </svg>
      `;
    }

    if (l === currentSelectedLevel) {
      btn.classList.add('selected');
    }

    btn.addEventListener('click', () => {
      // De-select current
      grid.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentSelectedLevel = l;
      updateStartButtonText();
      
      // Animate level description fade
      const box = document.getElementById('level-desc-box');
      if (box) {
        box.style.opacity = '0';
        setTimeout(() => {
          box.innerText = LEVEL_DESCRIPTIONS[l - 1] || '';
          box.style.opacity = '1';
        }, 120);
      }
    });

    grid.appendChild(btn);
  }

  // Set initial level description
  const box = document.getElementById('level-desc-box');
  if (box) {
    box.innerText = LEVEL_DESCRIPTIONS[currentSelectedLevel - 1] || '';
  }
}

function renderControlsBlock(game) {
  const container = document.getElementById('controls-list-container');
  if (!container) return;

  const controls = game.controls || [
    { key: 'WASD / ARROWS', action: 'Move' },
    { key: 'SPACE', action: 'Action' }
  ];

  container.innerHTML = controls.map(c => {
    return `
      <div class="control-row">
        <span class="key-cap">${c.key}</span>
        <svg class="chevron-arrow" viewBox="0 0 10 10">
          <polyline points="3,2 6,5 3,8"></polyline>
        </svg>
        <span class="control-action">${c.action}</span>
      </div>
    `;
  }).join('');
}

async function startGame(gameId, level) {
  // Clear overlays
  const mount = document.getElementById('overlay-mount');
  if (mount) mount.innerHTML = '';

  const startBtn = document.getElementById('game-start-btn');
  if (startBtn) {
    startBtn.classList.add('running');
    startBtn.innerHTML = 'PLAYING <span class="dots">...</span>';
  }

  // Load game
  const loadResult = await loadGame(gameId);
  if (loadResult.error) {
    console.error('[Loader] Failed to load:', loadResult.error);
    if (startBtn) {
      startBtn.classList.remove('running');
      updateStartButtonText();
    }
    return;
  }

  const { GameClass } = loadResult;
  const canvas = document.getElementById('game-canvas');
  
  if (activeGameInstance) {
    Runner.stop();
  }

  activeGameInstance = new GameClass(canvas, { level });
  
  // Connect UI updates
  activeGameInstance.onScoreChange = (score) => {
    const lbl = document.getElementById('hud-score-label');
    if (lbl) lbl.innerText = score;
  };
  activeGameInstance.onLivesChange = (lives) => {
    updateLivesHUD(lives);
  };
  activeGameInstance.onGameOver = (score) => {
    showGameOverOverlay(score);
  };
  activeGameInstance.onLevelComplete = (lvl, score) => {
    showLevelCompleteOverlay(lvl, score);
  };

  // Reset HUD
  document.getElementById('hud-level-label').innerText = `LEVEL ${level}`;
  document.getElementById('hud-score-label').innerText = '0';
  updateLivesHUD(activeGameInstance.lives !== undefined ? activeGameInstance.lives : 3);
  gameTimeStart = performance.now();

  // Run game loop
  Runner.start(activeGameInstance);
}

function updateLivesHUD(lives) {
  const container = document.getElementById('hud-lives-container');
  if (!container) return;
  container.innerHTML = '';
  const maxLives = 3;
  for (let i = 0; i < maxLives; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot';
    if (i < lives) {
      dot.classList.add('filled');
    }
    container.appendChild(dot);
  }
}

function showLevelCompleteOverlay(level, score) {
  Runner.stop(); // freezes renders
  saveStats(currentActiveGameId, score, level);

  // Update detail blocks in right panel
  renderRecordBlock(currentActiveGameId);
  renderLevelGrid(currentActiveGameId);

  const mount = document.getElementById('overlay-mount');
  if (!mount) return;

  const duration = ((performance.now() - gameTimeStart) / 1000).toFixed(1);
  const nextLvl = level < 10 ? level + 1 : 10;
  const isFinal = level >= 10;
  const game = GAMES.find(g => g.id === currentActiveGameId);
  const accent = game ? game.accentColor : '#00d4aa';

  const card = document.createElement('div');
  card.className = 'overlay-card';
  card.innerHTML = `
    <div class="overlay-title">LEVEL COMPLETE</div>
    <div class="overlay-val">LEVEL ${level}</div>
    <div class="overlay-score">${score > 0 ? '+' : ''}${score}</div>
    <div class="overlay-line"></div>
    <div style="display:flex; justify-content:space-between; width:100%; margin-bottom: 20px;">
      <div style="text-align:left;">
        <div style="font-size:9px; color:rgba(255,255,255,0.35);">BEST</div>
        <div style="font-size:15px; font-weight:600; color:#fff;">${getRecord(currentActiveGameId).score}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:9px; color:rgba(255,255,255,0.35);">TIME TAKEN</div>
        <div style="font-size:15px; font-weight:600; color:#fff;">${duration}s</div>
      </div>
    </div>
    <button class="overlay-btn" id="level-continue-btn">${isFinal ? 'COMPLETE →' : `LEVEL ${nextLvl} →`}</button>
  `;

  mount.appendChild(card);

  requestAnimationFrame(() => {
    card.classList.add('active');
  });

  card.querySelector('#level-continue-btn').addEventListener('click', () => {
    card.classList.remove('active');
    setTimeout(() => {
      card.remove();
      if (isFinal) {
        closeGameModal();
      } else {
        currentSelectedLevel = nextLvl;
        updateStartButtonText();
        renderLevelGrid(currentActiveGameId);
        startGame(currentActiveGameId, nextLvl);
      }
    }, 240);
  });
}

function showGameOverOverlay(score) {
  Runner.stop(); // freeze game
  saveStats(currentActiveGameId, score, activeGameInstance.level || 1);

  // Update record stats
  renderRecordBlock(currentActiveGameId);
  renderLevelGrid(currentActiveGameId);

  const mount = document.getElementById('overlay-mount');
  if (!mount) return;

  const record = getRecord(currentActiveGameId);
  const isNewBest = score >= record.score && score > 0;
  
  const card = document.createElement('div');
  card.className = 'overlay-card';
  card.innerHTML = `
    <div style="font-family:'Press Start 2P', monospace; font-size:16px; color:#fff; margin-bottom:20px;">GAME OVER</div>
    <div class="overlay-title">SCORE</div>
    <div class="overlay-val" id="count-up-score" style="font-family:'JetBrains Mono', monospace; font-size:52px; font-weight:700; color:#fff;">0</div>
    <div id="new-best-badge-container" style="min-height: 24px;"></div>
    <div style="font-family:'DM Sans', sans-serif; font-size:13px; color:rgba(255,255,255,0.5); margin-bottom:20px;">Reached Level ${activeGameInstance.level || 1}</div>
    <div class="overlay-row-btns">
      <button class="overlay-btn-retry" id="go-retry-btn">RETRY</button>
      <button class="overlay-btn-levels" id="go-levels-btn">LEVELS</button>
    </div>
  `;

  mount.appendChild(card);

  requestAnimationFrame(() => {
    card.classList.add('active');
    
    // Animate score count-up
    animateScore(card.querySelector('#count-up-score'), score, 700, () => {
      // Badge on completion
      if (isNewBest) {
        const badge = card.querySelector('#new-best-badge-container');
        if (badge) {
          badge.innerHTML = `<div class="overlay-badge">NEW BEST</div>`;
        }
      }
    });
  });

  card.querySelector('#go-retry-btn').addEventListener('click', () => {
    card.classList.remove('active');
    setTimeout(() => {
      card.remove();
      startGame(currentActiveGameId, activeGameInstance.level || 1);
    }, 240);
  });

  card.querySelector('#go-levels-btn').addEventListener('click', () => {
    card.classList.remove('active');
    setTimeout(() => {
      card.remove();
      const startBtn = document.getElementById('game-start-btn');
      if (startBtn) {
        startBtn.classList.remove('running');
        updateStartButtonText();
      }
    }, 240);
  });
}

function animateScore(element, targetScore, duration, onComplete) {
  let start = null;
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
  const game = GAMES.find(g => g.id === currentActiveGameId);
  const accent = game ? game.accentColor : '#00d4aa';
  
  function step(timestamp) {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const val = Math.floor(easeOutCubic(progress) * targetScore);
    element.innerText = val;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.innerText = targetScore;
      // Brief color flash
      element.style.color = accent;
      setTimeout(() => {
        element.style.color = '#fff';
      }, 150);
      if (onComplete) onComplete();
    }
  }
  requestAnimationFrame(step);
}

export function closeGameModal() {
  const modal = document.getElementById('game-modal');
  if (!modal) return;

  Runner.stop();
  activeGameInstance = null;

  modal.classList.remove('active');
  const container = document.querySelector('body > :not(#game-modal)');
  if (container) container.style.opacity = '1';

  teardownModalEvents();

  setTimeout(() => {
    modal.className = 'game-modal-shell hidden';
    modal.innerHTML = '';
    window.location.hash = '';
  }, 320);
}

const handleScoreChange = (e) => {
  const lbl = document.getElementById('hud-score-label');
  if (lbl) lbl.innerText = e.detail;
};
const handleLivesChange = (e) => {
  updateLivesHUD(e.detail);
};
const handleGameOver = (e) => {
  showGameOverOverlay(e.detail.score);
};
const handleLevelCompleteEvent = (e) => {
  showLevelCompleteOverlay(e.detail.level, e.detail.score);
};

function setupModalEvents() {
  document.addEventListener('game:scoreChange', handleScoreChange);
  document.addEventListener('game:livesChange', handleLivesChange);
  document.addEventListener('game:gameOver', handleGameOver);
  document.addEventListener('game:levelComplete', handleLevelCompleteEvent);
}

function teardownModalEvents() {
  document.removeEventListener('game:scoreChange', handleScoreChange);
  document.removeEventListener('game:livesChange', handleLivesChange);
  document.removeEventListener('game:gameOver', handleGameOver);
  document.removeEventListener('game:levelComplete', handleLevelCompleteEvent);
}

window.launchGameModal = launchGameModal;
window.closeGameModal = closeGameModal;
