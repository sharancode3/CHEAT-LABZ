import { GameShell } from './game-shell.js';

export default class PixelDodge extends GameShell {
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
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      radius: 8,
      speed: 300 * (this.mods.speedMult > 1 ? 1.2 : 1),
      color: '#06B6D4'
    };

    this.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
    
    this.bullets = [];
    this.lasers = [];
    
    this.spawnerTimer = 0;
    this.difficulty = 1;
    this.timeSurvived = 0;
    
    this.particles = [];
    
    this.score = 0;
    this.updateScore(0);
  }

  onInput(keyLabel, e, isDown) {
    if(this.keys.hasOwnProperty(e.key)) this.keys[e.key] = isDown;
  }

  spawnPattern() {
    const type = Math.random();
    if (type < 0.6) {
      const numBullets = 8 + this.difficulty * 2;
      const x = Math.random() < 0.5 ? 0 : this.canvas.width;
      const y = Math.random() * this.canvas.height;
      for (let i=0; i<numBullets; i++) {
        const angle = (Math.PI * 2 / numBullets) * i;
        this.bullets.push({
          x: x, y: y,
          vx: Math.cos(angle) * (100 + this.difficulty * 20) * this.mods.speedMult,
          vy: Math.sin(angle) * (100 + this.difficulty * 20) * this.mods.speedMult,
          radius: 4, color: '#EF4444'
        });
      }
    } else if (type < 0.8) {
      const isVertical = Math.random() < 0.5;
      const numBullets = isVertical ? this.canvas.width / 40 : this.canvas.height / 40;
      const startX = isVertical ? 0 : (Math.random() < 0.5 ? 0 : this.canvas.width);
      const startY = isVertical ? (Math.random() < 0.5 ? 0 : this.canvas.height) : 0;
      
      for(let i=0; i<numBullets; i++) {
        this.bullets.push({
          x: isVertical ? i * 40 : startX,
          y: isVertical ? startY : i * 40,
          vx: isVertical ? 0 : (startX === 0 ? 1 : -1) * (150 * this.mods.speedMult),
          vy: isVertical ? (startY === 0 ? 1 : -1) * (150 * this.mods.speedMult) : 0,
          radius: 5, color: '#FBBF24'
        });
      }
    } else {
      const isVertical = Math.random() < 0.5;
      const pos = isVertical ? Math.random() * this.canvas.width : Math.random() * this.canvas.height;
      this.lasers.push({
        isVertical: isVertical,
        pos: pos,
        width: 40 + this.difficulty * 10,
        telegraphTime: 2000 / this.mods.speedMult,
        activeTime: 500 / this.mods.speedMult,
        state: 'telegraph'
      });
    }
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
    
    this.timeSurvived += dtSec;
    if (Math.floor(this.timeSurvived * 10) % 10 === 0) {
      this.score += 1;
      this.updateScore(this.score);
    }
    
    this.difficulty = 1 + Math.floor(this.timeSurvived / 10);
    
    this.spawnerTimer -= dtMs;
    if (this.spawnerTimer <= 0) {
      this.spawnPattern();
      this.spawnerTimer = Math.max(500, 2000 - this.difficulty * 200) / this.mods.speedMult;
    }

    let up = this.keys.ArrowUp || this.keys.w;
    let down = this.keys.ArrowDown || this.keys.s;
    let left = this.keys.ArrowLeft || this.keys.a;
    let right = this.keys.ArrowRight || this.keys.d;

    if (this.mods.reverse) {
      let tempU = up; up = down; down = tempU;
      let tempL = left; left = right; right = tempL;
    }

    let dx = 0; let dy = 0;
    if (up) dy -= 1;
    if (down) dy += 1;
    if (left) dx -= 1;
    if (right) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
    }

    this.player.x += dx * this.player.speed * dtSec;
    this.player.y += dy * this.player.speed * dtSec;

    this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
    this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let b = this.bullets[i];
      b.x += b.vx * dtSec;
      b.y += b.vy * dtSec;

      if (Math.hypot(this.player.x - b.x, this.player.y - b.y) < this.player.radius + b.radius) {
         this.createExplosion(this.player.x, this.player.y, this.player.color, 100);
         return this.gameOver();
      }

      if (b.x < -50 || b.x > this.canvas.width + 50 || b.y < -50 || b.y > this.canvas.height + 50) {
        this.bullets.splice(i, 1);
      }
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      let l = this.lasers[i];
      if (l.state === 'telegraph') {
        l.telegraphTime -= dtMs;
        if (l.telegraphTime <= 0) {
          l.state = 'active';
        }
      } else if (l.state === 'active') {
        l.activeTime -= dtMs;
        
        if (l.isVertical) {
          if (Math.abs(this.player.x - l.pos) < l.width/2 + this.player.radius) {
             this.createExplosion(this.player.x, this.player.y, this.player.color, 100);
             return this.gameOver();
          }
        } else {
          if (Math.abs(this.player.y - l.pos) < l.width/2 + this.player.radius) {
             this.createExplosion(this.player.x, this.player.y, this.player.color, 100);
             return this.gameOver();
          }
        }

        if (l.activeTime <= 0) {
          this.lasers.splice(i, 1);
        }
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

    this.lasers.forEach(l => {
      this.ctx.save();
      if (l.state === 'telegraph') {
        this.ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        this.ctx.strokeStyle = '#EF4444';
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([5, 5]);
      } else {
        this.ctx.fillStyle = '#EF4444';
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = '#EF4444';
        this.ctx.strokeStyle = 'transparent';
        this.ctx.setLineDash([]);
      }

      if (l.isVertical) {
        this.ctx.fillRect(l.pos - l.width/2, 0, l.width, this.canvas.height);
        if (l.state === 'telegraph') {
          this.ctx.beginPath();
          this.ctx.moveTo(l.pos, 0);
          this.ctx.lineTo(l.pos, this.canvas.height);
          this.ctx.stroke();
        }
      } else {
        this.ctx.fillRect(0, l.pos - l.width/2, this.canvas.width, l.width);
        if (l.state === 'telegraph') {
          this.ctx.beginPath();
          this.ctx.moveTo(0, l.pos);
          this.ctx.lineTo(this.canvas.width, l.pos);
          this.ctx.stroke();
        }
      }
      this.ctx.restore();
    });

    this.bullets.forEach(b => {
      this.ctx.fillStyle = b.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = b.color;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = this.player.color;
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = this.player.color;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI*2);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.shadowBlur = 0;
    this.ctx.beginPath();
    this.ctx.arc(this.player.x, this.player.y, 2, 0, Math.PI*2);
    this.ctx.fill();

    this.particles.forEach(p => {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1.0;

    if (this.mods.limitedVision) {
      this.ctx.globalCompositeOperation = 'destination-in';
      const gradient = this.ctx.createRadialGradient(this.player.x, this.player.y, 50, this.player.x, this.player.y, 200);
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
      this.ctx.fillText(`SURVIVED: ${Math.floor(this.timeSurvived)}s | THREAT LEVEL: ${this.difficulty}`, 20, 30);
    }
  }
}
