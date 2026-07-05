/**
 * js/core/game-base.js
 * The standard base class for all games.
 * Games must extend this and implement init, update, render, destroy, and getStats.
 */

import { InputManager } from './input-manager.js';

export class GameBase {
  constructor(canvas) {
    if (!canvas) {
      throw new Error("[GameBase] Canvas element is required");
    }
    
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.W = this.constructor.logicalWidth || 800;
    this.H = this.constructor.logicalHeight || 600;
    
    this.canvas.logicalWidth = this.W;
    this.canvas.logicalHeight = this.H;

    this._score = 0;
    this._lives = 3;
    this._level = 1;

    this.isPaused = false;
    this.isOver = false;

    this.input = InputManager;
  }

  // --- Properties with Reactive Setters ---

  get score() {
    return this._score;
  }

  set score(value) {
    const delta = value - this._score;
    this._score = Math.max(0, value);
    if (typeof this.onScoreChange === 'function') {
      this.onScoreChange(this._score, delta);
    }
  }

  get lives() {
    return this._lives;
  }

  set lives(value) {
    this._lives = Math.max(0, value);
    if (typeof this.onLivesChange === 'function') {
      this.onLivesChange(this._lives);
    }
    
    if (this._lives === 0 && !this.isOver) {
      this.triggerGameOver();
    }
  }

  get level() {
    return this._level;
  }

  // Called by external UI / shell after level complete overlay finishes
  setLevel(newLevel) {
    this._level = newLevel;
    if (typeof this.onLevelChange === 'function') {
      this.onLevelChange(this._level);
    }
  }

  // --- Core Lifecycle Hooks (Must be overridden) ---
  
  init() {
    throw new Error("Subclass must implement init()");
  }

  update(delta) {
    throw new Error("Subclass must implement update(delta)");
  }

  render() {
    throw new Error("Subclass must implement render()");
  }

  destroy() {
    // Default empty implementation to prevent crashes when calling super.destroy()
  }

  getStats() {
    return []; // Return empty array by default if subclass doesn't implement
  }

  // --- Flow Control ---

  levelComplete() {
    // Dispatch a custom event so the UI shell knows the level was completed
    const event = new CustomEvent('game:levelComplete', { detail: { game: this, level: this.level } });
    document.dispatchEvent(event);
  }

  triggerGameOver() {
    this.isOver = true;
    const event = new CustomEvent('game:gameOver', { detail: { game: this, score: this.score } });
    document.dispatchEvent(event);
  }

  // --- Optional Hooks ---

  onScoreChange(newScore, delta) {}
  onLivesChange(newLives) {}
  onLevelChange(newLevel) {}
  onPause() {}
  onResume() {}

  // --- High-Frequency Utilities ---

  clearCanvas(color = '#0a0a0f') {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  drawText(text, x, y, options = {}) {
    this.ctx.save();
    this.ctx.fillStyle = options.color || '#ffffff';
    this.ctx.font = `${options.size || 20}px ${options.font || 'Press Start 2P, monospace'}`;
    this.ctx.textAlign = options.align || 'left';
    this.ctx.textBaseline = options.baseline || 'top';
    
    if (options.shadow) {
      this.ctx.shadowColor = options.shadow;
      this.ctx.shadowBlur = options.blur || 10;
    }
    
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  distance(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  circleHit(a, b) {
    const dist = this.distance(a.x || 0, a.y || 0, b.x || 0, b.y || 0);
    return dist < ((a.radius || 0) + (b.radius || 0));
  }

  rectHit(a, b) {
    return (
      (a.x || 0) < (b.x || 0) + (b.w || 0) &&
      (a.x || 0) + (a.w || 0) > (b.x || 0) &&
      (a.y || 0) < (b.y || 0) + (b.h || 0) &&
      (a.y || 0) + (a.h || 0) > (b.y || 0)
    );
  }

  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }
}
