import { GameShell } from './game-shell.js';

export default class AstroStrider extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas, config);
  }

  onStart() {
    this.player = {
      x: 50, y: 200,
      width: 40, height: 20,
      speed: 300,
      weaponTier: 1,
      cooldown: 0
    };

    this.keys = { up: false, down: false, left: false, right: false, space: false };
    
    this.bullets = [];
    this.enemies = [];
    this.powerups = [];
    this.particles = [];
    this.stars = [];
    
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: Math.random() * 50 + 20,
        size: Math.random() * 2 + 1
      });
    }

    this.enemySpawnTimer = 0;
    this.powerupSpawnTimer = 0;
    this.timeElapsed = 0;
    this.score = 0;
    this.updateScore(0);
  }

  onInput(keyLabel, e, isDown) {
    const key = e.key.toLowerCase();
    if (key === 'arrowup' || key === 'w') this.keys.up = isDown;
    if (key === 'arrowdown' || key === 's') this.keys.down = isDown;
    if (key === 'arrowleft' || key === 'a') this.keys.left = isDown;
    if (key === 'arrowright' || key === 'd') this.keys.right = isDown;
    if (key === ' ') this.keys.space = isDown;
  }

  update(dtMs) {
    const dt = dtMs / 1000;
    this.timeElapsed += dt;

    if (this.keys.up) this.player.y -= this.player.speed * dt;
    if (this.keys.down) this.player.y += this.player.speed * dt;
    if (this.keys.left) this.player.x -= this.player.speed * dt;
    if (this.keys.right) this.player.x += this.player.speed * dt;

    if (this.player.x < 0) this.player.x = 0;
    if (this.player.y < 0) this.player.y = 0;
    if (this.player.x > this.canvas.width - this.player.width) this.player.x = this.canvas.width - this.player.width;
    if (this.player.y > this.canvas.height - this.player.height) this.player.y = this.canvas.height - this.player.height;

    if (this.player.cooldown > 0) this.player.cooldown -= dt;
    if (this.keys.space && this.player.cooldown <= 0) {
      this.player.cooldown = 0.2;
      
      if (this.player.weaponTier === 1) {
        this.bullets.push({ x: this.player.x + this.player.width, y: this.player.y + this.player.height/2, vx: 500, vy: 0, w: 10, h: 4, color: '#06B6D4' });
      } else if (this.player.weaponTier === 2) {
        this.bullets.push({ x: this.player.x + this.player.width, y: this.player.y, vx: 500, vy: 0, w: 10, h: 4, color: '#06B6D4' });
        this.bullets.push({ x: this.player.x + this.player.width, y: this.player.y + this.player.height, vx: 500, vy: 0, w: 10, h: 4, color: '#06B6D4' });
      } else {
        this.bullets.push({ x: this.player.x + this.player.width, y: this.player.y + this.player.height/2, vx: 500, vy: 0, w: 10, h: 4, color: '#8B5CF6' });
        this.bullets.push({ x: this.player.x + this.player.width, y: this.player.y, vx: 500, vy: -100, w: 10, h: 4, color: '#06B6D4' });
        this.bullets.push({ x: this.player.x + this.player.width, y: this.player.y + this.player.height, vx: 500, vy: 100, w: 10, h: 4, color: '#06B6D4' });
      }
    }

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.x > this.canvas.width || b.x < 0 || b.y < 0 || b.y > this.canvas.height) {
        this.bullets.splice(i, 1);
      }
    }

    this.enemySpawnTimer += dt;
    if (this.enemySpawnTimer > Math.max(0.5, 2.0 - (this.timeElapsed * 0.05))) {
      this.enemySpawnTimer = 0;
      this.enemies.push({
        x: this.canvas.width + 20,
        startY: Math.random() * (this.canvas.height - 40) + 20,
        y: 0,
        w: 30, h: 30,
        speed: 150 + Math.random() * 100,
        amplitude: 50 + Math.random() * 100,
        frequency: 2 + Math.random() * 3,
        time: 0
      });
    }

    this.powerupSpawnTimer += dt;
    if (this.powerupSpawnTimer > 15) {
      this.powerupSpawnTimer = 0;
      this.powerups.push({
        x: this.canvas.width + 20,
        y: Math.random() * (this.canvas.height - 30) + 15,
        w: 20, h: 20,
        speed: 100
      });
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let e = this.enemies[i];
      e.time += dt;
      e.x -= e.speed * dt;
      e.y = e.startY + Math.sin(e.time * e.frequency) * e.amplitude;
      
      if (this.checkCollision(this.player, e)) {
        this.gameOver();
        return;
      }

      let hit = false;
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        let b = this.bullets[j];
        if (this.checkCollision(b, e)) {
          for (let p=0; p<5; p++) {
            this.particles.push({
              x: e.x, y: e.y,
              vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200,
              life: 0.5 + Math.random() * 0.5, color: '#EF4444'
            });
          }
          this.bullets.splice(j, 1);
          hit = true;
          this.score += 100;
          this.updateScore(this.score);
          break;
        }
      }

      if (hit) {
        this.enemies.splice(i, 1);
      } else if (e.x < -e.w) {
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      let p = this.powerups[i];
      p.x -= p.speed * dt;
      if (this.checkCollision(this.player, p)) {
        if (this.player.weaponTier < 3) this.player.weaponTier++;
        this.score += 500;
        this.updateScore(this.score);
        this.powerups.splice(i, 1);
      } else if (p.x < -p.w) {
        this.powerups.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let s of this.stars) {
      s.x -= s.speed * dt;
      if (s.x < 0) {
        s.x = this.canvas.width;
        s.y = Math.random() * this.canvas.height;
      }
    }
  }

  checkCollision(rect1, rect2) {
    return (rect1.x < rect2.x + rect2.w &&
            rect1.x + (rect1.width || rect1.w) > rect2.x &&
            rect1.y < rect2.y + rect2.h &&
            rect1.y + (rect1.height || rect1.h) > rect2.y);
  }

  draw() {
    this.ctx.fillStyle = '#09090B';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let s of this.stars) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${s.speed / 70})`;
      this.ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    for (let b of this.bullets) {
      this.ctx.fillStyle = b.color;
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = b.color;
      this.ctx.fillRect(b.x, b.y, b.w, b.h);
    }
    this.ctx.shadowBlur = 0;

    for (let p of this.powerups) {
      this.ctx.fillStyle = '#8B5CF6';
      this.ctx.beginPath();
      this.ctx.arc(p.x + p.w/2, p.y + p.h/2, p.w/2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = '#fff';
      this.ctx.fillText('W', p.x + p.w/2 - 5, p.y + p.h/2 + 5);
    }

    this.ctx.fillStyle = '#EF4444';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#EF4444';
    for (let e of this.enemies) {
      this.ctx.beginPath();
      this.ctx.moveTo(e.x + e.w, e.y + e.h/2);
      this.ctx.lineTo(e.x, e.y);
      this.ctx.lineTo(e.x, e.y + e.h);
      this.ctx.closePath();
      this.ctx.fill();
    }
    this.ctx.shadowBlur = 0;

    for (let p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life * 2;
      this.ctx.fillRect(p.x, p.y, 4, 4);
    }
    this.ctx.globalAlpha = 1.0;

    this.ctx.fillStyle = '#06B6D4';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = '#06B6D4';
    this.ctx.beginPath();
    this.ctx.moveTo(this.player.x + this.player.width, this.player.y + this.player.height/2);
    this.ctx.lineTo(this.player.x, this.player.y);
    this.ctx.lineTo(this.player.x + 10, this.player.y + this.player.height/2);
    this.ctx.lineTo(this.player.x, this.player.y + this.player.height);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }
}
