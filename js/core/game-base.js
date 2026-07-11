/**
 * js/core/game-base.js
 * Base class all games extend.
 */

import { Input } from './input.js';

export class GameBase {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // logicalW / logicalH can be static properties on the subclass, or defaults
    const logicalW = this.constructor.logicalWidth || 800;
    const logicalH = this.constructor.logicalHeight || 600;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = logicalW * dpr;
    canvas.height = logicalH * dpr;
    this.ctx.scale(dpr, dpr);
    canvas.style.width = logicalW + 'px';
    canvas.style.height = logicalH + 'px';

    this.W = logicalW;
    this.H = logicalH;
    this.level = config.level || 1;
    this._score = 0;
    this._lives = 3;
    this.isPaused = false;
    this.isOver = false;
    
    this.input = Input; // uses Input singleton
  }

  get score() {
    return this._score;
  }

  set score(v) {
    this._score = v;
    this.onScoreChange(v);
  }

  get lives() {
    return this._lives;
  }

  set lives(v) {
    this._lives = Math.max(0, v);
    this.onLivesChange(this._lives);
    if (this._lives === 0) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.isOver = true;
    this.onGameOver(this._score);
  }

  levelComplete() {
    this.onLevelComplete(this.level, this._score);
  }

  // Methods games MUST override
  init() {
    // Subclass implementation
  }

  update(delta) {
    // Subclass implementation
  }

  render(ctx) {
    // Subclass implementation
  }

  // Methods games MAY override
  onScoreChange(score) {
    document.dispatchEvent(new CustomEvent('game:scoreChange', { detail: score }));
  }

  onLivesChange(lives) {
    document.dispatchEvent(new CustomEvent('game:livesChange', { detail: lives }));
  }

  onGameOver(score) {
    document.dispatchEvent(new CustomEvent('game:gameOver', { detail: { score } }));
  }

  onLevelComplete(level, score) {
    document.dispatchEvent(new CustomEvent('game:levelComplete', { detail: { level, score } }));
  }

  destroy() {
    this.canvas = null;
    this.ctx = null;
    this.input = null;
  }

  // Utility methods available to all games
  clear() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.W, this.H);
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }

  rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  dist(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  circleHit(a, b) {
    return this.dist(a.x, a.y, b.x, b.y) < (a.r + b.r);
  }

  rectHit(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }
}

export default GameBase;
