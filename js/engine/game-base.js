/**
 * js/engine/game-base.js
 * The Contract Every Game Must Fulfill
 */

export class GameBase {
  constructor(engine, metadata) {
    this.engine = engine; // Reference to an Engine wrapper or runner
    this.metadata = metadata;
    
    // Shortcuts for convenience
    this.runner = engine.runner;
    this.input = engine.input;
    this.canvasManager = engine.canvasManager;
    this.levelSystem = engine.levelSystem;
    
    this.width = metadata.logicalWidth || 600;
    this.height = metadata.logicalHeight || 600;
    
    // Base State
    this._score = 0;
    this._lives = 3;
    this._coins = 0;
    this.gameTime = 0;
    this.frameCount = 0;
    
    this.level = 1;
    this.levelConfig = null;
  }

  // Getters & Setters for automatic HUD updates (if implemented in future HUD layer)
  get score() { return this._score; }
  set score(v) { this._score = v; }
  
  get lives() { return this._lives; }
  set lives(v) { this._lives = v; }
  
  get coins() { return this._coins; }
  set coins(v) { this._coins = v; }

  // ── Engine Hooks (Do not override directly unless calling super) ────────

  onLevelStart(config) {
    this.level = config.number;
    this.levelConfig = config;
    this.init(config);
  }

  onLevelEnd() {
    // Optional internal cleanups before next level
  }

  onGameWin() {
    // Called if levels array is exhausted and game has no endless mode
    this.gameOver(true);
  }

  destroy() {
    // Cleanup any lingering resources (audio, specific timeouts if any)
  }

  // ── Methods games CAN call ──────────────────────────────────────────────

  gameOver(isWin = false) {
    this.runner.triggerSlowMotion(300, 0.15); // Dramatic game over slow-mo
    // Wait slightly then transition to GAMEOVER state/screen
    setTimeout(() => {
      this.input.setContext('GAMEOVER');
      this.runner.running = false; // Stop updating game logic
      
      // Dispatch event or call a method to show Game Over UI
      if (this.engine.onGameOver) {
        this.engine.onGameOver(isWin, this.getScoreBreakdown());
      }
    }, 500); // 500ms real time (ignoring slowmo)
  }

  levelComplete() {
    this.levelSystem.nextLevel();
  }

  addScore(amount, multiplier = 1) {
    this._score += (amount * multiplier);
    // Could trigger floating text animation via CanvasManager here
  }

  loseLife() {
    this._lives--;
    if (this._lives <= 0) {
      this.gameOver();
    } else {
      this.screenShake(10, 200);
      this.flashScreen('#ff0000', 100);
    }
  }

  triggerSlowMotion(ms, factor) {
    this.runner.triggerSlowMotion(ms, factor);
  }

  screenShake(intensity, duration) {
    // Shake the canvas mount point via CSS animation
    const container = this.canvasManager.mountPoint;
    container.style.transition = 'none';
    
    let start = performance.now();
    const shake = (now) => {
      const elapsed = now - start;
      if (elapsed < duration) {
        const dx = (Math.random() - 0.5) * intensity * 2;
        const dy = (Math.random() - 0.5) * intensity * 2;
        container.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(shake);
      } else {
        container.style.transform = 'translate(0, 0)';
      }
    };
    requestAnimationFrame(shake);
  }

  flashScreen(color, duration) {
    const overlay = this.canvasManager.overlayDiv;
    const flash = document.createElement('div');
    flash.style.position = 'absolute';
    flash.style.inset = '0';
    flash.style.backgroundColor = color;
    flash.style.opacity = '0.5';
    flash.style.transition = `opacity ${duration}ms ease-out`;
    flash.style.pointerEvents = 'none';
    overlay.appendChild(flash);
    
    // Trigger fade
    requestAnimationFrame(() => {
      flash.style.opacity = '0';
      setTimeout(() => flash.remove(), duration);
    });
  }

  // ── Methods every game MUST implement ───────────────────────────────────

  init(levelConfig) {
    throw new Error('Game must implement init(levelConfig)');
  }

  update(delta) {
    throw new Error('Game must implement update(delta)');
  }

  render(ctx) {
    throw new Error('Game must implement render(ctx)');
  }

  getHUDData() {
    return {
      score: this.score,
      lives: this.lives,
      level: this.level,
      extra: []
    };
  }

  getLevels() {
    throw new Error('Game must implement getLevels()');
  }

  getControls() {
    throw new Error('Game must implement getControls()');
  }

  getScoreBreakdown() {
    return [
      { label: 'Base Score', value: this.score, detail: '' }
    ];
  }
}
