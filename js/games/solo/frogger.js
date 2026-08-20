import { GameBase } from '../../core/game-base.js';

export class Frogger extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.gridRows = 13;
    this.gridCols = 15;
    this.tileSize = 50;
    
    // Total board size = 15*50 = 750, 13*50 = 650
    this.offsetX = (this.W - (this.gridCols * this.tileSize)) / 2;
    this.offsetY = (this.H - (this.gridRows * this.tileSize)) / 2 + 50;
    
    this.frog = {
      col: 7,
      row: 12,
      x: 0, // Pixel X
      y: 0, // Pixel Y
      moving: false,
      moveTimer: 0,
      moveDirX: 0,
      moveDirY: 0,
      attachedPlatform: null
    };
    
    this.syncFrogToGrid();
    
    this.bays = [
      { col: 1, occupied: false },
      { col: 4, occupied: false },
      { col: 7, occupied: false },
      { col: 10, occupied: false },
      { col: 13, occupied: false }
    ];
    
    this.entities = [];
    this.stageTimer = 30.0;
    
    this.setupLanes();
    this.setupInput();
  }

  setupLanes() {
    this.lanes = [];
    // Rows 1-5: River
    // Rows 7-11: Highway
    // 0: Bays, 6: Median, 12: Start
    
    const speedMult = 1.0 + (this.level * 0.2);
    
    // Rivers
    this.lanes.push({ row: 1, type: 'RIVER', dir: -1, speed: 100 * speedMult, gap: 200, length: 150 });
    this.lanes.push({ row: 2, type: 'RIVER', dir: 1, speed: 80 * speedMult, gap: 150, length: 100 });
    this.lanes.push({ row: 3, type: 'RIVER', dir: -1, speed: 150 * speedMult, gap: 300, length: 200 });
    this.lanes.push({ row: 4, type: 'RIVER', dir: 1, speed: 90 * speedMult, gap: 180, length: 100 });
    this.lanes.push({ row: 5, type: 'RIVER', dir: -1, speed: 120 * speedMult, gap: 220, length: 150 });
    
    // Highways
    this.lanes.push({ row: 7, type: 'HIGHWAY', dir: -1, speed: 100 * speedMult, gap: 250, length: 50 });
    this.lanes.push({ row: 8, type: 'HIGHWAY', dir: 1, speed: 180 * speedMult, gap: 350, length: 80 }); // Fast cars
    this.lanes.push({ row: 9, type: 'HIGHWAY', dir: -1, speed: 80 * speedMult, gap: 200, length: 120 }); // Trucks
    this.lanes.push({ row: 10, type: 'HIGHWAY', dir: 1, speed: 120 * speedMult, gap: 220, length: 50 });
    this.lanes.push({ row: 11, type: 'HIGHWAY', dir: -1, speed: 90 * speedMult, gap: 200, length: 50 });
    
    // Initial spawn entities across screen
    for (let l of this.lanes) {
      let x = l.dir === 1 ? -100 : this.W + 100;
      for (let i = 0; i < 4; i++) {
        x += -l.dir * (l.length + l.gap + (Math.random()*50));
        this.entities.push({
          row: l.row,
          type: l.type,
          x: x,
          w: l.length,
          speed: l.speed * l.dir
        });
      }
    }
  }

  syncFrogToGrid() {
    this.frog.x = this.offsetX + this.frog.col * this.tileSize;
    this.frog.y = this.offsetY + this.frog.row * this.tileSize;
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver || this.frog.moving) return;
      
      let dc = 0, dr = 0;
      if (e.code === 'KeyW' || e.code === 'ArrowUp') dr = -1;
      else if (e.code === 'KeyS' || e.code === 'ArrowDown') dr = 1;
      else if (e.code === 'KeyA' || e.code === 'ArrowLeft') dc = -1;
      else if (e.code === 'KeyD' || e.code === 'ArrowRight') dc = 1;
      
      if (dc !== 0 || dr !== 0) {
        // Bounds check
        const targetCol = this.frog.col + dc;
        const targetRow = this.frog.row + dr;
        
        if (targetCol >= 0 && targetCol < this.gridCols && targetRow >= 0 && targetRow <= 12) {
          // Check bay occupation
          if (targetRow === 0) {
            const bay = this.bays.find(b => b.col === targetCol);
            if (!bay || bay.occupied) {
              // Can't go there
              return;
            }
          }
          
          this.frog.col = targetCol;
          this.frog.row = targetRow;
          this.frog.moving = true;
          this.frog.moveTimer = 0.15; // 150ms hop
          this.frog.moveDirX = dc;
          this.frog.moveDirY = dr;
          this.frog.attachedPlatform = null;
          
          if (window.Sound) window.Sound.playTone(300 + (dr === -1 ? 100 : 0), 'square', 0.05);
        }
      }
    };
  }

  die() {
    this.lives -= 1;
    if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.5);
    
    if (this.lives > 0) {
      this.frog.col = 7;
      this.frog.row = 12;
      this.frog.moving = false;
      this.frog.attachedPlatform = null;
      this.syncFrogToGrid();
      this.stageTimer = 30.0;
    } else {
      this.isOver = true;
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.stageTimer -= delta;
    if (this.stageTimer <= 0) {
      this.die();
      return;
    }

    // Move entities
    for (let e of this.entities) {
      e.x += e.speed * delta;
      
      // Wrap
      if (e.speed > 0 && e.x > this.W + 100) e.x = -e.w - 50;
      else if (e.speed < 0 && e.x + e.w < -100) e.x = this.W + 50;
    }

    // Frog Hop Animation
    if (this.frog.moving) {
      this.frog.moveTimer -= delta;
      
      const targetX = this.offsetX + this.frog.col * this.tileSize;
      const targetY = this.offsetY + this.frog.row * this.tileSize;
      
      if (this.frog.moveTimer <= 0) {
        this.frog.moving = false;
        this.frog.x = targetX;
        this.frog.y = targetY;
        
        this.score += 10;
        
        // Did we hit a bay?
        if (this.frog.row === 0) {
          const bay = this.bays.find(b => b.col === this.frog.col);
          if (bay) {
            bay.occupied = true;
            this.score += 500;
            if (window.Sound) window.Sound.playTone(800, 'sine', 0.2);
            
            // Check win
            if (this.bays.every(b => b.occupied)) {
              this.levelComplete();
              // Reset bays for next level
              this.bays.forEach(b => b.occupied = false);
            }
            
            // Respawn
            this.frog.col = 7;
            this.frog.row = 12;
            this.syncFrogToGrid();
            this.stageTimer = 30.0;
          }
        }
        
      } else {
        const progress = 1.0 - (this.frog.moveTimer / 0.15);
        const startX = this.offsetX + (this.frog.col - this.frog.moveDirX) * this.tileSize;
        const startY = this.offsetY + (this.frog.row - this.frog.moveDirY) * this.tileSize;
        
        this.frog.x = startX + (targetX - startX) * progress;
        this.frog.y = startY + (targetY - startY) * progress;
      }
    } else {
      // Logic when resting
      
      // 1. Attached Platform Movement
      if (this.frog.attachedPlatform) {
        this.frog.x += this.frog.attachedPlatform.speed * delta;
        // Keep col synced approximately (will snap on next move)
        this.frog.col = Math.round((this.frog.x - this.offsetX) / this.tileSize);
        
        // If carried off screen
        if (this.frog.x < this.offsetX || this.frog.x > this.offsetX + this.gridCols * this.tileSize) {
          this.die();
          return;
        }
      }
      
      // Collision checking
      const fX = this.frog.x + this.tileSize / 2;
      const fY = this.frog.y + this.tileSize / 2;
      
      let onPlatform = false;
      
      for (let e of this.entities) {
        if (e.row === this.frog.row) {
          // AABB check
          // e.x is left, e.x + e.w is right
          // frog x is this.frog.x
          const frogCX = this.frog.x + this.tileSize/2;
          
          if (frogCX >= e.x && frogCX <= e.x + e.w) {
            if (e.type === 'HIGHWAY') {
              // Hit by car
              this.die();
              return;
            } else if (e.type === 'RIVER') {
              // On a log
              onPlatform = true;
              this.frog.attachedPlatform = e;
            }
          }
        }
      }
      
      // River death check
      if (this.frog.row >= 1 && this.frog.row <= 5 && !onPlatform) {
        // Drown
        this.die();
        return;
      }
    }
  }

  render(ctx) {
    this.clear();
    
    // Draw Timer
    ctx.fillStyle = '#111';
    ctx.fillRect(this.W / 2 - 200, 20, 400, 10);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(this.W / 2 - 200, 20, 400 * (this.stageTimer / 30.0), 10);
    
    // Draw Base Grid zones
    const gridW = this.gridCols * this.tileSize;
    
    // Start/Median (Purple/Gray)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(this.offsetX, this.offsetY + 12 * this.tileSize, gridW, this.tileSize); // Start
    ctx.fillRect(this.offsetX, this.offsetY + 6 * this.tileSize, gridW, this.tileSize); // Median
    
    // Highway (Dark Grey)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(this.offsetX, this.offsetY + 7 * this.tileSize, gridW, 5 * this.tileSize);
    
    // River (Blue)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(this.offsetX, this.offsetY + 1 * this.tileSize, gridW, 5 * this.tileSize);
    
    // Bays (Green)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(this.offsetX, this.offsetY, gridW, this.tileSize);
    
    ctx.fillStyle = '#10b981';
    for (let b of this.bays) {
      ctx.fillRect(this.offsetX + b.col * this.tileSize, this.offsetY, this.tileSize, this.tileSize);
      if (b.occupied) {
        // Draw a saved frog here
        ctx.fillStyle = '#a3e635';
        ctx.beginPath();
        ctx.arc(this.offsetX + b.col * this.tileSize + this.tileSize/2, this.offsetY + this.tileSize/2, this.tileSize/3, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = '#10b981'; // reset
      }
    }

    // Draw Entities
    for (let e of this.entities) {
      const y = this.offsetY + e.row * this.tileSize;
      
      if (e.type === 'HIGHWAY') {
        ctx.fillStyle = e.speed > 0 ? '#ef4444' : '#facc15'; // Red or yellow cars
        ctx.fillRect(e.x, y + 5, e.w, this.tileSize - 10);
        // Headlights
        ctx.fillStyle = '#fff';
        if (e.speed > 0) {
          ctx.fillRect(e.x + e.w - 5, y + 10, 5, 5);
          ctx.fillRect(e.x + e.w - 5, y + 35, 5, 5);
        } else {
          ctx.fillRect(e.x, y + 10, 5, 5);
          ctx.fillRect(e.x, y + 35, 5, 5);
        }
      } else {
        ctx.fillStyle = '#854d0e'; // Brown log
        ctx.fillRect(e.x, y + 5, e.w, this.tileSize - 10);
      }
    }

    // Draw Frog
    ctx.save();
    ctx.translate(this.frog.x + this.tileSize / 2, this.frog.y + this.tileSize / 2);
    
    // Rotate frog based on movement
    if (this.frog.moveDirY === -1) ctx.rotate(0);
    else if (this.frog.moveDirY === 1) ctx.rotate(Math.PI);
    else if (this.frog.moveDirX === 1) ctx.rotate(Math.PI / 2);
    else if (this.frog.moveDirX === -1) ctx.rotate(-Math.PI / 2);
    
    // Hop scale
    let scale = 1.0;
    if (this.frog.moving) {
      const p = this.frog.moveTimer / 0.15;
      scale = 1.0 + Math.sin(p * Math.PI) * 0.3; // arc up
    }
    ctx.scale(scale, scale);
    
    ctx.fillStyle = '#a3e635'; // Lime green
    ctx.shadowColor = '#a3e635';
    ctx.shadowBlur = 10;
    
    // Body
    ctx.beginPath();
    ctx.ellipse(0, 5, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Legs
    ctx.beginPath();
    ctx.ellipse(-12, 10, 6, 12, -Math.PI / 4, 0, Math.PI * 2);
    ctx.ellipse(12, 10, 6, 12, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-6, -8, 5, 0, Math.PI * 2);
    ctx.arc(6, -8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-6, -10, 2, 0, Math.PI * 2);
    ctx.arc(6, -10, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowBlur = 0;
    ctx.restore();
    
    // Grid overlay (debug optional)
    // ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    // for(let c=0; c<=this.gridCols; c++) {
    //   ctx.beginPath(); ctx.moveTo(this.offsetX + c*this.tileSize, this.offsetY); ctx.lineTo(this.offsetX + c*this.tileSize, this.offsetY + this.gridRows*this.tileSize); ctx.stroke();
    // }
  }
}

export default Frogger;
