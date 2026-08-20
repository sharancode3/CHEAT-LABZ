import { GameBase } from '../../core/game-base.js';

export class BrickBreaker extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.paddle = {
      w: 120,
      h: 15,
      x: this.W / 2,
      y: this.H - 50,
      vx: 0,
      speed: 600
    };
    
    this.ball = {
      x: this.W / 2,
      y: this.H - 75,
      r: 8,
      vx: 0,
      vy: 0,
      speed: 400 + (this.level * 20),
      launched: false
    };
    
    // Grid: 5 rows x 10 cols
    this.rows = 5;
    this.cols = 10;
    this.bricks = [];
    
    this.brickW = 70;
    this.brickH = 30;
    this.brickSpacing = 6;
    
    // Total width = cols * brickW + (cols-1)*spacing
    const totalW = this.cols * this.brickW + (this.cols - 1) * this.brickSpacing;
    this.offsetX = (this.W - totalW) / 2;
    this.offsetY = 80;
    
    this.generateBricks();
    
    this.keys = { left: false, right: false };
    
    this.particles = [];
    
    this.setupInput();
  }

  generateBricks() {
    this.bricks = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const isReinforced = Math.random() < 0.2;
        this.bricks.push({
          row: r,
          col: c,
          x: this.offsetX + c * (this.brickW + this.brickSpacing),
          y: this.offsetY + r * (this.brickH + this.brickSpacing),
          hp: isReinforced ? 2 : 1,
          maxHp: isReinforced ? 2 : 1
        });
      }
    }
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
      
      if ((e.code === 'Space' || e.code === 'Enter') && !this.ball.launched) {
        this.launchBall();
      }
    };
    
    this.input.onKeyUp = (e) => {
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
    };
    
    this.input.onMouseMove = (e) => {
      if (!this.isPaused && !this.isOver) {
        this.paddle.x = e.x;
      }
    };
    
    this.input.onMouseDown = (e) => {
      if (!this.ball.launched) {
        this.launchBall();
      }
    };
  }

  launchBall() {
    if (this.isPaused || this.isOver) return;
    this.ball.launched = true;
    
    // Launch angle slightly random but generally upwards
    const angle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
    this.ball.vx = Math.cos(angle) * this.ball.speed;
    this.ball.vy = Math.sin(angle) * this.ball.speed;
  }

  spawnParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: color
      });
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    // Paddle movement
    if (this.keys.left) this.paddle.x -= this.paddle.speed * delta;
    if (this.keys.right) this.paddle.x += this.paddle.speed * delta;
    
    // Clamp paddle
    if (this.paddle.x - this.paddle.w / 2 < 0) this.paddle.x = this.paddle.w / 2;
    if (this.paddle.x + this.paddle.w / 2 > this.W) this.paddle.x = this.W - this.paddle.w / 2;

    if (!this.ball.launched) {
      // Lock ball to paddle
      this.ball.x = this.paddle.x;
      this.ball.y = this.paddle.y - this.paddle.h / 2 - this.ball.r - 2;
    } else {
      // Move Ball
      this.ball.x += this.ball.vx * delta;
      this.ball.y += this.ball.vy * delta;
      
      // Wall Bounces
      if (this.ball.x - this.ball.r < 0) {
        this.ball.x = this.ball.r;
        this.ball.vx *= -1;
      } else if (this.ball.x + this.ball.r > this.W) {
        this.ball.x = this.W - this.ball.r;
        this.ball.vx *= -1;
      }
      
      if (this.ball.y - this.ball.r < 0) {
        this.ball.y = this.ball.r;
        this.ball.vy *= -1;
      }
      
      // Paddle Bounce
      const bL = this.paddle.x - this.paddle.w / 2;
      const bR = this.paddle.x + this.paddle.w / 2;
      const bT = this.paddle.y - this.paddle.h / 2;
      const bB = this.paddle.y + this.paddle.h / 2;
      
      if (this.ball.x + this.ball.r >= bL && this.ball.x - this.ball.r <= bR &&
          this.ball.y + this.ball.r >= bT && this.ball.y - this.ball.r <= bB) {
        
        // Only bounce if falling
        if (this.ball.vy > 0) {
          // Adjust angle based on where it hit the paddle
          const hitPos = (this.ball.x - this.paddle.x) / (this.paddle.w / 2); // -1 to 1
          const maxBounceAngle = Math.PI / 3; // 60 degrees
          
          const angle = -Math.PI / 2 + hitPos * maxBounceAngle;
          
          this.ball.vx = Math.cos(angle) * this.ball.speed;
          this.ball.vy = Math.sin(angle) * this.ball.speed;
          
          this.ball.y = bT - this.ball.r - 1; // Snap out
          
          if (window.Sound) window.Sound.playTone(600, 'sine', 0.05);
        }
      }
      
      // Floor -> Death
      if (this.ball.y - this.ball.r > this.H) {
        this.lives -= 1;
        if (window.Sound) window.Sound.playTone(150, 'square', 0.2);
        
        if (this.lives > 0) {
          this.ball.launched = false;
        } else {
          this.isOver = true;
        }
      }
      
      // Brick collisions
      let hitBrick = false;
      for (let i = this.bricks.length - 1; i >= 0; i--) {
        const brick = this.bricks[i];
        
        const cL = brick.x;
        const cR = brick.x + this.brickW;
        const cT = brick.y;
        const cB = brick.y + this.brickH;
        
        if (this.ball.x + this.ball.r >= cL && this.ball.x - this.ball.r <= cR &&
            this.ball.y + this.ball.r >= cT && this.ball.y - this.ball.r <= cB) {
          
          // Collision logic (normal inversion based on overlap)
          // Find center of brick
          const cx = brick.x + this.brickW / 2;
          const cy = brick.y + this.brickH / 2;
          
          const dx = this.ball.x - cx;
          const dy = this.ball.y - cy;
          
          // Normalize by dimension
          const nx = dx / (this.brickW / 2);
          const ny = dy / (this.brickH / 2);
          
          if (Math.abs(nx) > Math.abs(ny)) {
            // Horizontal impact
            this.ball.vx *= -1;
            // Snap out
            this.ball.x = nx > 0 ? cR + this.ball.r + 1 : cL - this.ball.r - 1;
          } else {
            // Vertical impact
            this.ball.vy *= -1;
            this.ball.y = ny > 0 ? cB + this.ball.r + 1 : cT - this.ball.r - 1;
          }
          
          // Damage
          brick.hp -= 1;
          if (brick.hp <= 0) {
            this.score += brick.maxHp === 2 ? 30 : 10;
            this.spawnParticles(cx, cy, brick.maxHp === 2 ? '#facc15' : '#38bdf8');
            this.bricks.splice(i, 1);
            if (window.Sound) window.Sound.playTone(800, 'square', 0.05);
          } else {
            if (window.Sound) window.Sound.playTone(400, 'square', 0.05);
          }
          
          hitBrick = true;
          break; // Only hit one brick per frame to prevent weirdness
        }
      }
      
      // Speed up slightly on hit
      if (hitBrick) {
         this.ball.speed = Math.min(800, this.ball.speed + 2);
         const angle = Math.atan2(this.ball.vy, this.ball.vx);
         this.ball.vx = Math.cos(angle) * this.ball.speed;
         this.ball.vy = Math.sin(angle) * this.ball.speed;
      }
    }
    
    // Win condition
    if (this.bricks.length === 0 && !this.isOver) {
      this.levelComplete();
    }
    
    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.life -= delta * 2;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    this.clear();
    
    // Draw Particles
    for (let p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    
    // Draw Bricks
    for (let b of this.bricks) {
      const color = b.hp === 2 ? '#facc15' : (b.maxHp === 2 ? '#ca8a04' : '#38bdf8');
      
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillRect(b.x, b.y, this.brickW, this.brickH);
      
      // Inner detail
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(b.x, b.y, this.brickW, 5); // top highlight
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(b.x, b.y + this.brickH - 5, this.brickW, 5); // bottom shadow
      
      ctx.shadowBlur = 0;
    }
    
    // Draw Paddle
    ctx.fillStyle = '#10b981';
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 15;
    ctx.fillRect(this.paddle.x - this.paddle.w / 2, this.paddle.y - this.paddle.h / 2, this.paddle.w, this.paddle.h);
    ctx.shadowBlur = 0;
    
    // Draw Ball
    ctx.fillStyle = '#fff';
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    if (!this.ball.launched) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '14px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText("CLICK OR SPACE TO LAUNCH", this.W / 2, this.paddle.y + 40);
    }
  }
}

export default BrickBreaker;
