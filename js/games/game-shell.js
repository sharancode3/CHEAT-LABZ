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
  constructor(canvasId, config) {
    this.canvas = document.getElementById(canvasId);
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      if (config.width) this.canvas.width = config.width;
      if (config.height) this.canvas.height = config.height;
      
      // Accessibility
      this.canvas.setAttribute('role', 'application');
      this.canvas.setAttribute('aria-label', \`\${config.name} game canvas\`);
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
          
          this.canvas.style.width = \`\${finalWidth}px\`;
          this.canvas.style.height = \`\${finalHeight}px\`;
        }
      });
      this.resizeObserver.observe(this.canvas.parentElement);
    }
  }

  /**
   * Initializes the game and shows the instruction overlay
   */
  init() {
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
    // The UI should have a #instructions-overlay with the game title, objective, and "PRESS SPACE TO START"
    // that updates dynamically based on this.config.
    const titleEl = document.getElementById('instruction-title');
    const descEl = document.getElementById('instruction-desc');
    if (titleEl) titleEl.innerText = this.config.name;
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
    
    const urlParams = new URLSearchParams(window.location.search);
    const dailyIndex = urlParams.get('daily');
    const arenaIndex = urlParams.get('arena');
    
    let isNewRecord = false;

    if (dailyIndex !== null) {
      // Daily Challenge mode
      const today = new Date();
      const dateString = \`\${today.getUTCFullYear()}-\${String(today.getUTCMonth()+1).padStart(2,'0')}-\${String(today.getUTCDate()).padStart(2,'0')}\`;
      const dailyKey = \`cheatLabz_daily_\${dateString}\`;
      let completedIds = Storage.get(dailyKey, []);
      
      const pathParts = window.location.pathname.split('/');
      const filename = pathParts[pathParts.length - 1];
      const gameId = filename.replace('.html', '');

      if (!completedIds.includes(gameId)) {
        completedIds.push(gameId);
        Storage.set(dailyKey, completedIds);
      }

      if (this.score > this.highScore) {
        this.highScore = this.score;
        Storage.set(this.config.name, this.highScore);
      }
      
      this._showOverlay('gameover-overlay', { isNewRecord: false });
      
      const menuBtn = document.querySelector('#gameover-overlay .btn-outline');
      if (menuBtn) {
        menuBtn.innerText = 'CONTINUE DAILY (ESC)';
        menuBtn.href = 'daily.html';
      }
    } else if (arenaIndex !== null) {
      // Arena Mode
      let runData = sessionStorage.getItem('cheatLabz_arena_run');
      if (runData) {
        runData = JSON.parse(runData);
        const idx = parseInt(arenaIndex, 10);
        runData.scores[idx] = Math.max(runData.scores[idx] || 0, this.score);
        runData.currentRound = idx + 1;
        sessionStorage.setItem('cheatLabz_arena_run', JSON.stringify(runData));
      }
      
      if (this.score > this.highScore) {
        this.highScore = this.score;
        Storage.set(this.config.name, this.highScore);
      }
      
      this._showOverlay('gameover-overlay', { isNewRecord: false });
      
      const menuBtn = document.querySelector('#gameover-overlay .btn-outline');
      if (menuBtn) {
        menuBtn.innerText = 'CONTINUE ARENA (ESC)';
        menuBtn.href = 'arena.html';
      }
    } else {
      // Normal mode
      isNewRecord = this.score > this.highScore;
      if (isNewRecord) {
        this.highScore = this.score;
        Storage.set(this.config.name, this.highScore);
      }
      this._showOverlay('gameover-overlay', { isNewRecord });
    }
    
    
    // Update score displays
    const scoreEl = document.getElementById('gameover-score');
    const bestEl = document.getElementById('gameover-best');
    if (scoreEl) scoreEl.innerText = this.score;
    if (bestEl) bestEl.innerText = this.highScore;
    
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
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('daily')) {
      window.location.href = 'daily.html';
    } else if (urlParams.has('arena')) {
      // "If the player closes the game mid-round, arena progress resets"
      sessionStorage.removeItem('cheatLabz_arena_run');
      window.location.href = 'arena.html';
    } else {
      window.location.href = 'games.html';
    }
  }

  // --- UI Helpers ---

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
        
        conf.style.transform = \`translate(\${x - window.innerWidth/2}px, \${y - window.innerHeight/2}px) rotate(\${rot}deg)\`;
        
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