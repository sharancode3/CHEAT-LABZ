import { showToast } from '../core/notifications.js';
import { renderScoreBreakdown } from './ScoreBreakdown.js';
import { GAME_ICONS } from '../../assets/icons/game-icons.js';
import { Storage } from '../core/storage.js';

const GAME_SPECS = {
  'neon-serpent': {
    objective: "Eat orbs to grow longer and score combos without hitting walls or your own tail.",
    scoring: "10pts per food + speed bonus. Combo multiplier for 3+ foods eaten fast.",
    controls: [
      { key: "↑ W", action: "Move Up" },
      { key: "↓ S", action: "Move Down" },
      { key: "← A", action: "Move Left" },
      { key: "→ D", action: "Move Right" }
    ]
  },
  'loop-rally': {
    objective: "Keep the ball in play by deflecting it back to the AI opponent.",
    scoring: "+1 per rally. Speed increases every 5.",
    controls: [
      { key: "← A", action: "Paddle Left" },
      { key: "→ D", action: "Paddle Right" },
      { key: "MOUSE", action: "Move Paddle" }
    ]
  },
  'turbo-drift': {
    objective: "Complete 3 laps as fast as possible while drifting around corners for bonus points.",
    scoring: "1000 - elapsed ms + drift score bonus.",
    controls: [
      { key: "↑ W", action: "Accelerate" },
      { key: "↓ S", action: "Reverse" },
      { key: "← A", action: "Steer Left" },
      { key: "→ D", action: "Steer Right" }
    ]
  },
  'key-frenzy': {
    objective: "Press the key matching the letter shown on screen before time runs out.",
    scoring: "+10 per key + time bonus. -10 per miss.",
    controls: [
      { key: "A-Z", action: "Press Key" }
    ]
  },
  'astro-strider': {
    objective: "Navigate your ship through space, destroying asteroids and enemy ships.",
    scoring: "+5 asteroid +15 enemy ship. Powerup multipliers.",
    controls: [
      { key: "↑ W", action: "Move Up" },
      { key: "↓ S", action: "Move Down" },
      { key: "SPACE", action: "Fire Lasers" }
    ]
  },
  'cipher-quest': {
    objective: "Decode Caesar-ciphered words as fast as possible.",
    scoring: "100 per word + up to 50 time bonus. -20 per hint used.",
    controls: [
      { key: "A-Z", action: "Type Answer" },
      { key: "ENTER", action: "Submit Word" }
    ]
  },
  'phantom-calc': {
    objective: "Solve and type the correct answer to mathematical equations before they disappear.",
    scoring: "+50 correct -10 wrong +20 time bonus.",
    controls: [
      { key: "0-9", action: "Type Number" },
      { key: "ENTER", action: "Submit Answer" }
    ]
  },
  'word-pulse': {
    objective: "Type the displayed letters exactly on the rhythm of the beat.",
    scoring: "+10 on-beat letter. Bonus for full word.",
    controls: [
      { key: "A-Z", action: "Type Letter" }
    ]
  },
  'pixel-dodge': {
    objective: "Dodge incoming bullets and obstacles; survive as long as you can.",
    scoring: "Score = milliseconds survived.",
    controls: [
      { key: "↑ W", action: "Move Up" },
      { key: "↓ S", action: "Move Down" },
      { key: "← A", action: "Move Left" },
      { key: "→ D", action: "Move Right" }
    ]
  },
  'stack-blitz': {
    objective: "Drop moving platforms exactly on top of the tower to build it as high as possible.",
    scoring: "+10 per layer +150 perfect stack bonus.",
    controls: [
      { key: "SPACE", action: "Drop Platform" },
      { key: "CLICK", action: "Drop Platform" }
    ]
  },
  'memory-grid': {
    objective: "Watch the grid sequence light up, then repeat it back in the exact order.",
    scoring: "+100 per sequence × round multiplier.",
    controls: [
      { key: "CLICK", action: "Select Tile" }
    ]
  },
  'hyper-tap': {
    objective: "Tap exactly when the moving dot matches the center of the target.",
    scoring: "Up to 100pts per tap. Precision scoring.",
    controls: [
      { key: "SPACE", action: "Tap / Select" },
      { key: "CLICK", action: "Tap / Select" }
    ]
  },
  'gravity-flip': {
    objective: "Run forward, flipping gravity to avoid spikes and collect coins.",
    scoring: "Distance run + 10 per coin collected.",
    controls: [
      { key: "SPACE", action: "Flip Gravity" },
      { key: "CLICK", action: "Flip Gravity" }
    ]
  },
  'chain-burst': {
    objective: "Drag and chain same-colored orbs together to burst them within the 90 second limit.",
    scoring: "Chain length² × 10. Combo multipliers.",
    controls: [
      { key: "DRAG", action: "Draw Chain" }
    ]
  },
  'reflex-rush': {
    objective: "Press the corresponding arrow key as fast as possible when a color flashes.",
    scoring: "100 - reaction ms per round. 10 rounds.",
    controls: [
      { key: "↑ ↓", action: "Match Color" },
      { key: "← →", action: "Match Color" }
    ]
  },
  'tile-runner': {
    objective: "Tap only the dark tiles as they scroll down without missing any.",
    scoring: "+1 per correct tile. Speed bonuses.",
    controls: [
      { key: "CLICK", action: "Click Dark Tile" }
    ]
  },
  'beat-drop': {
    objective: "Hit D, F, J, or K keys when the musical notes reach the indicator line.",
    scoring: "PERFECT=100 GOOD=50 MISS=0 per note.",
    controls: [
      { key: "D F", action: "Hit Note" },
      { key: "J K", action: "Hit Note" }
    ]
  },
  'slide-forge': {
    objective: "Slide tiles in four directions to merge identical numbers and reach 2048.",
    scoring: "Sum of all merged tile values.",
    controls: [
      { key: "↑ W", action: "Slide Up" },
      { key: "↓ S", action: "Slide Down" },
      { key: "← A", action: "Slide Left" },
      { key: "→ D", action: "Slide Right" }
    ]
  },
  'orb-pop-deluxe': {
    objective: "Shoot and match 3 colored orbs to pop them before they reach the bottom of the grid.",
    scoring: "+10 per orb +50 per orphan drop chain.",
    controls: [
      { key: "MOUSE", action: "Aim Launcher" },
      { key: "CLICK", action: "Shoot Orb" }
    ]
  }
};

let currentGame = null;
let currentActiveGameId = null;
let currentActiveConfig = {};
let latestFinishedScore = null;

function getGameIcon(gameId) {
  return GAME_ICONS[gameId] || GAME_ICONS['default'] || '🎮';
}

function findGame(gameId) {
  if (!window.GAMES) return null;
  const cleanId = gameId.toLowerCase().replace(/[\s_]+/g, '-');
  let game = window.GAMES.find(g => g.id === gameId);
  if (game) return game;
  game = window.GAMES.find(g => g.id === cleanId);
  if (game) return game;
  game = window.GAMES.find(g => g.name.toLowerCase() === gameId.toLowerCase());
  if (game) return game;
  game = window.GAMES.find(g => g.name.toLowerCase().replace(/[\s_]+/g, '-') === cleanId);
  if (game) return game;
  return null;
}

function getYourTopAcrossAllGames() {
  let highest = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cheatLabz_')) {
      const gameId = key.substring('cheatLabz_'.length);
      if (gameId === 'soundEnabled' || gameId === 'arena_history' || gameId.startsWith('daily_')) continue;
      try {
        const val = JSON.parse(localStorage.getItem(key));
        let score = 0;
        if (typeof val === 'number') score = val;
        else if (val && typeof val.score === 'number') score = val.score;
        if (score > highest) highest = score;
      } catch (e) {}
    }
  }
  return highest;
}

function getGameRecord(gameId) {
  const saved = Storage.get(gameId, null);
  if (saved && typeof saved === 'object') {
    return saved;
  }
  if (typeof saved === 'number') {
    return { score: saved, runs: 1, history: [saved], trend: 'flat' };
  }
  return { score: 0, runs: 0, history: [], trend: 'flat' };
}

export function updateModalScore(score) {
  const scoreEl = document.getElementById('game-modal-score');
  if (scoreEl) scoreEl.innerText = `SCORE: ${score}`;
}

export function handleGameOver(gameData, score) {
  latestFinishedScore = score;
  
  // Save challenge run if in daily challenge mode
  if (currentActiveConfig && currentActiveConfig.dailyIndex !== undefined) {
    const today = new Date();
    const dateString = `${today.getUTCFullYear()}-${String(today.getUTCMonth()+1).padStart(2,'0')}-${String(today.getUTCDate()).padStart(2,'0')}`;
    const dailyKey = `cheatLabz_daily_${dateString}`;
    
    let completedIds = [];
    try {
      const raw = localStorage.getItem(dailyKey);
      completedIds = raw ? JSON.parse(raw) : [];
    } catch(e) {}
    
    if (!completedIds.includes(gameData.id)) {
      completedIds.push(gameData.id);
      localStorage.setItem(dailyKey, JSON.stringify(completedIds));
    }
  }

  if (window.onArenaGameComplete) {
    window.onArenaGameComplete(score);
  } else {
    // Show results state (which is the Detail Screen but highlighting the latest score)
    const playScreen = document.getElementById('game-playing-screen');
    const detailScreen = document.getElementById('game-detail-screen');
    if (playScreen && detailScreen) {
      // Fade playing screen out
      playScreen.classList.remove('active');
      
      // Stop the game
      if (currentGame) {
        if (typeof currentGame.destroy === 'function') currentGame.destroy();
        currentGame = null;
      }
      
      // Refresh detail screen with results highlight
      renderDetailScreen(gameData.id, score);
      
      // Slide detail screen in
      detailScreen.classList.remove('slide-out');
      detailScreen.classList.add('active');
    }
  }
}
window.handleGameOver = handleGameOver;

window.returnToDetailScreen = () => {
  const playScreen = document.getElementById('game-playing-screen');
  const detailScreen = document.getElementById('game-detail-screen');
  if (playScreen && detailScreen) {
    playScreen.classList.remove('active');
    if (currentGame) {
      if (typeof currentGame.destroy === 'function') currentGame.destroy();
      currentGame = null;
    }
    renderDetailScreen(currentActiveGameId, latestFinishedScore);
    detailScreen.classList.remove('slide-out');
    detailScreen.classList.add('active');
  }
};

window.closeGameModal = () => {
  const modal = document.getElementById('game-modal');
  const detailScreen = document.getElementById('game-detail-screen');
  const playScreen = document.getElementById('game-playing-screen');
  
  if (currentGame) {
    if (typeof currentGame.destroy === 'function') currentGame.destroy();
    currentGame = null;
  }
  
  if (detailScreen) {
    detailScreen.classList.remove('active');
    detailScreen.classList.add('slide-out');
  }
  if (playScreen) {
    playScreen.classList.remove('active');
  }

  setTimeout(() => {
    if (modal) {
      modal.classList.add('hidden');
    }
    // Clear hash so routing doesn't trigger modal re-load repeatedly
    window.location.hash = '';
  }, 250);

  document.removeEventListener('keydown', window._modalEscHandler);
};

window._modalEscHandler = (e) => {
  if (e.key === 'Escape') {
    if (currentGame && currentGame.state === 'PLAYING') {
      return; 
    }
    window.closeGameModal();
  }
};

window.launchGameModal = async (gameId, config = {}) => {
  const foundGame = findGame(gameId);
  if (foundGame) {
    gameId = foundGame.id;
  } else {
    gameId = gameId.toLowerCase().replace(/[\s_]+/g, '-');
  }

  if (window.isGameLocked && window.isGameLocked(gameId)) {
    if (window.showToast) {
      window.showToast('Module is locked! Unlock it in the Library first.', 'warning');
    }
    window.location.hash = '';
    return;
  }

  if (!config.isArena) {
    if (window.awardCoins) {
      window.awardCoins(10, 'Started playing game');
    }
  }

  currentActiveGameId = gameId;
  currentActiveConfig = config;
  latestFinishedScore = null;

  const modal = document.getElementById('game-modal');
  if (!modal) return;

  // Unify internal modal elements dynamic layout
  modal.style.position = 'fixed';
  modal.style.inset = '0';
  modal.style.background = '#060608';
  modal.style.zIndex = '9999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  
  modal.innerHTML = `
    <div id="game-detail-screen" class="game-detail-container"></div>
    <div id="game-playing-screen" class="game-playing-container"></div>
  `;

  renderDetailScreen(gameId);

  modal.classList.remove('hidden');
  
  if (config.isArena) {
    startActiveGame();
  } else {
    const detailScreen = document.getElementById('game-detail-screen');
    // Slide in from right (300ms)
    setTimeout(() => {
      detailScreen.classList.remove('slide-out');
      detailScreen.classList.add('active');
    }, 50);
  }

  document.addEventListener('keydown', window._modalEscHandler);
};

function renderDetailScreen(gameId, highlightedScore = null) {
  const detailScreen = document.getElementById('game-detail-screen');
  if (!detailScreen) return;

  const gameData = findGame(gameId) || { id: gameId, name: gameId, category: 'ARCADE', difficulty: 'MEDIUM', description: '' };
  
  const spec = GAME_SPECS[gameData.id] || { objective: "Survive and set a new high score.", scoring: "Points awarded based on performance.", controls: [{ key: "SPACE", action: "Action" }] };
  const iconSvg = getGameIcon(gameData.id);
  const record = getGameRecord(gameData.id);
  
  // Calculate Avg Score
  let avgScore = '—';
  if (record.history && record.history.length > 0) {
    avgScore = Math.round(record.history.reduce((a, b) => a + b, 0) / record.history.length).toLocaleString();
  }

  // Get Top Score Across All Games
  const highestAcrossAll = getYourTopAcrossAllGames();
  const yourTopStr = highestAcrossAll > 0 ? highestAcrossAll.toLocaleString() : '—';

  // Animation category selection
  let bgClass = 'bg-anim-arcade';
  const catLower = (gameData.category || '').toLowerCase();
  if (catLower === 'puzzle') bgClass = 'bg-anim-puzzle';
  else if (catLower === 'skill') bgClass = 'bg-anim-skill';
  else if (catLower === 'racing') bgClass = 'bg-anim-racing';

  // Difficulty Explanation
  let diffExplanation = "Balanced challenge. Gets harder over time.";
  const diffLower = (gameData.difficulty || '').toLowerCase();
  if (diffLower === 'easy') diffExplanation = "Forgiving. Good for warmup.";
  else if (diffLower === 'hard') diffExplanation = "Punishing. Mistakes cost everything.";

  // Controls cap rendering
  const keycapsHtml = spec.controls.map(ctrl => {
    const keysList = ctrl.key.split(' ');
    const capsMarkup = keysList.map(k => {
      let width = '32px';
      if (k.length > 2) {
        width = 'auto';
      }
      return `<div class="keycap-box" style="min-width: 32px; width: ${width}; height: 32px; padding: 0 8px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px; background: rgba(255, 255, 255, 0.05); box-shadow: 0 2px 0 rgba(255, 255, 255, 0.1); color: #fff; font-family: 'DM Sans', sans-serif; font-size: 12px; font-weight: bold; display: inline-flex; align-items: center; justify-content: center; margin-right: 4px; box-sizing: border-box;">${k}</div>`;
    }).join('<span style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0 4px;">/</span>');

    return `
      <div class="keycap-row" style="display: flex; align-items: center; margin-bottom: 12px; gap: 12px;">
        <div style="display: flex; align-items: center;">${capsMarkup}</div>
        <span style="color: var(--text-secondary); font-family: 'DM Sans', sans-serif; font-size: 13px;">${ctrl.action}</span>
      </div>
    `;
  }).join('');

  // Post game score highlight HTML
  let highlightHtml = '';
  if (highlightedScore !== null) {
    const isNewBest = highlightedScore >= record.score;
    highlightHtml = `
      <div style="background: rgba(108,99,255,0.1); border: 1px solid var(--accent-1); border-radius: 8px; padding: 16px; margin: 20px auto; max-width: 600px; text-align: center; animation: fadeIn 0.3s ease;">
        <span style="font-size: 11px; color: var(--accent-2); font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">LATEST RUN RESULT</span>
        <div style="font-family: 'Press Start 2P', monospace; font-size: 24px; color: #fff; margin: 8px 0;">${highlightedScore.toLocaleString()}</div>
        ${isNewBest ? '<span style="color: var(--accent-4); font-size: 11px; font-weight: bold; letter-spacing: 1px;">★ NEW PERSONAL BEST! ★</span>' : ''}
      </div>
    `;
  }

  const isDaily = currentActiveConfig && currentActiveConfig.dailyIndex !== undefined;

  detailScreen.innerHTML = `
    <!-- Top Section - Game Identity -->
    <div class="detail-header">
      <div class="bg-anim-container ${bgClass}"></div>
      <div style="position: relative; z-index: 1;">
        <div class="icon-80" style="margin: 0 auto 20px auto; color: var(--accent-1);">${iconSvg}</div>
        <h2 style="font-family: 'Press Start 2P', monospace; font-size: 28px; color: #fff; margin-bottom: 12px; text-transform: uppercase;">${gameData.name}</h2>
        <div style="display: flex; gap: 8px; justify-content: center; margin-bottom: 16px;">
          <span class="badge-tag badge-cat" style="padding: 4px 12px; font-size: 10px;">${gameData.category}</span>
          <span class="badge-tag badge-diff" style="padding: 4px 12px; font-size: 10px;">${gameData.difficulty}</span>
        </div>
        <p style="font-family: 'DM Sans', sans-serif; font-size: 15px; color: var(--text-secondary); max-width: 600px; margin: 0 auto; line-height: 1.6;">${gameData.description || gameData.desc || 'No detailed intelligence report available.'}</p>
      </div>
    </div>

    ${highlightHtml}

    <!-- Stats Row -->
    <div class="detail-stats-grid">
      <div class="stat-card">
        <div class="stat-card-title">YOUR BEST</div>
        <div class="stat-card-value">${record.score > 0 ? record.score.toLocaleString() : '—'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">YOUR RUNS</div>
        <div class="stat-card-value">${record.runs || '0'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">YOUR TOP</div>
        <div class="stat-card-value">${yourTopStr}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card-title">AVG SCORE</div>
        <div class="stat-card-value">${avgScore}</div>
      </div>
    </div>

    <!-- How To Play Section -->
    <div style="padding: 0 40px 60px 40px; max-width: 1000px; margin: 0 auto; flex: 1;">
      <h3 style="font-family: 'Press Start 2P', monospace; font-size: 14px; color: var(--accent-2); margin-bottom: 24px; text-transform: uppercase;">HOW TO PLAY</h3>
      <div style="display: grid; grid-template-columns: 1.2fr 1.8fr; gap: 40px;">
        <div>
          <h4 style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 16px;">CONTROLS</h4>
          <div class="keycaps-flex" style="display: block; margin: 0;">
            ${keycapsHtml}
          </div>
        </div>
        <div>
          <h4 style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 12px;">OBJECTIVE</h4>
          <p style="font-size: 14px; color: #fff; margin-bottom: 24px; line-height: 1.5; font-family: 'DM Sans', sans-serif;">${spec.objective}</p>
          
          <h4 style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 12px;">SCORING</h4>
          <p style="font-size: 14px; color: #fff; margin-bottom: 24px; line-height: 1.5; font-family: 'DM Sans', sans-serif;">${spec.scoring}</p>

          <h4 style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); text-transform: uppercase; margin-bottom: 12px;">DIFFICULTY</h4>
          <p style="font-size: 14px; color: #fff; line-height: 1.5; font-family: 'DM Sans', sans-serif;">${diffExplanation}</p>
        </div>
      </div>
    </div>

    <!-- Bottom Action Bar -->
    <div class="detail-action-bar">
      <button id="detail-back-btn" style="display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: bold; background: transparent; border: none; cursor: pointer;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        BACK
      </button>
      <div style="font-family: 'JetBrains Mono', monospace; font-size: 14px; color: var(--text-secondary);">
        BEST: <span style="color: #fff; font-weight: bold; font-size: 16px;">${record.score > 0 ? record.score.toLocaleString() : '0'}</span>
      </div>
      <button id="detail-start-btn" style="background: var(--accent-1); color: #fff; border: none; padding: 12px 32px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: var(--shadow-glow-purple);">
        ${isDaily ? 'START CHALLENGE' : 'START GAME'}
      </button>
    </div>
  `;

  // Bind buttons
  const backBtn = document.getElementById('detail-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (isDaily) {
        window.location.href = 'daily.html';
      } else {
        window.closeGameModal();
      }
    });
  }

  const startBtn = document.getElementById('detail-start-btn');
  if (startBtn) {
    startBtn.addEventListener('click', () => {
      startActiveGame();
    });
  }
}

async function startActiveGame() {
  const detailScreen = document.getElementById('game-detail-screen');
  const playScreen = document.getElementById('game-playing-screen');
  if (!detailScreen || !playScreen) return;

  const gameId = currentActiveGameId;
  const config = currentActiveConfig;

  const gameData = findGame(gameId) || { id: gameId, name: gameId, className: gameId, file: `../games/${gameId}.js` };

  const iconSvg = getGameIcon(gameData.id);
  const displayText = gameData.name ? gameData.name.toUpperCase() : gameId.toUpperCase();
  const record = getGameRecord(gameData.id);

  // Transition states
  detailScreen.classList.remove('active');
  playScreen.classList.add('active');

  // Build playScreen contents (Minimal top bar + HUD bar + Full screen canvas area)
  playScreen.innerHTML = `
    <div style="display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; background: #07070a; position: relative;">
      <div id="gameover-overlay" class="game-overlay" style="display: none; position: absolute; inset: 0; background: rgba(10,10,15,0.98); flex-direction: column; align-items: center; justify-content: center; z-index: 10; border-radius: 8px; font-family: 'DM Sans', sans-serif;">
         <h2 style="font-family: 'Press Start 2P', monospace; font-size: 32px; color: #fff; margin-bottom: 12px; text-shadow: 0 0 15px rgba(255,255,255,0.3);">GAME OVER</h2>
         <div id="new-record-banner" style="display: none; margin-bottom: 24px; background: var(--accent-1); color: #fff; padding: 6px 16px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: bold; letter-spacing: 1px; animation: pulse 1.5s infinite;">★ NEW RECORD ★</div>
         
         <div style="display: flex; gap: 48px; margin-bottom: 40px; text-align: center;">
           <div>
             <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">SCORE</div>
             <div id="gs-gameover-score" style="font-family: 'Press Start 2P', monospace; font-size: 28px; color: var(--accent-1); font-weight: bold;">0</div>
           </div>
           <div>
             <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">BEST</div>
             <div id="gs-gameover-best" style="font-family: 'Press Start 2P', monospace; font-size: 28px; color: #fff; font-weight: bold;">0</div>
           </div>
         </div>
         
         <!-- Score Breakdown Container -->
         <div id="score-breakdown" style="width: 80%; max-width: 400px; margin-bottom: 24px;"></div>
         
         <div style="display: flex; gap: 16px;">
           <button id="btn-gameover-retry" style="background: var(--accent-1); color: #fff; border: none; padding: 12px 28px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: bold; cursor: pointer; box-shadow: var(--shadow-glow-purple);">
             RETRY [R]
           </button>
           <button id="btn-gameover-back" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 12px 28px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: bold; cursor: pointer;">
             BACK [ESC]
           </button>
         </div>
      </div>
      <!-- Minimal Top Bar -->
      <div class="playing-top-bar" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; background: rgba(9, 9, 11, 0.95); border-bottom: 1px solid rgba(255, 255, 255, 0.08); z-index: 1010; height: 56px; box-sizing: border-box;">
        <!-- LEFT: game name + small icon -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="icon-24" style="color: var(--accent-1); display: flex; align-items: center;">${iconSvg}</div>
          <span style="font-family: 'Press Start 2P', monospace; font-size: 12px; color: #fff; text-transform: uppercase;">${displayText}</span>
        </div>
        
        <!-- CENTER: live score (updates every frame) -->
        <div id="game-score" style="font-family: 'Press Start 2P', monospace; font-size: 16px; color: var(--neon); text-align: center; flex: 1;">SCORE: 0</div>
        
        <!-- RIGHT: personal best + pause button (SVG icon) -->
        <div style="display: flex; align-items: center; gap: 16px;">
          <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-secondary);">BEST: <strong style="color: #fff;">${record.score.toLocaleString()}</strong></span>
          <button id="pause-game-btn" style="background: transparent; border: none; padding: 4px; cursor: pointer; color: #fff; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;" title="Pause Game">
            <svg id="pause-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="14" y="4" width="4" height="16" rx="1"></rect>
              <rect x="6" y="4" width="4" height="16" rx="1"></rect>
            </svg>
          </button>
        </div>
      </div>
      
      <!-- Secondary HUD row for game metrics -->
      <div id="game-hud-bar" style="display: flex; justify-content: center; align-items: center; gap: 24px; padding: 8px 24px; background: rgba(16, 16, 24, 0.8); border-bottom: 1px solid rgba(255, 255, 255, 0.05); z-index: 1009; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #fff; min-height: 36px; box-sizing: border-box;">
        <span id="game-lives" style="display: none;">LIVES: 3</span>
        <span id="game-level" style="display: none;">LEVEL: 1</span>
        <span id="game-time" style="display: none;">TIME: 0.0s</span>
        <span id="game-laps" style="display: none;">LAPS: 0/3</span>
        <span id="game-combo" style="display: none; color: var(--accent-4); font-weight: bold;">COMBO!</span>
        <span id="drift-score" style="display: none; color: var(--neon);">DRIFT: 0</span>
        <span id="game-collision" style="display: none; color: var(--danger);">COLLISION!</span>
        <span id="game-miss" style="display: none; color: var(--danger);">MISS!</span>
        <span id="game-flash" style="display: none;">FLASH!</span>
        <span id="game-spike" style="display: none; color: var(--accent-3);">SPIKES!</span>
        <canvas id="minimap-canvas" width="40" height="40" style="display: none; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; background: #000;"></canvas>
      </div>
      
      <!-- Game Container (Full Width) -->
      <div id="game-canvas-container" style="flex: 1; position: relative; display: flex; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; overflow: hidden; height: calc(100% - 92px);">
        <canvas id="game-canvas" style="display: block; box-shadow: 0 20px 50px rgba(0,0,0,0.6); border: 2px solid #2a2a3a; border-radius: 8px; max-width: 100%; max-height: 100%; object-fit: contain;"></canvas>
      </div>
    </div>
  `;

  // Bind top bar pause button
  const pauseBtn = document.getElementById('pause-game-btn');
  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (currentGame) {
        if (currentGame.state === 'PLAYING') {
          currentGame.pause();
        } else if (currentGame.state === 'PAUSED') {
          currentGame.resume();
        }
      }
    });
  }

  const retryBtn = document.getElementById('btn-gameover-retry');
    if (retryBtn) retryBtn.onclick = () => this.start();

    const backBtn = document.getElementById('btn-gameover-back');
    if (backBtn) backBtn.onclick = () => this.quit();

    // Render score breakdown if available
    if (typeof this.currentGame?.getScoreBreakdown === 'function') {
      const breakdown = this.currentGame.getScoreBreakdown();
      renderScoreBreakdown(breakdown);
    } 

  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  // Add loading indicator
  const gameContainer = document.getElementById('game-canvas-container');
  if (gameContainer) {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'game-loading';
    loadingDiv.id = 'game-loading-indicator';
    loadingDiv.innerHTML = `
      <div class="game-loading-bar"></div>
      <span>Loading ${displayText}...</span>
    `;
    gameContainer.appendChild(loadingDiv);
  }

  // Load Game Module
  try {
    // Determine module path: use explicit file if provided, otherwise default to standard games folder
    const path = gameData.file
      ? new URL(gameData.file, window.location.href).href
      : `../games/${gameData.id}.js`;
    const module = await import(path);
    
    // Always use default export per step 6
    const GameClass = module.default;
    
    if (!GameClass) {
      showToast('Game not found: ' + (gameData.name || gameData.id), 'error');
      window.closeGameModal();
      return;
    }
    
    const finalConfig = {
      ...config,
      id: gameData.id,
      name: gameData.name,
      onScoreChange: (score) => updateModalScore(score),
      onGameOver: (score) => handleGameOver(gameData, score)
    };

    currentGame = new GameClass(canvas, finalConfig);
    currentGame.onScoreChange = finalConfig.onScoreChange;
    
    const loadingIndicator = document.getElementById('game-loading-indicator');
    if (loadingIndicator) loadingIndicator.remove();

    if (typeof currentGame.init === 'function') {
      currentGame.init();
    } else if (typeof currentGame.showInstructions === 'function') {
      currentGame.showInstructions();
    } else if (typeof currentGame.start === 'function') {
      currentGame.start();
    }
  } catch (err) {
    console.error('Game load error:', err);
    showToast('Failed to load ' + (gameData.name || gameData.id), 'error');
    window.closeGameModal();
  }
}
