import { GameBase } from '../../core/game-base.js';

class OrbPop extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.orbRadius = 18;
    this.cols = Math.floor(600 / (this.orbRadius * 2));
    
    // Colors scale with level (from 4 up to 7 colors)
    const baseColors = ['#ff4d4d', '#00f0ff', '#a855f7', '#ffd93d', '#ff4dff', '#4dffff', '#ff9f43'];
    const colorCount = Math.min(7, 4 + Math.floor(this.level / 3));
    this.colors = baseColors.slice(0, colorCount);

    this.grid = [];
    
    // Populate grid rows based on level (sparse vs dense)
    const rows = 3 + Math.min(5, Math.floor(this.level / 2));
    for (let r = 0; r < rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        this.grid[r][c] = {
          color: this.randomChoice(this.colors),
          active: true
        };
      }
    }

    this.launcher = {
      x: 300,
      y: 550,
      color: this.randomChoice(this.colors)
    };

    this.activeOrb = null;
    this.popCount = 0;

    this.score = 0;
    this.lives = 3;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;
    const inp = this.input;
    const m = inp.getMousePos();

    // Aim launcher
    let dx = m.x - this.launcher.x;
    let dy = m.y - this.launcher.y;
    if (dy > -15) dy = -15; // prevent firing backwards
    const angle = Math.atan2(dy, dx);

    // Fire Orb
    if (inp.wasMouseClicked() && !this.activeOrb) {
      this.activeOrb = {
        x: this.launcher.x,
        y: this.launcher.y,
        vx: Math.cos(angle) * 600,
        vy: Math.sin(angle) * 600,
        color: this.launcher.color
      };
      this.launcher.color = this.randomChoice(this.colors);
    }

    // Move Active Orb
    if (this.activeOrb) {
      this.activeOrb.x += this.activeOrb.vx * dt;
      this.activeOrb.y += this.activeOrb.vy * dt;

      // Bounce off side walls
      if (this.activeOrb.x - this.orbRadius <= 0) {
        this.activeOrb.x = this.orbRadius;
        this.activeOrb.vx = Math.abs(this.activeOrb.vx);
      } else if (this.activeOrb.x + this.orbRadius >= 600) {
        this.activeOrb.x = 600 - this.orbRadius;
        this.activeOrb.vx = -Math.abs(this.activeOrb.vx);
      }

      // Check collision with grid orbs
      let hit = false;
      for (let r = 0; r < this.grid.length; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cell = this.grid[r][c];
          if (cell && cell.active) {
            const cx = c * (this.orbRadius * 2) + this.orbRadius;
            const cy = r * (this.orbRadius * 2) + this.orbRadius;
            
            const dist = this.distance(this.activeOrb.x, this.activeOrb.y, cx, cy);
            if (dist < this.orbRadius * 1.8) {
              hit = true;
              this.popMatch(r, c, this.activeOrb.color);
              this.activeOrb = null;
              break;
            }
          }
        }
        if (hit) break;
      }

      // Offscreen top
      if (this.activeOrb && this.activeOrb.y < 0) {
        this.activeOrb = null;
      }
    }
  }

  popMatch(row, col, color) {
    // Find all connected matching color orbs
    const matches = [];
    const queue = [{ r: row, c: col }];
    const visited = new Set();
    
    while (queue.length > 0) {
      const curr = queue.shift();
      const key = `${curr.r},${curr.c}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const cell = this.grid[curr.r] && this.grid[curr.r][curr.c];
      if (cell && cell.active && cell.color === color) {
        matches.push(curr);
        
        // Add adjacent cells
        queue.push({ r: curr.r - 1, c: curr.c });
        queue.push({ r: curr.r + 1, c: curr.c });
        queue.push({ r: curr.r, c: curr.c - 1 });
        queue.push({ r: curr.r, c: curr.c + 1 });
      }
    }

    if (matches.length >= 2) {
      matches.forEach(m => {
        this.grid[m.r][m.c].active = false;
        this.popCount++;
        this.score += 20;
      });

      // Goal Check
      const goal = this.getLevelGoal();
      if (this.popCount >= goal.target) {
        this.levelComplete();
      }
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Grid Orbs
    for (let r = 0; r < this.grid.length; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell && cell.active) {
          const cx = c * (this.orbRadius * 2) + this.orbRadius;
          const cy = r * (this.orbRadius * 2) + this.orbRadius;
          ctx.fillStyle = cell.color;
          ctx.beginPath();
          ctx.arc(cx, cy, this.orbRadius - 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Draw Launcher
    ctx.fillStyle = this.launcher.color;
    ctx.beginPath();
    ctx.arc(this.launcher.x, this.launcher.y, this.orbRadius, 0, Math.PI * 2);
    ctx.fill();

    // Draw Active fired Orb
    if (this.activeOrb) {
      ctx.fillStyle = this.activeOrb.color;
      ctx.beginPath();
      ctx.arc(this.activeOrb.x, this.activeOrb.y, this.orbRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Pops', value: `${this.popCount}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'pops', target: 6 },
      { type: 'pops', target: 8 },
      { type: 'pops', target: 10 },
      { type: 'pops', target: 12 },
      { type: 'pops', target: 14 },
      { type: 'pops', target: 16 },
      { type: 'pops', target: 18 },
      { type: 'pops', target: 20 },
      { type: 'pops', target: 22 },
      { type: 'pops', target: 25 }
    ];
    return goals[this.level];
  }
}

window.GameClass = OrbPop;
