/**
 * js/ui/game-detail.js
 *
 * Renders the pre-game details screen inside the modal wrapper.
 * Displays stats, difficulty settings, control diagrams, and ambient background animations.
 *
 * Phase 3: Premium polish with animated icons, sparkline charts,
 *          difficulty emoji indicators, and enhanced visual hierarchy.
 */

import { Storage } from '../core/storage.js';
import { GAMES } from '../core/game-manifest.js';
import { GAME_ICONS } from '../../assets/icons/game-icons.js';

function getGameIcon(gameId) {
  return GAME_ICONS[gameId] || GAME_ICONS['default'] || '🎮';
}

function getGameRecord(gameId) {
  const saved = Storage.get(gameId, null);
  if (saved && typeof saved === 'object') {
    return saved;
  }
  if (typeof saved === 'number') {
    return { score: saved, runs: 1, history: [saved] };
  }
  return { score: 0, runs: 0, history: [] };
}

export function renderDetailScreen(gameId, containerEl, onStartCallback, onBackCallback, selectedDifficulty = 'MEDIUM') {
  const game = GAMES.find(g => g.id === gameId);
  if (!game) {
    containerEl.innerHTML = `<div style="padding:40px; text-align:center;">Unknown Game ID: ${gameId}</div>`;
    return;
  }

  const icon = getGameIcon(game.id);
  const record = getGameRecord(game.id);

  // Compute Stats
  const bestScore = record.score || 0;
  const runsCount = record.runs || (record.history ? record.history.length : 0);
  
  let avgScore = '—';
  if (record.history && record.history.length > 0) {
    avgScore = Math.round(record.history.reduce((a, b) => a + b, 0) / record.history.length).toLocaleString();
  }

  // Last Played (approximate based on saved runs / mock date)
  let lastPlayed = 'Never';
  if (runsCount > 0) {
    lastPlayed = 'Recently';
  }

  // Accent Color & Background Gradient
  const accent = game.accentColor || '#6c63ff';
  const accentRgb = hexToRgb(accent);
  
  // Ambient Animations based on Category
  let ambientAnimationHtml = '';
  const cat = (game.category || '').toUpperCase();
  if (cat === 'ARCADE') {
    ambientAnimationHtml = `
      <div class="ambient-shapes">
        <span class="amb-shape amb-circle" style="left:15%; top:20%; width:40px; height:40px;"></span>
        <span class="amb-shape amb-square" style="left:75%; top:15%; width:30px; height:30px; transform: rotate(45deg);"></span>
        <span class="amb-shape amb-circle" style="left:80%; top:70%; width:50px; height:50px;"></span>
      </div>
    `;
  } else if (cat === 'PUZZLE') {
    ambientAnimationHtml = `
      <div class="ambient-grid"></div>
    `;
  } else if (cat === 'SKILL') {
    ambientAnimationHtml = `
      <div class="ambient-rings">
        <span class="amb-ring" style="width:120px; height:120px; animation-delay:0s;"></span>
        <span class="amb-ring" style="width:200px; height:200px; animation-delay:1s;"></span>
      </div>
    `;
  } else if (cat === 'RACING') {
    ambientAnimationHtml = `
      <div class="ambient-lines">
        <span class="amb-line" style="top:30%; animation-duration:4s;"></span>
        <span class="amb-line" style="top:60%; animation-duration:6s;"></span>
      </div>
    `;
  }

  // Sparkline for returning players (>2 runs)
  const hasSparkline = record.history && record.history.length >= 2;
  const sparklineId = `sparkline-${Date.now()}`;

  // Keycap markup creation
  const keycapsHtml = (game.controls || []).map(ctrl => {
    const keys = ctrl.key.split(' ');
    const caps = keys.map(k => `<div class="keycap-box-detail">${k}</div>`).join('<span style="color:rgba(255,255,255,0.2); font-size:12px; margin:0 3px;">/</span>');
    return `
      <div style="display:flex; align-items:center; margin-bottom:12px; gap:16px;">
        <div style="display:flex; align-items:center; gap:2px;">${caps}</div>
        <span style="font-family:'DM Sans',sans-serif; font-size:14px; color:#b8b8d0;">${ctrl.action}</span>
      </div>
    `;
  }).join('');

  // Assemble HTML Content
  containerEl.innerHTML = `
    <style>
      .detail-screen-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background-color: #060608;
        font-family: 'DM Sans', sans-serif;
        color: #fff;
        overflow-y: auto;
        overflow-x: hidden;
      }
      
      /* Header with Radial Gradient & Ambient animations */
      .detail-header-block {
        position: relative;
        width: 100%;
        min-height: 260px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 36px 24px;
        box-sizing: border-box;
        border-bottom: 1px solid rgba(255,255,255,0.04);
        background: 
          radial-gradient(circle at 80% 20%, rgba(${accentRgb}, 0.12) 0%, transparent 55%),
          radial-gradient(circle at 20% 80%, rgba(${accentRgb}, 0.06) 0%, transparent 50%);
        overflow: hidden;
      }
      
      /* Ambient Category Animations CSS */
      .ambient-shapes, .ambient-grid, .ambient-rings, .ambient-lines {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        opacity: 0.04;
      }
      .amb-shape {
        position: absolute;
        border: 2px solid #fff;
        animation: floatShape 8s infinite ease-in-out alternate;
      }
      .amb-circle { border-radius: 50%; }
      @keyframes floatShape {
        from { transform: translateY(0px) rotate(0deg); }
        to { transform: translateY(-20px) rotate(360deg); }
      }
      
      .ambient-grid {
        background-image: linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
        background-size: 30px 30px;
        animation: pulseGrid 4s infinite alternate;
      }
      @keyframes pulseGrid {
        from { opacity: 0.3; }
        to { opacity: 0.7; }
      }

      .ambient-rings {
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .amb-ring {
        position: absolute;
        border: 2px solid #fff;
        border-radius: 50%;
        animation: pulseRing 3s infinite linear;
      }
      @keyframes pulseRing {
        from { transform: scale(0.6); opacity: 1; }
        to { transform: scale(1.4); opacity: 0; }
      }

      .ambient-lines {
        width: 100%;
        height: 100%;
      }
      .amb-line {
        position: absolute;
        left: -100px;
        width: 100px;
        height: 2px;
        background: #fff;
        animation: slideLine 5s infinite linear;
      }
      @keyframes slideLine {
        from { left: -100px; }
        to { left: 100%; }
      }

      /* Logo & Identifiers */
      .detail-icon {
        font-size: 60px;
        margin-bottom: 14px;
        filter: drop-shadow(0 8px 12px rgba(${accentRgb}, 0.3));
        z-index: 1;
        animation: detailIconFloat 3.5s ease-in-out infinite;
      }
      @keyframes detailIconFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      .detail-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 22px;
        text-transform: uppercase;
        margin-bottom: 10px;
        z-index: 1;
        letter-spacing: 1px;
      }
      .detail-tagline {
        font-size: 14px;
        color: rgba(255,255,255,0.45);
        max-width: 500px;
        line-height: 1.5;
        z-index: 1;
      }

      /* Stats strip */
      .detail-stats-strip {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border-bottom: 1px solid rgba(255,255,255,0.04);
        background: rgba(255,255,255,0.01);
      }
      .detail-stat-card {
        padding: 14px;
        text-align: center;
        border-right: 1px solid rgba(255,255,255,0.04);
        position: relative;
      }
      .detail-stat-card:last-child { border-right: none; }
      .detail-stat-card::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 20%;
        right: 20%;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba(${accentRgb}, 0.08), transparent);
      }
      .detail-stat-label {
        font-size: 9px;
        font-family: 'JetBrains Mono', monospace;
        color: rgba(255,255,255,0.25);
        font-weight: 700;
        letter-spacing: 1.5px;
        margin-bottom: 4px;
        text-transform: uppercase;
      }
      .detail-stat-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 18px;
        font-weight: bold;
        color: #fff;
      }

      /* Sparkline mini chart in stats */
      .detail-sparkline-wrap {
        grid-column: span 4;
        height: 32px;
        padding: 4px 16px;
        background: rgba(255,255,255,0.01);
        border-top: 1px solid rgba(255,255,255,0.03);
      }
      .detail-sparkline-canvas {
        width: 100%;
        height: 100%;
        display: block;
      }

      /* Contents */
      .detail-content-body {
        padding: 28px 40px;
        max-width: 800px;
        width: 100%;
        margin: 0 auto;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 28px;
      }

      /* Difficulty Segment buttons */
      .difficulty-segment-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .diff-segment-title {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px;
        color: rgba(255,255,255,0.3);
        letter-spacing: 1.5px;
        text-transform: uppercase;
        font-weight: 700;
      }
      .diff-buttons-group {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
      }
      .diff-btn {
        background: rgba(255,255,255,0.02);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 10px;
        padding: 14px;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s ease;
        box-sizing: border-box;
      }
      .diff-btn:hover {
        background: rgba(255,255,255,0.04);
        border-color: rgba(255,255,255,0.12);
      }
      .diff-btn.selected {
        border-color: ${accent};
        background: rgba(${accentRgb}, 0.06);
        box-shadow: 0 4px 16px rgba(${accentRgb}, 0.1), inset 0 0 0 1px rgba(${accentRgb}, 0.08);
      }
      .diff-btn-header {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
      }
      .diff-btn-emoji {
        font-size: 14px;
      }
      .diff-btn-name {
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: bold;
        color: rgba(255,255,255,0.7);
      }
      .diff-btn.selected .diff-btn-name {
        color: ${accent};
      }
      .diff-btn-desc {
        font-size: 11px;
        color: rgba(255,255,255,0.3);
      }
      .diff-multiplier {
        float: right;
        font-size: 10px;
        background: rgba(255,255,255,0.04);
        padding: 2px 6px;
        border-radius: 4px;
        color: rgba(255,255,255,0.5);
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
      }
      .diff-btn.selected .diff-multiplier {
        background: ${accent};
        color: #fff;
      }

      /* Guide layout grid */
      .guide-grid {
        display: grid;
        grid-template-columns: 1.2fr 1.8fr;
        gap: 40px;
      }

      /* Accordion styles */
      .accordion-section {
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 8px;
        overflow: hidden;
      }
      .accordion-trigger {
        background: rgba(255,255,255,0.02);
        padding: 14px 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: bold;
        color: rgba(255,255,255,0.7);
        cursor: pointer;
        border: none;
        width: 100%;
        text-align: left;
        letter-spacing: 0.5px;
      }
      .accordion-trigger:hover {
        background: rgba(255,255,255,0.04);
      }
      .accordion-content {
        padding: 14px 16px;
        background: rgba(0,0,0,0.2);
        border-top: 1px solid rgba(255,255,255,0.04);
        font-size: 13px;
        color: rgba(255,255,255,0.5);
        line-height: 1.6;
        display: none;
      }
      .accordion-section.expanded .accordion-content {
        display: block;
      }

      .keycap-box-detail {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 32px;
        height: 32px;
        padding: 0 6px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-bottom-width: 3px;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.03);
        color: #fff;
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px;
        font-weight: bold;
        box-sizing: border-box;
        box-shadow: inset 0 -1px 2px rgba(0,0,0,0.3), 0 1px 3px rgba(0,0,0,0.15);
        transition: transform 0.15s ease;
      }
      .keycap-box-detail:hover {
        transform: translateY(-1px);
      }

      /* Action Strip */
      .detail-action-strip {
        margin-top: auto;
        padding: 16px 40px;
        border-top: 1px solid rgba(255,255,255,0.04);
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(6,6,8,0.92);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
      .start-button-main {
        background: rgba(${accentRgb}, 0.06);
        color: ${accent};
        font-family: 'Press Start 2P', monospace;
        font-size: 10px;
        font-weight: bold;
        border: 1.5px solid rgba(${accentRgb}, 0.4);
        padding: 11px 22px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease-in-out;
        text-shadow: 0 0 6px rgba(${accentRgb}, 0.2);
        box-shadow: inset 0 0 8px rgba(${accentRgb}, 0.08);
        letter-spacing: 0.5px;
      }
      .start-button-main:hover {
        background: ${accent};
        color: #060608;
        transform: translateY(-1px);
        box-shadow: 0 0 20px rgba(${accentRgb}, 0.3);
        text-shadow: none;
        border-color: ${accent};
      }
      .start-button-main:active {
        transform: translateY(0);
      }
      .back-btn-detail {
        background: transparent;
        border: none;
        display: flex;
        align-items: center;
        gap: 8px;
        color: rgba(255,255,255,0.35);
        font-family: 'JetBrains Mono', monospace;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        transition: color 0.15s ease;
        letter-spacing: 0.5px;
      }
      .back-btn-detail:hover {
        color: rgba(255,255,255,0.7);
      }
    </style>

    <div class="detail-screen-wrapper">
      <!-- Header -->
      <div class="detail-header-block">
        ${ambientAnimationHtml}
        <div class="detail-icon">${icon}</div>
        <h2 class="detail-title">${game.name}</h2>
        <p class="detail-tagline">${game.description || "Establish control, maximize scores, and rise in the cyber ranking."}</p>
      </div>

      <!-- Stats -->
      <div class="detail-stats-strip">
        <div class="detail-stat-card">
          <div class="detail-stat-label">YOUR BEST</div>
          <div class="detail-stat-value">${bestScore > 0 ? bestScore.toLocaleString() : '—'}</div>
        </div>
        <div class="detail-stat-card">
          <div class="detail-stat-label">YOUR RUNS</div>
          <div class="detail-stat-value">${runsCount}</div>
        </div>
        <div class="detail-stat-card">
          <div class="detail-stat-label">AVG SCORE</div>
          <div class="detail-stat-value">${avgScore}</div>
        </div>
        <div class="detail-stat-card">
          <div class="detail-stat-label">LAST PLAYED</div>
          <div class="detail-stat-value">${lastPlayed}</div>
        </div>
        ${hasSparkline ? `
          <div class="detail-sparkline-wrap">
            <canvas class="detail-sparkline-canvas" id="${sparklineId}"></canvas>
          </div>
        ` : ''}
      </div>

      <!-- Content Grid -->
      <div class="detail-content-body">
        
        <!-- Difficulty (Only for Solo Games) -->
        ${game.type === 'solo' ? `
          <div class="difficulty-segment-container">
            <div class="diff-segment-title">Select Intensity Level</div>
            <div class="diff-buttons-group">
              <button class="diff-btn ${selectedDifficulty === 'EASY' ? 'selected' : ''}" data-diff="EASY">
                <span class="diff-multiplier">×1.0</span>
                <div class="diff-btn-header">
                  <span class="diff-btn-emoji">🟢</span>
                  <div class="diff-btn-name">EASY</div>
                </div>
                <div class="diff-btn-desc">Forgiving. Perfect for warmup.</div>
              </button>
              <button class="diff-btn ${selectedDifficulty === 'MEDIUM' ? 'selected' : ''}" data-diff="MEDIUM">
                <span class="diff-multiplier">×1.5</span>
                <div class="diff-btn-header">
                  <span class="diff-btn-emoji">🟡</span>
                  <div class="diff-btn-name">MEDIUM</div>
                </div>
                <div class="diff-btn-desc">Balanced. Intended difficulty.</div>
              </button>
              <button class="diff-btn ${selectedDifficulty === 'HARD' ? 'selected' : ''}" data-diff="HARD">
                <span class="diff-multiplier">×2.0</span>
                <div class="diff-btn-header">
                  <span class="diff-btn-emoji">🔴</span>
                  <div class="diff-btn-name">HARD</div>
                </div>
                <div class="diff-btn-desc">Brutal speed. Mistakes cost lives.</div>
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Guide split -->
        <div class="guide-grid">
          <!-- Left: Controls -->
          <div>
            <div class="diff-segment-title" style="margin-bottom:16px;">CONTROLS</div>
            ${keycapsHtml}
          </div>
          <!-- Right: Instructions / Objective -->
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div>
              <div class="diff-segment-title" style="margin-bottom:8px;">OBJECTIVE</div>
              <p style="font-size:14px; color:rgba(255,255,255,0.65); line-height:1.5; margin:0;">${game.howToPlay}</p>
            </div>
            
            <div class="accordion-section expanded">
              <button class="accordion-trigger">
                <span>SCORING PARAMETERS</span>
                <span class="accordion-arrow">▼</span>
              </button>
              <div class="accordion-content">
                ${game.scoringExplanation}
              </div>
            </div>

            <div class="accordion-section">
              <button class="accordion-trigger">
                <span>TACTICAL INTELLIGENCE</span>
                <span class="accordion-arrow">▶</span>
              </button>
              <div class="accordion-content">
                • Continuous streaks build multipliers fast.<br>
                • Under high-speed phases, safety routes are superior to risky scoring tags.<br>
                • Learn key positions. The physical key alignment yields maximum muscle memory advantage.
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Action Strip -->
      <div class="detail-action-strip">
        <button class="back-btn-detail" id="detail-back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          BACK TO GRID
        </button>
        
        <button class="start-button-main" id="detail-start-btn">
          START GAME
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
        </button>
      </div>
    </div>
  `;

  // Render sparkline if available
  if (hasSparkline) {
    requestAnimationFrame(() => {
      renderDetailSparkline(sparklineId, record.history, accent);
    });
  }

  // Bind Accordion Click events
  const accordions = containerEl.querySelectorAll('.accordion-section');
  accordions.forEach(acc => {
    const trigger = acc.querySelector('.accordion-trigger');
    const arrow = acc.querySelector('.accordion-arrow');
    trigger.addEventListener('click', () => {
      const isExpanded = acc.classList.contains('expanded');
      
      // Collapse all
      accordions.forEach(a => {
        a.classList.remove('expanded');
        const arr = a.querySelector('.accordion-arrow');
        if (arr) arr.textContent = '▶';
      });

      // Toggle current
      if (!isExpanded) {
        acc.classList.add('expanded');
        if (arrow) arrow.textContent = '▼';
      }
    });
  });

  // Bind Difficulty Selector
  let selectedDiff = selectedDifficulty;
  const diffButtons = containerEl.querySelectorAll('.diff-btn');
  diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      diffButtons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedDiff = btn.getAttribute('data-diff');
    });
  });

  // Bind Start Button
  containerEl.querySelector('#detail-start-btn').addEventListener('click', () => {
    onStartCallback(selectedDiff);
  });

  // Bind Back Button
  containerEl.querySelector('#detail-back-btn').addEventListener('click', () => {
    onBackCallback();
  });
}

// Render a mini sparkline chart in the stats strip
function renderDetailSparkline(canvasId, history, accent) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const wrap = canvas.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.resetTransform();
  ctx.scale(dpr, dpr);

  const last10 = history.slice(-10);
  const maxVal = Math.max(...last10, 1);
  const accentRgb = hexToRgb(accent);
  const padding = { top: 4, bottom: 2, left: 12, right: 12 };
  const plotW = w - padding.left - padding.right;
  const plotH = h - padding.top - padding.bottom;

  // Area fill
  ctx.beginPath();
  last10.forEach((val, i) => {
    const x = padding.left + (i / (last10.length - 1)) * plotW;
    const y = padding.top + (1 - val / maxVal) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(padding.left + plotW, padding.top + plotH);
  ctx.lineTo(padding.left, padding.top + plotH);
  ctx.closePath();
  ctx.fillStyle = `rgba(${accentRgb}, 0.06)`;
  ctx.fill();

  // Line
  ctx.beginPath();
  last10.forEach((val, i) => {
    const x = padding.left + (i / (last10.length - 1)) * plotW;
    const y = padding.top + (1 - val / maxVal) * plotH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Dots
  last10.forEach((val, i) => {
    const x = padding.left + (i / (last10.length - 1)) * plotW;
    const y = padding.top + (1 - val / maxVal) * plotH;
    ctx.beginPath();
    ctx.arc(x, y, i === last10.length - 1 ? 2.5 : 1.5, 0, Math.PI * 2);
    ctx.fillStyle = i === last10.length - 1 ? accent : `rgba(${accentRgb}, 0.4)`;
    ctx.fill();
  });
}

// Utility to convert hex color to rgb array format for CSS radial gradients
function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  const fullHex = hex.replace(shorthandRegex, (m, r, g, b) => r + r + g + g + b + b);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '108, 99, 255';
}
