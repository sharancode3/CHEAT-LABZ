import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

class StackBlitz extends GameShell {
  constructor() {
    super('game-canvas', {
      name: 'stack-blitz',
      description: 'Drop the blocks to stack. Overhangs are cut off. 3 perfects = block grows.',
      width: 400,
      height: 600
    });

    this.scoreEl = document.getElementById('game-score');
    this.comboEl = document.getElementById('game-combo');

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.state === 'PLAYING') {
        this.dropBlock();
      }
    });

    this.init();
  }

  onStart() {
    this.blockH = 30;
    this.blocks = [];
    
    // Initial foundation block
    this.blocks.push({
      x: 100, y: 550, w: 200, h: this.blockH, hue: 0
    });
    
    this.activeBlock = null;
    
    this.cameraY = 0;
    this.targetCameraY = 0;
    
    this.speed = 150;
    this.dir = 1;
    this.hueCounter = 0;
    
    this.perfectDrops = 0;
    this.debris = []; // Falling cut-off pieces
    
    this.spawnNextBlock();
    this.updateUI();
    
    let runs = Storage.get('stack-blitz_runs', 0);
    Storage.set('stack-blitz_runs', runs + 1);
  }

  onInput(key, event) {
    if (key === ' ' && this.state === 'PLAYING') {
      this.dropBlock();
    }
  }

  spawnNextBlock() {
    const last = this.blocks[this.blocks.length - 1];
    this.hueCounter = (this.hueCounter + 15) % 360;
    
    this.activeBlock = {
      x: this.dir > 0 ? -last.w : this.canvas.width,
      y: last.y - this.blockH,
      w: last.w,
      h: this.blockH,
      hue: this.hueCounter
    };
    
    // Speed up slightly per block
    this.speed += 5;
    
    // Camera pan
    if (this.blocks.length > 6) {
      this.targetCameraY = (this.blocks.length - 6) * this.blockH;
    }
  }

  dropBlock() {
    if (!this.activeBlock) return;
    
    const prev = this.blocks[this.blocks.length - 1];
    const curr = this.activeBlock;
    
    // Check overlap
    const overlap = curr.w - Math.abs(curr.x - prev.x);
    
    // Tolerance for perfect drop (within 4px)
    if (Math.abs(curr.x - prev.x) < 4) {
      // Perfect drop
      curr.x = prev.x; // align exactly
      curr.w = prev.w;
      this.perfectDrops++;
      Sound.playCoin();
      
      if (this.perfectDrops >= 3) {
        // Grow block slightly
        curr.w = Math.min(curr.w + 20, 200);
        curr.x -= 10;
        this.showCombo();
      }
    } else if (overlap > 0) {
      // Cut off
      this.perfectDrops = 0;
      this.comboEl.style.display = 'none';
      Sound.playBlip();
      
      const newWidth = overlap;
      let newX = curr.x;
      let debrisX = curr.x;
      let debrisW = curr.w - overlap;
      
      if (curr.x < prev.x) {
        // overhang on left
        newX = prev.x;
        debrisX = curr.x;
      } else {
        // overhang on right
        newX = curr.x;
        debrisX = curr.x + overlap;
      }
      
      curr.w = newWidth;
      curr.x = newX;
      
      // Spawn debris
      this.debris.push({
        x: debrisX, y: curr.y, w: debrisW, h: this.blockH, hue: curr.hue, vy: 0
      });
      
    } else {
      // Missed completely
      this.debris.push({
        x: curr.x, y: curr.y, w: curr.w, h: this.blockH, hue: curr.hue, vy: 0
      });
      this.activeBlock = null;
      Sound.playDamage();
      setTimeout(() => { Sound.playGameOver(); this.gameOver(); }, 1000);
      return;
    }
    
    this.blocks.push(curr);
    this.activeBlock = null;
    this.score++;
    this.updateUI();
    
    this.dir *= -1; // reverse direction
    this.spawnNextBlock();
  }

  showCombo() {
    this.comboEl.style.display = 'inline';
    this.comboEl.style.animation = 'none';
    this.comboEl.offsetHeight; /* trigger reflow */
    this.comboEl.style.animation = 'pulse 0.5s';
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    // Move active block
    if (this.activeBlock) {
      this.activeBlock.x += this.speed * this.dir * dt;
      // Bounce off walls
      if (this.activeBlock.x > this.canvas.width || this.activeBlock.x + this.activeBlock.w < 0) {
        this.dir *= -1;
      }
    }
    
    // Camera smooth pan
    if (this.cameraY < this.targetCameraY) {
      this.cameraY += (this.targetCameraY - this.cameraY) * 10 * dt;
    }
    
    // Update debris
    for (let i = this.debris.length - 1; i >= 0; i--) {
      let d = this.debris[i];
      d.vy += 1000 * dt; // gravity
      d.y += d.vy * dt;
      // rotate logic omitted for simplicity, just falls straight down
      if (d.y > this.canvas.height + this.cameraY) {
        this.debris.splice(i, 1);
      }
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f'; // var(--bg-primary)
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.save();
    this.ctx.translate(0, this.cameraY);

    // Draw blocks
    for (let i = 0; i < this.blocks.length; i++) {
      let b = this.blocks[i];
      this.ctx.fillStyle = \`hsl(\${b.hue}, 80%, 60%)\`;
      this.ctx.fillRect(b.x, b.y, b.w, b.h);
      
      // highlight
      this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
      this.ctx.fillRect(b.x, b.y, b.w, 4);
    }
    
    // Draw active block
    if (this.activeBlock) {
      let b = this.activeBlock;
      this.ctx.fillStyle = \`hsl(\${b.hue}, 80%, 60%)\`;
      this.ctx.fillRect(b.x, b.y, b.w, b.h);
      this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
      this.ctx.fillRect(b.x, b.y, b.w, 4);
    }
    
    // Draw debris
    for (let d of this.debris) {
      this.ctx.fillStyle = \`hsl(\${d.hue}, 80%, 40%)\`;
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillRect(d.x, d.y, d.w, d.h);
    }
    this.ctx.globalAlpha = 1.0;

    this.ctx.restore();
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
  new StackBlitz();
});
