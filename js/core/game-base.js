/**
 * js/core/game-base.js
 *
 * Base class that all games extend.
 * Provides the required lifecycle hooks, canvas context cache,
 * and high-frequency collision/math utility helper functions.
 */

export class GameBase {
  /**
   * @param {HTMLCanvasElement} canvas - The canvas element to render to
   * @param {Object} container - The GameContainer manager instance
   */
  constructor(canvas, container) {
    if (!canvas) {
      throw new Error("[GameBase] Canvas element is required");
    }
    
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // For solo games, container is the GameContainer instance.
    // For multiplayer games, container might be room, so handle gracefully.
    this.container = container;
    
    // Extract difficulty and config values
    this.config = (container && container.config) ? container.config : {};
    
    // Virtual logical resolution defaults, subclasses override via static getters
    this.width = this.constructor.logicalWidth || 600;
    this.height = this.constructor.logicalHeight || 600;

    // Standard properties
    this._score = 0;
    this._lives = 3;
    this.frameCount = 0;

    // Mock DOM elements to prevent exceptions on legacy direct DOM updates
    const mockEl = {
      set textContent(v) {},
      get textContent() { return ''; },
      set innerText(v) {},
      get innerText() { return ''; },
      style: {
        set display(v) {},
        get display() { return 'none'; }
      }
    };
    this.scoreEl = mockEl;
    this.livesEl = mockEl;
    this.comboEl = mockEl;
    this.timeEl = mockEl;
    this.levelEl = mockEl;
    this.spikeEl = mockEl;
    this.lapsEl = mockEl;
    this.driftEl = mockEl;
    this.collisionEl = mockEl;
    this.missEl = mockEl;
    this.flashEl = mockEl;

    // Mathematical and Collision Utilities
    this.utils = {
      randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
      randomFloat: (min, max) => Math.random() * (max - min) + min,
      lerp: (a, b, t) => a + (b - a) * t,
      clamp: (val, min, max) => Math.max(min, Math.min(max, val)),
      distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
      circleCollision: (a, b) => {
        const dist = Math.hypot((b.x || 0) - (a.x || 0), (b.y || 0) - (a.y || 0));
        return dist < ((a.radius || 0) + (b.radius || 0));
      },
      rectCollision: (a, b) => {
        return (
          (a.x || 0) < (b.x || 0) + (b.w || 0) &&
          (a.x || 0) + (a.w || 0) > (b.x || 0) &&
          (a.y || 0) < (b.y || 0) + (b.h || 0) &&
          (a.y || 0) + (a.h || 0) > (b.y || 0)
        );
      }
    };
  }

  // Reactive properties linked to the parent container HUD
  get score() {
    return this._score;
  }

  set score(value) {
    this._score = Math.max(0, value);
    if (this.container && typeof this.container.updateScore === 'function') {
      this.container.updateScore(this._score);
    }
  }

  get lives() {
    return this._lives;
  }

  set lives(value) {
    this._lives = Math.max(0, value);
    if (this.container && typeof this.container.updateLives === 'function') {
      this.container.updateLives(this._lives);
    }
  }

  // Triggers game termination in the parent container
  gameOver() {
    if (this.container && typeof this.container.endGame === 'function') {
      this.container.endGame();
    }
  }

  // --- Mandatory overrides (Subclasses must implement these) ---
  init() {
    throw new Error("[GameBase] Subclass must implement init()");
  }

  update(delta) {
    throw new Error("[GameBase] Subclass must implement update(delta)");
  }

  render(ctx) {
    throw new Error("[GameBase] Subclass must implement render(ctx)");
  }

  getControls() {
    throw new Error("[GameBase] Subclass must implement getControls()");
  }

  getFunStat() {
    throw new Error("[GameBase] Subclass must implement getFunStat()");
  }

  getScoreBreakdown() {
    throw new Error("[GameBase] Subclass must implement getScoreBreakdown()");
  }

  // --- Optional overrides ---
  onDifficultyApplied(config) {}
  onResize(newWidth, newHeight) {}
  onVisibilityHidden() {
    // Default behavior is to trigger pause if playing
    if (this.container && this.container.state === 'PLAYING') {
      this.container.pause();
    }
  }
  onVisibilityVisible() {}

  // --- Protected lifecycle controllers (Should not be overridden by subclasses) ---
  start() {
    // Handled authorized launch state machine inside Container
  }
  pause() {
    // Handled toggle inside Container
  }
  resume() {
    // Handled toggle inside Container
  }
  destroy() {
    // Handled teardown inside Container
  }
}
