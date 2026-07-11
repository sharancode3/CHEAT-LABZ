import { GameBase } from '../../core/game-base.js';

class ReflexRush extends GameBase {
  static logicalWidth = 620;
  static logicalHeight = 420;

  init() {
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    this.roundsCount = 0;
    this.totalReactionTime = 0;
    this.reactionCounts = 0;

    // Define all colors and key binds
    this.mapping = [
      { key: 'ArrowUp', color: '#ff7675', name: 'RED', label: '▲' },
      { key: 'ArrowDown', color: '#74b9ff', name: 'BLUE', label: '▼' },
      { key: 'ArrowLeft', color: '#55efc4', name: 'GREEN', label: '◀' },
      { key: 'ArrowRight', color: '#ffe259', name: 'YELLOW', label: '▶' },
      { key: ' ', color: '#ffffff', name: 'WHITE', label: 'SPACE' },
      { key: 'd', color: '#ff9f43', name: 'ORANGE', label: 'D' },
      { key: 'f', color: '#a29bfe', name: 'PURPLE', label: 'F' }
    ];

    // States: 'WAITING_DELAY', 'STIMULUS', 'POST_ROUND_PAUSE', 'FALSE_START'
    this.state = 'WAITING_DELAY';
    this.stateTimer = 0;

    this.stimulusTime = 0;
    this.reactionTimeText = "";
    this.reactionTimeTextAccent = false;

    this.activeFlashes = []; // Array of color hexes
    this.expectedKeys = new Set();
    this.pressedKeysThisStimulus = new Set();
    this.stimulusDuration = 400; // ms

    this.decoyTriggered = false;
    this.falseStimulusTriggered = false;

    this.nextRound();
  }

  nextRound() {
    const lvl = this.level;
    this.activeFlashes = [];
    this.expectedKeys.clear();
    this.pressedKeysThisStimulus.clear();
    this.decoyTriggered = false;
    this.falseStimulusTriggered = false;

    // Set flash duration limit
    const durations = [0, 400, 350, 300, 250, 200, 200, 150, 150, 120, 100];
    this.stimulusDuration = durations[lvl] || 100;

    // Choose target colors count
    let activeMappingCount = 4; // L1-L5: 4 colors
    if (lvl >= 6) activeMappingCount = 5; // L6-L7: 5 colors
    if (lvl >= 8) activeMappingCount = 6; // L8: 6 colors
    if (lvl >= 9) activeMappingCount = 7; // L9-L10: 7 colors

    const activeMapping = this.mapping.slice(0, activeMappingCount);

    // Pick target color mapping
    const primaryTarget = this.randomChoice(activeMapping);
    this.activeFlashes.push(primaryTarget.color);
    this.expectedKeys.add(primaryTarget.key);

    // Level 5, 9, 10: Two colors can flash simultaneously
    if ((lvl === 5 || lvl === 9 || lvl === 10) && Math.random() < 0.35) {
      const remainingMap = activeMapping.filter(m => m.key !== primaryTarget.key);
      const secondTarget = this.randomChoice(remainingMap);
      if (secondTarget) {
        this.activeFlashes.push(secondTarget.color);
        this.expectedKeys.add(secondTarget.key);
      }
    }

    // Set up delay timer
    this.state = 'WAITING_DELAY';
    // Random delay: 1200ms to 3500ms
    const basePause = (lvl === 8 || lvl === 10) ? 800 : 1200; // L8, L10 rapid fire
    this.stateTimer = basePause + Math.random() * 2300;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.stateTimer -= delta;
    const inp = this.input;

    // WAITING DELAY STATE
    if (this.state === 'WAITING_DELAY') {
      // Check for early press (FALSE START)
      for (const key of inp.pressed) {
        if (this.isBindedKey(key)) {
          this.triggerFalseStart();
          return;
        }
      }

      // Check false stimulus / decoy timings
      const lvl = this.level;
      if (lvl === 3 || lvl === 4) {
        // L3-L4: false stimuli (brief dim flash, then real one)
        if (this.stateTimer <= 500 && !this.falseStimulusTriggered && Math.random() < 0.25) {
          this.falseStimulusTriggered = true;
          this.activeFlashes = ['rgba(255, 255, 255, 0.1)']; // dim flash
          // return normal stateTimer shortly
        }
      }

      if (lvl === 9 && this.stateTimer <= 200 && !this.decoyTriggered && Math.random() < 0.3) {
        // L9: decoy color flashes 200ms before real one
        this.decoyTriggered = true;
        this.activeFlashes = [this.randomChoice(this.mapping).color];
      }

      if (this.stateTimer <= 0) {
        // Trigger stimulus flash
        this.state = 'STIMULUS';
        this.stateTimer = this.stimulusDuration;
        this.stimulusTime = performance.now();
        this.pressedKeysThisStimulus.clear();
        
        // Ensure active flashes reflect true target selection
        this.activeFlashes = [];
        this.expectedKeys.forEach(k => {
          const map = this.mapping.find(m => m.key === k);
          if (map) this.activeFlashes.push(map.color);
        });
      }
    }

    // STIMULUS FLASH STATE
    else if (this.state === 'STIMULUS') {
      // Read keys pressed
      for (const key of inp.pressed) {
        if (this.isBindedKey(key)) {
          if (this.expectedKeys.has(key)) {
            this.pressedKeysThisStimulus.add(key);
            // Verify if all expected keys pressed
            if (this.pressedKeysThisStimulus.size === this.expectedKeys.size) {
              this.triggerCorrectReaction();
              return;
            }
          } else {
            // Pressed a wrong color key
            this.triggerWrongReaction();
            return;
          }
        }
      }

      // Expired stimulus timer
      if (this.stateTimer <= 0) {
        this.triggerWrongReaction();
      }
    }

    // POST ROUND TRANSITION PAUSE
    else if (this.state === 'POST_ROUND_PAUSE' || this.state === 'FALSE_START') {
      if (this.stateTimer <= 0) {
        const targetRounds = this.level === 10 ? 15 : this.level === 6 ? 12 : 10;
        if (this.roundsCount >= targetRounds) {
          if (this.lives > 0) {
            this.levelComplete();
          } else {
            this.isOver = true;
            this.gameOver();
          }
        } else {
          this.nextRound();
        }
      }
    }
  }

  isBindedKey(key) {
    return this.mapping.some(m => m.key === key);
  }

  triggerCorrectReaction() {
    const reaction = performance.now() - this.stimulusTime;
    
    // Add reaction history
    this.totalReactionTime += reaction;
    this.reactionCounts++;
    this.roundsCount++;

    const roundScore = Math.max(0, Math.round(100 - reaction));
    this.score += roundScore;

    this.reactionTimeText = `${Math.round(reaction)}ms`;
    this.reactionTimeTextAccent = reaction < 200;

    this.state = 'POST_ROUND_PAUSE';
    this.stateTimer = 1000;
  }

  triggerWrongReaction() {
    this.lives--;
    this.roundsCount++;
    this.reactionTimeText = "MISS";
    this.reactionTimeTextAccent = false;

    this.state = 'POST_ROUND_PAUSE';
    this.stateTimer = 1200;
  }

  triggerFalseStart() {
    this.lives--;
    this.roundsCount++;
    this.state = 'FALSE_START';
    this.stateTimer = 1200;
    this.reactionTimeText = "EARLY";
    this.reactionTimeTextAccent = false;
  }

  render(ctx) {
    this.clear();

    const cx = this.W / 2;
    const cy = this.H / 2;

    // Render flash color if active
    if (this.state === 'STIMULUS' || (this.state === 'WAITING_DELAY' && (this.falseStimulusTriggered || this.decoyTriggered))) {
      this.activeFlashes.forEach((col, idx) => {
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.70 / this.activeFlashes.length;
        
        // draw full viewport overlays
        if (this.activeFlashes.length === 1) {
          ctx.fillRect(0, 0, this.W, this.H);
        } else {
          // split horizontal screens for dual flashes
          const w = this.W / this.activeFlashes.length;
          ctx.fillRect(idx * w, 0, w, this.H);
        }
      });
      ctx.globalAlpha = 1.0; // reset
    }

    // False Start red block slam text
    if (this.state === 'FALSE_START') {
      ctx.fillStyle = '#ff7675';
      ctx.font = "bold 28px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('TOO EARLY', cx, cy - 20);
    }

    // Reaction times overlays
    if (this.state === 'POST_ROUND_PAUSE') {
      ctx.fillStyle = this.reactionTimeTextAccent ? '#ff7675' : '#ffffff';
      ctx.font = "bold 42px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(this.reactionTimeText, cx, cy);
    }

    // Key Legend strip at the bottom
    const stripY = this.H - 60;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, stripY, this.W, 60);

    const activeMapCount = this.level >= 9 ? 7 : this.level >= 8 ? 6 : this.level >= 6 ? 5 : 4;
    const activeMapping = this.mapping.slice(0, activeMapCount);

    const itemW = this.W / activeMapping.length;
    ctx.textAlign = 'center';
    
    activeMapping.forEach((map, idx) => {
      const lx = idx * itemW + itemW / 2;
      
      // Draw small keycap
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(lx - 25, stripY + 8, 50, 20);
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(lx - 25, stripY + 8, 50, 20);

      ctx.fillStyle = '#ffffff';
      ctx.font = "11px 'DM Sans', sans-serif";
      ctx.fillText(map.label, lx, stripY + 22);

      // Color badge
      ctx.fillStyle = map.color;
      ctx.beginPath();
      ctx.arc(lx, stripY + 42, 6, 0, Math.PI * 2);
      ctx.fill();
    });

    // Muted averages and rounds top-left
    const avg = this.reactionCounts === 0 ? 0 : Math.round(this.totalReactionTime / this.reactionCounts);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`AVG: ${avg}ms`, 24, 30);

    const targetRounds = this.level === 10 ? 15 : this.level === 6 ? 12 : 10;
    ctx.textAlign = 'right';
    ctx.fillText(`ROUNDS: ${this.roundsCount}/${targetRounds}`, this.W - 24, 30);
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = ReflexRush;
export default ReflexRush;
