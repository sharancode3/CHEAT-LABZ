import { Storage } from '../core/storage.js';
import { GameState } from '../core/events.js';

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
    this._showOverlay('instructions-overlay');
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
    this._showOverlay('pause-overlay');
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

  /**
   * Ends the game, saves score, and shows game over screen
   */
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
      // Arena overrides game over handling
    } else {
      this._showOverlay('gameover-overlay', { isNewRecord });
      const scoreEl = document.getElementById('gs-gameover-score');
      const bestEl = document.getElementById('gs-gameover-best');
      if (scoreEl) scoreEl.innerText = this.score;
      if (bestEl) bestEl.innerText = this.highScore;
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

  /**
   * Quits the current game entirely, unregisters, and returns to the game list
   */
  quit() {
    this.destroy();
    
    // When using the modal system, quitting just clicks the back button.
    const closeBtn = document.getElementById('close-game');
    if (closeBtn) closeBtn.click();
  }

  // --- UI Helpers ---

  _ensureOverlays() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const parent = this.canvas.parentElement;
    
    if (document.getElementById('instructions-overlay')) return;

    const overlayHTML = `
      <div id="instructions-overlay" class="game-overlay" style="display: none; position: absolute; inset: 0; background: rgba(10,10,15,0.9); flex-direction: column; align-items: center; justify-content: center; z-index: 10;">
        <h2 id="gs-instruction-title" class="font-display" style="font-size: 32px; color: var(--accent-1); margin-bottom: 16px;"></h2>
        <p id="gs-instruction-desc" style="max-width: 400px; text-align: center; line-height: 1.5; margin-bottom: 32px;"></p>
        <div class="font-display" style="animation: pulse 1.5s infinite; color: #fff;">PRESS SPACE TO START</div>
      </div>

      <div id="pause-overlay" class="game-overlay" style="display: none; position: absolute; inset: 0; background: rgba(10,10,15,0.9); flex-direction: column; align-items: center; justify-content: center; z-index: 10;">
        <h2 class="font-display" style="font-size: 32px; color: #fff; margin-bottom: 32px;">PAUSED</h2>
        <div class="font-display" style="color: var(--text-secondary); font-size: 14px; margin-bottom: 16px;">[P] RESUME</div>
        <div class="font-display" style="color: var(--text-secondary); font-size: 14px; margin-bottom: 16px;">[R] RESTART</div>
        <div class="font-display" style="color: var(--text-secondary); font-size: 14px;">[ESC] QUIT</div>
      </div>

      <div id="gameover-overlay" class="game-overlay" style="display: none; position: absolute; inset: 0; background: rgba(10,10,15,0.95); flex-direction: column; align-items: center; justify-content: center; z-index: 10;">
        <h2 class="font-display" style="font-size: 48px; color: #fff; margin-bottom: 8px;">GAME OVER</h2>
        <div id="new-record-banner" class="badge badge-purple" style="display: none; margin-bottom: 24px;">NEW RECORD</div>
        <div style="display: flex; gap: 32px; margin-bottom: 32px; text-align: center;">
          <div>
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">SCORE</div>
            <div id="gs-gameover-score" class="font-display" style="font-size: 32px; color: var(--accent-1);">0</div>
          </div>
          <div>
            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 8px;">BEST</div>
            <div id="gs-gameover-best" class="font-display" style="font-size: 32px; color: #fff;">0</div>
          </div>
        </div>
        <div class="font-display" style="color: var(--text-secondary); font-size: 14px; margin-bottom: 16px;">[R] RETRY</div>
        <div class="font-display" style="color: var(--text-secondary); font-size: 14px;">[ESC] BACK</div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = overlayHTML;
    while (wrapper.firstChild) {
      parent.appendChild(wrapper.firstChild);
    }
  }

  _showOverlay(id, data = {}) {
    this._hideAllOverlays();
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.style.display = 'flex';
      overlay.classList.add('fade-in');
      
      if (data.isNewRecord && id === 'gameover-overlay') {
        const recordBanner = document.getElementById('new-record-banner');
        if (recordBanner) {
          recordBanner.style.display = 'block';
          this._spawnConfetti();
        }
      }
    }
  }

  _spawnConfetti() {
    for (let i = 0; i < 50; i++) {
      const conf = document.createElement('div');
      conf.style.position = 'fixed';
      conf.style.width = '8px';
      conf.style.height = '8px';
      conf.style.backgroundColor = ['#ff6b6b', '#00d4aa', '#6c63ff', '#ffd93d'][Math.floor(Math.random() * 4)];
      conf.style.left = '50%';
      conf.style.top = '50%';
      conf.style.zIndex = '2000';
      conf.style.pointerEvents = 'none';
      conf.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
      document.body.appendChild(conf);

      const angle = Math.random() * Math.PI * 2;
      const velocity = 5 + Math.random() * 15;
      const vx = Math.cos(angle) * velocity;
      let vy = Math.sin(angle) * velocity - 5;
      
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;
      let rot = 0;
      let rotV = (Math.random() - 0.5) * 20;

      let frame;
      const anim = () => {
        x += vx;
        vy += 0.5; // gravity
        y += vy;
        rot += rotV;
        
        conf.style.transform = `translate(${x - window.innerWidth/2}px, ${y - window.innerHeight/2}px) rotate(${rot}deg)`;
        
        if (y > window.innerHeight) {
          conf.remove();
        } else {
          frame = requestAnimationFrame(anim);
        }
      };
      frame = requestAnimationFrame(anim);
    }
  }

  _hideAllOverlays() {
    const overlays = ['instructions-overlay', 'pause-overlay', 'gameover-overlay'];
    overlays.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }
}