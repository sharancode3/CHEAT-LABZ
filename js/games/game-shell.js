import { Storage } from '../core/storage.js';
import { GameState } from '../core/events.js';
import { renderScoreBreakdown } from '../ui/ScoreBreakdown.js';

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
      this.canvas.width = config.width || 800;
      this.canvas.height = config.height || 600;
      
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

    const gameId = config.id || (config.name ? config.name.toLowerCase().replace(/\s+/g, '-') : 'unknown');
    this.gameId = gameId;

    const saved = Storage.get(gameId, null);
    if (saved && typeof saved === 'object' && 'score' in saved) {
      this.highScore = saved.score;
    } else {
      const oldScore = Storage.get(config.name, 0);
      this.highScore = typeof oldScore === 'number' ? oldScore : (oldScore && oldScore.score || 0);
    }
    
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
          // Scale canvas to fit container while maintaining aspect ratio, with 85% scale for breathing space
          const w = config.width || 800;
          const h = config.height || 600;
          const targetRatio = w / h;
          
          const maxW = rect.width * 0.85;
          const maxH = rect.height * 0.85;
          const containerRatio = maxW / maxH;
          
          let finalWidth, finalHeight;
          if (containerRatio > targetRatio) {
            // Container is wider than needed, bound by height
            finalHeight = maxH;
            finalWidth = maxH * targetRatio;
          } else {
            // Container is taller than needed, bound by width
            finalWidth = maxW;
            finalHeight = maxW / targetRatio;
          }
          
          this.canvas.style.width = `${finalWidth}px`;
          this.canvas.style.height = `${finalHeight}px`;
        }
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  init() {
    this._ensureOverlays();
    this.state = 'INSTRUCTIONS';
    this.score = 0;
    GameState.registerGame(this);
    this.showInstructions();
    try {
      this.draw(); // Initial draw of the background/board
    } catch (e) {
      console.warn("Early draw bypassed:", e.message);
      this.drawFallbackBackground();
    }
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
    try {
      this.draw();
    } catch (e) {
      console.warn("Early draw bypassed:", e.message);
      this.drawFallbackBackground();
    }
  }

  drawFallbackBackground() {
    if (this.ctx && this.canvas) {
      this.ctx.fillStyle = '#0a0a0f';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
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

    // Update pause button icon if present in top bar
    const pauseBtn = document.getElementById('pause-game-btn');
    if (pauseBtn) {
      pauseBtn.innerHTML = `
        <svg id="pause-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
      `;
      pauseBtn.title = "Resume Game";
    }
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

    // Update pause button icon if present in top bar
    const pauseBtn = document.getElementById('pause-game-btn');
    if (pauseBtn) {
      pauseBtn.innerHTML = `
        <svg id="pause-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="14" y="4" width="4" height="16" rx="1"></rect>
          <rect x="6" y="4" width="4" height="16" rx="1"></rect>
        </svg>
      `;
      pauseBtn.title = "Pause Game";
    }
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

    let isNewRecord = false;

    // Normal mode
    if (!isArena) {
      const gameId = this.gameId;
      const saved = Storage.get(gameId, null);
      
      let record = { score: 0, runs: 0, history: [], trend: 'flat' };
      if (saved && typeof saved === 'object') {
        record = { ...record, ...saved };
      } else if (typeof saved === 'number') {
        record.score = saved;
      }
      
      record.runs = (record.runs || 0) + 1;
      if (!record.history) record.history = [];
      record.history.push(this.score);
      
      let trend = 'flat';
      if (record.history.length > 1) {
        const prev = record.history[record.history.length - 2];
        if (this.score > prev) trend = 'up';
        else if (this.score < prev) trend = 'down';
      }
      record.trend = trend;
      
      isNewRecord = this.score > record.score;
      if (this.score > record.score) {
        record.score = this.score;
      }
      record.lastPlayed = Date.now();
      
      Storage.set(gameId, record);
      this.highScore = record.score;

      // Award coins and check bounties for regular game completes
      if (!isArena) {
        if (window.awardCoins) {
          window.awardCoins(20, `Completed ${gameId}`);
          if (isNewRecord) {
            window.awardCoins(50, `New best in ${gameId}!`);
          }
        }
        
        const bountyKey = `cheatLabz_bounty_${gameId}`;
        try {
          const raw = localStorage.getItem(bountyKey);
          if (raw) {
            const bounty = JSON.parse(raw);
            if (bounty.accepted && !bounty.completed && this.score >= bounty.target && Date.now() <= bounty.expiresAt) {
              bounty.completed = true;
              localStorage.setItem(bountyKey, JSON.stringify(bounty));
              
              if (window.awardCoins) {
                window.awardCoins(500, `Completed bounty for ${gameId}`);
              }
              if (window.showToast) {
                window.showToast(`Bounty Completed! +500 AP`, 'success');
              }
            }
          }
        } catch(e) {}
      }
    }
    
    // Do not show local gameover overlay if Arena mode handles it
    if (isArena) {
      // Arena overrides game over handling
    } else {
      this._showOverlay('gameover-overlay', { isNewRecord });
      
      // If the game has a generateScoreBreakdown method (or passes this.scoreBreakdown data), render it
      let breakdownData = null;
      if (typeof this.generateScoreBreakdown === 'function') {
        breakdownData = this.generateScoreBreakdown();
      } else if (this.scoreBreakdown) {
        breakdownData = this.scoreBreakdown;
      }
      
      const scoreBreakdownContainer = document.getElementById('score-breakdown');
      const standardScoreBlock = document.getElementById('gs-standard-score-block');
      
      if (breakdownData && scoreBreakdownContainer) {
        if (standardScoreBlock) standardScoreBlock.style.display = 'none';
        scoreBreakdownContainer.style.display = 'block';
        renderScoreBreakdown(breakdownData);
      } else {
        if (scoreBreakdownContainer) scoreBreakdownContainer.style.display = 'none';
        if (standardScoreBlock) standardScoreBlock.style.display = 'flex';
        const scoreEl = document.getElementById('gs-gameover-score');
        const bestEl = document.getElementById('gs-gameover-best');
        if (scoreEl) scoreEl.innerText = this.score;
        if (bestEl) bestEl.innerText = this.highScore;
      }
    }
    
    // Call subclass teardown if defined
    if (typeof this.onGameOver === 'function') {
      this.onGameOver();
    }
  }

  /**
   * Returns the score breakdown data for the game
   */
  getScoreBreakdown() {
    if (typeof this.generateScoreBreakdown === 'function') {
      return this.generateScoreBreakdown();
    }
    return this.scoreBreakdown || null;
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
    
    // When using the modal system, quitting just calls returnToDetailScreen.
    if (typeof window.returnToDetailScreen === 'function') {
      window.returnToDetailScreen();
    } else {
      const closeBtn = document.getElementById('close-game');
      if (closeBtn) closeBtn.click();
    }
  }

  // --- UI Helpers ---

  _ensureOverlays() {
    if (!this.canvas || !this.canvas.parentElement) return;
    const parent = this.canvas.parentElement;
    
    if (document.getElementById('instructions-overlay')) return;

    const overlayHTML = `
      <div id="instructions-overlay" class="game-overlay" style="display: none; position: absolute; inset: 0; background: rgba(10,10,15,0.95); flex-direction: column; align-items: center; justify-content: center; z-index: 10; border-radius: 8px; font-family: 'DM Sans', sans-serif;">
        <h2 id="gs-instruction-title" style="font-family: 'Press Start 2P', monospace; font-size: 24px; color: var(--accent-1); margin-bottom: 20px; text-transform: uppercase; text-shadow: 0 0 10px rgba(108,99,255,0.5);"></h2>
        <p id="gs-instruction-desc" style="max-width: 440px; text-align: center; line-height: 1.6; color: var(--text-secondary); font-size: 14px; margin-bottom: 32px; padding: 0 20px;"></p>
        <button id="btn-instruction-start" style="background: var(--accent-1); color: #fff; border: none; padding: 12px 36px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: bold; cursor: pointer; box-shadow: var(--shadow-glow-purple); transition: all 0.2s;">
          START [SPACE]
        </button>
      </div>

      <div id="pause-overlay" class="game-overlay" style="display: none; position: absolute; inset: 0; background: rgba(10,10,15,0.95); flex-direction: column; align-items: center; justify-content: center; z-index: 10; border-radius: 8px; font-family: 'DM Sans', sans-serif; gap: 16px;">
        <h2 style="font-family: 'Press Start 2P', monospace; font-size: 28px; color: #fff; margin-bottom: 24px; text-shadow: 0 0 10px rgba(255,255,255,0.2);">PAUSED</h2>
        <button id="btn-pause-resume" style="width: 180px; background: var(--accent-1); color: #fff; border: none; padding: 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: bold; cursor: pointer;">
          RESUME [P]
        </button>
        <button id="btn-pause-restart" style="width: 180px; background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: bold; cursor: pointer;">
          RESTART [R]
        </button>
        <button id="btn-pause-quit" style="width: 180px; background: rgba(239,68,68,0.1); color: var(--danger); border: 1px solid rgba(239,68,68,0.2); padding: 10px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: bold; cursor: pointer;">
          QUIT [ESC]
        </button>
      </div>

      <div id="gameover-overlay" class="game-overlay" style="display: none; position: absolute; inset: 0; background: rgba(10,10,15,0.98); flex-direction: column; align-items: center; justify-content: center; z-index: 10; border-radius: 8px; font-family: 'DM Sans', sans-serif;">
        <h2 style="font-family: 'Press Start 2P', monospace; font-size: 32px; color: #fff; margin-bottom: 12px; text-shadow: 0 0 15px rgba(255,255,255,0.3);">GAME OVER</h2>
        <div id="new-record-banner" style="display: none; margin-bottom: 24px; background: var(--accent-1); color: #fff; padding: 6px 16px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: bold; letter-spacing: 1px; animation: pulse 1.5s infinite;">★ NEW RECORD ★</div>
        
        <div id="gs-standard-score-block" style="display: flex; gap: 48px; margin-bottom: 40px; text-align: center;">
          <div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">SCORE</div>
            <div id="gs-gameover-score" style="font-family: 'Press Start 2P', monospace; font-size: 28px; color: var(--accent-1); font-weight: bold;">0</div>
          </div>
          <div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">BEST</div>
            <div id="gs-gameover-best" style="font-family: 'Press Start 2P', monospace; font-size: 28px; color: #fff; font-weight: bold;">0</div>
          </div>
        </div>

        <div id="score-breakdown" style="display: none; width: 100%; max-width: 320px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin-bottom: 32px;"></div>
        
        <div style="display: flex; gap: 16px;">
          <button id="btn-gameover-retry" style="background: var(--accent-1); color: #fff; border: none; padding: 12px 28px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: bold; cursor: pointer; box-shadow: var(--shadow-glow-purple);">
            RETRY [R]
          </button>
          <button id="btn-gameover-back" style="background: rgba(255,255,255,0.05); color: #fff; border: 1px solid rgba(255,255,255,0.1); padding: 12px 28px; border-radius: 6px; font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: bold; cursor: pointer;">
            BACK [ESC]
          </button>
        </div>
      </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = overlayHTML;
    while (wrapper.firstChild) {
      parent.appendChild(wrapper.firstChild);
    }

    // Bind overlay button clicks
    const startBtn = document.getElementById('btn-instruction-start');
    if (startBtn) startBtn.onclick = () => this.start();

    const resumeBtn = document.getElementById('btn-pause-resume');
    if (resumeBtn) resumeBtn.onclick = () => this.resume();

    const restartBtn = document.getElementById('btn-pause-restart');
    if (restartBtn) restartBtn.onclick = () => this.start();

    const quitBtn = document.getElementById('btn-pause-quit');
    if (quitBtn) quitBtn.onclick = () => this.quit();

    const retryBtn = document.getElementById('btn-gameover-retry');
    if (retryBtn) retryBtn.onclick = () => this.start();

    const backBtn = document.getElementById('btn-gameover-back');
    if (backBtn) backBtn.onclick = () => this.quit();
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