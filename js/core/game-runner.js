/**
 * js/core/game-runner.js
 * The single requestAnimationFrame loop owner for the entire application.
 */

import { InputManager } from './input-manager.js';

class GameRunnerClass {
  constructor() {
    this.activeGame = null;
    this.lastTimestamp = 0;
    this.frameId = null;
    this.isRunning = false;

    this.loop = this.loop.bind(this);
  }

  loop(timestamp) {
    if (!this.isRunning) return;

    let delta = timestamp - this.lastTimestamp;
    
    // Cap delta at 50ms to prevent physics explosions on tab switches
    if (delta > 50) {
      delta = 50;
    }
    
    this.lastTimestamp = timestamp;

    if (this.activeGame && !this.activeGame.isPaused && !this.activeGame.isOver) {
      this.activeGame.update(delta);
      
      // We pass the context to render just in case, but the game has this.ctx anyway
      this.activeGame.render(this.activeGame.ctx);
    }
    
    // Always call endFrame to clear single-frame inputs
    InputManager.endFrame();

    this.frameId = requestAnimationFrame(this.loop);
  }

  start(gameInstance) {
    if (this.activeGame) {
      this.stop();
    }
    
    this.activeGame = gameInstance;
    
    // Provide the active canvas to the InputManager for coordinate mapping
    if (this.activeGame.canvas) {
      InputManager.setActiveCanvas(this.activeGame.canvas);
    }
    
    if (typeof this.activeGame.init === 'function') {
      this.activeGame.init();
    }
    
    this.isRunning = true;
    this.lastTimestamp = performance.now();
    this.frameId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.isRunning = false;
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    
    if (this.activeGame) {
      if (typeof this.activeGame.destroy === 'function') {
        this.activeGame.destroy();
      }
      this.activeGame = null;
    }
    
    InputManager.setActiveCanvas(null);
  }
}

export const GameRunner = new GameRunnerClass();
