import { GameShell } from './game-shell.js';

export default class StackBlitz extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);
    this.clickHandler = () => {
      if (this.isRunning) this.placeBlock();
    };
    this.canvas.addEventListener('mousedown', this.clickHandler);
  }

  destroy() {
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

    this.blocks = [];
    this.blockHeight = 30;
    this.startWidth = 200;
    
    this.blocks.push({
      x: this.canvas.width / 2,
      y: this.canvas.height - this.blockHeight,
      width: this.startWidth,
      color: '#333'
    });

    this.currentBlock = null;
    this.moveSpeed = 300 * this.mods.speedMult;
    this.moveDir = 1;
    
    this.cameraY = 0;
    this.wobbleAmount = 0;
    
    this.combo = 0;
    this.particles = [];
    this.floatingTexts = [];
    this.fallingBlocks = [];
    
    this.score = 0;
    this.updateScore(0);

    this.spawnBlock();
  }

  onInput(keyLabel, e, isDown) {
    if (!isDown) return;
    if (e.code === 'Space' || e.key === 'Enter') {
      this.placeBlock();
    }
  }

  spawnBlock() {
    const prevBlock = this.blocks[this.blocks.length - 1];
    
    this.moveSpeed += 10 * this.mods.speedMult;
    this.moveDir = (Math.random() < 0.5 ? 1 : -1);

    this.currentBlock = {
      x: this.moveDir === 1 ? -prevBlock.width/2 : this.canvas.width + prevBlock.width/2,
      y: prevBlock.y - this.blockHeight,
      width: prevBlock.width,
      color: `hsl(${(this.blocks.length * 10) % 360}, 80%, 60%)`
    };
    
    const targetCameraY = (this.blocks.length > 10) ? (this.blocks.length - 10) * this.blockHeight : 0;
    this.cameraY += (targetCameraY - this.cameraY) * 0.1;
  }

  placeBlock() {
    if (!this.currentBlock) return;
    
    const prevBlock = this.blocks[this.blocks.length - 1];
    
    const deltaX = this.currentBlock.x - prevBlock.x;
    const absDeltaX = Math.abs(deltaX);
    
    if (absDeltaX > prevBlock.width / 2 + this.currentBlock.width / 2) {
      this.fallingBlocks.push({...this.currentBlock, vy: 0});
      this.currentBlock = null;
      return this.gameOver();
    }

    const tolerance = 5;
    
    if (absDeltaX <= tolerance) {
      this.currentBlock.x = prevBlock.x;
      this.combo++;
      this.wobbleAmount = Math.max(0, this.wobbleAmount - 1);
      
      let pts = 50 * this.combo;
      this.score += pts;
      this.updateScore(this.score);
      
      this.createExplosion(this.currentBlock.x, this.currentBlock.y + this.blockHeight/2, '#06B6D4', 30);
      this.floatingTexts.push({ x: this.currentBlock.x, y: this.currentBlock.y, text: 'PERFECT', color: '#06B6D4', life: 1.0, vy: -2 });
      
    } else {
      this.combo = 0;
      
      const newWidth = prevBlock.width - absDeltaX;
      const overlapCenter = prevBlock.x + (deltaX / 2);
      
      const fallingWidth = absDeltaX;
      const fallingX = deltaX > 0 ? prevBlock.x + prevBlock.width/2 + fallingWidth/2 : prevBlock.x - prevBlock.width/2 - fallingWidth/2;
      
      this.fallingBlocks.push({
        x: fallingX,
        y: this.currentBlock.y,
        width: fallingWidth,
        color: this.currentBlock.color,
        vy: 0
      });
      
      this.currentBlock.width = newWidth;
      this.currentBlock.x = overlapCenter;
      
      this.wobbleAmount += (absDeltaX / this.startWidth) * 10;
      
      let pts = 10;
      this.score += pts;
      this.updateScore(this.score);
      
      this.createExplosion(fallingX, this.currentBlock.y + this.blockHeight/2, '#EF4444', 15);
    }
    
    this.blocks.push({...this.currentBlock});
    
    if (this.mods.suddenDeath && this.combo === 0 && this.blocks.length > 2) {
      return this.gameOver();
    }
    
    if (this.currentBlock.width < 10) {
      return this.gameOver();
    }
    
    this.currentBlock = null;
    this.spawnBlock();
  }

  // Override gameOver to add visual effect before triggering GameShell's gameOver
  gameOver() {
    this.blocks.forEach((b, i) => {
      if (i === 0) return;
      this.fallingBlocks.push({...b, vy: -5 - Math.random()*10, vx: (Math.random()-0.5)*10});
    });
    this.blocks = [this.blocks[0]];
    
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
    
    const targetCameraY = (this.blocks.length > 10) ? (this.blocks.length - 10) * this.blockHeight : 0;
    this.cameraY += (targetCameraY - this.cameraY) * 5 * dtSec;
    
    if (this.currentBlock) {
      this.currentBlock.x += this.moveSpeed * this.moveDir * dtSec;
      
      if (this.currentBlock.x > this.canvas.width + this.currentBlock.width/2) {
        this.currentBlock.x = this.canvas.width + this.currentBlock.width/2;
        this.moveDir = -1;
      } else if (this.currentBlock.x < -this.currentBlock.width/2) {
        this.currentBlock.x = -this.currentBlock.width/2;
        this.moveDir = 1;
      }
    }
    
    for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
      let b = this.fallingBlocks[i];
      b.vy += 1000 * dtSec;
      b.y += b.vy * dtSec;
      if (b.vx) b.x += b.vx * dtSec;
      
      if (b.y > this.canvas.height + 200 + this.cameraY) {
        this.fallingBlocks.splice(i, 1);
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

    this.ctx.save();
    
    const time = performance.now() / 1000;
    const wobbleOffset = Math.sin(time * 5) * this.wobbleAmount;
    
    this.ctx.translate(wobbleOffset, this.cameraY);
    
    this.blocks.forEach((b, i) => {
      this.ctx.fillStyle = b.color;
      this.ctx.shadowBlur = i === this.blocks.length - 1 ? 15 : 5;
      this.ctx.shadowColor = b.color;
      
      this.ctx.fillRect(b.x - b.width/2, b.y, b.width, this.blockHeight);
      
      this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(b.x - b.width/2, b.y, b.width, this.blockHeight);
    });
    
    if (this.currentBlock) {
      this.ctx.fillStyle = this.currentBlock.color;
      this.ctx.shadowBlur = 20;
      this.ctx.shadowColor = this.currentBlock.color;
      this.ctx.fillRect(this.currentBlock.x - this.currentBlock.width/2, this.currentBlock.y, this.currentBlock.width, this.blockHeight);
      this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      this.ctx.strokeRect(this.currentBlock.x - this.currentBlock.width/2, this.currentBlock.y, this.currentBlock.width, this.blockHeight);
    }
    
    this.ctx.shadowBlur = 0;
    this.fallingBlocks.forEach(b => {
      this.ctx.fillStyle = b.color;
      this.ctx.fillRect(b.x - b.width/2, b.y, b.width, this.blockHeight);
    });
    
    this.ctx.restore();

    this.ctx.save();
    this.ctx.translate(wobbleOffset, this.cameraY);
    
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
    this.ctx.restore();

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.canvas.width/2, this.canvas.height/2, 100, this.canvas.width/2, this.canvas.height/2, 300);
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
      this.ctx.fillText(`FLOOR: ${this.blocks.length} | COMBO: ${this.combo}`, 20, 30);
      
      if (this.wobbleAmount > 5) {
        this.ctx.fillStyle = '#EF4444';
        this.ctx.fillText('WARNING: STRUCTURAL INSTABILITY DETECTED', 20, 60);
      }
      
      if (this.mods.suddenDeath) {
         this.ctx.fillStyle = '#FBBF24';
         this.ctx.fillText('SUDDEN DEATH: MUST BE PERFECT', 20, 90);
      }
    }
  }
}
