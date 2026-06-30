/**
 * js/engine/game-runner.js
 * The Game Loop Orchestrator
 */

import { InputContext } from './input-manager.js';

export class GameRunner {
  constructor(canvasManager, inputManager, levelSystem) {
    this.canvasManager = canvasManager;
    this.input = inputManager;
    this.levelSystem = levelSystem;
    
    this.lastTime = null;
    this.running = false;
    this.activeGame = null;
    this.frameCount = 0;
    this.fpsTimestamp = null;
    this.measuredFPS = 60;
    
    this.slowFactor = 1.0;
    this.targetSlowFactor = 1.0;
    this.slowMotionEnd = 0;
    this.slowMotionDuration = 0;
    this.isTransitioningToSlow = false;
    
    this.wasRunningBeforeHide = false;
    this._loopBind = this._loop.bind(this);

    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.running) {
          this.wasRunningBeforeHide = true;
          this.pause();
        }
      } else {
        if (this.wasRunningBeforeHide) {
          this.resume();
        }
      }
    });
  }

  _loop(timestamp) {
    if (!this.running) return;

    if (this.lastTime === null) {
      this.lastTime = timestamp;
      this.fpsTimestamp = timestamp;
    }

    let rawDelta = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // Cap delta at 100ms
    let delta = Math.min(rawDelta, 100);

    // Process slow motion transitions (50ms transition)
    this._updateSlowMotion(timestamp, rawDelta);
    delta *= this.slowFactor;

    // Execute game logic if we aren't in a level transition cinematic
    if (!this.levelSystem.isTransitioning) {
      // Step 1: Advance input states
      this.input.update();

      if (this.activeGame) {
        // Step 2: Update game logic
        this.activeGame.update(delta);
        
        // Step 3: Clear game canvas
        this.canvasManager.clearGame();
        
        // Step 4: Render game
        this.activeGame.render(this.canvasManager.gameCtx);
      }
    }

    this.frameCount++;

    // Performance monitoring
    if (this.frameCount % 60 === 0) {
      this.measuredFPS = 60000 / (timestamp - this.fpsTimestamp);
      this.fpsTimestamp = timestamp;
      if (this.measuredFPS < 30) {
        this.onLowFPS();
      }
    }

    requestAnimationFrame(this._loopBind);
  }

  _updateSlowMotion(timestamp, rawDelta) {
    if (this.slowMotionEnd > 0 && timestamp > this.slowMotionEnd) {
      // Slow motion duration expired, transition back to 1.0
      this.targetSlowFactor = 1.0;
      this.slowMotionEnd = 0;
    }

    if (this.slowFactor !== this.targetSlowFactor) {
      const step = rawDelta / 50.0; // 50ms transition
      if (this.slowFactor < this.targetSlowFactor) {
        this.slowFactor = Math.min(this.targetSlowFactor, this.slowFactor + step);
      } else {
        this.slowFactor = Math.max(this.targetSlowFactor, this.slowFactor - step);
      }
    }
  }

  startGame(game) {
    if (this.activeGame) {
      this.activeGame.destroy();
    }
    
    this.activeGame = game;
    this.running = true;
    this.lastTime = null;
    this.frameCount = 0;
    
    this.input.setContext(InputContext.GAME);
    
    this.levelSystem.setGame(game);
    // Begin level 1 (index 0)
    this.levelSystem.startLevel(0);

    requestAnimationFrame(this._loopBind);
  }

  stopGame() {
    this.running = false;
    if (this.activeGame) {
      this.activeGame.destroy();
      this.activeGame = null;
    }
    this.input.setContext(InputContext.NONE);
  }

  pause() {
    this.running = false;
    this.input.setContext(InputContext.PAUSED);
    // Draw a dark overlay or pause menu on UI Canvas if desired
  }

  resume() {
    this.running = true;
    this.lastTime = null; // reset to prevent delta spike
    this.input.setContext(InputContext.GAME);
    requestAnimationFrame(this._loopBind);
  }

  // Used by level system to prevent logic/rendering updates but keep the loop alive if needed.
  // Actually, level system uses requestAnimationFrame itself for cinematic, but we can just pause game logic.
  pauseForTransition() {
    // Keep input manager advancing but ignore in game?
    // Handled by the check `!this.levelSystem.isTransitioning` in `_loop`.
    this.input.setContext(InputContext.NONE);
  }

  resumeFromTransition() {
    this.input.setContext(InputContext.GAME);
    this.lastTime = performance.now();
  }

  triggerSlowMotion(durationMs, factor) {
    this.targetSlowFactor = factor;
    this.slowMotionEnd = performance.now() + durationMs + 50; // Add 50ms for the in-transition
  }

  onLowFPS() {
    // console.warn('Low FPS detected:', this.measuredFPS);
  }
}
