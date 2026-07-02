import { GameBase } from '../../core/game-base.js';

class ChainBurst extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    // Grid sizing scales with level
    this.gridW = 5 + Math.min(5, Math.floor(this.level / 2)); // 6x6 up to 10x10
    this.gridH = this.gridW;
    this.cellSize = 500 / this.gridW;

    // Color count scales with level (3 colors to 6 colors)
    const baseColors = ['#ff4d4d', '#4dff4d', '#4d4dff', '#ffff4d', '#ff4dff', '#4dffff'];
    const colorCount = Math.min(6, 3 + Math.floor(this.level / 3));
    this.colors = baseColors.slice(0, colorCount);

    this.dots = [];
    this.chain = [];
    this.isDragging = false;
    
    this.timeLimit = Math.max(30000, 60000 - this.level * 2500); // 60s to 35s
    this.timer = this.timeLimit;
    
    this.burstsCount = 0;
    this.score = 0;
    this.lives = 3;

    this.fillGrid();
  }

  fillGrid() {
    this.dots = [];
    for (let c = 0; c < this.gridW; c++) {
      for (let r = 0; r < this.gridH; r++) {
        this.dots.push({
          id: c * this.gridW + r,
          gx: c,
          gy: r,
          x: 50 + c * this.cellSize + this.cellSize / 2,
          y: 50 + r * this.cellSize + this.cellSize / 2,
          color: this.randomChoice(this.colors)
        });
      }
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.timer -= delta;
    if (this.timer <= 0) {
      this.lives--;
      if (this.lives > 0) {
        this.fillGrid();
        this.timer = this.timeLimit;
      }
      return;
    }

    const inp = this.input;
    const m = inp.getMousePos();

    if (inp.isMouseHeld()) {
      // Start Drag
      if (!this.isDragging) {
        const d = this.getDotAt(m.x, m.y);
        if (d) {
          this.isDragging = true;
          this.chain = [d];
        }
      } else {
        // Continue Drag
        const d = this.getDotAt(m.x, m.y);
        if (d && !this.chain.includes(d)) {
          const last = this.chain[this.chain.length - 1];
          // Check adjacency
          const distG = Math.abs(d.gx - last.gx) + Math.abs(d.gy - last.gy);
          if (distG === 1 && d.color === last.color) {
            this.chain.push(d);
          }
        }
      }
    } else {
      // Release Drag
      if (this.isDragging) {
        this.isDragging = false;
        if (this.chain.length >= 3) {
          this.burstChain();
        }
        this.chain = [];
      }
    }
  }

  getDotAt(x, y) {
    return this.dots.find(d => {
      const dist = this.distance(x, y, d.x, d.y);
      return dist <= this.cellSize / 2;
    });
  }

  burstChain() {
    this.score += this.chain.length * 15;
    this.burstsCount++;

    // Replace chain dots with new colors
    this.chain.forEach(c => {
      c.color = this.randomChoice(this.colors);
    });

    const goal = this.getLevelGoal();
    if (this.burstsCount >= goal.target) {
      this.levelComplete();
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw timer bar
    const barWidth = (this.timer / this.timeLimit) * 400;
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(100, 20, barWidth, 8);

    // Draw grid board
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, 500, 500);

    // Draw Dots
    this.dots.forEach(d => {
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, this.cellSize * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Chain connections
    if (this.chain.length > 1) {
      ctx.strokeStyle = this.chain[0].color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(this.chain[0].x, this.chain[0].y);
      for (let i = 1; i < this.chain.length; i++) {
        ctx.lineTo(this.chain[i].x, this.chain[i].y);
      }
      ctx.stroke();
    }
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Bursts', value: `${this.burstsCount}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'bursts', target: 5 },
      { type: 'bursts', target: 6 },
      { type: 'bursts', target: 7 },
      { type: 'bursts', target: 8 },
      { type: 'bursts', target: 9 },
      { type: 'bursts', target: 10 },
      { type: 'bursts', target: 11 },
      { type: 'bursts', target: 12 },
      { type: 'bursts', target: 13 },
      { type: 'bursts', target: 15 }
    ];
    return goals[this.level];
  }
}

window.GameClass = ChainBurst;
