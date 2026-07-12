import { initArena } from '../ui/arena.js';

export default class ArenaPage {
  constructor() {
    this.html = `
  <!-- SECTION 1 — ARENA HERO -->
  <div class="arena-hero">
    <canvas class="arena-hero-bg" id="hero-particles"></canvas>
    <div class="arena-hero-content">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="14" y1="4" x2="20" y2="10"></line><line x1="4" y1="20" x2="10" y2="14"></line><line x1="20" y1="4" x2="4" y2="20"></line><line x1="14" y1="20" x2="20" y2="14"></line><line x1="4" y1="4" x2="10" y2="10"></line></svg>
      <h1>ARENA MODE</h1>
      <p>3 rounds. Escalating difficulty. No mercy.</p>
      <div class="arena-stats-row">
        <div class="arena-stat">
          <span>YOUR BEST</span>
          <strong id="arena-best">0</strong>
        </div>
        <div class="arena-stat">
          <span>LAST ARENA</span>
          <strong id="arena-last">—</strong>
        </div>
        <div class="arena-stat">
          <span>ARENAS PLAYED</span>
          <strong id="arena-count">0</strong>
        </div>
      </div>
    </div>
  </div>

  <!-- DAILY ARENA CHALLENGE -->
  <div class="daily-arena-wrapper">
    <div class="daily-arena-card">
      <div class="dac-badge">DAILY CHALLENGE</div>
      <div class="dac-content">
        <h3>TODAY'S GAUNTLET</h3>
        <p>3 pre-selected games in sequence. Global daily challenge — resets at midnight.</p>
        <div class="dac-games" id="daily-games-container">
          <!-- Injected via JS -->
        </div>
      </div>
      <button class="btn-daily-arena" id="btn-daily-play">
        PLAY DAILY GAUNTLET
      </button>
    </div>
  </div>

  <div class="arena-container">
    <!-- SECTION 2 — CATEGORY SELECTOR -->
    <div class="arena-category-selector">
      <h2>CHOOSE YOUR BATTLEFIELD</h2>
      <div class="arena-cat-tabs" id="arena-cat-tabs">
        <button class="arena-cat-tab active" data-cat="all">ALL GAMES</button>
        <button class="arena-cat-tab" data-cat="arcade">ARCADE GAUNTLET</button>
        <button class="arena-cat-tab" data-cat="skill">SKILL TRIAL</button>
        <button class="arena-cat-tab" data-cat="puzzle">MIND BENDER</button>
        <button class="arena-cat-tab" data-cat="racing">SPEED RUN</button>
      </div>
    </div>

    <!-- SECTION 3 — GAME SELECTION GRID -->
    <div class="arena-grid-layout" id="arena-tiles-container">
      <!-- Injected via JS -->
    </div>
  </div>

  <!-- SECTION 4 — ARENA LAUNCH PANEL -->
  <div class="arena-launch-panel" id="arena-launch">
    <div class="launch-game-preview">
      <div id="launch-icon"></div>
      <div>
        <div class="launch-game-name" id="launch-name">GAME NAME</div>
        <div class="launch-game-desc" id="launch-desc">Description</div>
      </div>
    </div>
    <div class="launch-round-info">
      <div><span>ROUND 1</span> Normal</div>
      <div><span>ROUND 2</span> 1.5× Speed</div>
      <div><span>ROUND 3</span> 2.0× Speed</div>
    </div>
    <button id="start-arena-btn" class="btn-arena-start">
      START ARENA
    </button>
  </div>

  <!-- ARENA ROUND TRANSITION CINEMATIC -->
  <div class="round-complete-overlay" id="round-transition">
    <div class="rc-round" id="rc-title">ROUND 1 COMPLETE</div>
    <div class="rc-score" id="rc-score">0</div>
    <div class="rc-next" id="rc-next-title">ROUND 2 STARTING IN</div>
    <div class="rc-countdown" id="rc-countdown">3</div>
  </div>

  <!-- ARENA RESULTS SCREEN -->
  <div class="arena-results" id="arena-results">
    <h2>ARENA COMPLETE</h2>
    <div class="results-breakdown">
      <div class="result-row">
        <span>ROUND 1</span>
        <span class="r-score" id="res-r1-score">0</span>
        <span class="r-diff">NORMAL</span>
      </div>
      <div class="result-row">
        <span>ROUND 2</span>
        <span class="r-score" id="res-r2-score">0</span>
        <span class="r-diff">1.5× SPEED</span>
      </div>
      <div class="result-row">
        <span>ROUND 3</span>
        <span class="r-score" id="res-r3-score">0</span>
        <span class="r-diff">2.0× SPEED</span>
      </div>
      <div class="result-total">
        <span>TOTAL</span>
        <span class="r-total" id="res-total-score">0</span>
      </div>
    </div>
    <div class="results-actions">
      <button class="btn-re" onclick="location.href='arena.html'">PLAY AGAIN</button>
      <button class="btn-se" onclick="location.href='games.html'">BROWSE GAMES</button>
      <button class="btn-se" onclick="location.href='leaderboard.html'">VIEW LEADERBOARD</button>
    </div>
  </div>

  <!-- Global Game Modal (Recycled for Arena) -->
  <div id="game-modal" class="hidden" style="position: fixed; inset: 0; background: #000; z-index: 9999; display: flex; flex-direction: column;">
    <div style="padding: 16px 24px; background: rgba(9,9,11,0.9); border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
      <button id="close-game" style="background: transparent; border: 1px solid var(--danger); color: var(--danger); padding: 8px 16px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px; cursor: pointer;">← FORFEIT ARENA</button>
      <span id="game-modal-title" style="font-family: 'Press Start 2P', monospace; font-size: 12px; color: var(--danger);">ROUND 1/3</span>
      <span id="game-modal-score" style="font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: bold; color: #fff;">TOTAL SCORE: 0</span>
    </div>
    
    <!-- Active Modifiers HUD inside game -->
    <div id="arena-hud-mods" style="position: absolute; top: 80px; left: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 100;"></div>

    <div id="game-canvas-container" style="flex: 1; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden;">
      <canvas id="game-canvas"></canvas>
    </div>
  </div>
    `;
  }
  async mount(params, container) {
    container.innerHTML = this.html;
    if (typeof initArena === 'function') {
      initArena();
    }
  }
  async unmount() {
    // Unbind events if necessary
  }
}
