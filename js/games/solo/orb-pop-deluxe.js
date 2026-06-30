import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class OrbPop extends GameBase {
  static get logicalWidth() { return 500; }
  static get logicalHeight() { return 600; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.orbRadius = 16;
    this.orbDiameter = this.orbRadius * 2;
    this.cols = Math.floor(this.width / this.orbDiameter);
    
    this.colors = ['#ff4d4d', '#00f0ff', '#a855f7', '#ffd93d', '#ff4dff']; // Red, Cyan, Purple, Yellow, Pink
    this.grid = [];
    
    this.launcher = {
      x: this.width / 2,
      y: this.height - 40,
      orbColor: '#ff4d4d',
      nextColor: '#00f0ff'
    };
    
    this.mouseAngle = -Math.PI / 2;
    this.activeOrb = null;
    this.popParticles = [];
    this.floatingTexts = [];
    
    this.redFlashTimer = 0;
  }

  init() {
    this.score = 0;
    this.orbRadius = 16;
    this.orbDiameter = this.orbRadius * 2;
    
    this.grid = [];
    // Start with 5 rows of random colors
    for (let r = 0; r < 5; r++) {
      this.grid[r] = [];
      let colsInRow = (r % 2 === 0) ? this.cols : this.cols - 1;
      for (let c = 0; c < colsInRow; c++) {
        this.grid[r][c] = {
          color: this.colors[Math.floor(Math.random() * this.colors.length)]
        };
      }
    }
    
    this.launcher = {
      x: this.width / 2,
      y: this.height - 40,
      orbColor: this.colors[Math.floor(Math.random() * this.colors.length)],
      nextColor: this.colors[Math.floor(Math.random() * this.colors.length)]
    };
    
    this.mouseAngle = -Math.PI / 2;
    this.activeOrb = null;
    this.popParticles = [];
    this.floatingTexts = [];
    this.redFlashTimer = 0;

    let runs = Storage.get('orb-pop_runs', 0);
    Storage.set('orb-pop_runs', runs + 1);
  }

  onInput(key, event) {
    const k = key.toLowerCase();
    if ((k === ' ' || k === 'enter') && this.state === 'PLAYING' && !this.activeOrb) {
      this.fireOrb();
    }
  }

  onMouseMove(x, y, event) {
    if (this.state !== 'PLAYING') return;

    let dx = x - this.launcher.x;
    let dy = y - this.launcher.y;
    
    // clamp angle so launcher cannot fire backwards
    if (dy > -15) dy = -15;
    
    this.mouseAngle = Math.atan2(dy, dx);
  }

  onMouseDown(x, y, event) {
    if (this.state !== 'PLAYING' || this.activeOrb) return;
    this.fireOrb();
  }

  fireOrb() {
    const speed = 700;
    this.activeOrb = {
      x: this.launcher.x,
      y: this.launcher.y,
      vx: Math.cos(this.mouseAngle) * speed,
      vy: Math.sin(this.mouseAngle) * speed,
      color: this.launcher.orbColor
    };
    
    // reload next orb
    this.launcher.orbColor = this.launcher.nextColor;
    this.launcher.nextColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    this.container.audio.play('blip');
  }

  getGridXY(r, c) {
    const offsetX = (r % 2 === 0) ? 0 : this.orbRadius;
    const x = offsetX + c * this.orbDiameter + this.orbRadius;
    const y = r * (this.orbDiameter - 4) + this.orbRadius + 20; // 20px header padding
    return { x, y };
  }

  snapOrbToGrid(orb) {
    let closestRow = -1;
    let closestCol = -1;
    let minD = Infinity;
    
    for (let r = 0; r <= this.grid.length + 1; r++) {
      const colsInRow = (r % 2 === 0) ? this.cols : this.cols - 1;
      for (let c = 0; c < colsInRow; c++) {
        // Skip if already occupied
        if (this.grid[r] && this.grid[r][c]) continue;
        
        const pos = this.getGridXY(r, c);
        const dx = orb.x - pos.x;
        const dy = orb.y - pos.y;
        const dist = dx*dx + dy*dy;
        
        if (dist < minD) {
          minD = dist;
          closestRow = r;
          closestCol = c;
        }
      }
    }
    
    if (closestRow !== -1) {
      if (!this.grid[closestRow]) this.grid[closestRow] = [];
      this.grid[closestRow][closestCol] = { color: orb.color };
      
      this.resolveMatches(closestRow, closestCol);
      
      // Bottom ceiling limit check -> Game Over
      const thresholdY = this.height - 110;
      const snapPos = this.getGridXY(closestRow, closestCol);
      if (snapPos.y > thresholdY) {
        this.container.audio.play('damage');
        this.finishGame();
      }
    }
    
    this.activeOrb = null;
  }

  getNeighbors(r, c) {
    const isEven = (r % 2 === 0);
    const neighbors = [
      { r: r, c: c - 1 }, { r: r, c: c + 1 }, // Left, Right
      { r: r - 1, c: c }, { r: r + 1, c: c }, // Top, Bottom
      { r: r - 1, c: isEven ? c - 1 : c + 1 }, // Top offsets
      { r: r + 1, c: isEven ? c - 1 : c + 1 }  // Bottom offsets
    ];
    
    return neighbors.filter(n => {
      const colsInRow = (n.r % 2 === 0) ? this.cols : this.cols - 1;
      return n.r >= 0 && n.c >= 0 && n.c < colsInRow;
    });
  }

  resolveMatches(r, c) {
    const color = this.grid[r][c].color;
    const cluster = [];
    const visited = new Set();
    const toCheck = [{ r, c }];
    
    visited.add(`${r},${c}`);
    
    // BFS search
    while (toCheck.length > 0) {
      const curr = toCheck.pop();
      cluster.push(curr);
      
      const neighbors = this.getNeighbors(curr.r, curr.c);
      for (let n of neighbors) {
        const key = `${n.r},${n.c}`;
        if (!visited.has(key) && this.grid[n.r] && this.grid[n.r][n.c] && this.grid[n.r][n.c].color === color) {
          visited.add(key);
          toCheck.push(n);
        }
      }
    }
    
    // Popped targets (3 match minimum)
    if (cluster.length >= 3) {
      this.container.audio.play('coin');
      this.container.shake(120, 3.0);

      cluster.forEach(cell => {
        const pos = this.getGridXY(cell.r, cell.c);
        
        // Spawn burst particles
        for (let i = 0; i < 7; i++) {
          this.popParticles.push({
            x: pos.x, y: pos.y,
            vx: (Math.random() - 0.5) * 160,
            vy: (Math.random() - 0.5) * 160,
            color: color,
            life: 450,
            maxLife: 450
          });
        }
        
        this.grid[cell.r][cell.c] = null;
        
        const pts = 10;
        this.score += pts;
        
        this.floatingTexts.push({
          x: pos.x,
          y: pos.y - 10,
          text: `+${pts}`,
          life: 750,
          maxLife: 750,
          color: color
        });
      });

      this.dropOrphans();
    } else {
      this.container.audio.play('blip'); // stuck on collision
    }
  }

  dropOrphans() {
    const visited = new Set();
    const toCheck = [];
    
    // Seed BFS starting from the top ceiling row anchors
    if (this.grid[0]) {
      for (let c = 0; c < this.grid[0].length; c++) {
        if (this.grid[0][c]) {
          toCheck.push({ r: 0, c: c });
          visited.add(`0,${c}`);
        }
      }
    }
    
    while (toCheck.length > 0) {
      const curr = toCheck.pop();
      const neighbors = this.getNeighbors(curr.r, curr.c);
      for (let n of neighbors) {
        const key = `${n.r},${n.c}`;
        if (!visited.has(key) && this.grid[n.r] && this.grid[n.r][n.c]) {
          visited.add(key);
          toCheck.push(n);
        }
      }
    }
    
    // Purge dangling orbs
    let droppedCount = 0;
    for (let r = 0; r < this.grid.length; r++) {
      if (!this.grid[r]) continue;
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c] && !visited.has(`${r},${c}`)) {
          const color = this.grid[r][c].color;
          this.grid[r][c] = null;
          droppedCount++;
          
          const pos = this.getGridXY(r, c);
          
          // Spawn gravity-drop debris particles
          for (let i = 0; i < 6; i++) {
            this.popParticles.push({
              x: pos.x, y: pos.y,
              vx: (Math.random() - 0.5) * 80,
              vy: Math.random() * 120 + 80, // downward speed
              color: color,
              life: 550,
              maxLife: 550
            });
          }

          const bonusPoints = 20;
          this.score += bonusPoints;
          this.floatingTexts.push({
            x: pos.x,
            y: pos.y - 10,
            text: `+${bonusPoints}`,
            life: 800,
            maxLife: 800,
            color: color
          });
        }
      }
    }

    if (droppedCount > 0) {
      this.container.audio.play('perfect');
      this.container.shake(180, 4.0);
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;

    if (this.redFlashTimer > 0) this.redFlashTimer -= deltaTime;

    // Decay floating texts
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.life -= deltaTime;
      t.y -= dt * 25;
      return t.life > 0;
    });

    // Translate active firing orb
    if (this.activeOrb) {
      this.activeOrb.x += this.activeOrb.vx * dt;
      this.activeOrb.y += this.activeOrb.vy * dt;
      
      // Left/Right side walls bounce
      if (this.activeOrb.x - this.orbRadius < 0) {
        this.activeOrb.x = this.orbRadius;
        this.activeOrb.vx *= -1;
        this.container.audio.play('blip');
      } else if (this.activeOrb.x + this.orbRadius > this.width) {
        this.activeOrb.x = this.width - this.orbRadius;
        this.activeOrb.vx *= -1;
        this.container.audio.play('blip');
      }
      
      // Top ceiling snap
      if (this.activeOrb.y - this.orbRadius < 20) {
        this.activeOrb.y = this.orbRadius + 20;
        this.snapOrbToGrid(this.activeOrb);
      } else {
        // Evaluate collision with existing grid orbs
        let collision = false;
        for (let r = 0; r < this.grid.length; r++) {
          if (!this.grid[r]) continue;
          for (let c = 0; c < this.grid[r].length; c++) {
            if (this.grid[r][c]) {
              const pos = this.getGridXY(r, c);
              const dx = this.activeOrb.x - pos.x;
              const dy = this.activeOrb.y - pos.y;
              if (dx*dx + dy*dy <= (this.orbDiameter - 3) * (this.orbDiameter - 3)) {
                collision = true;
                break;
              }
            }
          }
          if (collision) break;
        }
        
        if (collision) {
          this.snapOrbToGrid(this.activeOrb);
        }
      }
    }
    
    // Update popped particles
    this.popParticles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
    });
    this.popParticles = this.popParticles.filter(p => p.life > 0);
  }

  finishGame() {
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 70);

    this.scoreBreakdown = {
      rows: [
        { label: 'Score Accumulation', value: baseScore, points: baseScore }
      ],
      total: baseScore,
      coinsEarned: coins
    };

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Orb Pop Score');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  drawOrb(x, y, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.fill();
    ctx.shadowBlur = 0; // reset
    
    // Inner sphere shine vector
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Draw ceiling header panel
    ctx.fillStyle = '#14141f';
    ctx.fillRect(0, 0, this.width, 20);

    // 3. Draw grid orbs
    for (let r = 0; r < this.grid.length; r++) {
      if (!this.grid[r]) continue;
      for (let c = 0; c < this.grid[r].length; c++) {
        const orb = this.grid[r][c];
        if (orb) {
          const pos = this.getGridXY(r, c);
          // pass global context variables
          window.ctx = ctx;
          this.drawOrb(pos.x, pos.y, this.orbRadius, orb.color);
        }
      }
    }

    // 4. Draw danger boundary line
    ctx.strokeStyle = 'rgba(255, 59, 48, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, this.height - 110);
    ctx.lineTo(this.width, this.height - 110);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // 5. Draw laser trajectory raycast lines with wall bounces
    if (!this.activeOrb) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      let rayX = this.launcher.x;
      let rayY = this.launcher.y;
      let rayVx = Math.cos(this.mouseAngle) * 16;
      let rayVy = Math.sin(this.mouseAngle) * 16;
      
      for (let i = 0; i < 35; i++) {
        rayX += rayVx;
        rayY += rayVy;
        
        // Wall bounces math
        if (rayX - this.orbRadius < 0 || rayX + this.orbRadius > this.width) {
          rayVx *= -1;
          rayX += rayVx * 2;
        }
        
        ctx.beginPath();
        ctx.arc(rayX, rayY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        if (rayY < 20) break;
      }
    }

    // 6. Draw active fired orb
    if (this.activeOrb) {
      window.ctx = ctx;
      this.drawOrb(this.activeOrb.x, this.activeOrb.y, this.orbRadius, this.activeOrb.color);
    }

    // 7. Draw launcher loaded colors
    if (!this.activeOrb) {
      window.ctx = ctx;
      this.drawOrb(this.launcher.x, this.launcher.y, this.orbRadius, this.launcher.orbColor);
    }
    
    // Draw next color loader queue indicator
    window.ctx = ctx;
    this.drawOrb(this.launcher.x + 35, this.launcher.y + 12, this.orbRadius * 0.55, this.launcher.nextColor);

    // 8. Pop particles updates
    for (let p of this.popParticles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;

    // 9. Floating texts popups
    ctx.font = "bold 11px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    this.floatingTexts.forEach(t => {
      const alpha = t.life / t.maxLife;
      ctx.fillStyle = t.color || `rgba(255, 215, 0, ${alpha})`;
      ctx.fillText(t.text, t.x, t.y);
    });

    // Score HUD indicators
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText("ORB POP DELUXE", 20, this.height - 18);
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${this.score}`, this.width - 20, this.height - 18);
  }

  getControls() {
    return [
      { key: 'MOUSE AIM', action: 'Direct target trajectory' },
      { key: 'CLICK / SPACE', action: 'Shoot loaded orb' }
    ];
  }

  getFunStat() {
    return `Cleared groups for total score: ${this.score}`;
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
