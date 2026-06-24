import { Storage } from '../core/storage.js';
import { GameState } from '../core/events.js';
import { GAME_ICONS } from '../../assets/icons/game-icons.js';

/**
 * Base class that all games extend.
 * Ensures a consistent lifecycle, standardized overlay states, and keyboard routing.
 */
export class GameShell {
  /**
   * @param {string} canvasId - The ID of the canvas element
   * @param {Object} config - { name, description, instructions[], controls{}, width, height }
   */
  constructor(canvasOrId, config) {
    this.canvas = typeof canvasOrId === 'string' ? document.getElementById(canvasOrId) : canvasOrId;
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      if (config.width) this.canvas.width = config.width;
      if (config.height) this.canvas.height = config.height;
      
      // Accessibility
      this.canvas.setAttribute('role', 'application');
      this.canvas.setAttribute('aria-label', `${config.name} game canvas`);
      this.canvas.tabIndex = 0; // Make canvas focusable if needed
    }
    
    this.config = config;
    
    // Arena Mode Multiplier Support
    const urlParams = new URLSearchParams(window.location.search);
    const mult = urlParams.get('mult');
    if (mult) {
      this.config.difficultyMultiplier = parseFloat(mult);
    } else {
      this.config.difficultyMultiplier = 1.0;
    }

    this.state = 'INSTRUCTIONS'; // INSTRUCTIONS, PLAYING, PAUSED, GAMEOVER
    this.score = 0;
    this.highScore = Storage.get(config.name, 0);
    
    this._animationFrameId = null;
    this._lastTime = 0;
    
    // Bind methods
    this.loop = this.loop.bind(this);
    this.handleInput = this.handleInput.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    
    if (this.canvas && this.canvas.parentElement) {
      this.resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          const rect = entry.contentRect;
          // Scale canvas to fit container while maintaining aspect ratio
          const targetRatio = config.width / config.height;
          const containerRatio = rect.width / rect.height;
          
          let finalWidth, finalHeight;
          if (containerRatio > targetRatio) {
            // Container is wider than needed, bound by height
            finalHeight = rect.height;
            finalWidth = rect.height * targetRatio;
          } else {
            // Container is taller than needed, bound by width
            finalWidth = rect.width;
            finalHeight = rect.width / targetRatio;
          }
          
          this.canvas.style.width = `${finalWidth}px`;
          this.canvas.style.height = `${finalHeight}px`;
        }
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  /**
   * Initializes the game and shows the instruction overlay
   */
  init() {
    this._ensureOverlays();
    this.state = 'INSTRUCTIONS';
    this.score = 0;
    GameState.registerGame(this);
    this.showInstructions();
    this.draw(); // Initial draw of the background/board
  }

  /**
   * Show the instructions overlay
   */
  showInstructions() {
    this._showOverlay('instruction-screen');
    const titleEl = document.getElementById('gs-instruction-title');
    const descEl = document.getElementById('gs-instruction-desc');
    if (titleEl) titleEl.innerText = this.config.name.toUpperCase();
    if (descEl) descEl.innerText = this.config.description || '';
    
    // Draw the state so the user sees the first frame of the game behind the overlay
    this.draw();
  }

  /**
   * Starts or restarts the game
   */
  start() {
    this._hideAllOverlays();
    this.state = 'PLAYING';
    this.score = 0;
    this._lastTime = performance.now();
    
    // Call subclass setup if defined
    if (typeof this.onStart === 'function') {
      this.onStart();
    }
    
    this._animationFrameId = requestAnimationFrame(this.loop);
  }

  /**
   * Pauses the game
   */
  pause() {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    cancelAnimationFrame(this._animationFrameId);
    this._showOverlay('pause-screen');
  }

  /**
   * Resumes a paused game
   */
  resume() {
    if (this.state !== 'PAUSED') return;
    this._hideAllOverlays();
    this.state = 'PLAYING';
    this._lastTime = performance.now();
    this._animationFrameId = requestAnimationFrame(this.loop);
  }

  handleVisibilityChange() {
    if (document.hidden && this.state === 'PLAYING') {
      this.pause();
    }
  }

  gameOver() {
    this.state = 'GAMEOVER';
    cancelAnimationFrame(this._animationFrameId);
    
    const isArena = !!this.config.difficultyMultiplier && this.config.difficultyMultiplier !== 1.0;

    // Normal mode
    let isNewRecord = this.score > this.highScore;
    if (isNewRecord) {
      this.highScore = this.score;
      Storage.set(this.config.name, this.highScore);
    }
    
    // Do not show local gameover overlay if Arena mode handles it
    if (isArena) {
      if (window.onArenaGameComplete) window.onArenaGameComplete(this.score);
    } else {
      this._showOverlay('gameover-screen', { isNewRecord });
      const scoreEl = document.getElementById('final-score');
      const bestEl = document.getElementById('best-score-display');
      
      if (bestEl) bestEl.innerText = this.highScore.toLocaleString();
      if (scoreEl) {
        this._animateScore(scoreEl, this.score);
      }
    }
    
    // Call subclass teardown if defined
    if (typeof this.onGameOver === 'function') {
      this.onGameOver();
    }
  }

  /**
   * The main game loop powered by requestAnimationFrame
   * @param {number} timestamp 
   */
  loop(timestamp) {
    if (this.state !== 'PLAYING') return;

    const deltaTime = timestamp - this._lastTime;
    this._lastTime = timestamp;

    this.update(deltaTime);
    this.draw();

    this._animationFrameId = requestAnimationFrame(this.loop);
  }

  /**
   * To be overridden by subclasses. Updates game logic.
   * @param {number} deltaTime 
   */
  update(deltaTime) {
    // Override this
  }

  /**
   * To be overridden by subclasses. Renders the game.
   */
  draw() {
    // Override this
  }

  /**
   * Called by the global event manager
   * @param {string} key 
   * @param {KeyboardEvent} event 
   */
  handleInput(key, event) {
    if (this.state === 'INSTRUCTIONS' && key === ' ') {
      this.start();
      return;
    }

    if (this.state === 'PLAYING' && key === 'p') {
      this.pause();
      return;
    }

    if (this.state === 'PAUSED' && key === 'p') {
      this.resume();
      return;
    }

    if (this.state === 'GAMEOVER') {
      if (key === 'r') {
        this.start();
      } else if (key === 'escape') {
        this.quit();
      }
      return;
    }

    // Pass to subclass if it has custom handling
    if (this.state === 'PLAYING' && typeof this.onInput === 'function') {
      this.onInput(key, event);
    }
  }

  /**
   * Called by global event manager for keyup events
   */
  handleKeyUp(key, event) {
    if (this.state === 'PLAYING' && typeof this.onKeyUp === 'function') {
      this.onKeyUp(key, event);
    }
  }

  /**
   * Cleans up the game entirely
   */
  destroy() {
    cancelAnimationFrame(this._animationFrameId);
    GameState.unregisterGame();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  quit() {
    this.destroy();
    const closeBtn = document.getElementById('close-game');
    if (closeBtn) closeBtn.click();
  }

  updateScore(newScore) {
    this.score = newScore;
    const el = document.getElementById('live-score');
    if (el) el.innerText = this.score.toLocaleString();
  }

  // --- UI Helpers ---

  _ensureOverlays() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const parent = this.canvas.parentElement;
    
    if (document.querySelector('.game-ui-overlay')) return;

    const iconSvg = GAME_ICONS[this.config.id] || GAME_ICONS['default'] || '';
    const name = this.config.name.toUpperCase();
    const desc = this.config.description || '';

    let controlsHTML = '';
    if (this.config.controls) {
      controlsHTML = Object.entries(this.config.controls).map(([key, action]) => `
        <div class="control-row" style="display:flex; align-items:center; gap:12px; margin-bottom:8px; color:#fff;">
          <div class="key-cap" style="background:#222; border:1px solid #444; border-radius:4px; padding:4px 12px; font-family:monospace;">${key.toUpperCase()}</div>
          <span>${action}</span>
        </div>
      `).join('');
    }

    const overlayHTML = `
<div class="game-ui-overlay" style="position: absolute; inset: 0; pointer-events: none; display: flex; flex-direction: column; z-index: 10;">
  
  <!-- TOP BAR -->
  <div class="game-topbar" style="display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); pointer-events: auto;">
    <div class="game-topbar-left" style="display: flex; align-items: center; gap: 12px;">
      <div class="game-icon-small" style="width: 24px; height: 24px; color: var(--accent-1);">${iconSvg}</div>
      <span class="game-name-label font-display" style="color: #fff; font-size: 14px;">${name}</span>
    </div>
    <div class="game-topbar-center">
      <div class="score-display" style="text-align: center;">
        <span class="score-label" style="display: block; font-size: 10px; color: var(--text-muted); letter-spacing: 2px;">SCORE</span>
        <span class="score-value font-display" id="live-score" style="font-size: 24px; color: #fff;">0</span>
      </div>
    </div>
    <div class="game-topbar-right" style="display: flex; align-items: center; gap: 24px;">
      <div class="best-display" style="text-align: right;">
        <span class="best-label" style="display: block; font-size: 10px; color: var(--text-muted); letter-spacing: 2px;">BEST</span>
        <span class="best-value font-display" id="live-best" style="font-size: 16px; color: var(--accent-2);">${this.highScore.toLocaleString()}</span>
      </div>
      <button class="pause-btn" id="ui-pause-btn" title="Pause (P)" style="background: none; border: none; color: #fff; cursor: pointer; padding: 4px; transition: transform 0.2s;">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
      </button>
    </div>
  </div>

  <div style="flex: 1; position: relative;">
    <!-- INSTRUCTION SCREEN -->
    <div class="instruction-overlay hidden" id="instruction-screen" style="position: absolute; inset: 0; background: rgba(10,10,15,0.85); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; pointer-events: auto;">
      <div class="instruction-card" style="background: #111; border: 1px solid #333; border-radius: 12px; padding: 40px; text-align: center; max-width: 500px;">
        <div class="inst-icon" style="width: 64px; height: 64px; margin: 0 auto 24px; color: var(--accent-1);">${iconSvg}</div>
        <h2 class="inst-title font-display" style="font-size: 32px; color: #fff; margin-bottom: 12px;">${name}</h2>
        <p class="inst-desc" style="color: var(--text-secondary); margin-bottom: 32px; line-height: 1.5;">${desc}</p>
        <div class="inst-controls" style="display: flex; flex-direction: column; align-items: center; gap: 8px; margin-bottom: 40px;">
          ${controlsHTML}
        </div>
        <button class="inst-start-btn font-display" id="ui-start-btn" style="background: var(--accent-1); color: #000; border: none; padding: 16px 32px; border-radius: 8px; font-size: 16px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);">
          PRESS SPACE TO START
        </button>
      </div>
    </div>

    <!-- PAUSE OVERLAY -->
    <div class="pause-overlay hidden" id="pause-screen" style="position: absolute; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; pointer-events: auto;">
      <div class="pause-card" style="text-align: center;">
        <h2 class="font-display" style="font-size: 48px; color: #fff; margin-bottom: 16px; letter-spacing: 4px;">PAUSED</h2>
        <div class="pause-actions" style="display: flex; flex-direction: column; gap: 16px; width: 240px; margin: 0 auto;">
          <button id="resume-btn" style="background: #222; color: #fff; border: 1px solid #444; padding: 16px; font-family: inherit; cursor: pointer; transition: background 0.2s;">RESUME (P)</button>
          <button id="restart-btn" style="background: #222; color: #fff; border: 1px solid #444; padding: 16px; font-family: inherit; cursor: pointer; transition: background 0.2s;">RESTART (R)</button>
          <button id="quit-btn" style="background: transparent; color: var(--danger); border: 1px solid var(--danger); padding: 16px; font-family: inherit; cursor: pointer; transition: background 0.2s;">QUIT (ESC)</button>
        </div>
      </div>
    </div>

    <!-- GAME OVER OVERLAY -->
    <div class="gameover-overlay hidden" id="gameover-screen" style="position: absolute; inset: 0; background: rgba(10,10,15,0.95); display: flex; align-items: center; justify-content: center; pointer-events: auto;">
      <div class="gameover-card" style="text-align: center; width: 100%; max-width: 600px;">
        <h2 class="go-title font-display" style="font-size: 64px; color: #fff; margin-bottom: 48px; text-shadow: 0 0 40px rgba(255,255,255,0.2);">GAME OVER</h2>
        
        <div class="go-score-section" style="display: flex; justify-content: center; gap: 64px; margin-bottom: 48px;">
          <div class="go-score">
            <span style="display: block; font-size: 14px; color: var(--text-muted); letter-spacing: 2px; margin-bottom: 8px;">YOUR SCORE</span>
            <strong id="final-score" class="font-display" style="font-size: 56px; color: var(--accent-1); text-shadow: 0 0 20px rgba(139, 92, 246, 0.5);">0</strong>
          </div>
          <div class="go-best">
            <span style="display: block; font-size: 14px; color: var(--text-muted); letter-spacing: 2px; margin-bottom: 8px;">BEST</span>
            <strong id="best-score-display" class="font-display" style="font-size: 56px; color: #fff;">0</strong>
          </div>
        </div>

        <div class="new-record-banner hidden" id="new-record" style="color: #ffd93d; font-family: 'Press Start 2P', monospace; font-size: 16px; margin-bottom: 48px; animation: pulse 1s infinite;">
          ★ NEW RECORD! ★
        </div>

        <div class="go-actions" style="display: flex; justify-content: center; gap: 24px;">
          <button id="retry-btn" class="font-display" style="background: #fff; color: #000; border: none; padding: 16px 40px; border-radius: 4px; font-size: 18px; cursor: pointer; transition: transform 0.2s;">RETRY (R)</button>
          <button id="back-btn" class="font-display" style="background: transparent; color: var(--text-secondary); border: 1px solid #444; padding: 16px 40px; border-radius: 4px; font-size: 18px; cursor: pointer; transition: color 0.2s, border-color 0.2s;">BACK (ESC)</button>
        </div>
      </div>
    </div>
  </div>
</div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = overlayHTML;
    while (wrapper.firstChild) {
      parent.appendChild(wrapper.firstChild);
    }

    // Bind UI buttons
    document.getElementById('ui-pause-btn')?.addEventListener('click', () => {
      this.state === 'PLAYING' ? this.pause() : this.resume();
    });
    document.getElementById('ui-start-btn')?.addEventListener('click', () => this.start());
    document.getElementById('resume-btn')?.addEventListener('click', () => this.resume());
    document.getElementById('restart-btn')?.addEventListener('click', () => this.start());
    document.getElementById('quit-btn')?.addEventListener('click', () => this.quit());
    document.getElementById('retry-btn')?.addEventListener('click', () => this.start());
    document.getElementById('back-btn')?.addEventListener('click', () => this.quit());
  }

  _showOverlay(id, data = {}) {
    this._hideAllOverlays();
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.classList.remove('hidden');
      
      if (data.isNewRecord && id === 'gameover-screen') {
        this._showNewRecord(overlay);
      }
    }
  }

  _hideAllOverlays() {
    const overlays = ['instruction-screen', 'pause-screen', 'gameover-screen'];
    overlays.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
  }

  _animateScore(element, targetScore) {
    const start = performance.now();
    const duration = 800;
    const startVal = 0;
    
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startVal + (targetScore - startVal) * eased);
      element.textContent = current.toLocaleString();
      
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  _showNewRecord(containerEl) {
    const banner = document.getElementById('new-record');
    if (banner) banner.classList.remove('hidden');
    
    // 20 particles burst outward
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.className = 'record-particle';
      const angle = (i / 20) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      particle.style.cssText = `
        position: absolute;
        width: 6px; height: 6px;
        border-radius: 50%;
        background: #ffd93d;
        left: 50%; top: 50%;
        --tx: ${Math.cos(angle) * distance}px;
        --ty: ${Math.sin(angle) * distance}px;
        animation: particle-burst 600ms ease-out forwards;
        z-index: -1;
      `;
      // Append right behind the banner
      if (banner) {
        banner.appendChild(particle);
      } else {
        containerEl.appendChild(particle);
      }
      setTimeout(() => particle.remove(), 700);
    }
  }
}
