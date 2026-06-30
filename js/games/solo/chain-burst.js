import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class ChainBurst extends GameBase {
  static get logicalWidth() { return 500; }
  static get logicalHeight() { return 500; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.isDragging = false;
    this.chain = [];
    this.dots = [];
    this.particles = [];
    this.floatingTexts = [];
    
    // Level constraints
    this.level = 1;
    this.movesLeft = 22;
    this.targetColor = '#ff4d4d';
    this.targetCount = 15;
    this.remainingCount = 15;

    this.gridW = 7;
    this.gridH = 7;
    this.cellSize = this.width / this.gridW;
    
    this.colors = ['#ff4d4d', '#4dff4d', '#4d4dff', '#ffff4d', '#ff4dff'];
    this.colorNames = {
      '#ff4d4d': 'RED',
      '#4dff4d': 'GREEN',
      '#4d4dff': 'BLUE',
      '#ffff4d': 'YELLOW',
      '#ff4dff': 'PINK'
    };
  }

  init() {
    this.level = 1;
    this.score = 0;
    this.movesLeft = 22;
    this.dots = [];
    this.particles = [];
    this.floatingTexts = [];
    this.chain = [];
    
    this.setupLevelTarget();
    this.fillGrid();

    // Trigger grid slide down
    this.dots.forEach(d => {
      d.y = d.gy * this.cellSize + this.cellSize / 2 - this.height;
    });

    let runs = Storage.get('chain-burst_runs', 0);
    Storage.set('chain-burst_runs', runs + 1);
  }

  setupLevelTarget() {
    this.targetColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.targetCount = 10 + this.level * 4;
    this.remainingCount = this.targetCount;
  }

  fillGrid() {
    for (let x = 0; x < this.gridW; x++) {
      for (let y = 0; y < this.gridH; y++) {
        const exists = this.dots.some(d => d.gx === x && d.gy === y);
        if (!exists) {
          this.dots.push({
            gx: x, gy: y,
            x: x * this.cellSize + this.cellSize / 2,
            y: y * this.cellSize + this.cellSize / 2 - 250, // drop in slightly above
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            vy: 0,
            r: this.cellSize * 0.38
          });
        }
      }
    }
  }

  getDotAt(x, y) {
    for (let d of this.dots) {
      const dx = x - d.x;
      const dy = y - d.y;
      if (Math.hypot(dx, dy) <= d.r * 1.25) return d; // generous match radius
    }
    return null;
  }

  onInput(key, event) {}

  onMouseDown(x, y, event) {
    if (this.state !== 'PLAYING') return;
    const dot = this.getDotAt(x, y);
    if (dot) {
      this.isDragging = true;
      this.chain = [dot];
      this.container.audio.play('blip');
    }
  }

  onMouseMove(x, y, event) {
    if (!this.isDragging || this.state !== 'PLAYING') return;
    const dot = this.getDotAt(x, y);
    
    if (dot && !this.chain.includes(dot)) {
      const last = this.chain[this.chain.length - 1];
      // Verify adjacency and color match
      const dx = Math.abs(dot.gx - last.gx);
      const dy = Math.abs(dot.gy - last.gy);
      if (dx <= 1 && dy <= 1 && dot.color === last.color) {
        this.chain.push(dot);
        this.container.audio.play('blip');
      }
    } else if (dot && this.chain.length > 1 && dot === this.chain[this.chain.length - 2]) {
      // Backtracking support
      this.chain.pop();
    }
  }

  onMouseUp(x, y, event) {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    if (this.chain.length >= 3) {
      this.movesLeft--;

      // Pitch-shifting sound cascade per popped bubble
      this.chain.forEach((dot, index) => {
        const pitchFreq = 300 + index * 75; // rising pitch
        setTimeout(() => {
          this.playSynthesizedTone(pitchFreq, 0.15);
        }, index * 60);

        // Spawn explosion particles
        this.createExplosion(dot.x, dot.y, dot.color);

        // Floating score pops
        const pointValue = 10 * this.level;
        this.score += pointValue;
        
        // Track target colors matches
        if (dot.color === this.targetColor) {
          this.remainingCount = Math.max(0, this.remainingCount - 1);
        }

        this.floatingTexts.push({
          x: dot.x,
          y: dot.y - 12,
          text: `+${pointValue}`,
          life: 800,
          maxLife: 800,
          color: dot.color
        });
      });

      // Clear popped chain
      this.dots = this.dots.filter(d => !this.chain.includes(d));

      this.applyGravity();
      this.fillGrid();

      // Check level win
      if (this.remainingCount <= 0) {
        this.levelUp();
      } else if (this.movesLeft <= 0) {
        // Game Over
        this.finishGame();
      }
    }
    
    this.chain = [];
  }

  playSynthesizedTone(freq, duration = 0.2) {
    try {
      const audioCtx = window.audioCtx || (this.container && this.container.audioCtx);
      if (!audioCtx) return;
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.06, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (err) {
      console.warn("Rhythm tone blocked:", err);
    }
  }

  levelUp() {
    this.container.audio.play('perfect');
    this.level++;
    this.movesLeft += 8; // grant bonus moves
    this.setupLevelTarget();
  }

  applyGravity() {
    for (let x = 0; x < this.gridW; x++) {
      let col = this.dots.filter(d => d.gx === x).sort((a, b) => b.gy - a.gy);
      let targetY = this.gridH - 1;
      for (let d of col) {
        d.gy = targetY;
        targetY--;
      }
    }
  }

  createExplosion(x, y, color) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 160,
        vy: (Math.random() - 0.5) * 160,
        life: 250 + Math.random() * 150,
        maxLife: 400,
        color: color
      });
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;

    // Sliced floating popups
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.life -= deltaTime;
      t.y -= dt * 20;
      return t.life > 0;
    });

    // Move falling dots down
    for (let d of this.dots) {
      const targetY = d.gy * this.cellSize + this.cellSize / 2;
      if (d.y < targetY) {
        d.vy += 1200 * dt; // gravity fall speed
        d.y += d.vy * dt;
        if (d.y >= targetY) {
          d.y = targetY;
          d.vy = 0;
        }
      }
    }

    // Update burst particles
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  finishGame() {
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 80);

    this.scoreBreakdown = {
      rows: [
        { label: 'Total Score', value: baseScore, points: baseScore }
      ],
      total: baseScore,
      coinsEarned: coins
    };

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Chain Burst score');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw connecting chain lines
    if (this.chain.length > 1) {
      ctx.strokeStyle = this.chain[0].color;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.chain[0].color;
      ctx.beginPath();
      ctx.moveTo(this.chain[0].x, this.chain[0].y);
      for (let i = 1; i < this.chain.length; i++) {
        ctx.lineTo(this.chain[i].x, this.chain[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset
    }

    // 3. Draw orbs/dots
    for (let d of this.dots) {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      
      let radius = d.r;
      if (this.chain.includes(d)) {
        radius *= 1.15; // puff visual scale when selected
        ctx.shadowBlur = 12;
        ctx.shadowColor = d.color;
      }

      ctx.arc(d.x, d.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw subtle inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.beginPath();
      ctx.arc(d.x - radius * 0.3, d.y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Explosion particles
    for (let p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1.0;

    // 5. Floating text popups
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    this.floatingTexts.forEach(t => {
      const alpha = t.life / t.maxLife;
      ctx.fillStyle = t.color || `rgba(255, 215, 0, ${alpha})`;
      ctx.fillText(t.text, t.x, t.y);
    });

    // 6. Draw UI HUD Targets info
    ctx.fillStyle = '#14141f';
    ctx.fillRect(0, this.height - 60, this.width, 60);

    ctx.strokeStyle = '#222230';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.height - 60);
    ctx.lineTo(this.width, this.height - 60);
    ctx.stroke();

    // Text specs
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`MOVES LEFT: ${this.movesLeft}`, 20, this.height - 25);
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${this.score}`, this.width - 20, this.height - 25);

    // Center target color bubble info
    ctx.fillStyle = '#8888a8';
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(`TARGET:`, this.width / 2 - 30, this.height - 25);

    ctx.fillStyle = this.targetColor;
    ctx.beginPath();
    ctx.arc(this.width / 2 + 10, this.height - 29, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`x ${this.remainingCount}`, this.width / 2 + 24, this.height - 25);
  }

  getControls() {
    return [
      { key: 'DRAG MOUSE', action: 'Connect adjacent identical color bubbles (min 3)' }
    ];
  }

  getFunStat() {
    return `Cleared level ${this.level} targets with ${this.movesLeft} spare moves remaining`;
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
