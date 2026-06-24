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
      color: '#06B6D4',
      history: [] // For motion trail
    };

    this.scrollSpeed = 400 * this.mods.speedMult;
    this.distance = 0;
    
    // Object pool for obstacles
    this.activeObstacles = [];
    this.obstaclePool = [];

    this.spawnTimer = 0;
    this.spawnInterval = 1000 / this.mods.speedMult;
    
    this.particles = [];
    
    this.screenShake = 0;

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
      this.screenShake = 4; // Mini shake on flip
      this.createExplosion(this.player.x + this.player.width/2, this.player.y + (this.player.gravityDir===1 ? 0 : this.player.height), ['#06B6D4', '#8B5CF6', '#F472B6'], 20);
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
    
    let obs;
    if (this.obstaclePool.length > 0) {
      obs = this.obstaclePool.pop();
      obs.x = this.mods.reverse ? -w : this.canvas.width;
      obs.y = y;
      obs.width = w;
      obs.height = h;
      obs.passed = false;
      obs.warningTime = 0.5; // Warning laser timer
    } else {
      obs = {
        x: this.mods.reverse ? -w : this.canvas.width,
        y: y,
        width: w,
        height: h,
        passed: false,
        warningTime: 0.5
      };
    }
    
    this.activeObstacles.push(obs);
  }

  createExplosion(x, y, colors, count=30) {
    const colorArray = Array.isArray(colors) ? colors : [colors];
    for(let i=0; i<count; i++) {
      this.particles.push({
        x: x,
        y: y,
        vx: (Math.random() - 0.5) * 15,
        vy: (Math.random() - 0.5) * 15,
        life: 1.0,
        color: colorArray[Math.floor(Math.random() * colorArray.length)]
      });
    }
  }

  createSpeedSparks(dtSec) {
    if (Math.random() < 0.3) {
      this.particles.push({
        x: this.mods.reverse ? 0 : this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: this.mods.reverse ? (15 + Math.random() * 10) : -(15 + Math.random() * 10),
        vy: 0,
        life: 0.5 + Math.random() * 0.5,
        color: 'rgba(255, 255, 255, 0.8)',
        isSpeedSpark: true
      });
    }
  }

  update(dtMs) {
    const dtSec = dtMs / 1000;

    // Apply Screen Shake decay
    if (this.screenShake > 0) {
      this.screenShake -= dtSec * 30;
      if (this.screenShake < 0) this.screenShake = 0;
    }
    
    // Update player history for motion trail
    this.player.history.unshift({ x: this.player.x, y: this.player.y, width: this.player.width, height: this.player.height });
    if (this.player.history.length > 5) {
      this.player.history.pop();
    }

    this.player.vy += this.player.gravityForce * this.player.gravityDir * dtSec;
    this.player.y += this.player.vy * dtSec;
    
    if (this.player.y > this.canvas.height - this.player.height) {
      this.player.y = this.canvas.height - this.player.height;
      this.player.vy = 0;
      if (!this.player.isGrounded) {
         this.player.isGrounded = true;
         // Landing dust debris
         this.createExplosion(this.player.x + this.player.width/2, this.canvas.height, '#06B6D4', 10);
      }
    } else if (this.player.y < 0) {
      this.player.y = 0;
      this.player.vy = 0;
      if (!this.player.isGrounded) {
         this.player.isGrounded = true;
         // Landing dust debris
         this.createExplosion(this.player.x + this.player.width/2, 0, '#06B6D4', 10);
      }
    }
    
    this.scrollSpeed += 15 * dtSec * this.mods.speedMult;
    this.distance += this.scrollSpeed * dtSec;
    
    this.spawnTimer -= dtMs;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      this.spawnInterval = Math.max(350, this.spawnInterval - 10);
      this.spawnTimer = this.spawnInterval;
    }
    
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      let obs = this.activeObstacles[i];
      
      if (obs.warningTime > 0) {
        obs.warningTime -= dtSec;
      } else {
        if (this.mods.reverse) {
          obs.x += this.scrollSpeed * dtSec;
        } else {
          obs.x -= this.scrollSpeed * dtSec;
        }
      }
      
      // Collision
      if (
        obs.warningTime <= 0 &&
        this.player.x < obs.x + obs.width &&
        this.player.x + this.player.width > obs.x &&
        this.player.y < obs.y + obs.height &&
        this.player.y + this.player.height > obs.y
      ) {
        this.createExplosion(this.player.x + this.player.width/2, this.player.y + this.player.height/2, '#EF4444', 100);
        this.screenShake = 25; // Massive shake
        this.draw();
        this.gameOver();
        return;
      }

      if (!obs.passed) {
        if (this.mods.reverse) {
          if (obs.x > this.player.x + this.player.width) {
            obs.passed = true;
            this.screenShake = 2; // Minor tremor
            this.score += 10;
            this.updateScore(this.score);
          }
        } else {
          if (obs.x + obs.width < this.player.x) {
            obs.passed = true;
            this.screenShake = 2; // Minor tremor
            this.score += 10;
            this.updateScore(this.score);
          }
        }
      }
      
      // Object pooling
      if (this.mods.reverse) {
        if (obs.x > this.canvas.width + 50) {
          this.obstaclePool.push(this.activeObstacles.splice(i, 1)[0]);
        }
      } else {
        if (obs.x < -100) {
          this.obstaclePool.push(this.activeObstacles.splice(i, 1)[0]);
        }
      }
    }

    this.createSpeedSparks(dtSec);

    this.particles = this.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dtSec * 2;
      return p.life > 0;
    });
  }

  draw() {
    this.ctx.save();
    
    // Apply Screen Shake
    if (this.screenShake > 0) {
      const dx = (Math.random() - 0.5) * this.screenShake;
      const dy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(dx, dy);
    }

    // 1. Deep background digital matrix
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Mid-ground techno-grid
    this.ctx.strokeStyle = 'rgba(139, 92, 246, 0.15)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    const offset = this.distance % 100;
    for (let x = -100; x < this.canvas.width + 100; x += 100) {
      let drawX = this.mods.reverse ? x + offset : x - offset;
      this.ctx.moveTo(drawX, 0);
      this.ctx.lineTo(drawX, this.canvas.height);
    }
    // Horizontal lines
    for (let y = 0; y < this.canvas.height; y += 100) {
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
    }
    this.ctx.stroke();

    // Floor and Ceiling bounds
    this.ctx.fillStyle = '#8B5CF6';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#8B5CF6';
    this.ctx.fillRect(0, 0, this.canvas.width, 4);
    this.ctx.fillRect(0, this.canvas.height - 4, this.canvas.width, 4);
    this.ctx.shadowBlur = 0;

    // Obstacles
    this.activeObstacles.forEach(obs => {
      if (obs.warningTime > 0) {
        // Warning Laser
        this.ctx.fillStyle = `rgba(239, 68, 68, ${Math.abs(Math.sin(performance.now() / 50))})`;
        this.ctx.fillRect(0, obs.y + obs.height/2 - 1, this.canvas.width, 2);
      } else {
        // High-tech laser security gate
        this.ctx.fillStyle = '#EF4444';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#EF4444';
        this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        
        // Inner bright core
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(obs.x + 10, obs.y, obs.width - 20, obs.height);
      }
    });
    this.ctx.shadowBlur = 0;

    // Player Motion Trail
    this.player.history.forEach((hist, i) => {
      const alpha = 1 - (i / this.player.history.length);
      this.ctx.fillStyle = `rgba(6, 182, 212, ${alpha * 0.5})`;
      this.ctx.fillRect(hist.x, hist.y, hist.width, hist.height);
    });

    // Player Core Module
    let pHeight = this.player.height;
    let pWidth = this.player.width;
    if (!this.player.isGrounded) {
      pHeight = this.player.height * 1.2; // Stretch vertically
      pWidth = this.player.width * 0.8;
    } else {
      pHeight = this.player.height * 0.9; // Flatten slightly
      pWidth = this.player.width * 1.1;
    }
    const py = this.player.y + (this.player.height - pHeight);
    const px = this.player.x + (this.player.width - pWidth) / 2;

    this.ctx.fillStyle = this.player.color;
    this.ctx.shadowBlur = 25;
    this.ctx.shadowColor = this.player.color;
    this.ctx.fillRect(px, py, pWidth, pHeight);
    
    // Core center bright spot
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(px + pWidth/4, py + pHeight/4, pWidth/2, pHeight/2);
    this.ctx.shadowBlur = 0;
    
    // Particles
    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      if (p.isSpeedSpark) {
        this.ctx.fillRect(p.x, p.y, 20 * p.life, 2);
      } else {
        this.ctx.arc(p.x, p.y, 4, 0, Math.PI*2);
        this.ctx.fill();
      }
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
      // In-Game UI Typography
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillRect(20, 20, 240, 60);
      this.ctx.strokeStyle = '#06B6D4';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(20, 20, 240, 60);

      this.ctx.fillStyle = '#fff';
      this.ctx.font = "bold 16px 'Inter', sans-serif";
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`SPEED: ${Math.floor(this.scrollSpeed/10)}`, 35, 45);
      
      this.ctx.fillStyle = '#06B6D4';
      this.ctx.fillText(`GRAVITY: ${this.player.gravityDir === 1 ? 'DOWN ↓' : 'UP ↑'}`, 35, 65);
    }

    this.ctx.restore();
  }
}
