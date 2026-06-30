/**
 * js/ui/game-modal.js
 *
 * Full-screen modal shell that slides in from the right (or bottom on mobile).
 * Contains the game detail screen and hosts the GameContainer runtime.
 *
 * Phase 3: Premium accent underline, better typography, hover effects.
 */

import { loadGame, ERROR_MESSAGES } from '../core/game-loader.js';
import { GameContainer } from '../core/game-container.js';
import { renderDetailScreen } from './game-detail.js';
import { showToast } from '../core/notifications.js';
import { GAMES } from '../core/game-manifest.js';

let activeContainer = null;
let currentActiveGameId = null;
let currentActiveConfig = {};

// Utility to convert hex color to rgb
function hexToRgb(hex) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '108, 99, 255';
}

// Register DOM injection
function ensureModalDOM() {
  let modal = document.getElementById('game-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'game-modal';
    modal.className = 'game-modal-shell hidden';
    document.body.appendChild(modal);
  } else {
    // If the modal was pre-rendered/hardcoded in the HTML, clear legacy inline styles
    // and ensure it uses our game-modal-shell transitions.
    modal.className = 'game-modal-shell hidden';
    modal.removeAttribute('style');
  }

  // Insert structural CSS if not already present
  let styleEl = document.getElementById('game-modal-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'game-modal-styles';
    styleEl.innerHTML = `
      .game-modal-shell {
        position: fixed;
        top: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        background-color: #060608;
        transform: translateX(100%);
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;
      }
      .game-modal-shell.active {
        transform: translateX(0);
      }
      
      .modal-top-bar {
        height: 42px;
        background: rgba(6, 6, 8, 0.96);
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        box-sizing: border-box;
        z-index: 100;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        position: relative;
      }
      /* Accent underline on modal top bar — dynamically colored */
      .modal-accent-line {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 1px;
        pointer-events: none;
      }
      
      .modal-abort-btn {
        background: transparent;
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 6px;
        display: flex;
        align-items: center;
        gap: 6px;
        color: rgba(255,255,255,0.4);
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: bold;
        cursor: pointer;
        padding: 5px 10px;
        transition: all 0.15s ease;
        letter-spacing: 0.5px;
      }
      .modal-abort-btn:hover {
        color: rgba(255,255,255,0.8);
        background: rgba(255,255,255,0.04);
        border-color: rgba(255,255,255,0.12);
      }
      
      .modal-title-display {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
      }
      
      .modal-content-area {
        flex: 1;
        position: relative;
        width: 100%;
        height: calc(100% - 42px);
        overflow: hidden;
      }

      /* Sliding child screens */
      .modal-panel {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
      }
      .detail-panel {
        z-index: 10;
        transform: translateX(0);
        opacity: 1;
      }
      .detail-panel.slide-out {
        z-index: -1;
        transform: translateX(-100%);
        opacity: 0;
        pointer-events: none;
        visibility: hidden;
      }
      .runtime-panel {
        z-index: 5;
        transform: translateX(100%);
        opacity: 0;
        pointer-events: none;
      }
      .runtime-panel.active {
        z-index: 15;
        transform: translateX(0);
        opacity: 1;
        pointer-events: auto;
      }

      /* Mobile Sizing (Slide up from bottom) */
      @media (max-width: 768px) {
        .game-modal-shell {
          top: auto;
          bottom: 0;
          transform: translateY(100%);
        }
        .game-modal-shell.active {
          transform: translateY(0);
        }
        .detail-panel.slide-out {
          transform: translateY(-100%);
        }
        .runtime-panel {
          transform: translateY(100%);
        }
        .runtime-panel.active {
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(styleEl);
  }
  return modal;
}

/**
 * Launches the game modal.
 * @param {string} gameId - Unique kebab-case ID of the game
 * @param {Object} config - Configuration options (difficulty, matchmaking room)
 */
export async function launchGameModal(gameId, config = {}) {
  const modal = ensureModalDOM();
  currentActiveGameId = gameId;
  currentActiveConfig = config;

  // Get accent color for this game
  const gameManifest = GAMES.find(g => g.id === gameId);
  const accent = (gameManifest && gameManifest.accentColor) || '#6c63ff';
  const accentRgb = hexToRgb(accent);

  // Render top bar & initial layout
  modal.innerHTML = `
    <div class="modal-top-bar">
      <button class="modal-abort-btn" id="modal-abort-btn" title="Exit to library">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        EXIT
      </button>
      <div class="modal-title-display" id="modal-title-display" style="color: rgba(${accentRgb}, 0.7);">LAUNCH LOBBY</div>
      <div style="width:60px;"></div> <!-- placeholder balance -->
      <div class="modal-accent-line" style="background: linear-gradient(90deg, transparent, rgba(${accentRgb}, 0.2), transparent);"></div>
    </div>
    <div class="modal-content-area">
      <div id="modal-detail-panel" class="modal-panel detail-panel"></div>
      <div id="modal-runtime-panel" class="modal-panel runtime-panel"></div>
    </div>
  `;

  // Bind close action
  modal.querySelector('#modal-abort-btn').addEventListener('click', closeGameModal);

  // Animate modal open (Slide in)
  modal.classList.remove('hidden');
  requestAnimationFrame(() => {
    modal.classList.add('active');
    // Fade background page down to 50% opacity
    const container = document.querySelector('body > :not(#game-modal)');
    if (container) container.style.opacity = '0.5';
  });

  // Render Detail Panel
  const detailPanel = modal.querySelector('#modal-detail-panel');
  renderDetailScreen(
    gameId, 
    detailPanel, 
    // Start game trigger
    (difficulty) => {
      startRuntimeGame(gameId, difficulty);
    },
    // Back trigger
    () => {
      closeGameModal();
    }
  );

  // ESC key handler for the modal
  window._modalEscHandler = (e) => {
    if (e.key === 'Escape') {
      if (activeContainer && activeContainer.state === 'PLAYING') {
        // Let container intercept ESC key for pausing
        return;
      }
      closeGameModal();
    }
  };
  document.addEventListener('keydown', window._modalEscHandler);
}

/**
 * Handles the actual loading of the game file and mounting the GameContainer.
 */
async function startRuntimeGame(gameId, difficulty) {
  const modal = document.getElementById('game-modal');
  const detailPanel = modal.querySelector('#modal-detail-panel');
  const runtimePanel = modal.querySelector('#modal-runtime-panel');
  const titleDisplay = modal.querySelector('#modal-title-display');

  // Transition screen overlays
  detailPanel.classList.add('slide-out');
  runtimePanel.classList.add('active');

  // Clear previous runs
  if (activeContainer) {
    activeContainer.destroyGameInstance();
    activeContainer = null;
  }

  // Load game source code
  titleDisplay.textContent = "LOADING MODULE...";
  const loadResult = await loadGame(gameId);

  if (loadResult.error) {
    const errorMsg = ERROR_MESSAGES[loadResult.error] || "Could not launch the module.";
    showToast(errorMsg, "error");
    
    // Reset overlays
    detailPanel.classList.remove('slide-out');
    runtimePanel.classList.remove('active');
    titleDisplay.textContent = "LAUNCH LOBBY";
    return;
  }

  const { GameClass, manifest } = loadResult;
  titleDisplay.textContent = manifest.name.toUpperCase();

  // Create runtime container and initiate loading stages
  activeContainer = new GameContainer(runtimePanel, GameClass, manifest, {
    ...currentActiveConfig,
    difficulty: difficulty
  });
  activeContainer.initiateGameLaunch();
}

/**
 * Closes the modal shell and destroys game runtime contexts.
 */
export function closeGameModal() {
  const modal = document.getElementById('game-modal');
  if (!modal) return;

  if (activeContainer) {
    activeContainer.destroyGameInstance();
    activeContainer = null;
  }

  // Slide modal out
  modal.classList.remove('active');
  
  // Fade background page back to 100% opacity
  const container = document.querySelector('body > :not(#game-modal)');
  if (container) container.style.opacity = '1';

  // Teardown event listeners
  document.removeEventListener('keydown', window._modalEscHandler);

  setTimeout(() => {
    modal.classList.add('hidden');
    // Reset location hash to clear routing loops
    window.location.hash = '';
  }, 350);
}

// Bind to global window context
window.launchGameModal = launchGameModal;
window.closeGameModal = closeGameModal;
window.handleGameOver = (gameData, score) => {
  // Let container handle standard game over overlays and highscore persistences
  if (activeContainer && typeof activeContainer.endGame === 'function') {
    activeContainer.endGame();
  }
};
