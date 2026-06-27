import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class AstroStrider extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'astro-strider',
      description: 'Destroy asteroids and enemy ships. Collect powerups. 3 lives.',
      width: 700,
      height: 450
    });

    this.scoreEl = document.getElementById('game-score');
    this.hpEl = document.getElementById('game-hp');
    this.waveEl = document.getElementById('wave-text');

    this.keys = { up: false, down: false, fire: false };
    
    // Parallax stars
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: Math.random() * 2 + 0.5,
        size: Math.random() * 2 + 1
      });
    }

    this.init();
  }

  onStart() {
    this.hp = 3;
    this.player = { x: 50, y: 225, w: 30, h: 20, speed: 250 };
    
    this.bullets = [];
    this.enemies = [];
    this.particles = [];
    this.powerups = [];
    
    this.fireTimer = 0;
    this.fireRate = 250; // ms between shots
    
    this.wave = 1;
    this.waveTimer = 0;
    this.enemySpawnTimer = 0;
    
    // Powerup states
    this.hasShield = false;
    this.rapidTimer = 0;
    this.wideTimer = 0;
    
    this.showWaveText();
    this.updateUI();
    
    let runs = Storage.get('astro-strider_runs', 0);
    Storage.set('astro-strider_runs', runs + 1);
  }

  onInput(key, event) {
    if (key === 'arrowup' || key === 'w') this.keys.up = true;
    if (key === 'arrowdown' || key === 's') this.keys.down = true;
    if (key === ' ' || key === 'z') this.keys.fire = true;
  }

  onKeyUp(key, event) {
    if (key === 'arrowup' || key === 'w') this.keys.up = false;
    if (key === 'arrowdown' || key === 's') this.keys.down = false;
    if (key === ' ' || key === 'z') this.keys.fire = false;
  }

  showWaveText() {
    this.waveEl.innerText = `WAVE ${this.wave}`;
    this.waveEl.classList.add('active');
    setTimeout(() => this.waveEl.classList.remove('active'), 2000);
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    
    // Powerup timers
    if (this.rapidTimer > 0) this.rapidTimer -= deltaTime;
    if (this.wideTimer > 0) this.wideTimer -= deltaTime;

    // Player Move
    if (this.keys.up) this.player.y -= this.player.speed * dt;
    if (this.keys.down) this.player.y += this.player.speed * dt;
    if (this.player.y < 10) this.player.y = 10;
    if (this.player.y > this.canvas.height - 30) this.player.y = this.canvas.height - 30;

    // Fire logic
    this.fireTimer -= deltaTime;
    if (this.keys.fire && this.fireTimer <= 0) {
      this.fireBullet();
      this.fireTimer = this.rapidTimer > 0 ? 100 : this.fireRate;
    }

    // Update stars
    for (let s of this.stars) {
      s.x -= s.speed * (1 + this.wave*0.1);
      if (s.x < 0) {
        s.x = this.canvas.width;
        s.y = Math.random() * this.canvas.height;
      }
    }

    // Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      let b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      
      // Hit enemies
      if (b.isPlayer) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          let e = this.enemies[j];
          if (this.checkCollision(b, e)) {
            this.bullets.splice(i, 1);
            e.hp--;
            if (e.hp <= 0) {
              this.score += e.type === 'ship' ? 15 : 5;
              this.updateUI();
              this.createExplosion(e.x, e.y, e.type === 'ship' ? '#ff6b6b' : '#8888a8');
              this.enemies.splice(j, 1);
              Sound.playCoin();
              
              // Drop powerup? 5% chance
              if (Math.random() < 0.05) {
                const types = ['SHIELD', 'RAPID', 'WIDE'];
                this.powerups.push({
                  x: e.x, y: e.y,
                  w: 16, h: 16,
                  type: types[Math.floor(Math.random() * types.length)]
                });
              }
            }
            break;
          }
        }
      } else {
        // Enemy bullet hits player
        if (this.checkCollision(b, this.player)) {
          this.bullets.splice(i, 1);
          this.takeDamage();
        }
      }
      
      if (b.x > this.canvas.width || b.x < 0) this.bullets.splice(i, 1);
    }

    // Enemies
    this.enemySpawnTimer -= deltaTime;
    const spawnRate = Math.max(500, 1500 - this.wave * 150);
    if (this.enemySpawnTimer <= 0) {
      this.spawnEnemy();
      this.enemySpawnTimer = spawnRate;
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      let e = this.enemies[i];
      e.x -= e.speed * dt;
      e.angle += e.rotSpeed * dt;
      
      // Enemy shoot
      if (e.type === 'ship') {
        e.fireTimer -= deltaTime;
        if (e.fireTimer <= 0) {
          this.bullets.push({ x: e.x, y: e.y + e.h/2, w: 10, h: 4, vx: -300, vy: 0, isPlayer: false, color: '#ff6b6b' });
          e.fireTimer = 2000;
        }
      }
      
      // Hit player
      if (this.checkCollision(e, this.player)) {
        this.enemies.splice(i, 1);
        this.createExplosion(e.x, e.y, '#ff6b6b');
        this.takeDamage();
      } else if (e.x < -50) {
        this.enemies.splice(i, 1);
      }
    }

    // Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      let p = this.powerups[i];
      p.x -= 100 * dt;
      if (this.checkCollision(p, this.player)) {
        this.collectPowerup(p.type);
        this.powerups.splice(i, 1);
      } else if (p.x < -20) {
        this.powerups.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Waves
    this.waveTimer += deltaTime;
    if (this.waveTimer >= 30000) { // 30s
      this.waveTimer = 0;
      this.wave++;
      this.showWaveText();
    }
  }

  fireBullet() {
    Sound.playBlip();
    const bx = this.player.x + this.player.w;
    const by = this.player.y + this.player.h/2 - 2;
    this.bullets.push({ x: bx, y: by, w: 12, h: 4, vx: 500, vy: 0, isPlayer: true, color: '#00d4aa' });
    
    if (this.wideTimer > 0) {
      this.bullets.push({ x: bx, y: by, w: 12, h: 4, vx: 500, vy: 150, isPlayer: true, color: '#00d4aa' });
      this.bullets.push({ x: bx, y: by, w: 12, h: 4, vx: 500, vy: -150, isPlayer: true, color: '#00d4aa' });
    }
  }

  spawnEnemy() {
    const isShip = Math.random() > 0.8; // 20% ships
    const y = 20 + Math.random() * (this.canvas.height - 40);
    if (isShip) {
      this.enemies.push({
        type: 'ship', x: this.canvas.width + 20, y: y,
        w: 30, h: 20, hp: 2, speed: 100 + this.wave*20, angle: 0, rotSpeed: 0, fireTimer: 1000
      });
    } else {
      const size = 20 + Math.random() * 30;
      this.enemies.push({
        type: 'asteroid', x: this.canvas.width + size, y: y,
        w: size, h: size, hp: size > 40 ? 3 : 1, speed: 150 + Math.random()*100 + this.wave*10,
        angle: 0, rotSpeed: (Math.random() - 0.5) * 5
      });
    }
  }

  takeDamage() {
    if (this.hasShield) {
      this.hasShield = false;
      Sound.playDamage();
      return;
    }
    
    this.hp--;
    Sound.playDamage();
    this.createExplosion(this.player.x, this.player.y, '#6c63ff');
    this.updateUI();
    if (this.hp <= 0) {
      Sound.playGameOver();
      this.gameOver();
    }
  }

  collectPowerup(type) {
    Sound.playCoin();
    if (type === 'SHIELD') this.hasShield = true;
    if (type === 'RAPID') this.rapidTimer = 5000; // 5s
    if (type === 'WIDE') this.wideTimer = 5000;
  }

  checkCollision(r1, r2) {
    return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
  }

  createExplosion(x, y, color) {
    for(let i=0; i<15; i++) {
      this.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 300 + Math.random() * 200,
        maxLife: 500,
        color: color
      });
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
    if (this.hpEl) this.hpEl.innerText = `HP: ${this.hp}`;
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Stars
    this.ctx.fillStyle = '#fff';
    for (let s of this.stars) {
      this.ctx.globalAlpha = s.size / 3;
      this.ctx.fillRect(s.x, s.y, s.size, s.size);
    }
    this.ctx.globalAlpha = 1.0;

    // Bullets
    for (let b of this.bullets) {
      this.ctx.fillStyle = b.color;
      this.ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    // Powerups
    for (let p of this.powerups) {
      this.ctx.fillStyle = p.type === 'SHIELD' ? '#6c63ff' : (p.type === 'RAPID' ? '#ff6b6b' : '#00d4aa');
      this.ctx.beginPath();
      this.ctx.arc(p.x + p.w/2, p.y + p.h/2, p.w/2, 0, Math.PI*2);
      this.ctx.fill();
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '10px "Press Start 2P"';
      this.ctx.fillText(p.type[0], p.x + p.w/2 - 4, p.y + p.h/2 + 4);
    }

    // Player
    if (this.hp > 0) {
      this.ctx.save();
      this.ctx.translate(this.player.x, this.player.y);
      
      // Ship body
      this.ctx.fillStyle = '#f0f0f8';
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(this.player.w, this.player.h/2);
      this.ctx.lineTo(0, this.player.h);
      this.ctx.lineTo(5, this.player.h/2);
      this.ctx.fill();

      // Engine glow
      if (Math.random() > 0.2) {
        this.ctx.fillStyle = '#00d4aa';
        this.ctx.fillRect(-10, this.player.h/2 - 2, 10, 4);
      }

      if (this.hasShield) {
        this.ctx.strokeStyle = '#6c63ff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.player.w/2, this.player.h/2, 20, 0, Math.PI*2);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }

    // Enemies
    for (let e of this.enemies) {
      this.ctx.save();
      this.ctx.translate(e.x + e.w/2, e.y + e.h/2);
      this.ctx.rotate(e.angle);
      
      if (e.type === 'ship') {
        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.beginPath();
        this.ctx.moveTo(e.w/2, 0);
        this.ctx.lineTo(-e.w/2, e.h/2);
        this.ctx.lineTo(-e.w/2, -e.h/2);
        this.ctx.fill();
      } else {
        // Asteroid
        this.ctx.fillStyle = '#8888a8';
        this.ctx.beginPath();
        // Draw jagged polygon
        const sides = 6;
        for (let i=0; i<sides; i++) {
          const a = (i/sides) * Math.PI*2;
          const r = e.w/2 * (0.8 + Math.random()*0.2); // slight jitter but deterministic enough per frame
          const x = Math.cos(a)*r;
          const y = Math.sin(a)*r;
          if (i===0) this.ctx.moveTo(x,y); else this.ctx.lineTo(x,y);
        }
        this.ctx.fill();
      }
      this.ctx.restore();
    }

    // Particles
    for (let p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillRect(p.x, p.y, 3, 3);
    }
    this.ctx.globalAlpha = 1.0;
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
