import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class MemoryGrid extends GameBase {
  static get logicalWidth() { return 500; }
  static get logicalHeight() { return 500; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.lives = 3;
    this.level = 1;
    this.gridSize = 4;
    
    this.sequence = [];
    this.playerIndex = 0;
    
    this.gameState = 'IDLE'; // 'IDLE', 'SHOWING', 'PLAYING', 'SUCCESS', 'FAIL'
    this.stateTimer = 1000;
    
    this.flashIndex = -1;
    this.cells = [];
    this.redFlashTimer = 0;
  }

  init() {
    this.lives = 3;
    this.level = 1;
    this.gridSize = 4;
    
    this.score = 0;
    this.sequence = [];
    this.playerIndex = 0;
    
    this.gameState = 'IDLE';
    this.stateTimer = 900;
    this.flashIndex = -1;
    this.redFlashTimer = 0;

    this.setupGrid();
    this.startFirstRound();

    let runs = Storage.get('memory-grid_runs', 0);
    Storage.set('memory-grid_runs', runs + 1);
  }

  setupGrid() {
    this.cells = [];
    const padding = 12;
    const availableWidth = this.width - padding * 2;
    const cellSize = availableWidth / this.gridSize;
    
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        // Pentatonic / Ascending frequency map for unique tone per tile
        const index = c * this.gridSize + r;
        const baseFreq = 220; // A3
        const freq = baseFreq * Math.pow(1.059463, index * 2.1); // Harmonic scaling

        this.cells.push({
          id: index,
          gridC: c,
          gridR: r,
          x: padding + c * cellSize,
          y: padding + r * cellSize,
          w: cellSize,
          h: cellSize,
          scale: 1.0,
          color: '#1a1a24',
          freq: freq
        });
      }
    }
  }

  startFirstRound() {
    this.sequence = [];
    for (let i = 0; i < 3; i++) {
      this.sequence.push(Math.floor(Math.random() * this.cells.length));
    }
    this.playerIndex = 0;
    this.gameState = 'SHOWING';
    this.flashIndex = 0;
    this.stateTimer = 500;
  }

  nextRound() {
    this.level++;
    
    // Dynamic difficulty grid resize
    if (this.level === 4) {
      this.gridSize = 5;
      this.setupGrid();
    } else if (this.level === 8) {
      this.gridSize = 6;
      this.setupGrid();
    }
    
    this.playerIndex = 0;
    this.sequence.push(Math.floor(Math.random() * this.cells.length));
    
    this.gameState = 'SHOWING';
    this.flashIndex = 0;
    this.stateTimer = 500;
  }

  playTone(freq, type = 'sine', duration = 0.3) {
    try {
      const audioCtx = window.audioCtx || (this.container && this.container.audioCtx);
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.warn("Audio tone synthesiser context blocked:", err);
    }
  }

  onInput(key, event) {}

  onMouseDown(x, y, event) {
    if (this.state !== 'PLAYING' || this.gameState !== 'PLAYING') return;

    // Find clicked grid cell bounding box
    for (let cell of this.cells) {
      if (x > cell.x && x < cell.x + cell.w && y > cell.y && y < cell.y + cell.h) {
        this.clickCell(cell);
        break;
      }
    }
  }

  clickCell(cell) {
    const expectedId = this.sequence[this.playerIndex];
    if (cell.id === expectedId) {
      // Correct tile click
      this.playTone(cell.freq, 'sine', 0.4);
      this.score += 15;
      this.playerIndex++;

      cell.scale = 0.92;
      cell.color = '#10b981'; // flash green

      if (this.playerIndex >= this.sequence.length) {
        this.gameState = 'SUCCESS';
        this.stateTimer = 850;
        this.container.audio.play('perfect');
      }
    } else {
      // Wrong tile click -> Board shake, damage sound, red overlay
      this.playTone(95, 'sawtooth', 0.5);
      this.container.audio.play('damage');
      this.lives--;
      this.gameState = 'FAIL';
      this.stateTimer = 1400;
      this.redFlashTimer = 120;

      cell.scale = 0.88;
      cell.color = '#ff3b30'; // flash red

      this.container.shake(250, 4.5);

      if (this.lives <= 0) {
        setTimeout(() => this.finishGame(), 1200);
      }
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    if (this.redFlashTimer > 0) this.redFlashTimer -= deltaTime;

    // Return visual properties of tiles to normal size
    for (let cell of this.cells) {
      if (cell.scale < 1.0) cell.scale += 0.4 * dt;
      if (cell.scale > 1.0) cell.scale -= 1.8 * dt;
      if (Math.abs(cell.scale - 1.0) < 0.01) cell.scale = 1.0;
      
      if (this.gameState === 'PLAYING') {
        cell.color = '#1a1a24'; // Reset grid default coloring when player's turn is active
      }
    }

    if (this.gameState === 'SHOWING') {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        if (this.flashIndex < this.sequence.length) {
          const cellId = this.sequence[this.flashIndex];
          const cell = this.cells.find(c => c.id === cellId);
          if (cell) {
            cell.scale = 1.15; // Pop highlight scaling
            cell.color = '#6c63ff'; // Purple metronome flash
            this.playTone(cell.freq, 'sine', 0.4);
          }
          this.flashIndex++;
          this.stateTimer = 550; // Highlight duration (400ms flash + 150ms gap)
        } else {
          this.gameState = 'PLAYING';
        }
      } else if (this.stateTimer <= 150) {
        // Enforce dark blank state during transition gaps
        for (let cell of this.cells) cell.color = '#1a1a24';
      }
    } else if (this.gameState === 'SUCCESS') {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        this.nextRound();
      }
    } else if (this.gameState === 'FAIL') {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0 && this.lives > 0) {
        // Restart current sequence from beginning
        this.playerIndex = 0;
        this.gameState = 'SHOWING';
        this.flashIndex = 0;
        this.stateTimer = 500;
        this.cells.forEach(c => c.color = '#1a1a24');
      }
    }
  }

  finishGame() {
    const roundsCompleted = Math.max(0, this.level - 1);
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 30);

    this.scoreBreakdown = {
      rows: [
        { label: 'Rounds Completed', value: `${roundsCompleted} Stages`, points: baseScore }
      ],
      total: baseScore,
      coinsEarned: coins
    };

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Memory Grid Match');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.redFlashTimer > 0) {
      const alpha = this.redFlashTimer / 120;
      ctx.fillStyle = `rgba(255, 59, 48, ${alpha * 0.22})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 2. Draw memory grids
    for (let cell of this.cells) {
      const padding = 7;
      const cw = (cell.w - padding * 2) * cell.scale;
      const ch = (cell.h - padding * 2) * cell.scale;
      const cx = cell.x + padding + ((cell.w - padding * 2) - cw) / 2;
      const cy = cell.y + padding + ((cell.h - padding * 2) - ch) / 2;

      // Card Backing Shadow
      ctx.fillStyle = '#0a0a0f';
      ctx.beginPath();
      ctx.roundRect(cx + 2, cy + 4, cw, ch, 6);
      ctx.fill();

      // Core Card
      ctx.fillStyle = cell.color;
      
      // Neon glows on highlights
      if (cell.color === '#6c63ff') {
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#6c63ff';
      } else if (cell.color === '#10b981' || cell.color === '#ff3b30') {
        ctx.shadowBlur = 10;
        ctx.shadowColor = cell.color;
      }

      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, ch, 6);
      ctx.fill();
      ctx.shadowBlur = 0; // reset
    }

    // 3. Draw instructions banners
    ctx.fillStyle = '#8888a8';
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    
    if (this.gameState === 'SHOWING') {
      ctx.fillText("WATCH CAREFULLY...", this.width / 2, this.height - 25);
    } else if (this.gameState === 'PLAYING') {
      ctx.fillStyle = '#00f0ff';
      ctx.fillText("REPEAT THE PATTERN SEQUENCE!", this.width / 2, this.height - 25);
    }

    // Score HUD indicators
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`LEVEL: ${this.level}`, 20, this.height - 40);
    ctx.textAlign = 'right';
    ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, this.width - 20, this.height - 40);
  }

  getControls() {
    return [
      { key: 'MOUSE CLICK', action: 'Dodge / Pick Tiles' }
    ];
  }

  getFunStat() {
    return `Completed stage ${this.level - 1} with streak scoring multiplier active`;
  }

  getScoreBreakdown() {
    if (this.scoreBreakdown && this.scoreBreakdown.rows) {
      return this.scoreBreakdown.rows;
    }
    return [
      { label: 'Score Accumulation', value: this.score }
    ];
  }
}
window.GameState = {};
