/**
 * js/engine/level-system.js
 * The Level and Progression System
 */

export class LevelSystem {
  constructor(canvasManager, runner) {
    this.canvasManager = canvasManager;
    this.runner = runner; // used to pause/resume during level transitions
    this.game = null;
    this.levels = [];
    this.currentLevelIndex = 0;
    this.isTransitioning = false;
  }

  setGame(game) {
    this.game = game;
    if (typeof game.getLevels === 'function') {
      this.levels = game.getLevels() || [];
    } else {
      this.levels = [];
    }
  }

  startLevel(index) {
    this.currentLevelIndex = index;
    const config = this.getCurrentConfig();
    this.isTransitioning = true;
    
    // Tell engine/runner we are in a transition
    this.runner.pauseForTransition();
    
    this._playLevelEntryCinematic(config).then(() => {
      this.isTransitioning = false;
      if (this.game && typeof this.game.onLevelStart === 'function') {
        this.game.onLevelStart(config);
      }
      this.runner.resumeFromTransition();
    });
  }

  nextLevel() {
    if (this.currentLevelIndex < this.levels.length - 1) {
      if (this.game && typeof this.game.onLevelEnd === 'function') {
        this.game.onLevelEnd();
      }
      this.startLevel(this.currentLevelIndex + 1);
    } else {
      // Reached the end of defined levels. Game continues indefinitely or ends based on game logic.
      if (this.game && typeof this.game.onLevelEnd === 'function') {
        this.game.onLevelEnd();
      }
      if (this.game && typeof this.game.onGameWin === 'function') {
        this.game.onGameWin();
      }
    }
  }

  getCurrentConfig() {
    return this.levels[this.currentLevelIndex] || {
      number: this.currentLevelIndex + 1,
      name: 'Endless',
      description: 'Survive as long as you can.',
      config: {}
    };
  }

  async _playLevelEntryCinematic(levelConfig) {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.backgroundColor = '#0a0a0f'; // Dark solid background
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.color = '#fff';
    overlay.style.fontFamily = "'DM Sans', sans-serif";
    overlay.style.zIndex = '100'; // Make sure it covers everything
    overlay.style.opacity = '1';
    overlay.style.transition = 'opacity 300ms ease-in-out';

    // Level Number
    const numberEl = document.createElement('h1');
    numberEl.textContent = `LEVEL ${levelConfig.number}`;
    numberEl.style.fontFamily = "'Press Start 2P', monospace";
    numberEl.style.fontSize = '24px';
    numberEl.style.margin = '0 0 16px 0';
    numberEl.style.transform = 'scale(0.5)';
    numberEl.style.opacity = '0';
    numberEl.style.transition = 'transform 400ms cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 400ms ease-out';
    
    // Level Name
    const nameEl = document.createElement('h2');
    nameEl.textContent = levelConfig.name;
    nameEl.style.fontSize = '20px';
    nameEl.style.margin = '0 0 12px 0';
    nameEl.style.opacity = '0';
    nameEl.style.transition = 'opacity 400ms ease-out';
    
    // Description
    const descEl = document.createElement('p');
    descEl.textContent = levelConfig.description || '';
    descEl.style.fontSize = '14px';
    descEl.style.color = 'rgba(255,255,255,0.7)';
    descEl.style.margin = '0';
    descEl.style.opacity = '0';
    descEl.style.transition = 'opacity 400ms ease-out';

    overlay.appendChild(numberEl);
    overlay.appendChild(nameEl);
    overlay.appendChild(descEl);

    // Progress bar at bottom
    const totalLevels = this.levels.length || 1;
    const progressContainer = document.createElement('div');
    progressContainer.style.position = 'absolute';
    progressContainer.style.bottom = '40px';
    progressContainer.style.display = 'flex';
    progressContainer.style.flexDirection = 'column';
    progressContainer.style.alignItems = 'center';
    progressContainer.style.gap = '8px';
    
    const progressText = document.createElement('span');
    progressText.textContent = `Level ${levelConfig.number} of ${totalLevels}`;
    progressText.style.fontSize = '12px';
    progressText.style.color = 'rgba(255,255,255,0.5)';
    progressText.style.fontFamily = "'JetBrains Mono', monospace";
    progressContainer.appendChild(progressText);

    const dotsContainer = document.createElement('div');
    dotsContainer.style.display = 'flex';
    dotsContainer.style.gap = '6px';
    
    for (let i = 0; i < totalLevels; i++) {
      const dot = document.createElement('div');
      dot.style.width = '6px';
      dot.style.height = '6px';
      dot.style.borderRadius = '50%';
      
      if (i < this.currentLevelIndex) {
        dot.style.backgroundColor = '#fff';
      } else if (i === this.currentLevelIndex) {
        dot.style.backgroundColor = '#00d4aa'; // Accent color for current
        dot.style.boxShadow = '0 0 8px #00d4aa';
      } else {
        dot.style.backgroundColor = 'rgba(255,255,255,0.2)';
      }
      dotsContainer.appendChild(dot);
    }
    progressContainer.appendChild(dotsContainer);
    overlay.appendChild(progressContainer);

    this.canvasManager.overlayDiv.appendChild(overlay);

    // Trigger animations
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    numberEl.style.transform = 'scale(1.0)';
    numberEl.style.opacity = '1';

    setTimeout(() => { nameEl.style.opacity = '1'; }, 200);
    setTimeout(() => { descEl.style.opacity = '1'; }, 400);

    return new Promise(resolve => {
      setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 300); // Wait for fade out
      }, 2500); // 2.5 second display duration
    });
  }
}
