import { GameShell } from './game-shell.js';

export default class SlideForge extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);
  }

  onStart() {
    this.mods = {
      speedMult: this.config.modifiers?.includes('2x_speed') ? 1.5 : 1,
      reverse: this.config.modifiers?.includes('reverse'),
      noUI: this.config.modifiers?.includes('no_ui'),
      suddenDeath: this.config.modifiers?.includes('sudden_death'),
      limitedVision: this.config.modifiers?.includes('limited_vision')
    };

    this.gridSize = 4;
    this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(0));
    
    this.tiles = [];
    this.tileSize = 80;
    this.padding = 10;
    
    this.gridWidth = this.gridSize * this.tileSize + (this.gridSize + 1) * this.padding;
    this.startX = this.canvas.width/2 - this.gridWidth/2;
    this.startY = this.canvas.height/2 - this.gridWidth/2 + 20;

    this.turnTimer = 5000 / this.mods.speedMult;
    this.maxTurnTime = 5000 / this.mods.speedMult;

    this.particles = [];
    this.floatingTexts = [];
    
    this.score = 0;
    this.updateScore(0);
    
    this.addRandomTile();
    this.addRandomTile();
    this.updateTilesFromGrid();
  }

  addRandomTile() {
    let emptyCells = [];
    for(let r=0; r<this.gridSize; r++) {
      for(let c=0; c<this.gridSize; c++) {
        if (this.grid[r][c] === 0) emptyCells.push({r, c});
      }
    }
    if (emptyCells.length > 0) {
      let cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  updateTilesFromGrid() {
    let newTiles = [];
    for(let r=0; r<this.gridSize; r++) {
      for(let c=0; c<this.gridSize; c++) {
        if (this.grid[r][c] !== 0) {
          let existing = this.tiles.find(t => t.r === r && t.c === c && t.val === this.grid[r][c]);
          if (!existing) {
             existing = { r, c, val: this.grid[r][c], scale: 0.1, x: this.getTileX(c), y: this.getTileY(r), mergeScale: 1 };
          } else {
             existing.x += (this.getTileX(c) - existing.x) * 0.3;
             existing.y += (this.getTileY(r) - existing.y) * 0.3;
          }
          newTiles.push(existing);
        }
      }
    }
    this.tiles = newTiles;
  }

  getTileX(c) { return this.startX + this.padding + c * (this.tileSize + this.padding); }
  getTileY(r) { return this.startY + this.padding + r * (this.tileSize + this.padding); }

  onInput(key, e, isDown) {
    if (!isDown) return;
    
    let k = e.key;
    
    if (k === 'w' || k === 'W') k = 'ArrowUp';
    if (k === 'a' || k === 'A') k = 'ArrowLeft';
    if (k === 's' || k === 'S') k = 'ArrowDown';
    if (k === 'd' || k === 'D') k = 'ArrowRight';

    if (this.mods.reverse) {
      if (k === 'ArrowUp') k = 'ArrowDown';
      else if (k === 'ArrowDown') k = 'ArrowUp';
      else if (k === 'ArrowLeft') k = 'ArrowRight';
      else if (k === 'ArrowRight') k = 'ArrowLeft';
    }

    let moved = false;
    if (k === 'ArrowUp') moved = this.slide(-1, 0);
    else if (k === 'ArrowDown') moved = this.slide(1, 0);
    else if (k === 'ArrowLeft') moved = this.slide(0, -1);
    else if (k === 'ArrowRight') moved = this.slide(0, 1);

    if (moved) {
      this.addRandomTile();
      this.updateTilesFromGrid();
      this.turnTimer = this.maxTurnTime;
      if (this.isGameOverCheck()) {
        this.gameOver();
      }
    }
  }

  slide(dr, dc) {
    let moved = false;
    let merged = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(false));
    
    let rStart = dr === 1 ? this.gridSize - 1 : 0;
    let rEnd = dr === 1 ? -1 : this.gridSize;
    let rStep = dr === 1 ? -1 : 1;

    let cStart = dc === 1 ? this.gridSize - 1 : 0;
    let cEnd = dc === 1 ? -1 : this.gridSize;
    let cStep = dc === 1 ? -1 : 1;

    for(let r = rStart; r !== rEnd; r += rStep) {
      for(let c = cStart; c !== cEnd; c += cStep) {
        if (this.grid[r][c] === 0) continue;
        
        let currR = r;
        let currC = c;
        let nextR = r + dr;
        let nextC = c + dc;
        
        while(nextR >= 0 && nextR < this.gridSize && nextC >= 0 && nextC < this.gridSize) {
          if (this.grid[nextR][nextC] === 0) {
            this.grid[nextR][nextC] = this.grid[currR][currC];
            this.grid[currR][currC] = 0;
            currR = nextR;
            currC = nextC;
            moved = true;
          } else if (this.grid[nextR][nextC] === this.grid[currR][currC] && !merged[nextR][nextC]) {
            this.grid[nextR][nextC] *= 2;
            this.grid[currR][currC] = 0;
            merged[nextR][nextC] = true;
            moved = true;
            
            this.score += this.grid[nextR][nextC];
            this.updateScore(this.score);
            
            this.createExplosion(this.getTileX(nextC) + this.tileSize/2, this.getTileY(nextR) + this.tileSize/2, '#06B6D4', 10);
            this.floatingTexts.push({ x: this.getTileX(nextC) + this.tileSize/2, y: this.getTileY(nextR), text: `+${this.grid[nextR][nextC]}`, color: '#06B6D4', life: 1.0, vy: -1 });
            
            break;
          } else {
            break;
          }
          nextR += dr;
          nextC += dc;
        }
      }
    }
    return moved;
  }

  isGameOverCheck() {
    for(let r=0; r<this.gridSize; r++) {
      for(let c=0; c<this.gridSize; c++) {
        if (this.grid[r][c] === 0) return false;
        if (r < this.gridSize-1 && this.grid[r][c] === this.grid[r+1][c]) return false;
        if (c < this.gridSize-1 && this.grid[r][c] === this.grid[r][c+1]) return false;
      }
    }
    return true;
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
    const dtSec = dtMs / 1000;
    
    this.turnTimer -= dtMs;
    if (this.turnTimer <= 0) {
      if (this.mods.suddenDeath) return this.gameOver();
      
      let dirs = [
        {dr: -1, dc: 0}, {dr: 1, dc: 0},
        {dr: 0, dc: -1}, {dr: 0, dc: 1}
      ];
      let moved = false;
      dirs.sort(() => Math.random() - 0.5);
      for(let d of dirs) {
        let testGrid = JSON.stringify(this.grid);
        moved = this.slide(d.dr, d.dc);
        if (moved) break;
        this.grid = JSON.parse(testGrid);
      }
      
      if (moved) {
        this.addRandomTile();
        this.updateTilesFromGrid();
        this.turnTimer = this.maxTurnTime;
        if (this.isGameOverCheck()) this.gameOver();
      } else {
        this.gameOver();
      }
    }

    this.tiles.forEach(t => {
      let tx = this.getTileX(t.c);
      let ty = this.getTileY(t.r);
      t.x += (tx - t.x) * 15 * dtSec;
      t.y += (ty - t.y) * 15 * dtSec;
      if (t.scale < 1) t.scale += 5 * dtSec;
      if (t.scale > 1) t.scale = 1;
      
      if (t.mergeScale > 1) t.mergeScale -= 5 * dtSec;
      if (t.mergeScale < 1) t.mergeScale = 1;
    });

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

  getTileColor(val) {
    const power = Math.log2(val);
    const hue = (power * 30) % 360;
    return `hsl(${hue}, 80%, ${power > 10 ? 70 : 50}%)`;
  }

  draw() {
    this.ctx.fillStyle = '#09090B';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.startX = this.canvas.width/2 - this.gridWidth/2;
    this.startY = this.canvas.height/2 - this.gridWidth/2 + 20;

    this.ctx.fillStyle = 'rgba(255,255,255,0.05)';
    this.ctx.beginPath();
    this.ctx.roundRect(this.startX, this.startY, this.gridWidth, this.gridWidth, 10);
    this.ctx.fill();
    
    for(let r=0; r<this.gridSize; r++) {
      for(let c=0; c<this.gridSize; c++) {
        this.ctx.fillStyle = 'rgba(255,255,255,0.02)';
        this.ctx.beginPath();
        this.ctx.roundRect(this.getTileX(c), this.getTileY(r), this.tileSize, this.tileSize, 8);
        this.ctx.fill();
      }
    }

    this.tiles.forEach(t => {
      this.ctx.save();
      this.ctx.translate(t.x + this.tileSize/2, t.y + this.tileSize/2);
      this.ctx.scale(t.scale * t.mergeScale, t.scale * t.mergeScale);
      
      this.ctx.fillStyle = this.getTileColor(t.val);
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.ctx.fillStyle;
      
      this.ctx.beginPath();
      this.ctx.roundRect(-this.tileSize/2, -this.tileSize/2, this.tileSize, this.tileSize, 8);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
      
      this.ctx.fillStyle = '#fff';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      let fontSize = t.val > 1000 ? 24 : 32;
      this.ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
      this.ctx.fillText(t.val, 0, 0);
      
      this.ctx.restore();
    });

    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    this.floatingTexts.forEach(ft => {
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = Math.max(0, ft.life);
      this.ctx.font = "bold 16px 'Press Start 2P', monospace";
      this.ctx.textAlign = 'center';
      this.ctx.fillText(ft.text, ft.x, ft.y);
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, 100, this.canvas.width/2, this.canvas.height/2, 350);
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
      
      const timerRatio = this.turnTimer / this.maxTurnTime;
      this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
      this.ctx.fillRect(0, 0, this.canvas.width, 5);
      this.ctx.fillStyle = timerRatio > 0.3 ? '#06B6D4' : '#EF4444';
      this.ctx.fillRect(0, 0, this.canvas.width * timerRatio, 5);
      
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText('MOVE BEFORE TIMER RUNS OUT!', 20, 30);
    }
  }
}
