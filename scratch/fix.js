const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '../js/ui/game-modal.js');
let lines = fs.readFileSync(file, 'utf8').split('\n');

const cssStart = lines.findIndex(l => l.includes('.game-modal-shell {'));
const cssEnd = lines.findIndex((l, i) => i > cssStart && l.includes('/* HUD overlays */'));

const cssReplacement = `    .game-modal-shell {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: grid;
      grid-template-columns: minmax(320px, 400px) minmax(0, 1fr);
      background-color: #060608;
      transform: translateY(100%);
      transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .game-modal-shell.active {
      transform: translateY(0);
    }
    .game-sidebar {
      background: #111118;
      border-right: 1px solid rgba(255, 255, 255, 0.07);
      padding: 28px 24px;
      box-sizing: border-box;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }
    .game-sidebar::-webkit-scrollbar { width: 4px; }
    .game-sidebar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.1); }
    .game-sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.25); }

    .game-workspace {
      background: #0a0a0f;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      overflow: hidden;
    }
    
    .game-viewport-container {
      position: relative;
      width: 100%;
      height: 100%;
      max-height: 85vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    #game-canvas {
      display: block;
      background: #000;
      outline: none;
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      aspect-ratio: 1 / 1;
      object-fit: contain;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }
`;

lines.splice(cssStart, cssEnd - cssStart, cssReplacement);

const htmlStart = lines.findIndex(l => l.includes('modal.className = \\'game-modal-shell\\';'));
const htmlEnd = lines.findIndex((l, i) => i > htmlStart && l.trim() === '`;');

const htmlReplacement = `  modal.className = 'game-modal-shell';
  modal.innerHTML = \\\`
    <!-- LEFT SIDEBAR -->
    <div class="game-sidebar">
      <!-- Back Button -->
      <button class="back-btn" id="modal-close-btn" style="display: flex; align-items: center; gap: 8px; background: transparent; border: none; color: rgba(255,255,255,0.6); font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; padding: 0; margin-bottom: 8px; align-self: flex-start; transition: color 200ms;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" style="width: 16px; height: 16px; stroke-width: 2;">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back
      </button>

      <!-- BLOCK 1: Game Identity -->
      <div class="block-1">
        <div class="identity-row">
          <div class="identity-icon">\\\${getGameIcon(gameId)}</div>
          <div class="identity-names">
            <div class="identity-name">\\\${game.name}</div>
            <div class="identity-category">\\\${game.category || 'ARCADE'}</div>
          </div>
        </div>
        <div class="identity-desc">\\\${game.description || ''}</div>
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

    <!-- RIGHT WORKSPACE -->
    <div class="game-workspace">
      <!-- HUD Top -->
      <div class="hud-top">
        <div class="hud-level" id="hud-level-label">LEVEL 1</div>
        <div class="hud-score" id="hud-score-label">0</div>
      </div>

      <!-- Canvas Wrapper -->
      <div class="game-viewport-container">
        <canvas id="game-canvas" width="800" height="800"></canvas>
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
    </div>\\\`;
`;

lines.splice(htmlStart, htmlEnd - htmlStart + 1, htmlReplacement);

fs.writeFileSync(file, lines.join('\n'));
console.log('Done!');
