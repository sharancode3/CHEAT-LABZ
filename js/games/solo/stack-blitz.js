import { GameBase } from '../../core/game-base.js';

class StackBlitz extends GameBase {
  static logicalWidth = 420;
  static logicalHeight = 680;

  init() {
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    this.blockH = 26;
    
    // Initial Width
    const lvl = this.level;
    this.initialWidth = lvl === 10 ? 100 : lvl === 2 ? 180 : 200;
    
    // Stack of blocks
    this.blocks = [
      { x: (this.W - this.initialWidth) / 2, y: this.H - 50, w: this.initialWidth, h: this.blockH, hue: 163, light: 20 }
    ];

    // Active block falling state
    this.activeBlock = null;
    this.time = 0;
    this.frequency = 2.0 + lvl * 0.4;
    this.windPhase = 0;
    this.perfectTimer = 0;
    this.perfectFloatY = 0;
    
    // Offset camera tracking
    this.currentOffsetY = 0;
    this.targetOffsetY = 0;

    // Cut pieces list for animation
    this.cutPieces = []; // { x, y, w, h, vx, vy, rot, rotSpeed, opacity }

    // Double platform L7 tracking
    this.isSecondPlatformOfPair = false;

    this.spawnNextBlock();
  }

  spawnNextBlock() {
    const last = this.blocks[this.blocks.length - 1];
    
    let spawnW = last.w;
    
    // Level 8: Platform shrinks slightly during movement
    // But starting width here matches last placed width

    const lvl = this.level;
    let spawnX = 0;
    // Level 3: Platform can start at random edge
    if (lvl >= 3 && Math.random() > 0.5) {
      spawnX = Math.random() > 0.5 ? 0 : this.W - spawnW;
    }

    this.activeBlock = {
      x: spawnX,
      y: last.y - this.blockH,
      w: spawnW,
      h: this.blockH,
      initialW: spawnW
    };

    this.time = Math.random() * Math.PI; // random starting phase
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;
    this.time += dt;

    // Perfect float timer
    if (this.perfectTimer > 0) {
      this.perfectTimer = Math.max(0, this.perfectTimer - delta);
      this.perfectFloatY -= delta * 0.05;
    }

    // Update cut pieces
    this.cutPieces.forEach(p => {
      p.vy += 980 * dt; // gravity
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;
      p.opacity = Math.max(0, p.opacity - dt / 0.4);
    });
    this.cutPieces = this.cutPieces.filter(p => p.opacity > 0);

    // Active block swing logic
    if (this.activeBlock) {
      const lvl = this.level;
      let freq = this.frequency;

      // Level 8 or 9 shinking block
      if (lvl === 8 || lvl === 9) {
        // shrink slightly over time
        this.activeBlock.w = Math.max(20, this.activeBlock.initialW - this.time * 6);
      }

      // Level 4: Platform oscillates with variable speed
      if (lvl === 4 || lvl === 9) {
        freq = this.frequency + Math.sin(this.time * 1.8) * 0.8;
      }

      const amp = (this.W - this.activeBlock.w) / 2;
      const cX = this.W / 2;
      
      let xPos = cX + Math.sin(this.time * freq) * amp - this.activeBlock.w / 2;

      // Level 5 or 9: Wind effect (drifts off-sine)
      if (lvl === 5 || lvl === 9) {
        this.windPhase += dt * 2;
        xPos += Math.sin(this.windPhase) * 15;
      }

      this.activeBlock.x = this.clamp(xPos, 0, this.W - this.activeBlock.w);

      // Check Drop input (Space / Enter / Click)
      const inp = this.input;
      if (inp.wasPressed(' ') || inp.wasPressed('Enter') || inp.clicked) {
        this.dropBlock();
      }
    }

    // Camera follow height smoothly
    const towerTopY = this.blocks[this.blocks.length - 1].y;
    this.targetOffsetY = -(towerTopY - this.H * 0.65);
    this.currentOffsetY = this.currentOffsetY + (this.targetOffsetY - this.currentOffsetY) * 0.08;
  }

  dropBlock() {
    const prev = this.blocks[this.blocks.length - 1];
    const curr = this.activeBlock;

    const diff = curr.x - prev.x;
    const absDiff = Math.abs(diff);

    if (absDiff >= prev.w) {
      // Missed stack entirely
      this.lives--;
      if (this.lives <= 0) {
        this.isOver = true;
        this.gameOver();
      } else {
        this.spawnNextBlock();
      }
      return;
    }

    // Calculate cuts
    let newX = curr.x;
    let newW = curr.w - absDiff;
    let isPerfect = false;

    // Within 4px is perfect
    if (absDiff <= 4) {
      isPerfect = true;
      newX = prev.x;
      newW = prev.w;
      this.score += 50 * this.level;
      this.perfectTimer = 500;
      this.perfectFloatY = curr.y - 10;
    } else {
      // spawn cut piece falling down
      const cutW = absDiff;
      let cutX = 0;
      let vx = 0;
      if (diff > 0) {
        // cut right overhang
        cutX = curr.x + newW;
        vx = 40;
        newX = curr.x;
      } else {
        // cut left overhang
        cutX = curr.x;
        vx = -40;
        newX = prev.x;
      }

      this.cutPieces.push({
        x: cutX,
        y: curr.y,
        w: cutW,
        h: this.blockH,
        vx,
        vy: -50,
        rot: 0,
        rotSpeed: Math.random() > 0.5 ? 2.0 : -2.0,
        opacity: 1.0
      });

      this.score += 10 * this.level;
    }

    // Append to stack
    const stackSize = this.blocks.length;
    // Vary lightness 15-40%
    const light = 15 + (stackSize % 15) * 1.6;

    this.blocks.push({
      x: newX,
      y: curr.y,
      w: newW,
      h: this.blockH,
      hue: 163,
      light
    });

    // Verify target layer goal
    const goals = [0, 15, 18, 20, 22, 25, 25, 28, 28, 30, 35];
    const target = goals[this.level] || 35;
    if (this.blocks.length - 1 >= target) {
      this.levelComplete();
      return;
    }

    // Handle double platform Level 7 pairing
    if (this.level === 7) {
      if (!this.isSecondPlatformOfPair) {
        this.isSecondPlatformOfPair = true;
        // spawn paired block
        this.spawnNextBlock();
      } else {
        this.isSecondPlatformOfPair = false;
        this.spawnNextBlock();
      }
    } else {
      this.spawnNextBlock();
    }
  }

  render(ctx) {
    this.clear();

    ctx.save();
    // Scroll camera
    ctx.translate(0, this.currentOffsetY);

    // Draw stack blocks shadows & colors
    this.blocks.forEach((b, idx) => {
      // 1. Faint Shadow 6px below
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(b.x + 4, b.y + 6, b.w, b.h);

      // 2. Main color block
      const isTop = (idx === this.blocks.length - 1);
      // Topmost layer is brighter
      const lVal = isTop ? b.light + 15 : b.light;
      ctx.fillStyle = `hsl(${b.hue}, 60%, ${lVal}%)`;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Accent border highlight
      ctx.strokeStyle = `rgba(0, 184, 148, ${isTop ? 0.8 : 0.25})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    });

    // Draw cut pieces falling
    this.cutPieces.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
      ctx.rotate(p.rot);
      ctx.fillStyle = `rgba(0, 184, 148, 0.4)`;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    // Perfect popup float text
    if (this.perfectTimer > 0) {
      ctx.save();
      ctx.globalAlpha = this.perfectTimer / 500;
      ctx.fillStyle = '#ffeaa7';
      ctx.font = "bold 13px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('+PERFECT', this.W / 2, this.perfectFloatY);
      ctx.restore();
    }

    // Draw active moving block
    if (this.activeBlock) {
      const lvl = this.level;
      const isGhost = (lvl === 6 || lvl === 9) && (this.blocks.length % 5 === 0);
      
      let drawActive = true;
      if (isGhost) {
        // faint opacity or invisible
        drawActive = false;
      }

      if (drawActive) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.activeBlock.x, this.activeBlock.y, this.activeBlock.w, this.activeBlock.h);
        
        ctx.strokeStyle = '#00b894';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.activeBlock.x, this.activeBlock.y, this.activeBlock.w, this.activeBlock.h);
      }
    }

    ctx.restore();

    // Height vertical counter text right side of screen
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = "bold 12px 'JetBrains Mono', monospace";
    ctx.textAlign = 'right';
    ctx.save();
    ctx.translate(this.W - 20, 200);
    ctx.rotate(Math.PI / 2);
    const goals = [0, 15, 18, 20, 22, 25, 25, 28, 28, 30, 35];
    const target = goals[this.level] || 35;
    ctx.fillText(`HEIGHT: ${this.blocks.length - 1} / ${target}`, 0, 0);
    ctx.restore();
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = StackBlitz;
export default StackBlitz;
