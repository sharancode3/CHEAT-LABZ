import { GameBase } from '../../core/game-base.js';

class MemoryGrid extends GameBase {
  static logicalWidth = 520;
  static logicalHeight = 520;

  init() {
    this.score = 0;
    this.lives = 3; // 3 strikes = game over
    this.isOver = false;

    // Web Audio setup for unique tile tones
    this.audioCtx = null;
    this.frequencies = [261, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784];

    const lvl = this.level;
    this.gridSize = lvl >= 9 ? 6 : lvl >= 6 ? 5 : lvl >= 3 ? 4 : 3;

    // Highlight and Gap Durations
    const highlights = [0, 600, 500, 450, 400, 350, 300, 280, 280, 250, 200];
    const gaps = [0, 200, 180, 150, 130, 120, 120, 120, 120, 80, 80];
    this.highlightDuration = highlights[lvl] || 200;
    this.gapDuration = gaps[lvl] || 80;

    // Initialize sequence length
    const startSeqLengths = [0, 3, 4, 4, 5, 5, 5, 6, 6, 6, 8];
    this.targetSeqLength = startSeqLengths[lvl] || 8;
    
    this.sequence = [];
    this.playerIndex = 0;
    
    // States: 'WATCHING', 'YOUR_TURN', 'WRONG_PAUSE'
    this.gameState = 'WATCHING';
    
    // Track active highlights: maps tileIndex to flash timestamp or true/false
    this.activeHighlights = {};
    
    this.shakeTimer = 0;
    this.isDestroyed = false;

    this.cells = [];
    this.setupGrid();
    this.generateNewSequence();
  }

  setupGrid() {
    this.cells = [];
    const gridPadding = 50;
    const availableSize = this.W - gridPadding * 2;
    const cellSize = (availableSize - (this.gridSize - 1) * 6) / this.gridSize;

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const index = row * this.gridSize + col;
        this.cells.push({
          id: index,
          x: gridPadding + col * (cellSize + 6),
          y: gridPadding + 60 + row * (cellSize + 6),
          w: cellSize,
          h: cellSize,
          scale: 1.0,
          correctFlashTimer: 0
        });
      }
    }
  }

  generateNewSequence() {
    this.sequence = [];
    for (let i = 0; i < this.targetSeqLength; i++) {
      this.sequence.push(this.randomCellIndex());
    }
    this.playSequence();
  }

  randomCellIndex() {
    return Math.floor(Math.random() * this.cells.length);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  highlightTile(tileIndex) {
    this.activeHighlights[tileIndex] = true;
    this.playTileTone(tileIndex);
    
    // Scale bounce on cell
    const cell = this.cells[tileIndex];
    if (cell) {
      cell.scale = 1.08;
      // shrink back
      setTimeout(() => {
        if (cell) cell.scale = 1.0;
      }, 80);
    }
  }

  unhighlightTile(tileIndex) {
    this.activeHighlights[tileIndex] = false;
  }

  async playSequence() {
    this.gameState = 'WATCHING';
    this.playerIndex = 0;
    this.activeHighlights = {};
    
    await this.sleep(800);

    for (let i = 0; i < this.sequence.length; i++) {
      if (this.isDestroyed || this.isOver || this.isPaused) return;

      const tileIndex = this.sequence[i];
      this.highlightTile(tileIndex);

      // Level 7: Two tiles highlight simultaneously
      let secondTileIndex = -1;
      if (this.level === 7 && i < this.sequence.length - 1) {
        secondTileIndex = this.sequence[i + 1];
        this.highlightTile(secondTileIndex);
        i++; // skip next step
      }

      await this.sleep(this.highlightDuration);
      
      this.unhighlightTile(tileIndex);
      if (secondTileIndex !== -1) {
        this.unhighlightTile(secondTileIndex);
      }

      await this.sleep(this.gapDuration);
    }

    if (this.isDestroyed || this.isOver || this.isPaused) return;
    this.gameState = 'YOUR_TURN';
  }

  playTileTone(tileIndex) {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const freq = this.frequencies[tileIndex % this.frequencies.length];
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, this.audioCtx.currentTime + 0.15);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.18);
    } catch(e) {}
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - delta);
    }

    // Update correct click stay color duration
    this.cells.forEach(c => {
      if (c.correctFlashTimer > 0) {
        c.correctFlashTimer = Math.max(0, c.correctFlashTimer - delta);
      }
    });

    // Check Player Input
    if (this.gameState === 'YOUR_TURN') {
      const inp = this.input;
      if (inp.clicked) {
        const m = inp.getMousePos();
        // find which tile clicked
        const cell = this.cells.find(c => {
          return m.x >= c.x && m.x <= c.x + c.w && m.y >= c.y && m.y <= c.y + c.h;
        });

        if (cell) {
          const expectedTileIndex = this.sequence[this.playerIndex];
          
          if (cell.id === expectedTileIndex) {
            // Correct click!
            this.playTileTone(cell.id);
            cell.correctFlashTimer = 150; // stays highlight color for 150ms
            
            // scale scale bounce
            cell.scale = 1.08;
            setTimeout(() => { cell.scale = 1.0; }, 80);

            this.playerIndex++;

            if (this.playerIndex === this.sequence.length) {
              // Level Clear Criteria: reach seq length of 10
              if (this.sequence.length >= 10) {
                this.levelComplete();
              } else {
                // Add one more tile to sequence
                this.sequence.push(this.randomCellIndex());
                this.playSequence();
              }
            }
          } else {
            // Wrong click!
            this.lives--;
            this.shakeTimer = 200;
            
            if (this.lives <= 0) {
              this.isOver = true;
              this.gameOver();
            } else {
              // Replay sequence after 800ms pause
              this.gameState = 'WRONG_PAUSE';
              setTimeout(() => {
                if (!this.isOver && !this.isDestroyed) {
                  this.playSequence();
                }
              }, 800);
            }
          }
        }
      }
    }
  }

  render(ctx) {
    this.clear();

    const cx = this.W / 2;

    // Shake offset translation
    let shakeX = 0;
    if (this.shakeTimer > 0) {
      const step = Math.floor(this.shakeTimer / 33) % 2;
      shakeX = step === 0 ? -6 : 6;
    }

    // Render turn indicator top center
    ctx.font = "bold 13px 'DM Sans', sans-serif";
    ctx.textAlign = 'center';
    if (this.gameState === 'YOUR_TURN') {
      ctx.fillStyle = '#fdcb6e';
      ctx.fillText('YOUR TURN', cx, 35);
    } else if (this.gameState === 'WATCHING') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fillText('WATCH...', cx, 35);
    } else {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillText('WRONG!', cx, 35);
    }

    // Top Right: sequence length tracker
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText(`SEQ: ${this.sequence.length}/10`, this.W - 24, 35);

    // Draw Grid cells
    this.cells.forEach(c => {
      ctx.save();
      // Apply cell scale bounce
      ctx.translate(c.x + c.w / 2 + shakeX, c.y + c.h / 2);
      ctx.scale(c.scale, c.scale);

      const isHighlighted = this.activeHighlights[c.id] || c.correctFlashTimer > 0;
      
      if (isHighlighted) {
        ctx.fillStyle = '#fdcb6e';
      } else {
        // Level 8: position memory only (tiles look identical)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      }
      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);

      ctx.strokeStyle = isHighlighted ? 'rgba(253, 203, 110, 0.6)' : 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);

      ctx.restore();
    });

    // Muted bottom indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`STRIKES: ${3 - this.lives}/3`, 24, this.H - 20);
  }

  destroy() {
    this.isDestroyed = true;
    if (this.audioCtx) {
      this.audioCtx.close();
    }
    super.destroy();
  }
}

window.GameClass = MemoryGrid;
export default MemoryGrid;
