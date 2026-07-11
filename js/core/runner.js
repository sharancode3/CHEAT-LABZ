/**
 * js/core/runner.js
 * Owns the single requestAnimationFrame loop.
 */

import { Input } from './input.js';

class GameRunner {
  constructor() {
    this.game = null;
    this.lastTime = 0;
    this.rafId = null;
  }

  start(gameInstance) {
    if (this.rafId) {
      this.stop();
    }
    this.game = gameInstance;
    
    // Set active canvas in Input manager
    if (gameInstance.canvas) {
      Input.setCanvas(gameInstance.canvas);
    }

    this.game.init();
    this.lastTime = performance.now();

    const loop = (currentTime) => {
      const delta = Math.min(currentTime - this.lastTime, 50);
      this.lastTime = currentTime;

      if (this.game && !this.game.isPaused && !this.game.isOver) {
        this.game.update(delta);
        this.game.render(this.game.ctx);
      }

      Input.endFrame();
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.game) {
      this.game.destroy();
    }
    this.game = null;
  }
}

export const Runner = new GameRunner();
export default Runner;
