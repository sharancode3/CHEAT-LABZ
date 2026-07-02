/**
 * js/ui/game-detail.js
 * 
 * Phase 3: The minimal right-panel detail screen.
 * Contains Game Identity, Stats, Level Selector, Controls, and Start Button.
 */

import { Storage } from '../core/storage.js';
import { GAMES } from '../core/game-manifest.js';
import { GAME_ICONS } from '../../assets/icons/game-icons.js';

let currentSelectedLevel = 1;
let currentStartCallback = null;

const MOCK_LEVEL_DESCRIPTIONS = [
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

function getGameRecord(gameId) {
  const saved = Storage.get(gameId, null);
  if (saved && typeof saved === 'object') {
    return saved;
  }
  if (typeof saved === 'number') {
    return { score: saved, runs: 1, history: [saved], highestLevel: 1 };
  }
  return { score: 0, runs: 0, history: [], highestLevel: 1 };
}

export function renderDetailScreen(gameId, containerEl, onStartCallback, initialLevel = null) {
  const game = GAMES.find(g => g.id === gameId);
  if (!game) {
    containerEl.innerHTML = `<div style="padding:24px; color:#fff;">Unknown Game ID</div>`;
    return;
  }

  currentStartCallback = onStartCallback;
  const record = getGameRecord(game.id);
  
  if (initialLevel !== null) {
    currentSelectedLevel = initialLevel;
  } else {
    // Default to the highest reached level or 1
    currentSelectedLevel = record.highestLevel || 1;
  }

  const icon = GAME_ICONS[game.id] || GAME_ICONS['default'] || '🎮';
  const accent = game.accentColor || '#6c63ff';

  containerEl.innerHTML = `
    <style>
      .detail-wrapper {
        padding: 24px;
        color: #ffffff;
        font-family: 'DM Sans', sans-serif;
      }

      /* Section 1: Identity */
      .id-section {
        margin-bottom: 32px;
      }
      .id-icon {
        width: 40px;
        height: 40px;
        color: ${accent};
        margin-bottom: 16px;
        font-size: 40px;
        line-height: 1;
      }
      .id-title {
        font-size: 22px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      .id-category {
        display: inline-block;
        font-size: 11px;
        background: rgba(255,255,255,0.05); /* Adjusted via JS below */
        border: 1px solid rgba(255,255,255,0.1); /* Adjusted via JS below */
        color: ${accent};
        padding: 2px 8px;
        border-radius: 12px;
        margin-bottom: 12px;
        text-transform: uppercase;
      }
      .id-desc {
        font-size: 14px;
        color: rgba(255,255,255,0.6);
        line-height: 1.6;
      }

      /* Section 2: Stats */
      .stats-section {
        display: flex;
        align-items: center;
        gap: 24px;
        margin-bottom: 32px;
      }
      .stat-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .stat-label {
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: rgba(255,255,255,0.35);
      }
      .stat-value {
        font-size: 18px;
        font-weight: 600;
      }
      .stat-divider {
        width: 1px;
        height: 24px;
        background: rgba(255,255,255,0.06);
      }

      /* Section 3: Level Selector */
      .section-title {
        font-size: 11px;
        text-transform: uppercase;
        color: rgba(255,255,255,0.35);
        margin-bottom: 12px;
      }
      .level-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }
      .level-btn {
        height: 44px;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        transition: background 0.15s ease, border 0.15s ease, transform 0.15s ease;
        font-family: 'DM Sans', sans-serif;
      }
      .level-btn.unplayed {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        color: rgba(255,255,255,0.3);
      }
      .level-btn.played {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        color: rgba(255,255,255,0.7);
      }
      .level-btn.completed {
        background: rgba(108, 99, 255, 0.12); /* Will be overridden by inline style */
        border: 1px solid rgba(108, 99, 255, 0.25);
        color: ${accent};
      }
      .level-btn.selected {
        background: rgba(108, 99, 255, 0.2);
        border: 2px solid ${accent} !important;
        color: #ffffff !important;
        font-weight: bold;
        transform: scale(1.05);
      }
      .level-btn:hover {
        background-color: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.25);
      }
      .level-btn.selected:hover {
        background-color: rgba(108, 99, 255, 0.24);
        border-color: ${accent};
      }
      .level-dot {
        width: 4px;
        height: 4px;
        background: ${accent};
        border-radius: 50%;
        margin-top: 2px;
      }
      .level-check {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 8px;
        height: 8px;
        fill: ${accent};
      }
      .level-number {
        font-size: 14px;
      }

      .level-desc {
        font-size: 13px;
        color: rgba(255,255,255,0.35);
        font-style: italic;
        margin-bottom: 32px;
        height: 20px;
        transition: opacity 0.2s ease;
      }

      /* Section 4: Controls */
      .controls-section {
        margin-bottom: 32px;
      }
      .control-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }
      .control-caps {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .key-cap {
        min-width: 28px;
        height: 24px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        border-bottom: 2px solid rgba(255,255,255,0.2);
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 6px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: rgba(255,255,255,0.8);
      }
      .key-or {
        font-size: 10px;
        color: rgba(255,255,255,0.3);
      }
      .control-arrow {
        width: 8px;
        height: 8px;
        opacity: 0.3;
        fill: #ffffff;
      }
      .control-action {
        font-size: 12px;
        color: rgba(255,255,255,0.5);
      }

      /* Section 5: Start Button */
      .btn-start {
        width: 100%;
        height: 48px;
        border-radius: 8px;
        background: ${accent};
        color: #ffffff;
        border: none;
        font-family: 'DM Sans', sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: filter 0.15s ease, transform 0.1s ease;
      }
      .btn-start:hover {
        filter: brightness(1.1);
        transform: scale(1.01);
      }
      .btn-start:active {
        transform: scale(0.98);
      }
      .btn-start:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    </style>

    <div class="detail-wrapper">
      <!-- Section 1 -->
      <div class="id-section">
        <div class="id-icon">${icon}</div>
        <div class="id-title">${game.name}</div>
        <div class="id-category" style="background: ${hexToRgb(accent, 0.15)}; border-color: ${hexToRgb(accent, 0.3)};">
          ${game.category || 'Arcade'}
        </div>
        <div class="id-desc">${game.description || 'No description available.'}</div>
      </div>

      <!-- Section 2 -->
      <div class="stats-section">
        <div class="stat-item">
          <span class="stat-label">BEST</span>
          <span class="stat-value">${record.score || 0}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">RUNS</span>
          <span class="stat-value">${record.runs || 0}</span>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-item">
          <span class="stat-label">LEVEL</span>
          <span class="stat-value">${record.highestLevel || 1}</span>
        </div>
      </div>

      <!-- Section 3 -->
      <div class="section-title">SELECT LEVEL</div>
      <div class="level-grid" id="level-grid">
        ${renderLevelGrid(record.highestLevel || 1, accent)}
      </div>
      <div class="level-desc" id="level-desc">
        ${MOCK_LEVEL_DESCRIPTIONS[currentSelectedLevel - 1] || 'Level info not available.'}
      </div>

      <!-- Section 4 -->
      <div class="controls-section">
        <div class="section-title">HOW TO PLAY</div>
        ${renderControls(game.controls)}
      </div>

      <!-- Section 5 -->
      <button class="btn-start" id="btn-start">
        START LEVEL ${currentSelectedLevel}
      </button>
    </div>
  `;

  // Bind Level Selector
  const grid = containerEl.querySelector('#level-grid');
  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.level-btn');
    if (!btn) return;
    
    // UI update
    containerEl.querySelectorAll('.level-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    
    currentSelectedLevel = parseInt(btn.dataset.level, 10);
    
    // Description animation
    const descEl = containerEl.querySelector('#level-desc');
    descEl.style.opacity = '0';
    setTimeout(() => {
      descEl.textContent = MOCK_LEVEL_DESCRIPTIONS[currentSelectedLevel - 1] || 'Level info not available.';
      descEl.style.opacity = '1';
    }, 200);

    // Update button text
    containerEl.querySelector('#btn-start').textContent = `START LEVEL ${currentSelectedLevel}`;
  });

  // Bind Start Button
  containerEl.querySelector('#btn-start').addEventListener('click', () => {
    if (currentStartCallback) {
      currentStartCallback(currentSelectedLevel);
    }
  });
}

export function updateStartButtonState(text, disabled = true) {
  const btn = document.getElementById('btn-start');
  if (btn) {
    btn.textContent = text;
    btn.disabled = disabled;
  }
}

function renderLevelGrid(highestReached, accent) {
  let html = '';
  for (let i = 1; i <= 10; i++) {
    let stateClass = 'unplayed';
    let extraHtml = '';
    
    if (i < highestReached) {
      stateClass = 'completed';
      extraHtml = `<svg class="level-check" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"></polyline></svg>`;
    } else if (i === highestReached) {
      stateClass = 'played';
      extraHtml = `<div class="level-dot"></div>`;
    }

    const selectedClass = (i === currentSelectedLevel) ? 'selected' : '';
    
    html += `
      <div class="level-btn ${stateClass} ${selectedClass}" data-level="${i}" 
           ${stateClass === 'completed' ? `style="background: ${hexToRgb(accent, 0.12)}; border-color: ${hexToRgb(accent, 0.25)};"` : ''}>
        <span class="level-number">${i}</span>
        ${extraHtml}
      </div>
    `;
  }
  return html;
}

function renderControls(controlsConfig) {
  if (!controlsConfig || controlsConfig.length === 0) {
    return `<div style="font-size:12px; color:rgba(255,255,255,0.5);">Use arrow keys or WASD to play.</div>`;
  }

  let html = '';
  controlsConfig.forEach(ctrl => {
    // Attempt to parse WASD/Arrow combinations
    const keys = ctrl.key.split(' ');
    
    let capsHtml = '';
    if (keys.length > 1) {
      // E.g., ['W', 'Up']
      capsHtml = `
        <div class="key-cap">${formatKey(keys[0])}</div>
        <div class="key-or">or</div>
        <div class="key-cap">${formatKey(keys[1])}</div>
      `;
    } else {
      capsHtml = `<div class="key-cap">${formatKey(keys[0])}</div>`;
    }

    html += `
      <div class="control-row">
        <div class="control-caps">${capsHtml}</div>
        <svg class="control-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" stroke="currentColor" stroke-width="2" fill="none"></polyline></svg>
        <div class="control-action">${ctrl.action}</div>
      </div>
    `;
  });
  return html;
}

function formatKey(keyStr) {
  if (keyStr.toLowerCase() === 'arrowup' || keyStr.toLowerCase() === 'up') return '↑';
  if (keyStr.toLowerCase() === 'arrowdown' || keyStr.toLowerCase() === 'down') return '↓';
  if (keyStr.toLowerCase() === 'arrowleft' || keyStr.toLowerCase() === 'left') return '←';
  if (keyStr.toLowerCase() === 'arrowright' || keyStr.toLowerCase() === 'right') return '→';
  if (keyStr.toLowerCase() === 'space') return 'SPACE';
  return keyStr.toUpperCase();
}

function hexToRgb(hex, alpha) {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  if (result) {
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
  }
  return `rgba(255,255,255,${alpha})`;
}
