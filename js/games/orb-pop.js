import { GameShell } from './game-shell.js';

export default class OrbPop extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);

    this.mouseMoveHandler = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
      
      let dx = this.mouseX - this.shooter.x;
      let dy = this.mouseY - this.shooter.y;
      
      if (this.mods && this.mods.reverse) dx = -dx;
      
      this.shooter.angle = Math.atan2(dy, dx);
      if (this.shooter.angle > -0.1) this.shooter.angle = -0.1;
      if (this.shooter.angle < -Math.PI + 0.1) this.shooter.angle = -Math.PI + 0.1;
    };
    
    this.clickHandler = () => {
      if (!this.isRunning) return;
      if (this.projectiles && this.projectiles.length > 0) return; 
      this.fireOrb();
    };
    
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('mousedown', this.clickHandler);
  }

  destroy() {
    this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.removeEventListener('mousedown', this.clickHandler);
    super.destroy();
  }

  onStart() {
    this.mods = {
      speedMult: this.config.modifiers?.includes('2x_speed') ? 1.5 : 1,
      reverse: this.config.modifiers?.includes('reverse'),
      noUI: this.config.modifiers?.includes('no_ui'),
      suddenDeath: this.config.modifiers?.includes('sudden_death'),
      limitedVision: this.config.modifiers?.includes('limited_vision')
    };

    this.orbRadius = 15;
    this.cols = Math.floor(this.canvas.width / (this.orbRadius * 2));
    this.grid = [];
    this.colors = ['#EF4444', '#10B981', '#3B82F6', '#FBBF24', '#8B5CF6'];
    
    this.shooter = {
      x: this.canvas.width / 2,
      y: this.canvas.height - 30,
      angle: -Math.PI / 2,
      currentOrb: this.getRandomColor(),
      nextOrb: this.getRandomColor()
    };
    
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    
    this.ceilingY = 0;
    this.dropTimer = 0;
    this.dropInterval = 10000 / this.mods.speedMult;
    
    this.mouseX = this.canvas.width/2;
    this.mouseY = 0;

    this.score = 0;
    this.updateScore(0);
    
    this.initGrid();
  }

  getRandomColor() {
    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  initGrid() {
    for(let r=0; r<5; r++) {
      let row = [];
      let isOffset = r % 2 !== 0;
      let rowCols = isOffset ? this.cols - 1 : this.cols;
      for(let c=0; c<rowCols; c++) {
        row.push({ color: this.getRandomColor() });
      }
      this.grid.push(row);
    }
  }

  getOrbPos(r, c) {
    let isOffset = r % 2 !== 0;
    let startX = isOffset ? this.orbRadius * 2 : this.orbRadius;
    return {
      x: startX + c * (this.orbRadius * 2),
      y: this.ceilingY + this.orbRadius + r * (this.orbRadius * 1.732)
    };
  }

  fireOrb() {
    this.projectiles.push({
      x: this.shooter.x,
      y: this.shooter.y,
      vx: Math.cos(this.shooter.angle) * 800 * this.mods.speedMult,
      vy: Math.sin(this.shooter.angle) * 800 * this.mods.speedMult,
      color: this.shooter.currentOrb
    });
    
    this.shooter.currentOrb = this.shooter.nextOrb;
    this.shooter.nextOrb = this.getRandomColor();
  }

  snapToGrid(proj) {
    let closestDist = Infinity;
    let closestR = 0;
    let closestC = 0;
    
    for(let r=0; r<this.grid.length + 2; r++) {
      let isOffset = r % 2 !== 0;
      let rowCols = isOffset ? this.cols - 1 : this.cols;
      for(let c=0; c<rowCols; c++) {
        if (!this.grid[r] || !this.grid[r][c]) {
          let pos = this.getOrbPos(r, c);
          let dist = Math.hypot(proj.x - pos.x, proj.y - pos.y);
          if (dist < closestDist) {
            closestDist = dist;
            closestR = r;
            closestC = c;
          }
        }
      }
    }
    
    while(this.grid.length <= closestR) {
      let isOffset = this.grid.length % 2 !== 0;
      this.grid.push(Array(isOffset ? this.cols - 1 : this.cols).fill(null));
    }
    
    this.grid[closestR][closestC] = { color: proj.color };
    
    let cluster = this.findCluster(closestR, closestC, proj.color);
    if (cluster.length >= 3) {
      cluster.forEach(cell => {
        let pos = this.getOrbPos(cell.r, cell.c);
        this.createExplosion(pos.x, pos.y, proj.color, 10);
        this.grid[cell.r][cell.c] = null;
      });
      
      let pts = cluster.length * 10;
      this.score += pts;
      this.updateScore(this.score);
      
      let pos = this.getOrbPos(closestR, closestC);
      this.floatingTexts.push({ x: pos.x, y: pos.y, text: `+${pts}`, color: proj.color, life: 1.0, vy: -1 });
      
      this.removeOrphans();
    }
  }

  getNeighbors(r, c) {
    let neighbors = [];
    let isOffset = r % 2 !== 0;
    
    let dirs = isOffset ? [
      [0, -1], [0, 1], [-1, 0], [-1, 1], [1, 0], [1, 1]
    ] : [
      [0, -1], [0, 1], [-1, -1], [-1, 0], [1, -1], [1, 0]
    ];
    
    dirs.forEach(d => {
      let nr = r + d[0];
      let nc = c + d[1];
      if (nr >= 0 && nr < this.grid.length && nc >= 0) {
        let isNOffset = nr % 2 !== 0;
        let nCols = isNOffset ? this.cols - 1 : this.cols;
        if (nc < nCols) {
          neighbors.push({r: nr, c: nc});
        }
      }
    });
    return neighbors;
  }

  findCluster(r, c, color) {
    let cluster = [];
    let visited = new Set();
    let queue = [{r, c}];
    visited.add(`${r},${c}`);
    
    while(queue.length > 0) {
      let curr = queue.shift();
      cluster.push(curr);
      
      let neighbors = this.getNeighbors(curr.r, curr.c);
      neighbors.forEach(n => {
        if (!visited.has(`${n.r},${n.c}`)) {
          if (this.grid[n.r] && this.grid[n.r][n.c] && this.grid[n.r][n.c].color === color) {
            visited.add(`${n.r},${n.c}`);
            queue.push(n);
          }
        }
      });
    }
    return cluster;
  }

  removeOrphans() {
    let connected = new Set();
    let queue = [];
    
    if (this.grid[0]) {
      for(let c=0; c<this.grid[0].length; c++) {
        if (this.grid[0][c]) {
          connected.add(`0,${c}`);
          queue.push({r: 0, c: c});
        }
      }
    }
    
    while(queue.length > 0) {
      let curr = queue.shift();
      let neighbors = this.getNeighbors(curr.r, curr.c);
      neighbors.forEach(n => {
        if (!connected.has(`${n.r},${n.c}`)) {
          if (this.grid[n.r] && this.grid[n.r][n.c]) {
            connected.add(`${n.r},${n.c}`);
            queue.push(n);
          }
        }
      });
    }
    
    for(let r=0; r<this.grid.length; r++) {
      if (!this.grid[r]) continue;
      for(let c=0; c<this.grid[r].length; c++) {
        if (this.grid[r][c] && !connected.has(`${r},${c}`)) {
          let pos = this.getOrbPos(r, c);
          this.createExplosion(pos.x, pos.y, this.grid[r][c].color, 15);
          this.grid[r][c] = null;
          this.score += 20;
        }
      }
    }
    this.updateScore(this.score);
    
    while(this.grid.length > 0) {
      let empty = true;
      let lastRow = this.grid[this.grid.length-1];
      for(let c=0; c<lastRow.length; c++) {
        if (lastRow[c]) empty = false;
      }
      if (empty) this.grid.pop();
      else break;
    }
  }

  gameOver() {
    this.createExplosion(this.canvas.width/2, this.canvas.height/2, '#EF4444', 100);
    super.gameOver();
  }

  createExplosion(x, y, color, count=30) {
    for(let i=0; i<count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1.0,
        color: color
      });
    }
  }

  update(dtMs) {
    let dtSec = dtMs / 1000;
    
    this.dropTimer += dtMs;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      this.ceilingY += this.orbRadius * 2;
      
      if (this.mods.suddenDeath) {
         this.dropInterval = Math.max(2000, this.dropInterval - 500);
      }
    }
    
    let lowestY = this.ceilingY;
    for(let r=0; r<this.grid.length; r++) {
      if (!this.grid[r]) continue;
      for(let c=0; c<this.grid[r].length; c++) {
        if (this.grid[r][c]) {
          let pos = this.getOrbPos(r, c);
          if (pos.y > lowestY) lowestY = pos.y;
        }
      }
    }
    
    if (lowestY > this.canvas.height - 100) {
      return this.gameOver();
    }
    
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      let p = this.projectiles[i];
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      
      if (p.x < this.orbRadius) { p.x = this.orbRadius; p.vx *= -1; }
      if (p.x > this.canvas.width - this.orbRadius) { p.x = this.canvas.width - this.orbRadius; p.vx *= -1; }
      
      if (p.y <= this.ceilingY + this.orbRadius) {
         this.snapToGrid(p);
         this.projectiles.splice(i, 1);
         continue;
      }
      
      let hit = false;
      for(let r=0; r<this.grid.length; r++) {
        if (hit || !this.grid[r]) continue;
        for(let c=0; c<this.grid[r].length; c++) {
          if (this.grid[r][c]) {
            let pos = this.getOrbPos(r, c);
            if (Math.hypot(p.x - pos.x, p.y - pos.y) < this.orbRadius * 2) {
               this.snapToGrid(p);
               this.projectiles.splice(i, 1);
               hit = true;
               break;
            }
          }
        }
      }
    }

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dtSec * 2;
      return p.life > 0;
    });

    this.floatingTexts = this.floatingTexts.filter(ft => {
      ft.y += ft.vy;
      ft.life -= dtSec;
      return ft.life > 0;
    });
  }

  draw() {
    this.ctx.fillStyle = '#09090B';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = '#8B5CF6';
    this.ctx.fillRect(0, 0, this.canvas.width, this.ceilingY);
    
    this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 10]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - 100);
    this.ctx.lineTo(this.canvas.width, this.canvas.height - 100);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(this.shooter.x, this.shooter.y);
    
    let tx = this.shooter.x;
    let ty = this.shooter.y;
    let tvx = Math.cos(this.shooter.angle) * 10;
    let tvy = Math.sin(this.shooter.angle) * 10;
    
    for(let i=0; i<100; i++) {
      tx += tvx;
      ty += tvy;
      if (tx < 0) { tx = 0; tvx *= -1; }
      if (tx > this.canvas.width) { tx = this.canvas.width; tvx *= -1; }
      this.ctx.lineTo(tx, ty);
    }
    this.ctx.stroke();

    for(let r=0; r<this.grid.length; r++) {
      if (!this.grid[r]) continue;
      for(let c=0; c<this.grid[r].length; c++) {
        if (this.grid[r][c]) {
          let pos = this.getOrbPos(r, c);
          this.ctx.fillStyle = this.grid[r][c].color;
          this.ctx.shadowBlur = 10;
          this.ctx.shadowColor = this.ctx.fillStyle;
          this.ctx.beginPath();
          this.ctx.arc(pos.x, pos.y, this.orbRadius - 1, 0, Math.PI*2);
          this.ctx.fill();
        }
      }
    }
    this.ctx.shadowBlur = 0;

    this.projectiles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = 15;
      this.ctx.shadowColor = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, this.orbRadius, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = this.shooter.currentOrb;
    this.ctx.beginPath();
    this.ctx.arc(this.shooter.x, this.shooter.y, this.orbRadius, 0, Math.PI*2);
    this.ctx.fill();
    
    this.ctx.fillStyle = this.shooter.nextOrb;
    this.ctx.globalAlpha = 0.5;
    this.ctx.beginPath();
    this.ctx.arc(this.shooter.x + 30, this.shooter.y, this.orbRadius * 0.6, 0, Math.PI*2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1.0;
    
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(this.shooter.x, this.shooter.y);
    this.ctx.lineTo(this.shooter.x + Math.cos(this.shooter.angle)*30, this.shooter.y + Math.sin(this.shooter.angle)*30);
    this.ctx.stroke();

    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    this.ctx.textAlign = 'center';
    this.floatingTexts.forEach(ft => {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = Math.max(0, ft.life);
      this.ctx.font = "bold 16px 'Press Start 2P', monospace";
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.shooter.x, this.shooter.y, 100, this.shooter.x, this.shooter.y, 400);
      gradient.addColorStop(0, 'rgba(0,0,0,1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    if (!this.mods.noUI) {
      this.ctx.fillStyle = '#fff';
      this.ctx.font = "14px 'JetBrains Mono', monospace";
      this.ctx.textAlign = 'left';
      
      const timerRatio = this.dropTimer / this.dropInterval;
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.fillRect(20, 20, 200, 10);
      this.ctx.fillStyle = timerRatio > 0.8 ? '#EF4444' : '#8B5CF6';
      this.ctx.fillRect(20, 20, 200 * timerRatio, 10);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText(`CEILING DROP`, 20, 50);
    }
  }
}
