import { GameShell } from './game-shell.js';

export default class GravityFlip extends GameShell {
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

    this.player = {
      x: this.mods.reverse ? this.canvas.width - 150 : 150,
      y: this.canvas.height - 50,
      width: 30,
      height: 30,
      vy: 0,
      gravityDir: 1,
      gravityForce: 2500,
      isGrounded: true,
      color: '#06B6D4'
    };

    this.scrollSpeed = 400 * this.mods.speedMult;
    this.distance = 0;
    
    this.obstacles = [];
    this.spawnTimer = 0;
    this.spawnInterval = 1000 / this.mods.speedMult;
    
    this.particles = [];
    
    this.score = 0;
    this.updateScore(0);
  }

  onInput(key, e, isDown) {
    if (!isDown) return;
    if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      this.flipGravity();
    }
  }

  flipGravity() {
    if (this.player.isGrounded) {
      this.player.gravityDir *= -1;
      this.player.isGrounded = false;
      this.createExplosion(this.player.x + this.player.width/2, this.player.y + (this.player.gravityDir===1 ? 0 : this.player.height), '#06B6D4', 10);
    }
  }

  spawnObstacle() {
    const type = Math.floor(Math.random() * 3);
    const w = 40 + Math.random() * 40;
    const h = 40 + Math.random() * 60;
    
    let y = 0;
    if (type === 0) y = this.canvas.height - h;
    else if (type === 1) y = 0;
    else y = this.canvas.height/2 - h/2;
    
    this.obstacles.push({
      x: this.mods.reverse ? -w : this.canvas.width,
      y: y,
      width: w,
      height: h,
      passed: false
    });
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
    
    this.player.vy += this.player.gravityForce * this.player.gravityDir * dtSec;
    this.player.y += this.player.vy * dtSec;
    
    if (this.player.y > this.canvas.height - this.player.height) {
      this.player.y = this.canvas.height - this.player.height;
      this.player.vy = 0;
      if (!this.player.isGrounded) {
         this.player.isGrounded = true;
         this.createExplosion(this.player.x + this.player.width/2, this.canvas.height, '#fff', 5);
      }
    } else if (this.player.y < 0) {
      this.player.y = 0;
      this.player.vy = 0;
      if (!this.player.isGrounded) {
         this.player.isGrounded = true;
         this.createExplosion(this.player.x + this.player.width/2, 0, '#fff', 5);
      }
    }
    
    this.scrollSpeed += 10 * dtSec * this.mods.speedMult;
    this.distance += this.scrollSpeed * dtSec;
    
    this.spawnTimer -= dtMs;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      this.spawnInterval = Math.max(400, this.spawnInterval - 10);
      this.spawnTimer = this.spawnInterval;
    }
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      let obs = this.obstacles[i];
      if (this.mods.reverse) {
        obs.x += this.scrollSpeed * dtSec;
      } else {
        obs.x -= this.scrollSpeed * dtSec;
      }
      
      if (
        this.player.x < obs.x + obs.width &&
        this.player.x + this.player.width > obs.x &&
        this.player.y < obs.y + obs.height &&
        this.player.y + this.player.height > obs.y
      ) {
        this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2, '#EF4444', 100);
        this.draw();
        this.gameOver();
        return;
      }

      if (!obs.passed) {
        if (this.mods.reverse) {
          if (obs.x > this.player.x + this.player.width) {
            obs.passed = true;
            this.score += 10;
            this.updateScore(this.score);
          }
        } else {
          if (obs.x + obs.width < this.player.x) {
            obs.passed = true;
            this.score += 10;
            this.updateScore(this.score);
          }
        }
      }
      
      if (this.mods.reverse) {
        if (obs.x > this.canvas.width + 50) this.obstacles.splice(i, 1);
      } else {
        if (obs.x < -100) this.obstacles.splice(i, 1);
      }
    }

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dtSec * 2;
      return p.life > 0;
    });
  }

  draw() {
    this.ctx.fillStyle = '#09090B';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.1)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    const offset = this.distance % 100;
    for (let x = -100; x < this.canvas.width + 100; x += 100) {
      let drawX = this.mods.reverse ? x + offset : x - offset;
      this.ctx.moveTo(drawX, 0);
      this.ctx.lineTo(drawX, this.canvas.height);
    }
    this.ctx.stroke();

    this.ctx.fillStyle = '#8B5CF6';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#8B5CF6';
    this.ctx.fillRect(0, 0, this.canvas.width, 2);
    this.ctx.fillRect(0, this.canvas.height - 2, this.canvas.width, 2);
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = '#EF4444';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#EF4444';
    this.obstacles.forEach(obs => {
      this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = this.player.color;
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = this.player.color;
    this.ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
    this.ctx.shadowBlur = 0;
    
    this.ctx.fillStyle = 'rgba(6, 182, 212, 0.3)';
    this.ctx.fillRect(
      this.mods.reverse ? this.player.x + this.player.width : this.player.x - 20, 
      this.player.y + 5, 
      20, 
      this.player.height - 10
    );

    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.player.x + this.player.width/2, this.player.y + this.player.height/2, 50, this.player.x + this.player.width/2, this.player.y + this.player.height/2, 250);
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
      this.ctx.fillText(`SPEED: ${Math.floor(this.scrollSpeed/10)} | GRAVITY: ${this.player.gravityDir === 1 ? 'DOWN' : 'UP'}`, 20, 30);
    }
  }
  }
}
