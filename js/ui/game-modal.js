/**
 * js/ui/game-modal.js
 * 
 * Phase 3: The minimal, two-column premium game panel layout.
 */

import { loadGame, ERROR_MESSAGES } from '../core/game-loader.js';
import { GameRunner } from '../core/game-runner.js';
import { renderDetailScreen, updateStartButtonState } from './game-detail.js';
import { showToast } from '../core/notifications.js';
import { GAMES } from '../core/game-manifest.js';

let activeGameInstance = null;
let currentActiveGameId = null;
let scoreInterval = null;

function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '108, 99, 255';
}

function ensureModalDOM() {
  let modal = document.getElementById('game-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'game-modal';
    document.body.appendChild(modal);
  }

  // Inject structural CSS
  let styleEl = document.getElementById('game-modal-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'game-modal-styles';
    styleEl.innerHTML = `
      .game-modal-shell {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        flex-direction: row;
        background-color: transparent;
        transform: translateY(100%);
        transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        font-family: 'DM Sans', sans-serif;
      }
      .game-modal-shell.active {
        transform: translateY(0);
      }
      
      .panel-left {
        width: 60%;
        height: 100%;
        background-color: #0a0a0f;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .canvas-wrapper {
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.08);
      }

      .hud-top-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 40px;
        background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        pointer-events: none;
        z-index: 10;
      }

      .hud-game-name {
        font-family: 'DM Sans', sans-serif;
        font-size: 12px;
        color: rgba(255,255,255,0.5);
      }

      .hud-score {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        font-family: 'JetBrains Mono', monospace;
        font-size: 20px;
        font-weight: bold;
        color: #ffffff;
      }

      .hud-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .hud-lives {
        display: flex;
        gap: 4px;
      }
      .hud-lives .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #ffffff;
      }

      .hud-pause-icon {
        width: 16px;
        height: 16px;
        opacity: 0.6;
        fill: #ffffff;
      }

      .hud-level-indicator {
        position: absolute;
        bottom: 16px;
        left: 16px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.1);
        padding: 4px 10px;
        border-radius: 12px;
        font-family: 'DM Sans', sans-serif;
        font-size: 11px;
        color: rgba(255,255,255,0.6);
        pointer-events: none;
        z-index: 10;
      }

      .panel-right {
        width: 40%;
        height: 100%;
        background-color: #111118;
        border-left: 1px solid rgba(255,255,255,0.06);
        overflow-y: auto;
        position: relative;
      }

      .close-btn {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255,255,255,0.05);
        border: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        transition: background 0.15s ease;
        z-index: 50;
      }
      .close-btn:hover {
        background: rgba(255,255,255,0.1);
      }

      .overlay-container {
        position: absolute;
        inset: 0;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 20;
      }

      .card-overlay {
        background: rgba(10,10,15,0.92);
        backdrop-filter: blur(12px);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.1);
        padding: 32px;
        width: 320px;
        text-align: center;
        pointer-events: auto;
        opacity: 0;
        transform: scale(0.85);
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
      }
      .card-overlay.active {
        opacity: 1;
        transform: scale(1.0);
      }

      /* Mobile layout */
      @media (max-width: 768px) {
        .game-modal-shell {
          flex-direction: column;
        }
        .panel-left {
          width: 100%;
          height: 55%;
        }
        .panel-right {
          width: 100%;
          height: 45%;
          border-left: none;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  modal.className = 'game-modal-shell hidden';
  return modal;
}

export async function launchGameModal(gameId) {
  const modal = ensureModalDOM();
  currentActiveGameId = gameId;

  const gameManifest = GAMES.find(g => g.id === gameId);
  const accent = (gameManifest && gameManifest.accentColor) || '#6c63ff';

  modal.innerHTML = `
    <div class="panel-left" id="panel-left">
      <div class="canvas-wrapper" id="canvas-wrapper">
        <!-- Canvas injected here -->
        <div class="hud-top-bar">
          <div class="hud-game-name">${gameManifest ? gameManifest.name : 'GAME'}</div>
          <div class="hud-score" id="hud-score">0</div>
          <div class="hud-right">
            <div class="hud-lives" id="hud-lives"></div>
            <svg class="hud-pause-icon" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          </div>
        </div>
        <div class="hud-level-indicator" id="hud-level">LEVEL 1</div>
      </div>
      <div class="overlay-container" id="overlay-container"></div>
    </div>
    <div class="panel-right" id="panel-right">
      <button class="close-btn" id="close-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div id="detail-content"></div>
    </div>
  `;

  modal.querySelector('#close-btn').addEventListener('click', closeGameModal);

  // Animate open
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.add('active');
    const container = document.querySelector('body > :not(#game-modal)');
    if (container) container.style.opacity = '0.4';
  });

  const detailContent = modal.querySelector('#detail-content');
  renderDetailScreen(gameId, detailContent, (selectedLevel) => {
    startGame(gameId, selectedLevel);
  });

  setupEventListeners();
}

async function startGame(gameId, level) {
  const overlayContainer = document.getElementById('overlay-container');
  overlayContainer.innerHTML = ''; // Clear overlays

  updateStartButtonState('PLAYING...');

  if (activeGameInstance) {
    GameRunner.stop();
    activeGameInstance = null;
  }

  const loadResult = await loadGame(gameId);
  if (loadResult.error) {
    showToast(ERROR_MESSAGES[loadResult.error] || "Failed to load game", "error");
    updateStartButtonState(`START LEVEL ${level}`);
    return;
  }

  const { GameClass } = loadResult;
  
  // Create a clean canvas
  const canvasWrapper = document.getElementById('canvas-wrapper');
  // Remove old canvas if exists
  const oldCanvas = canvasWrapper.querySelector('canvas');
  if (oldCanvas) oldCanvas.remove();

  const canvas = document.createElement('canvas');
  // Temporary dimensions until we adapt to GameBase logical sizes
  canvas.width = 800;
  canvas.height = 600;
  canvasWrapper.appendChild(canvas);

  // We assume the new GameClass extends the Phase 2 GameBase
  try {
    activeGameInstance = new GameClass(canvas);
    if (typeof activeGameInstance.setLevel === 'function') {
      activeGameInstance.setLevel(level);
    }
    
    // Connect reactive HUD
    activeGameInstance.onScoreChange = (score) => {
      document.getElementById('hud-score').innerText = score;
    };
    activeGameInstance.onLivesChange = (lives) => {
      renderLives(lives);
    };
    activeGameInstance.onLevelChange = (lvl) => {
      document.getElementById('hud-level').innerText = `LEVEL ${lvl}`;
    };

    document.getElementById('hud-level').innerText = `LEVEL ${level}`;
    document.getElementById('hud-score').innerText = '0';
    renderLives(activeGameInstance.lives || 3);

    GameRunner.start(activeGameInstance);
    
    // Poll score continuously if reactive hooks fail for older games
    if (scoreInterval) clearInterval(scoreInterval);
    scoreInterval = setInterval(() => {
      if (activeGameInstance) {
        document.getElementById('hud-score').innerText = activeGameInstance.score || 0;
        if (activeGameInstance.level) document.getElementById('hud-level').innerText = `LEVEL ${activeGameInstance.level}`;
      }
    }, 100);

  } catch (err) {
    console.error("Game instantiation error:", err);
    showToast("This game has not been updated to Phase 2 architecture yet.", "error");
    updateStartButtonState(`START LEVEL ${level}`);
  }
}

function renderLives(lives) {
  const container = document.getElementById('hud-lives');
  if (!container) return;
  let html = '';
  for(let i=0; i<Math.max(0, lives); i++) {
    html += '<div class="dot"></div>';
  }
  container.innerHTML = html;
}

export function closeGameModal() {
  const modal = document.getElementById('game-modal');
  if (!modal) return;

  if (activeGameInstance) {
    GameRunner.stop();
    activeGameInstance = null;
  }
  if (scoreInterval) clearInterval(scoreInterval);

  modal.classList.remove('active');
  const container = document.querySelector('body > :not(#game-modal)');
  if (container) container.style.opacity = '1';

  teardownEventListeners();

  setTimeout(() => {
    modal.classList.add('hidden');
    modal.innerHTML = '';
    window.location.hash = '';
  }, 400);
}

// --- Event Handlers for Overlays ---

function handleLevelComplete(e) {
  const { game, level } = e.detail;
  GameRunner.stop(); // Freeze canvas

  const overlayContainer = document.getElementById('overlay-container');
  const gameManifest = GAMES.find(g => g.id === currentActiveGameId);
  const accent = (gameManifest && gameManifest.accentColor) || '#6c63ff';

  const isFinalLevel = level >= 10;
  
  const card = document.createElement('div');
  card.className = 'card-overlay';
  card.innerHTML = `
    <div style="font-family: 'DM Sans', sans-serif; font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 8px;">
      LEVEL COMPLETE
    </div>
    <div style="font-family: 'DM Sans', sans-serif; font-size: 32px; font-weight: bold; color: #ffffff; margin-bottom: 12px;">
      ${isFinalLevel ? 'ALL LEVELS COMPLETE' : `LEVEL ${level}`}
    </div>
    <div style="font-family: 'JetBrains Mono', monospace; font-size: 20px; color: ${accent}; margin-bottom: 24px;">
      ${game.score}
    </div>
    
    <div style="height: 1px; background: rgba(255,255,255,0.08); margin-bottom: 24px;"></div>
    
    ${!isFinalLevel ? `
    <button id="btn-next-level" style="width: 100%; height: 48px; border-radius: 8px; background: ${accent}; color: #ffffff; border: none; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: filter 0.15s ease;">
      CONTINUE TO LEVEL ${level + 1}
    </button>
    ` : `
    <button id="btn-next-level" style="width: 100%; height: 48px; border-radius: 8px; background: ${accent}; color: #ffffff; border: none; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: filter 0.15s ease;">
      FINISH
    </button>
    `}
  `;
  
  overlayContainer.appendChild(card);

  requestAnimationFrame(() => {
    card.classList.add('active');
  });

  const nextBtn = card.querySelector('#btn-next-level');
  nextBtn.onmouseover = () => nextBtn.style.filter = 'brightness(1.1)';
  nextBtn.onmouseout = () => nextBtn.style.filter = 'brightness(1)';
  
  nextBtn.onclick = () => {
    card.classList.remove('active');
    setTimeout(() => {
      if (isFinalLevel) {
        closeGameModal();
      } else {
        // Trigger detail screen re-render for new level selected
        const detailContent = document.getElementById('detail-content');
        renderDetailScreen(currentActiveGameId, detailContent, (l) => startGame(currentActiveGameId, l), level + 1);
        startGame(currentActiveGameId, level + 1);
      }
    }, 250);
  };
}

function handleGameOverEvent(e) {
  const { game, score } = e.detail;
  GameRunner.stop();

  const overlayContainer = document.getElementById('overlay-container');
  const gameManifest = GAMES.find(g => g.id === currentActiveGameId);
  const accent = (gameManifest && gameManifest.accentColor) || '#6c63ff';

  const card = document.createElement('div');
  card.className = 'card-overlay';
  card.innerHTML = `
    <div style="font-family: 'Press Start 2P', monospace; font-size: 18px; color: #ffffff; margin-bottom: 24px;">
      GAME OVER
    </div>
    <div style="font-family: 'DM Sans', sans-serif; font-size: 10px; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 8px;">
      SCORE
    </div>
    <div id="go-score" style="font-family: 'JetBrains Mono', monospace; font-size: 48px; font-weight: bold; color: #ffffff; margin-bottom: 24px;">
      0
    </div>
    <div style="font-family: 'DM Sans', sans-serif; font-size: 13px; color: rgba(255,255,255,0.35); margin-bottom: 24px;">
      Reached Level ${game.level || 1}
    </div>
    
    <div style="display: flex; gap: 12px; width: 100%;">
      <button id="btn-retry" style="flex: 1; height: 48px; border-radius: 8px; background: ${accent}; color: #ffffff; border: none; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;">
        RETRY
      </button>
      <button id="btn-levels" style="flex: 1; height: 48px; border-radius: 8px; background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); border: 1px solid rgba(255,255,255,0.1); font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer;">
        LEVELS
      </button>
    </div>
  `;

  overlayContainer.appendChild(card);

  requestAnimationFrame(() => {
    card.classList.add('active');
    animateScore(card.querySelector('#go-score'), score, 600);
  });

  const retryBtn = card.querySelector('#btn-retry');
  const levelsBtn = card.querySelector('#btn-levels');

  retryBtn.onclick = () => {
    startGame(currentActiveGameId, game.level || 1);
  };
  levelsBtn.onclick = () => {
    overlayContainer.innerHTML = '';
    updateStartButtonState(`START LEVEL ${game.level || 1}`);
  };
}

function animateScore(element, targetScore, duration) {
  let start = null;
  const easeOutCubic = x => 1 - Math.pow(1 - x, 3);
  
  function step(timestamp) {
    if (!start) start = timestamp;
    const progress = Math.min((timestamp - start) / duration, 1);
    const current = Math.floor(easeOutCubic(progress) * targetScore);
    element.innerText = current;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.innerText = targetScore;
    }
  }
  requestAnimationFrame(step);
}

const levelCompleteRef = (e) => handleLevelComplete(e);
const gameOverRef = (e) => handleGameOverEvent(e);

function setupEventListeners() {
  document.addEventListener('game:levelComplete', levelCompleteRef);
  document.addEventListener('game:gameOver', gameOverRef);
}

function teardownEventListeners() {
  document.removeEventListener('game:levelComplete', levelCompleteRef);
  document.removeEventListener('game:gameOver', gameOverRef);
}

window.launchGameModal = launchGameModal;
window.closeGameModal = closeGameModal;
