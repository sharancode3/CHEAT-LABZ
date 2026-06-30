import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class AstroStrider extends GameBase {
  static get logicalWidth() { return 700; }
  static get logicalHeight() { return 450; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.keys = { up: false, down: false, fire: false };
    
    // Parallax stars (3 layers: 0: dim/slow, 1: mid, 2: bright/fast)
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      const layer = Math.floor(Math.random() * 3);
      let speed = 25;
      let size = 1.0;
      let color = '#444460';
      
      if (layer === 1) {
        speed = 60;
        size = 1.5;
        color = '#8888a8';
      } else if (layer === 2) {
        speed = 130;
        size = 2.2;
        color = '#ffffff';
      }

      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        layer: layer,
        speed: speed,
        size: size,
        color: color
      });
    }

    // Pre-allocated object pool for bullets (max 30 bullets active)
    this.bulletPool = [];
    for (let i = 0; i < 30; i++) {
      this.bulletPool.push({
        active: false,
        x: 0, y: 0,
        radius: 3,
        vx: 0, vy: 0,
        isPlayer: true,
        color: '#00f0ff'
      });
    }

    // Scripted Enemy Wave Sequences
    this.waveScripts = {
      1: [
        { type: 'asteroid', delay: 800, y: 100, size: 25 },
        { type: 'asteroid', delay: 1800, y: 350, size: 30 },
        { type: 'asteroid', delay: 3000, y: 220, size: 20 },
        { type: 'ship', delay: 4500, y: 150 },
        { type: 'asteroid', delay: 6000, y: 280, size: 25 }
      ],
      2: [
        { type: 'ship', delay: 1000, y: 120 },
        { type: 'ship', delay: 2000, y: 320 },
        { type: 'asteroid', delay: 3400, y: 70, size: 40 },
        { type: 'asteroid', delay: 3800, y: 380, size: 22 },
        { type: 'ship', delay: 5200, y: 225 }
      ],
      3: [
        { type: 'asteroid', delay: 800, y: 100, size: 20 },
        { type: 'asteroid', delay: 1100, y: 180, size: 20 },
        { type: 'asteroid', delay: 1400, y: 260, size: 20 },
        { type: 'asteroid', delay: 1700, y: 340, size: 20 },
        { type: 'ship', delay: 3600, y: 90 },
        { type: 'ship', delay: 3800, y: 350 },
        { type: 'asteroid', delay: 5500, y: 220, size: 50 }
      ]
    };
  }

  init() {
    this.hp = 3;
    this.player = {
      x: 60, y: 225,
      radius: 12,
      w: 30, h: 20,
      speed: 260
    };
    
    // Clear pool
    this.bulletPool.forEach(b => b.active = false);

    this.enemies = [];
    this.particles = [];
    this.powerups = [];
    
    this.fireTimer = 0;
    this.fireRate = 240; // ms
    
    // Wave state
    this.wave = 1;
    this.waveTime = 0;
    this.spawnIndex = 0;
    this.activeScript = this.getWaveScript(this.wave);
    
    this.waveTransitionTimer = 0; // 2s break between waves
    this.waveIntroTimer = 2000;  // Display "WAVE N"

    // Powerups
    this.hasShield = false;
    this.rapidTimer = 0;
    this.wideTimer = 0;
    this.score = 0;
    this.timePlayed = 0;

    let runs = Storage.get('astro-strider_runs', 0);
    Storage.set('astro-strider_runs', runs + 1);
  }

  getWaveScript(waveNum) {
    if (this.waveScripts[waveNum]) {
      return this.waveScripts[waveNum];
    }
    // Procedural wave script generation for high waves
    const gen = [];
    const count = 5 + waveNum * 2;
    for (let i = 0; i < count; i++) {
      const delay = 1000 + i * Math.max(800, 1800 - waveNum * 100);
      const y = 50 + Math.random() * (this.height - 100);
      const type = Math.random() > 0.4 ? 'asteroid' : 'ship';
      gen.push({
        type: type,
        delay: delay,
        y: y,
        size: type === 'asteroid' ? 20 + Math.random() * 25 : undefined
      });
    }
    return gen;
  }

  onInput(key, event) {
    const k = key.toLowerCase();
    if (k === 'arrowup' || k === 'w') this.keys.up = true;
    if (k === 'arrowdown' || k === 's') this.keys.down = true;
    if (k === ' ' || k === 'z') this.keys.fire = true;
  }

  onKeyUp(key, event) {
    const k = key.toLowerCase();
    if (k === 'arrowup' || k === 'w') this.keys.up = false;
    if (k === 'arrowdown' || k === 's') this.keys.down = false;
    if (k === ' ' || k === 'z') this.keys.fire = false;
  }

  checkCircleCollision(c1, c2) {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    return Math.hypot(dx, dy) < (c1.radius + c2.radius);
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.timePlayed += deltaTime;

    // Powerups timers decay
    if (this.rapidTimer > 0) this.rapidTimer -= deltaTime;
    if (this.wideTimer > 0) this.wideTimer -= deltaTime;
    if (this.waveIntroTimer > 0) this.waveIntroTimer -= deltaTime;

    // Move player
    if (this.keys.up) this.player.y -= this.player.speed * dt;
    if (this.keys.down) this.player.y += this.player.speed * dt;
    this.player.y = Math.max(20, Math.min(this.height - 35, this.player.y));

    // Fire logic
    this.fireTimer -= deltaTime;
    if (this.keys.fire && this.fireTimer <= 0) {
      this.fireBullet();
      this.fireTimer = this.rapidTimer > 0 ? 95 : this.fireRate;
    }

    // Parallax background updates
    for (let s of this.stars) {
      s.x -= s.speed * dt;
      if (s.x < 0) {
        s.x = this.width;
        s.y = Math.random() * this.height;
      }
    }

    // Update active pooled bullets
    for (let b of this.bulletPool) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Deactivate if offscreen
      if (b.x > this.width + 20 || b.x < -20 || b.y > this.height + 20 || b.y < -20) {
        b.active = false;
        continue;
      }

      if (b.isPlayer) {
        // Evaluate against active enemies
        for (let e of this.enemies) {
          if (this.checkCircleCollision(b, e)) {
            b.active = false;
            e.hp--;
            if (e.hp <= 0) {
              this.score += e.type === 'ship' ? 15 : 5;
              this.createExplosion(e.x, e.y, e.type === 'ship' ? '#ff6b6b' : '#8888a8');
              this.enemies = this.enemies.filter(item => item !== e);
              this.container.audio.play('coin');

              // Drop powerup (8% chance)
              if (Math.random() < 0.08) {
                const types = ['SHIELD', 'RAPID', 'WIDE'];
                this.powerups.push({
                  x: e.x, y: e.y,
                  radius: 8,
                  type: types[Math.floor(Math.random() * types.length)]
                });
              }
            }
            break;
          }
        }
      } else {
        // Bullet hit player
        if (this.checkCircleCollision(b, this.player)) {
          b.active = false;
          this.takeDamage();
        }
      }
    }

    // Scripted wave spawning ticks
    if (this.waveIntroTimer <= 0 && this.waveTransitionTimer <= 0) {
      this.waveTime += deltaTime;
      if (this.spawnIndex < this.activeScript.length) {
        const nextSpawn = this.activeScript[this.spawnIndex];
        if (this.waveTime >= nextSpawn.delay) {
          this.spawnEnemyObject(nextSpawn);
          this.spawnIndex++;
        }
      } else if (this.enemies.length === 0) {
        // Wave complete! Transition to next wave
        this.waveTransitionTimer = 2000; // 2s intermission
      }
    }

    if (this.waveTransitionTimer > 0) {
      this.waveTransitionTimer -= deltaTime;
      if (this.waveTransitionTimer <= 0) {
        this.wave++;
        this.waveTime = 0;
        this.spawnIndex = 0;
        this.activeScript = this.getWaveScript(this.wave);
        this.waveIntroTimer = 2000;
        this.container.audio.play('perfect');
      }
    }

    // Enemies movement updates
    for (let e of this.enemies) {
      e.x -= e.speed * dt;
      e.angle += e.rotSpeed * dt;

      // Enemy ships fire bullets
      if (e.type === 'ship') {
        e.fireTimer -= deltaTime;
        if (e.fireTimer <= 0) {
          this.spawnPooledBullet(e.x - 10, e.y, -300, 0, false, '#ff6b6b');
          e.fireTimer = 1900;
        }
      }

      // Check collision with player
      if (this.checkCircleCollision(e, this.player)) {
        this.enemies = this.enemies.filter(item => item !== e);
        this.createExplosion(e.x, e.y, '#ff6b6b');
        this.takeDamage();
      } else if (e.x < -60) {
        this.enemies = this.enemies.filter(item => item !== e);
      }
    }

    // Powerups drift left
    for (let p of this.powerups) {
      p.x -= 80 * dt;
      if (this.checkCircleCollision(p, this.player)) {
        this.collectPowerup(p.type);
        this.powerups = this.powerups.filter(item => item !== p);
      } else if (p.x < -30) {
        this.powerups = this.powerups.filter(item => item !== p);
      }
    }

    // Particles updates
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  spawnPooledBullet(x, y, vx, vy, isPlayer, color) {
    const b = this.bulletPool.find(item => !item.active);
    if (b) {
      b.active = true;
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.vy = vy;
      b.isPlayer = isPlayer;
      b.color = color;
    }
  }

  fireBullet() {
    this.container.audio.play('blip');
    const bx = this.player.x + this.player.w / 2;
    const by = this.player.y;
    this.spawnPooledBullet(bx, by, 520, 0, true, '#00f0ff');
    
    if (this.wideTimer > 0) {
      this.spawnPooledBullet(bx, by, 500, 140, true, '#00f0ff');
      this.spawnPooledBullet(bx, by, 500, -140, true, '#00f0ff');
    }
  }

  spawnEnemyObject(spec) {
    if (spec.type === 'ship') {
      this.enemies.push({
        type: 'ship',
        x: this.width + 30,
        y: spec.y,
        radius: 12,
        w: 30, h: 20,
        hp: 2,
        speed: 100 + this.wave * 12,
        angle: 0,
        rotSpeed: 0,
        fireTimer: 1000
      });
    } else {
      const size = spec.size || 25;
      this.enemies.push({
        type: 'asteroid',
        x: this.width + size,
        y: spec.y,
        radius: size / 2,
        w: size, h: size,
        hp: size > 35 ? 3 : 1,
        speed: 140 + this.wave * 10,
        angle: 0,
        rotSpeed: (Math.random() - 0.5) * 4
      });
    }
  }

  takeDamage() {
    this.container.shake(250, 4);
    if (this.hasShield) {
      this.hasShield = false;
      this.container.audio.play('damage');
      return;
    }

    this.hp--;
    this.container.audio.play('damage');
    this.createExplosion(this.player.x, this.player.y, '#6c63ff');
    
    if (this.hp <= 0) {
      this.finishGame();
    }
  }

  collectPowerup(type) {
    this.container.audio.play('coin');
    if (type === 'SHIELD') this.hasShield = true;
    if (type === 'RAPID') this.rapidTimer = 6000; // 6s duration
    if (type === 'WIDE') this.wideTimer = 6000;
  }

  createExplosion(x, y, color) {
    for (let i = 0; i < 18; i++) {
      this.particles.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 220,
        vy: (Math.random() - 0.5) * 220,
        life: 300 + Math.random() * 200,
        maxLife: 500,
        color: color
      });
    }
  }

  finishGame() {
    const waveBonus = this.wave * 150;
    const timeBonus = Math.floor(this.timePlayed / 1000) * 5;
    const totalScore = this.score + waveBonus + timeBonus;
    const coins = Math.floor(totalScore / 50);

    this.scoreBreakdown = {
      rows: [
        { label: 'Combat Kills', value: this.score, points: this.score },
        { label: 'Waves Conquered', value: this.wave, points: waveBonus },
        { label: 'Survival Time', value: `${Math.floor(this.timePlayed / 1000)}s`, points: timeBonus }
      ],
      total: totalScore,
      coinsEarned: coins
    };

    this.score = totalScore;
    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Astro Strider Run');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  render(ctx) {
    // 1. Draw Space background
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Parallax stars
    for (let s of this.stars) {
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // 3. Pooled bullets
    for (let b of this.bulletPool) {
      if (!b.active) continue;
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Powerups
    for (let p of this.powerups) {
      const col = p.type === 'SHIELD' ? '#6c63ff' : (p.type === 'RAPID' ? '#ff4d4d' : '#00f0ff');
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Muted type letter icon
      ctx.fillStyle = '#ffffff';
      ctx.font = "bold 9px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type[0], p.x, p.y + 1);
    }

    // 5. Draw Player Ship
    if (this.hp > 0) {
      ctx.save();
      ctx.translate(this.player.x, this.player.y);
      
      // Engine exhaust fire glow
      if (Math.random() > 0.3) {
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.lineTo(-2, -4);
        ctx.lineTo(-2, 4);
        ctx.fill();
      }

      ctx.fillStyle = '#f0f0f8';
      ctx.beginPath();
      ctx.moveTo(-this.player.w / 2, -this.player.h / 2);
      ctx.lineTo(this.player.w / 2, 0);
      ctx.lineTo(-this.player.w / 2, this.player.h / 2);
      ctx.lineTo(-this.player.w / 3, 0);
      ctx.closePath();
      ctx.fill();

      // Shield shield glow
      if (this.hasShield) {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.player.radius + 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 6. Draw Enemies (ships and jagged asteroids)
    for (let e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);

      if (e.type === 'ship') {
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.moveTo(e.radius, 0);
        ctx.lineTo(-e.radius, e.radius);
        ctx.lineTo(-e.radius, -e.radius);
        ctx.closePath();
        ctx.fill();
      } else {
        // Asteroid jagged polygon
        ctx.fillStyle = '#7a7a92';
        ctx.beginPath();
        const sides = 6;
        for (let i = 0; i < sides; i++) {
          const a = (i / sides) * Math.PI * 2;
          // deterministic offset based on size to avoid runtime geometry jitters
          const r = e.radius * (0.85 + 0.15 * Math.sin(e.radius + i * 2.3));
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 7. Explosion Particles
    for (let p of this.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1.0;

    // 8. Visual Announcements Wave overlay
    if (this.waveIntroTimer > 0) {
      const alpha = Math.min(1.0, this.waveIntroTimer / 400);
      ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
      ctx.font = "bold 20px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(`WAVE ${this.wave}`, this.width / 2, this.height / 2);
    }
  }

  getControls() {
    return [
      { key: '↑ W / ↓ S', action: 'Move Up / Down' },
      { key: 'SPACE / Z', action: 'Fire Laser' }
    ];
  }

  getFunStat() {
    return `Final score of ${this.score} over ${Math.floor(this.timePlayed / 1000)}s survival`;
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
