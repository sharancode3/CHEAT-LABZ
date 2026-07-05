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
import { Storage } from '../core/storage.js';
import { Identity } from '../core/identity.js';

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
  } else {
    modal.removeAttribute('style');
  }

  // Inject structural CSS
  let styleEl = document.getElementById('game-modal-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'game-modal-styles';
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = `
      .game-modal-shell {
        position: fixed !important;
        inset: 0 !important;
        z-index: 9999 !important;
        display: flex !important;
        flex-direction: row !important;
        background-color: #060608 !important;
        transform: translateY(100%) !important;
        transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) !important;
        font-family: 'DM Sans', sans-serif !important;
      }
      .game-modal-shell.active { transform: translateY(0) !important; }

      .panel-left {
        flex: 0 0 60% !important;
        width: 60% !important;
        height: 100% !important;
        background-color: #0a0a0f !important;
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }

      .canvas-wrapper {
        position: relative !important;
        border-radius: 8px !important;
        overflow: hidden !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        width: 100% !important;
        height: 100% !important;
        background-color: #0e0e11 !important;
      }

      .canvas-loader {
        position: absolute !important;
        inset: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        background-color: #0e0e11 !important;
        color: #a1a1aa !important;
        gap: 16px !important;
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 11px !important;
        letter-spacing: 0.1em !important;
        z-index: 5 !important;
      }
      .loader-spinner {
        width: 24px !important;
        height: 24px !important;
        border: 2px solid rgba(255, 255, 255, 0.08) !important;
        border-top-color: var(--accent) !important;
        border-radius: 50% !important;
        animation: spin 0.8s linear infinite !important;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      .canvas-error {
        position: absolute !important;
        inset: 0 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        background-color: #0e0e11 !important;
        color: #f3f3f5 !important;
        gap: 12px !important;
        padding: 24px !important;
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 12px !important;
        text-align: center !important;
        z-index: 6 !important;
      }
      .error-title {
        color: #ef4444 !important;
        font-weight: bold !important;
        letter-spacing: 0.1em !important;
      }
      .error-message {
        color: #a1a1aa !important;
        font-size: 11px !important;
        max-width: 320px !important;
        line-height: 1.5 !important;
      }
      .error-retry-btn {
        margin-top: 8px !important;
        background-color: var(--accent) !important;
        color: #ffffff !important;
        padding: 8px 16px !important;
        border-radius: 6px !important;
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 11px !important;
        font-weight: bold !important;
        border: none !important;
        cursor: pointer !important;
        transition: opacity 0.15s ease !important;
      }
      .error-retry-btn:hover {
        opacity: 0.9 !important;
      }
      .error-retry-btn:disabled {
        opacity: 0.5 !important;
        cursor: not-allowed !important;
      }

      .hud-top-bar {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        height: 40px !important;
        background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 0 16px !important;
        pointer-events: none !important;
        z-index: 10 !important;
      }

      .hud-game-name {
        font-size: 12px !important;
        color: rgba(255,255,255,0.85) !important;
        background: rgba(10, 10, 15, 0.65) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        padding: 4px 10px !important;
        border-radius: 12px !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
      .hud-score {
        position: absolute !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 20px !important;
        font-weight: bold !important;
        color: #ffffff !important;
        background: rgba(10, 10, 15, 0.65) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        padding: 4px 16px !important;
        border-radius: 12px !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
      .hud-right {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        background: rgba(10, 10, 15, 0.65) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        padding: 4px 10px !important;
        border-radius: 12px !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
      }
      .hud-lives { display: flex !important; gap: 4px !important; }
      .hud-lives .dot { width: 6px !important; height: 6px !important; border-radius: 50% !important; background: #ffffff !important; }
      .hud-pause-icon { width: 16px !important; height: 16px !important; opacity: 0.6 !important; fill: #ffffff !important; }
      .hud-level-indicator {
        position: absolute !important;
        bottom: 16px !important;
        left: 16px !important;
        background: rgba(10, 10, 15, 0.65) !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
        border: 1px solid rgba(255,255,255,0.08) !important;
        padding: 4px 10px !important;
        border-radius: 12px !important;
        font-size: 11px !important;
        color: rgba(255,255,255,0.85) !important;
        pointer-events: none !important;
        z-index: 10 !important;
      }

      .panel-right {
        flex: 0 0 40% !important;
        width: 40% !important;
        height: 100% !important;
        background-color: #111118 !important;
        border-left: 1px solid rgba(255,255,255,0.06) !important;
        overflow-y: auto !important;
        position: relative !important;
      }

      .close-btn, .back-btn {
        position: absolute !important;
        top: 16px !important;
        width: 36px !important;
        height: 36px !important;
        border-radius: 50% !important;
        background: rgba(255,255,255,0.05) !important;
        border: none !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        color: #ffffff !important;
        transition: background 0.15s ease !important;
        z-index: 50 !important;
      }
      .close-btn { right: 16px !important; }
      .back-btn { left: 16px !important; }
      .close-btn:hover, .back-btn:hover { background: rgba(255,255,255,0.1) !important; }

      .overlay-container { position: absolute !important; inset: 0 !important; pointer-events: none !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 20 !important; }
      .card-overlay { background: rgba(10,10,15,0.92) !important; backdrop-filter: blur(12px) !important; border-radius: 12px !important; border: 1px solid rgba(255,255,255,0.1) !important; padding: 32px !important; width: 320px !important; text-align: center !important; pointer-events: auto !important; opacity: 0 !important; transform: scale(0.85) !important; transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease !important; }
      .card-overlay.active { opacity: 1 !important; transform: scale(1.0) !important; }

      /* Mobile layout override */
      @media (max-width: 768px) {
        .game-modal-shell {
          flex-direction: column !important;
        }
        .panel-left {
          flex: 0 0 55% !important;
          width: 100% !important;
          height: 55% !important;
        }
        .panel-right {
          flex: 0 0 45% !important;
          width: 100% !important;
          height: 45% !important;
          border-left: none !important;
          border-top: 1px solid rgba(255,255,255,0.06) !important;
        }
      }
    `;

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
      <button class="back-btn" id="back-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button class="close-btn" id="close-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div id="detail-content"></div>
    </div>
  `;

  modal.querySelector('#close-btn').addEventListener('click', closeGameModal);
  modal.querySelector('#back-btn').addEventListener('click', closeGameModal);

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

async function startGame(gameId, level, isRetry = false) {
  const overlayContainer = document.getElementById('overlay-container');
  overlayContainer.innerHTML = ''; // Clear overlays

  updateStartButtonState('PLAYING...');

  if (activeGameInstance) {
    GameRunner.stop();
    activeGameInstance = null;
  }

  const canvasWrapper = document.getElementById('canvas-wrapper');
  
  // Selectively clean up previous instances of canvas, loader, or errors to keep HUD elements intact
  const oldCanvas = canvasWrapper.querySelector('canvas');
  if (oldCanvas) oldCanvas.remove();
  const oldLoader = canvasWrapper.querySelector('.canvas-loader');
  if (oldLoader) oldLoader.remove();
  const oldError = canvasWrapper.querySelector('.canvas-error');
  if (oldError) oldError.remove();

  // Show Loading indicator
  const loader = document.createElement('div');
  loader.className = 'canvas-loader';
  loader.innerHTML = `
    <div class="loader-spinner"></div>
    <div class="loader-text">${isRetry ? 'RETRYING LOADING...' : 'LOADING MODULE...'}</div>
  `;
  canvasWrapper.appendChild(loader);

  const loadResult = await loadGame(gameId);
  if (loadResult.error) {
    loader.remove(); // Remove loading spinner
    updateStartButtonState(`START LEVEL ${level}`);

    // Differentiate error
    const friendlyMsg = ERROR_MESSAGES[loadResult.error] || "An unexpected error occurred.";
    
    // Create proper in-panel error state inside canvas wrapper
    const errorEl = document.createElement('div');
    errorEl.className = 'canvas-error';
    errorEl.innerHTML = `
      <div class="error-title">COULD NOT LOAD MODULE</div>
      <div class="error-message">${friendlyMsg}</div>
      <button id="error-retry-btn" class="error-retry-btn">RETRY CONNECTION</button>
    `;
    canvasWrapper.appendChild(errorEl);

    // Set up retry with brief backoff
    const retryBtn = errorEl.querySelector('#error-retry-btn');
    retryBtn.addEventListener('click', async () => {
      retryBtn.disabled = true;
      retryBtn.innerText = 'WAITING BACKOFF...';
      
      // 1000ms brief backoff delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      startGame(gameId, level, true);
    });

    return;
  }

  loader.remove(); // Remove loading spinner

  const { GameClass } = loadResult;
  
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

async function submitStats(gameId, score, level) {
  const uid = Identity.getUID();
  const displayName = Identity.getDisplayName();
  if (!uid) return;

  // 1. Update localStorage immediately for instant offline-first experience
  const saved = Storage.get(gameId, null);
  let record = { score: 0, runs: 0, history: [], highestLevel: 1 };
  if (saved && typeof saved === 'object') {
    record = saved;
  } else if (typeof saved === 'number') {
    record = { score: saved, runs: 1, history: [saved], highestLevel: 1 };
  }

  record.runs++;
  record.score = Math.max(record.score, score);
  record.highestLevel = Math.max(record.highestLevel, level);
  record.lastPlayed = Date.now();
  record.history.push(score);
  Storage.set(gameId, record);

  // Trigger real-time UI refresh in the right-hand panel
  const detailContent = document.getElementById('detail-content');
  if (detailContent && currentActiveGameId === gameId) {
    renderDetailScreen(gameId, detailContent, (l) => startGame(gameId, l), record.highestLevel);
  }

  // 2. Sync to Supabase DB via Express API endpoint
  const API_URL = import.meta.env?.VITE_SOCKET_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${API_URL}/api/stats/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, gameId, displayName, score, level })
    });
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  } catch (e) {
    console.warn('[Supabase] Stats submission failed (offline/schema mismatch):', e);
  }
}

function handleLevelComplete(e) {
  const { game, level } = e.detail;
  GameRunner.stop(); // Freeze canvas

  // Submit and sync stats
  submitStats(currentActiveGameId, game.score, level);

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

  // Submit and sync stats
  submitStats(currentActiveGameId, score, game.level || 1);

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
