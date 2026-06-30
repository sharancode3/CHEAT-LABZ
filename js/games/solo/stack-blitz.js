import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class StackBlitz extends GameBase {
  static get logicalWidth() { return 400; }
  static get logicalHeight() { return 600; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.blockH = 30;
    this.blocks = [];
    this.debris = [];
    this.floatingTexts = [];
    
    this.activeBlock = null;
    
    this.cameraY = 0;
    this.targetCameraY = 0;
    
    this.speed = 2.0;
    this.time = 0;
    this.hueCounter = 0;
    this.perfectDrops = 0;

    this.perfectFlashTimer = 0;
    this.perfectFlashX = 0;
    this.perfectFlashW = 0;
    this.perfectFlashY = 0;
  }

  init() {
    this.blockH = 30;
    this.blocks = [];
    this.debris = [];
    this.floatingTexts = [];
    this.score = 0;
    this.perfectDrops = 0;

    // Initial foundation base block
    this.blocks.push({
      x: 100, y: 550, w: 200, h: this.blockH, hue: 180
    });
    
    this.activeBlock = null;
    this.cameraY = 0;
    this.targetCameraY = 0;
    
    this.speed = 2.0; // horizontal sweep frequency
    this.time = 0;
    this.hueCounter = 180;
    this.perfectFlashTimer = 0;
    
    this.spawnNextBlock();

    let runs = Storage.get('stack-blitz_runs', 0);
    Storage.set('stack-blitz_runs', runs + 1);
  }

  onInput(key, event) {
    const k = key.toLowerCase();
    if ((k === ' ' || k === 'enter') && this.state === 'PLAYING') {
      this.dropBlock();
    }
  }

  onMouseDown(x, y, event) {
    if (this.state === 'PLAYING') {
      this.dropBlock();
    }
  }

  spawnNextBlock() {
    const last = this.blocks[this.blocks.length - 1];
    this.hueCounter = (this.hueCounter + 18) % 360;
    
    this.activeBlock = {
      x: 0,
      y: last.y - this.blockH,
      w: last.w,
      h: this.blockH,
      hue: this.hueCounter
    };
    
    this.time = 0;
    this.speed = 2.0 + (this.blocks.length * 0.08); // accelerate swing sweep speed
    
    // Smooth camera panning
    if (this.blocks.length > 5) {
      this.targetCameraY = (this.blocks.length - 5) * this.blockH;
    }
  }

  dropBlock() {
    if (!this.activeBlock) return;
    
    const prev = this.blocks[this.blocks.length - 1];
    const curr = this.activeBlock;
    
    const diff = Math.abs(curr.x - prev.x);
    const overlap = curr.w - diff;

    if (diff <= 3) {
      // 1. PERFECT DROP
      curr.x = prev.x; // Lock positions
      this.perfectDrops++;
      this.container.audio.play('perfect');
      this.container.shake(80, 2);

      // Trigger perfect green flashing highlight bounds
      this.perfectFlashTimer = 150;
      this.perfectFlashX = curr.x;
      this.perfectFlashW = curr.w;
      this.perfectFlashY = curr.y;

      this.floatingTexts.push({
        x: curr.x + curr.w / 2,
        y: curr.y - 10,
        text: `PERFECT x${this.perfectDrops}!`,
        life: 700,
        maxLife: 700,
        color: '#10b981'
      });

      // Expand blocks if combo >= 3
      if (this.perfectDrops >= 3) {
        const oldW = curr.w;
        curr.w = Math.min(curr.w + 15, 200);
        // center width expand adjustment
        curr.x = prev.x - (curr.w - oldW) / 2;
      }
    } else if (overlap > 0) {
      // 2. BLOCK OVERLAP SLICE
      this.perfectDrops = 0;
      this.container.audio.play('blip');
      
      const newWidth = overlap;
      let newX = curr.x;
      let debrisX = curr.x;
      let debrisW = diff;

      if (curr.x < prev.x) {
        // slice off left part, keep right
        newX = prev.x;
        debrisX = curr.x;
      } else {
        // slice off right part, keep left
        newX = curr.x;
        debrisX = curr.x + overlap;
      }

      curr.w = newWidth;
      curr.x = newX;

      // Add falling sliced piece debris
      this.debris.push({
        x: debrisX,
        y: curr.y,
        w: debrisW,
        h: this.blockH,
        hue: curr.hue,
        vy: 10 // initial downward momentum
      });
    } else {
      // 3. MISSED COMPLETELY -> falls and game over
      this.debris.push({
        x: curr.x,
        y: curr.y,
        w: curr.w,
        h: this.blockH,
        hue: curr.hue,
        vy: 20
      });
      this.activeBlock = null;
      this.container.audio.play('damage');
      
      // Delay to let debris start falling
      setTimeout(() => {
        this.container.audio.play('gameover');
        this.finishGame();
      }, 800);
      return;
    }

    this.blocks.push(curr);
    this.activeBlock = null;
    this.score++;
    this.spawnNextBlock();
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.time += dt;

    if (this.perfectFlashTimer > 0) this.perfectFlashTimer -= deltaTime;

    // Floating text items
    this.floatingTexts = this.floatingTexts.filter(t => {
      t.life -= deltaTime;
      t.y -= dt * 25;
      return t.life > 0;
    });

    // Move active sweep block with Sine wave oscillation
    if (this.activeBlock) {
      const sweepRange = this.width - this.activeBlock.w;
      // Oscillates smoothly from 0 to sweepRange
      this.activeBlock.x = (Math.sin(this.time * this.speed) * 0.5 + 0.5) * sweepRange;
    }

    // Camera pan eases to target
    if (this.cameraY < this.targetCameraY) {
      this.cameraY += (this.targetCameraY - this.cameraY) * 6 * dt;
    }

    // Gravity debris physics
    this.debris.forEach(d => {
      d.vy += 850 * dt; // gravity constant
      d.y += d.vy * dt;
    });
    // Remove debris below viewports
    this.debris = this.debris.filter(d => d.y < this.height + this.cameraY + 50);
  }

  finishGame() {
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 8);

    this.scoreBreakdown = {
      rows: [
        { label: 'Blocks Stacked', value: baseScore, points: baseScore * 100 }
      ],
      total: baseScore * 100,
      coinsEarned: coins
    };

    this.score = baseScore * 100;

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Stack Blitz Match');
    }

    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    // Follow camera offset translation
    ctx.translate(0, this.cameraY);

    // 2. Draw Stacked Blocks
    for (let i = 0; i < this.blocks.length; i++) {
      const b = this.blocks[i];
      
      // HSL color mapping for neon towers
      ctx.fillStyle = `hsl(${b.hue}, 80%, 55%)`;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 3);
      ctx.fill();

      // Top highlighted border sheen
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(b.x, b.y, b.w, 3);
    }

    // 3. Draw Active block
    if (this.activeBlock) {
      const b = this.activeBlock;
      ctx.fillStyle = `hsl(${b.hue}, 80%, 55%)`;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, 3);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(b.x, b.y, b.w, 3);
    }

    // 4. Draw falling cut off debris
    for (let d of this.debris) {
      ctx.fillStyle = `hsl(${d.hue}, 70%, 40%)`;
      ctx.beginPath();
      ctx.roundRect(d.x, d.y, d.w, d.h, 2);
      ctx.fill();
    }

    // 5. Draw green flash for perfect stacks
    if (this.perfectFlashTimer > 0) {
      const alpha = this.perfectFlashTimer / 150;
      ctx.strokeStyle = `rgba(16, 185, 129, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(this.perfectFlashX, this.perfectFlashY, this.perfectFlashW, this.blockH);
    }

    // 6. Draw floating combo text
    this.floatingTexts.forEach(t => {
      const alpha = t.life / t.maxLife;
      ctx.fillStyle = `rgba(16, 185, 129, ${alpha})`;
      ctx.font = "bold 11px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    });

    ctx.restore();

    // UI Stats hud
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`HEIGHT: ${this.score}`, 20, 50);
    ctx.textAlign = 'right';
    ctx.fillText(`COMBO: x${this.perfectDrops}`, this.width - 20, 50);
  }

  getControls() {
    return [
      { key: 'SPACE / CLICK', action: 'Drop Active block' }
    ];
  }

  getFunStat() {
    return `Final stack size of ${this.score} blocks reached`;
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
