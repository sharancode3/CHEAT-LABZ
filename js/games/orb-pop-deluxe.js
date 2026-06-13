import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class OrbPop extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'orb-pop',
      description: 'Match 3 or more orbs of the same color to pop them.',
      width: 500,
      height: 600
    });

    this.scoreEl = document.getElementById('game-score');

    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseClick(e));

    this.init();
  }

  onStart() {
    this.orbRadius = 16;
    this.orbDiameter = this.orbRadius * 2;
    this.cols = Math.floor(this.canvas.width / this.orbDiameter);
    
    this.colors = ['#ff6b6b', '#00d4aa', '#6c63ff']; // Red, Green, Blue
    
    this.grid = [];
    // Start with 5 rows of orbs
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
      x: this.canvas.width / 2,
      y: this.canvas.height - 30,
      orbColor: this.colors[Math.floor(Math.random() * this.colors.length)],
      nextColor: this.colors[Math.floor(Math.random() * this.colors.length)]
    };
    
    this.mouseAngle = -Math.PI / 2; // point up
    
    this.activeOrb = null; // currently flying orb
    this.popParticles = [];
    
    this.updateUI();
    
    let runs = Storage.get('orb-pop_runs', 0);
    Storage.set('orb-pop_runs', runs + 1);
  }

  handleMouseMove(e) {
    if (this.state !== 'PLAYING') return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    let dx = x - this.launcher.x;
    let dy = y - this.launcher.y;
    
    // clamp angle so we can't shoot backwards
    if (dy > -10) dy = -10;
    
    this.mouseAngle = Math.atan2(dy, dx);
  }

  handleMouseClick(e) {
    if (this.state !== 'PLAYING' || this.activeOrb) return;
    
    const speed = 600;
    this.activeOrb = {
      x: this.launcher.x,
      y: this.launcher.y,
      vx: Math.cos(this.mouseAngle) * speed,
      vy: Math.sin(this.mouseAngle) * speed,
      color: this.launcher.orbColor
    };
    
    // reload
    this.launcher.orbColor = this.launcher.nextColor;
    this.launcher.nextColor = this.colors[Math.floor(Math.random() * this.colors.length)];
    
    Sound.playBlip();
  }

  getGridXY(r, c) {
    let offsetX = (r % 2 === 0) ? 0 : this.orbRadius;
    let x = offsetX + c * this.orbDiameter + this.orbRadius;
    let y = r * (this.orbDiameter - 4) + this.orbRadius; // slightly squished vertically for hex look
    return { x, y };
  }

  snapOrbToGrid(orb) {
    // Find closest valid empty grid spot
    let closestRow = -1;
    let closestCol = -1;
    let minD = Infinity;
    
    // Check rows up to grid.length + 1
    for (let r = 0; r <= this.grid.length; r++) {
      let colsInRow = (r % 2 === 0) ? this.cols : this.cols - 1;
      for (let c = 0; c < colsInRow; c++) {
        // Skip if occupied
        if (this.grid[r] && this.grid[r][c]) continue;
        
        let pos = this.getGridXY(r, c);
        let dx = orb.x - pos.x;
        let dy = orb.y - pos.y;
        let dist = dx*dx + dy*dy;
        
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
      
      // Check game over
      if (closestRow * (this.orbDiameter - 4) > this.canvas.height - 100) {
        Sound.playDamage();
        Sound.playGameOver();
        this.gameOver();
      }
    }
    
    this.activeOrb = null;
  }

  getNeighbors(r, c) {
    const isEven = (r % 2 === 0);
    const neighbors = [
      { r: r, c: c - 1 }, { r: r, c: c + 1 }, // left, right
      { r: r - 1, c: c }, { r: r + 1, c: c }, // top-same, bottom-same
      { r: r - 1, c: isEven ? c - 1 : c + 1 }, // top-offset
      { r: r + 1, c: isEven ? c - 1 : c + 1 }  // bottom-offset
    ];
    
    return neighbors.filter(n => {
      let colsInRow = (n.r % 2 === 0) ? this.cols : this.cols - 1;
      return n.r >= 0 && n.c >= 0 && n.c < colsInRow;
    });
  }

  resolveMatches(r, c) {
    let color = this.grid[r][c].color;
    let cluster = [];
    let visited = new Set();
    let toCheck = [{r, c}];
    
    visited.add(\`\${r},\${c}\`);
    
    while(toCheck.length > 0) {
      let curr = toCheck.pop();
      cluster.push(curr);
      
      let neighbors = this.getNeighbors(curr.r, curr.c);
      for (let n of neighbors) {
        let key = \`\${n.r},\${n.c}\`;
        if (!visited.has(key) && this.grid[n.r] && this.grid[n.r][n.c] && this.grid[n.r][n.c].color === color) {
          visited.add(key);
          toCheck.push(n);
        }
      }
    }
    
    if (cluster.length >= 3) {
      Sound.playCoin();
      for (let cell of cluster) {
        // spawn particles
        let pos = this.getGridXY(cell.r, cell.c);
        for(let i=0; i<5; i++) {
          this.popParticles.push({
            x: pos.x, y: pos.y,
            vx: (Math.random()-0.5)*100, vy: (Math.random()-0.5)*100,
            color: color, life: 1.0
          });
        }
        
        this.grid[cell.r][cell.c] = null;
        this.score += 10;
      }
      this.updateUI();
      this.dropOrphans();
    } else {
      Sound.playBlip(); // just stuck sound
    }
  }

  dropOrphans() {
    let visited = new Set();
    let toCheck = [];
    
    // Start with all top row orbs
    if (this.grid[0]) {
      for (let c = 0; c < this.grid[0].length; c++) {
        if (this.grid[0][c]) {
          toCheck.push({r: 0, c: c});
          visited.add(\`0,\${c}\`);
        }
      }
    }
    
    while(toCheck.length > 0) {
      let curr = toCheck.pop();
      let neighbors = this.getNeighbors(curr.r, curr.c);
      for (let n of neighbors) {
        let key = \`\${n.r},\${n.c}\`;
        if (!visited.has(key) && this.grid[n.r] && this.grid[n.r][n.c]) {
          visited.add(key);
          toCheck.push(n);
        }
      }
    }
    
    // Find orphans
    let orphans = 0;
    for (let r = 0; r < this.grid.length; r++) {
      if (!this.grid[r]) continue;
      for (let c = 0; c < this.grid[r].length; c++) {
        if (this.grid[r][c] && !visited.has(\`\${r},\${c}\`)) {
          // Drop it!
          let color = this.grid[r][c].color;
          this.grid[r][c] = null;
          orphans++;
          
          let pos = this.getGridXY(r, c);
          for(let i=0; i<5; i++) {
            this.popParticles.push({
              x: pos.x, y: pos.y,
              vx: (Math.random()-0.5)*100, vy: Math.random()*100 + 100, // fall down
              color: color, life: 1.0
            });
          }
        }
      }
    }
    if (orphans > 0) {
       this.score += orphans * 20;
       Sound.playCoin();
       this.updateUI();
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    // Active Orb
    if (this.activeOrb) {
      this.activeOrb.x += this.activeOrb.vx * dt;
      this.activeOrb.y += this.activeOrb.vy * dt;
      
      // Bounce off sides
      if (this.activeOrb.x - this.orbRadius < 0) {
        this.activeOrb.x = this.orbRadius;
        this.activeOrb.vx *= -1;
      } else if (this.activeOrb.x + this.orbRadius > this.canvas.width) {
        this.activeOrb.x = this.canvas.width - this.orbRadius;
        this.activeOrb.vx *= -1;
      }
      
      // Collision with top
      if (this.activeOrb.y - this.orbRadius < 0) {
        this.activeOrb.y = this.orbRadius;
        this.snapOrbToGrid(this.activeOrb);
      } else {
        // Collision with other orbs
        let collision = false;
        for (let r = 0; r < this.grid.length; r++) {
          if (!this.grid[r]) continue;
          for (let c = 0; c < this.grid[r].length; c++) {
            if (this.grid[r][c]) {
              let pos = this.getGridXY(r, c);
              let dx = this.activeOrb.x - pos.x;
              let dy = this.activeOrb.y - pos.y;
              if (dx*dx + dy*dy <= (this.orbDiameter - 2) * (this.orbDiameter - 2)) {
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
    
    // Particles
    for (let i = this.popParticles.length - 1; i >= 0; i--) {
      let p = this.popParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt * 2;
      if (p.life <= 0) this.popParticles.splice(i, 1);
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
  }

  drawOrb(x, y, r, color) {
    this.ctx.fillStyle = color;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner glow
    this.ctx.fillStyle = '#fff';
    this.ctx.globalAlpha = 0.5;
    this.ctx.shadowBlur = 0;
    this.ctx.beginPath();
    this.ctx.arc(x - r*0.3, y - r*0.3, r*0.3, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1.0;
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw grid orbs
    for (let r = 0; r < this.grid.length; r++) {
      if (!this.grid[r]) continue;
      for (let c = 0; c < this.grid[r].length; c++) {
        let orb = this.grid[r][c];
        if (orb) {
          let pos = this.getGridXY(r, c);
          this.drawOrb(pos.x, pos.y, this.orbRadius, orb.color);
        }
      }
    }

    // Danger line
    this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height - 100);
    this.ctx.lineTo(this.canvas.width, this.canvas.height - 100);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Launcher line with bounce
    if (!this.activeOrb) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      let rayX = this.launcher.x;
      let rayY = this.launcher.y;
      let rayVx = Math.cos(this.mouseAngle) * 15;
      let rayVy = Math.sin(this.mouseAngle) * 15;
      
      for(let i=0; i<40; i++) {
        rayX += rayVx;
        rayY += rayVy;
        
        if (rayX - this.orbRadius < 0 || rayX + this.orbRadius > this.canvas.width) {
          rayVx *= -1;
          rayX += rayVx * 2; // bounce
        }
        
        this.ctx.beginPath();
        this.ctx.arc(rayX, rayY, 3, 0, Math.PI*2);
        this.ctx.fill();
        
        // Stop if it hits the ceiling
        if (rayY < this.orbRadius) break;
      }
    }

    // Active orb
    if (this.activeOrb) {
      this.drawOrb(this.activeOrb.x, this.activeOrb.y, this.orbRadius, this.activeOrb.color);
    }

    // Launcher loaded orb
    if (!this.activeOrb) {
      this.drawOrb(this.launcher.x, this.launcher.y, this.orbRadius, this.launcher.orbColor);
    }
    
    // Next orb indicator
    this.drawOrb(this.launcher.x + 40, this.launcher.y + 10, this.orbRadius * 0.5, this.launcher.nextColor);

    // Particles
    for (let p of this.popParticles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
