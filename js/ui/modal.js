import { showToast } from '../core/notifications.js';
import { GAME_ICONS } from '../../assets/icons/game-icons.js';

function getGameIcon(gameId) {
  return GAME_ICONS[gameId] || GAME_ICONS['default'];
}

let currentGame = null;

export function updateModalScore(score) {
  const scoreEl = document.getElementById('game-modal-score');
  if (scoreEl) scoreEl.innerText = `SCORE: ${score}`;
}

export function handleGameOver(gameData, score) {
  if (window.onArenaGameComplete) {
    window.onArenaGameComplete(score);
  } else {
    showToast(`Game Over! Final Score: ${score}`, 'info');
    window.closeGameModal();
  }
}
window.handleGameOver = handleGameOver;

window.closeGameModal = () => {
  const modal = document.getElementById('game-modal');
  if (currentGame) {
    if (typeof currentGame.destroy === 'function') currentGame.destroy();
    currentGame = null;
  }
  if (modal) {
    modal.classList.add('hidden');
  }
  document.removeEventListener('keydown', window._modalEscHandler);
};

window._modalEscHandler = (e) => {
  if (e.key === 'Escape') window.closeGameModal();
};

window.launchGameModal = async (gameId, config = {}) => {
  const modal = document.getElementById('game-modal');
  const canvas = document.getElementById('game-canvas');
  const titleEl = document.getElementById('game-modal-title');
  
  if (!modal || !canvas) return;

  // We find gameData from GAMES array
  const gameData = window.GAMES ? window.GAMES.find(g => g.id === gameId) || { id: gameId, name: gameId, className: gameId, file: `./js/games/${gameId}.js` } : { id: gameId, name: gameId, className: gameId, file: `./js/games/${gameId}.js` };
  
  const iconSvg = getGameIcon(gameData.id);
  const displayText = config.title || (gameData.name ? gameData.name.toUpperCase() : gameId.toUpperCase());
  titleEl.innerHTML = `<div class="game-icon" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 8px;">${iconSvg}</div>${displayText}`;
  updateModalScore(0);

  modal.classList.remove('hidden');
  
  const closeBtn = document.getElementById('close-game');
  if (closeBtn) {
    const newBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newBtn, closeBtn);
    newBtn.addEventListener('click', window.closeGameModal);
  }
  document.addEventListener('keydown', window._modalEscHandler);

  const gameContainer = document.getElementById('game-canvas-container');
  if (gameContainer) {
    const existingLoader = document.getElementById('game-loading-indicator');
    if (existingLoader) existingLoader.remove();
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'game-loading';
    loadingDiv.id = 'game-loading-indicator';
    loadingDiv.innerHTML = `
      <div class="game-loading-bar"></div>
      <span>Loading ${displayText}...</span>
    `;
    gameContainer.appendChild(loadingDiv);
  }

  currentGame = await launchGame(gameData, canvas, config);
  
  const loadingIndicator = document.getElementById('game-loading-indicator');
  if (loadingIndicator) loadingIndicator.remove();
};

async function launchGame(gameData, canvas, config = {}) {
  try {
    // Resolve path relative to the current HTML page instead of this module
    const path = gameData.file
      ? new URL(gameData.file, window.location.href).href
      : window.location.origin + `/js/games/${gameData.id}.js`;
    const module = await import(path);
    
    // Support default or named export based on className
    const GameClass = gameData.className ? module[gameData.className] : (module.default || Object.values(module)[0]);
    
    if (!GameClass) {
      showToast('Game not found: ' + (gameData.name || gameData.id), 'error');
      window.closeGameModal();
      return null;
    }
    
    // Merge provided config with the expected interface
    const finalConfig = {
      ...config,
      onScoreChange: (score) => updateModalScore(score),
      onGameOver: (score) => handleGameOver(gameData, score)
    };

    const game = new GameClass(canvas, finalConfig);
    
    // Compatibility for games that expect old manual hooks
    game.onScoreChange = finalConfig.onScoreChange;
    
    if (typeof game.init === 'function') {
      game.init();
    } else if (typeof game.showInstructions === 'function') {
      game.showInstructions();
    } else if (typeof game.start === 'function') {
      game.start();
    }
    return game;
    
  } catch(err) {
    console.error('Game load error:', err);
    showToast('Failed to load ' + (gameData.name || gameData.id), 'error');
    window.closeGameModal();
    return null;
  }
}
