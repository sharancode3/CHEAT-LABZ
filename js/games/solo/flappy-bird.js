import { GameBase } from '../../core/game-base.js';

export class FlappyBird extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.bird = {
      x: 200,
      y: this.H / 2,
      r: 14,
      vy: 0
    };
    
    // Physics constants
    this.gravity = 980; // px/s^2
    this.flapImpulse = -320; // px/s
    this.terminalVelocity = 600; // px/s
    
    this.pipes = [];
    this.pipeWidth = 70;
    this.pipeGap = 130;
    this.pipeSpeed = 180; // px/s
    this.pipeSpacing = 220; // Horizontal distance between pipes
    
    this.groundOffset = 40;
    
    this.nextPipeX = this.W + this.pipeSpacing;
    
    this.isDead = false;
    this.deathAnim = 0;
    
    this.setupInput();
  }

  setupInput() {
    // Both mouse and spacebar
    this.input.onMouseDown = (e) => {
      this.flap();
    };
    
    this.input.onKeyDown = (e) => {
      if (e.code === 'Space') {
        this.flap();
      }
    };
  }

  flap() {
    if (this.isPaused || this.isOver || this.isDead) return;
    
    this.bird.vy = this.flapImpulse;
    
    if (window.Sound) {
      window.Sound.playTone(400, 'sine', 0.1);
    }
  }

  spawnPipe(xPos) {
    // Top height max: H - ground - gap - minPipe
    // minPipe = 50
    const minHeight = 50;
    const maxHeight = this.H - this.groundOffset - this.pipeGap - minHeight;
    
    const topHeight = minHeight + Math.random() * (maxHeight - minHeight);
    const bottomHeight = this.H - this.groundOffset - topHeight - this.pipeGap;
    
    this.pipes.push({
      x: xPos,
      topHeight: topHeight,
      bottomHeight: bottomHeight,
      passed: false
    });
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.isDead) {
      // Death animation
      this.deathAnim -= delta;
      
      // Still apply gravity so bird falls off screen
      this.bird.vy += this.gravity * delta;
      if (this.bird.vy > this.terminalVelocity) this.bird.vy = this.terminalVelocity;
      this.bird.y += this.bird.vy * delta;
      
      if (this.deathAnim <= 0) {
        this.lives = 0; // Trigger system game over
        this.isOver = true;
      }
      return;
    }

    // Bird Physics
    this.bird.vy += this.gravity * delta;
    if (this.bird.vy > this.terminalVelocity) this.bird.vy = this.terminalVelocity;
    this.bird.y += this.bird.vy * delta;
    
    // Ceiling bounce
    if (this.bird.y - this.bird.r < 0) {
      this.bird.y = this.bird.r;
      this.bird.vy = 0;
    }
    
    // Ground collision -> Death
    if (this.bird.y + this.bird.r >= this.H - this.groundOffset) {
      this.die();
      return;
    }

    // Pipe Management
    if (this.pipes.length === 0 || this.pipes[this.pipes.length - 1].x < this.W - this.pipeSpacing) {
      this.spawnPipe(this.W + 50);
    }
    
    for (let i = 0; i < this.pipes.length; i++) {
      let p = this.pipes[i];
      p.x -= this.pipeSpeed * delta;
      
      // Collision Math
      // Bird AABB mapping (approx circle with AABB)
      const bR = this.bird.r;
      const bX = this.bird.x;
      const bY = this.bird.y;
      
      const pL = p.x;
      const pR = p.x + this.pipeWidth;
      
      if (bX + bR > pL && bX - bR < pR) {
        // Horizontally inside pipe area
        if (bY - bR < p.topHeight || bY + bR > this.H - this.groundOffset - p.bottomHeight) {
          // Hit pipe!
          this.die();
          return;
        }
      }
      
      // Score logic
      if (!p.passed && bX > pR) {
        p.passed = true;
        this.score += 1;
        if (window.Sound) {
          window.Sound.playTone(800, 'square', 0.1);
        }
      }
    }
    
    // Cleanup pipes off screen
    if (this.pipes.length > 0 && this.pipes[0].x + this.pipeWidth < 0) {
      this.pipes.shift();
    }
  }
  
  die() {
    this.isDead = true;
    this.deathAnim = 1.0;
    this.bird.vy = 0; // Stop momentum for a sec
    if (window.Sound) {
      window.Sound.playTone(100, 'sawtooth', 0.5);
    }
  }

  render(ctx) {
    this.clear();
    
    // Draw background grid (faint)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for(let i=0; i<this.W; i+=50) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, this.H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(this.W, i); ctx.stroke();
    }
    
    // Draw Pipes
    for (let p of this.pipes) {
      ctx.fillStyle = '#10b981'; // Green
      ctx.shadowColor = '#10b981';
      ctx.shadowBlur = 10;
      
      // Top pipe
      ctx.fillRect(p.x, 0, this.pipeWidth, p.topHeight);
      
      // Bottom pipe
      const bottomY = this.H - this.groundOffset - p.bottomHeight;
      ctx.fillRect(p.x, bottomY, this.pipeWidth, p.bottomHeight);
      
      // Pipe caps
      ctx.fillStyle = '#059669';
      ctx.fillRect(p.x - 4, p.topHeight - 20, this.pipeWidth + 8, 20);
      ctx.fillRect(p.x - 4, bottomY, this.pipeWidth + 8, 20);
      
      ctx.shadowBlur = 0;
    }
    
    // Draw Ground
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, this.H - this.groundOffset, this.W, this.groundOffset);
    
    // Scrolling ground lines
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    const offset = (Date.now() / 1000 * this.pipeSpeed) % 40;
    for(let i = 0; i < this.W + 40; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i - offset, this.H - this.groundOffset);
      ctx.lineTo(i - offset + 20, this.H);
      ctx.stroke();
    }
    
    // Draw Bird
    ctx.save();
    ctx.translate(this.bird.x, this.bird.y);
    
    // Rotate based on velocity
    let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.bird.vy * 0.1) * Math.PI / 180));
    if (this.isDead) rotation = Math.PI; // Upside down when dead
    ctx.rotate(rotation);
    
    ctx.fillStyle = '#facc15'; // Yellow bird
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 15;
    
    ctx.beginPath();
    ctx.arc(0, 0, this.bird.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(6, -4, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Wing
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-4, 2, 6, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
    
    if (this.isDead) {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.3)';
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }
}

export default FlappyBird;
