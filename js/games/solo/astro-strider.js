import { GameBase } from '../../core/game-base.js';

class AstroStrider extends GameBase {
  static logicalWidth = 680;
  static logicalHeight = 480;

  init() {
    this.player = {
      x: 80,
      y: 240,
      w: 24,
      h: 18,
      speed: 320,
      shield: 0, // shield HP
      rapidTimer: 0,
      wideTimer: 0
    };

    this.lives = 3;
    this.score = 0;
    this.isOver = false;

    // Pre-allocated object pools
    this.playerBullets = Array.from({ length: 40 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, trail: [] }));
    this.enemyBullets = Array.from({ length: 60 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, trail: [] }));
    this.enemies = Array.from({ length: 30 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, type: '', hp: 0, maxHP: 0, radius: 10, time: 0, shootTimer: 0 }));
    this.particles = Array.from({ length: 80 }, () => ({ active: false, x: 0, y: 0, vx: 0, vy: 0, color: '', alpha: 1.0, life: 0, maxLife: 0, r: 0 }));
    this.powerups = Array.from({ length: 6 }, () => ({ active: false, x: 0, y: 0, type: '', vx: 0, vy: 0, r: 12 }));

    // Parallax Starfield initialization
    this.stars = [];
    this.initStars();

    // Wave definition setup
    this.setupWaves();
    this.waveIndex = 0;
    this.waveTimer = 0;
    this.waveAlertText = '';
    this.waveAlertTimer = 0;
    this.bossDefeated = false;

    this.fireCooldown = 0;
    this.totalTime = 0;

    // Trigger initial wave display alert
    this.triggerWaveAlert(`WAVE 1`);
  }

  initStars() {
    this.stars = [];
    // 80 far
    for (let i = 0; i < 80; i++) {
      this.stars.push({ x: Math.random() * 680, y: Math.random() * 480, layer: 0 });
    }
    // 40 mid
    for (let i = 0; i < 40; i++) {
      this.stars.push({ x: Math.random() * 680, y: Math.random() * 480, layer: 1 });
    }
    // 20 near
    for (let i = 0; i < 20; i++) {
      this.stars.push({ x: Math.random() * 680, y: Math.random() * 480, layer: 2 });
    }
  }

  setupWaves() {
    const lvl = this.level;
    const allWaves = {
      1: [
        { delay: 1000, type: 'asteroid', count: 4, formation: 'line' },
        { delay: 5000, type: 'asteroid', count: 6, formation: 'swarm' }
      ],
      2: [
        { delay: 1000, type: 'asteroid', count: 4, formation: 'line' },
        { delay: 4000, type: 'scout', count: 3, formation: 'v-shape' },
        { delay: 8000, type: 'scout', count: 4, formation: 'swarm' }
      ],
      3: [
        { delay: 1000, type: 'scout', count: 4, formation: 'diagonal' },
        { delay: 5000, type: 'bomber', count: 2, formation: 'line' },
        { delay: 9000, type: 'asteroid', count: 5, formation: 'swarm' }
      ],
      4: [
        { delay: 1000, type: 'scout', count: 5, formation: 'v-shape' },
        { delay: 4000, type: 'bomber', count: 3, formation: 'diagonal' },
        { delay: 8000, type: 'scout', count: 5, formation: 'swarm' }
      ],
      5: [
        { delay: 1000, type: 'carrier', count: 1, formation: 'line' },
        { delay: 5000, type: 'scout', count: 4, formation: 'v-shape' },
        { delay: 9000, type: 'bomber', count: 3, formation: 'swarm' }
      ],
      6: [
        { delay: 1000, type: 'asteroid', count: 8, formation: 'swarm' },
        { delay: 4000, type: 'scout', count: 6, formation: 'diagonal' },
        { delay: 8000, type: 'asteroid', count: 8, formation: 'swarm' }
      ],
      7: [
        { delay: 1000, type: 'scout', count: 6, formation: 'line' },
        { delay: 4000, type: 'bomber', count: 4, formation: 'v-shape' },
        { delay: 8000, type: 'scout', count: 6, formation: 'swarm' }
      ],
      8: [
        { delay: 1000, type: 'scout', count: 8, formation: 'swarm' },
        { delay: 4000, type: 'scout', count: 8, formation: 'v-shape' },
        { delay: 8000, type: 'bomber', count: 4, formation: 'diagonal' }
      ],
      9: [
        { delay: 1000, type: 'carrier', count: 1, formation: 'line' },
        { delay: 3000, type: 'bomber', count: 3, formation: 'v-shape' },
        { delay: 6000, type: 'scout', count: 8, formation: 'swarm' },
        { delay: 9000, type: 'carrier', count: 1, formation: 'line' }
      ],
      10: [
        { delay: 1000, type: 'scout', count: 5, formation: 'v-shape' },
        { delay: 4000, type: 'bomber', count: 4, formation: 'diagonal' },
        { delay: 7000, type: 'carrier', count: 2, formation: 'line' },
        { delay: 11000, type: 'boss', count: 1, formation: 'line' }
      ]
    };
    this.waves = allWaves[lvl] || allWaves[1];
  }

  triggerWaveAlert(txt) {
    this.waveAlertText = txt;
    this.waveAlertTimer = 1800; // 1.8 seconds (slides, holds, slides)
  }

  spawnPlayerBullet(x, y, vx, vy) {
    const b = this.playerBullets.find(bullet => !bullet.active);
    if (b) {
      b.active = true;
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.vy = vy;
      b.trail = [];
    }
  }

  spawnEnemyBullet(x, y, vx, vy) {
    const b = this.enemyBullets.find(bullet => !bullet.active);
    if (b) {
      b.active = true;
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.vy = vy;
      b.trail = [];
    }
  }

  spawnEnemy(x, y, type) {
    const e = this.enemies.find(enemy => !enemy.active);
    if (e) {
      e.active = true;
      e.x = x;
      e.y = y;
      e.type = type;
      e.time = 0;
      e.shootTimer = Math.random() * 2000;

      if (type === 'asteroid') {
        e.hp = 1;
        e.maxHP = 1;
        e.vx = -120;
        e.vy = 0;
        e.radius = 16;
      } else if (type === 'scout') {
        e.hp = 1;
        e.maxHP = 1;
        e.vx = -150;
        e.vy = 0;
        e.radius = 12;
      } else if (type === 'bomber') {
        e.hp = 2;
        e.maxHP = 2;
        e.vx = -70;
        e.vy = 0;
        e.radius = 18;
      } else if (type === 'carrier') {
        e.hp = 5;
        e.maxHP = 5;
        e.vx = -45;
        e.vy = 0;
        e.radius = 28;
      } else if (type === 'boss') {
        e.hp = 20;
        e.maxHP = 20;
        e.vx = -30;
        e.vy = 0;
        e.radius = 44;
      }
    }
  }

  spawnParticles(x, y, color) {
    let count = 0;
    this.particles.forEach(p => {
      if (!p.active && count < 12) {
        p.active = true;
        p.x = x;
        p.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = this.rand(60, 120);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.color = color;
        p.alpha = 1.0;
        p.life = 0;
        p.maxLife = 400; // ms
        p.r = this.rand(1, 3);
        count++;
      }
    });
  }

  spawnPowerup(x, y) {
    const roll = Math.random();
    if (roll > 0.10) return; // 10% chance
    
    const types = ['SHIELD', 'RAPID', 'WIDE'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const p = this.powerups.find(pu => !pu.active);
    if (p) {
      p.active = true;
      p.x = x;
      p.y = y;
      p.type = type;
      p.vx = -100;
      p.vy = 0;
    }
  }

  spawnFormation(type, count, formation) {
    const rightEdge = this.W + 40;
    
    if (formation === 'line') {
      const spacing = 480 / (count + 1);
      for (let i = 0; i < count; i++) {
        this.spawnEnemy(rightEdge, spacing * (i + 1), type);
      }
    } else if (formation === 'v-shape') {
      const midY = 240;
      for (let i = 0; i < count; i++) {
        const offset = Math.floor(i / 2) + 1;
        const sign = i % 2 === 0 ? 1 : -1;
        this.spawnEnemy(rightEdge + offset * 40, midY + sign * offset * 50, type);
      }
    } else if (formation === 'diagonal') {
      for (let i = 0; i < count; i++) {
        this.spawnEnemy(rightEdge + i * 40, 80 + i * 60, type);
      }
    } else if (formation === 'swarm') {
      for (let i = 0; i < count; i++) {
        this.spawnEnemy(rightEdge + Math.random() * 120, 60 + Math.random() * 360, type);
      }
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.totalTime += delta;
    const dt = delta / 1000;
    const inp = this.input;

    // Powerup durations timers
    if (this.player.rapidTimer > 0) {
      this.player.rapidTimer = Math.max(0, this.player.rapidTimer - delta);
    }
    if (this.player.wideTimer > 0) {
      this.player.wideTimer = Math.max(0, this.player.wideTimer - delta);
    }

    // Wave alert timer
    if (this.waveAlertTimer > 0) {
      this.waveAlertTimer = Math.max(0, this.waveAlertTimer - delta);
    }

    // Parallax background scrolling
    this.stars.forEach(s => {
      let speed = 20;
      if (s.layer === 1) speed = 40;
      if (s.layer === 2) speed = 80;
      s.x -= speed * dt;
      if (s.x < 0) s.x = 680;
    });

    // Player controls (vertical only)
    if (inp.isHeldAny(['ArrowUp', 'w', 'W'])) {
      this.player.y -= this.player.speed * dt;
    }
    if (inp.isHeldAny(['ArrowDown', 's', 'S'])) {
      this.player.y += this.player.speed * dt;
    }
    this.player.y = this.clamp(this.player.y, 20, 460);

    // Player gun weapon firing logic
    if (this.fireCooldown > 0) {
      this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    }

    const isFireKey = inp.isHeld(' ') || inp.isHeld('z') || inp.isHeld('Z');
    if (isFireKey && this.fireCooldown <= 0) {
      // Setup firing rate
      let rate = 220; // ms
      if (this.player.rapidTimer > 0) rate = 110; // Rapid double rate

      this.fireCooldown = rate;

      // Spawn weapon configurations
      if (this.player.wideTimer > 0) {
        // spread
        this.spawnPlayerBullet(this.player.x + 16, this.player.y, 450, -100);
        this.spawnPlayerBullet(this.player.x + 16, this.player.y, 450, 0);
        this.spawnPlayerBullet(this.player.x + 16, this.player.y, 450, 100);
      } else {
        // regular straight shot
        this.spawnPlayerBullet(this.player.x + 16, this.player.y, 450, 0);
      }
    }

    // Scripted waves trigger manager
    this.waveTimer += delta;
    if (this.waveIndex < this.waves.length) {
      const nextWave = this.waves[this.waveIndex];
      if (this.waveTimer >= nextWave.delay) {
        this.spawnFormation(nextWave.type, nextWave.count, nextWave.formation);
        this.waveIndex++;
        this.triggerWaveAlert(`WAVE ${this.waveIndex + 1}`);
      }
    }

    // Update Player Bullets
    this.playerBullets.forEach(b => {
      if (!b.active) return;
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 4) b.trail.shift();

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x > 690) b.active = false;
    });

    // Update Enemy Bullets
    this.enemyBullets.forEach(b => {
      if (!b.active) return;
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 4) b.trail.shift();

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < -10) b.active = false;
    });

    // Update Powerups
    this.powerups.forEach(p => {
      if (!p.active) return;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.x < -20) p.active = false;

      // check grab
      const dist = this.dist(p.x, p.y, this.player.x, this.player.y);
      if (dist < p.r + 15) {
        p.active = false;
        if (p.type === 'SHIELD') {
          this.player.shield = 1;
        } else if (p.type === 'RAPID') {
          this.player.rapidTimer = 5000;
        } else if (p.type === 'WIDE') {
          this.player.wideTimer = 5000;
        }
      }
    });

    // Update Enemies
    this.enemies.forEach(e => {
      if (!e.active) return;
      e.time += delta;
      
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Scout sine wave motion path
      if (e.type === 'scout') {
        e.y += Math.sin(e.time * 0.005) * 120 * dt;
      }
      // Bomber logic path
      if (e.type === 'bomber') {
        e.shootTimer -= delta;
        if (e.shootTimer <= 0) {
          e.shootTimer = 2200; // fire every 2.2s
          // 3 spread
          this.spawnEnemyBullet(e.x - 16, e.y, -260, -60);
          this.spawnEnemyBullet(e.x - 16, e.y, -260, 0);
          this.spawnEnemyBullet(e.x - 16, e.y, -260, 60);
        }
      }
      // Carrier tracks player slowly
      if (e.type === 'carrier' || e.type === 'boss') {
        const diffY = this.player.y - e.y;
        e.y += Math.sign(diffY) * 60 * dt;

        e.shootTimer -= delta;
        if (e.shootTimer <= 0) {
          e.shootTimer = 2000;
          this.spawnEnemyBullet(e.x - 20, e.y, -300, 0);
          if (e.type === 'boss') {
            this.spawnEnemyBullet(e.x - 20, e.y - 12, -280, -30);
            this.spawnEnemyBullet(e.x - 20, e.y + 12, -280, 30);
          }
        }
      }

      if (e.x < -40) {
        e.active = false;
      }

      // Check collision vs player bullets
      this.playerBullets.forEach(b => {
        if (!b.active) return;
        const d = this.dist(b.x, b.y, e.x, e.y);
        if (d < e.radius + 6) {
          b.active = false;
          e.hp--;
          this.spawnParticles(e.x, e.y, '#ffd93d');
          if (e.hp <= 0) {
            e.active = false;
            this.score += e.maxHP * 15 * this.level;
            this.spawnParticles(e.x, e.y, '#ff4757');
            this.spawnPowerup(e.x, e.y);
            
            // Carrier split logic
            if (e.type === 'carrier') {
              this.spawnEnemy(e.x, e.y - 20, 'scout');
              this.spawnEnemy(e.x, e.y + 20, 'scout');
            }
            if (e.type === 'boss') {
              this.bossDefeated = true;
            }
          }
        }
      });

      // Check collision vs player body
      const distToPlayer = this.dist(e.x, e.y, this.player.x, this.player.y);
      if (distToPlayer < e.radius + 12) {
        e.active = false;
        this.damagePlayer();
        this.spawnParticles(e.x, e.y, '#ff4757');
      }
    });

    // Update Enemy Bullets vs player
    this.enemyBullets.forEach(eb => {
      if (!eb.active) return;
      const d = this.dist(eb.x, eb.y, this.player.x, this.player.y);
      if (d < 12) {
        eb.active = false;
        this.damagePlayer();
      }
    });

    // Update explosion particles
    this.particles.forEach(p => {
      if (!p.active) return;
      p.life += delta;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, 1.0 - (p.life / p.maxLife));
      if (p.life >= p.maxLife) {
        p.active = false;
      }
    });

    // Bounded level clearance check
    this.checkClearCondition();
  }

  damagePlayer() {
    if (this.player.shield > 0) {
      this.player.shield = 0; // Shield absorbed hit
      this.spawnParticles(this.player.x, this.player.y, '#4ecdc4');
    } else {
      this.lives--;
      this.spawnParticles(this.player.x, this.player.y, '#ff4757');
    }
  }

  checkClearCondition() {
    // If level 10: must defeat boss
    if (this.level === 10) {
      if (this.bossDefeated) {
        this.levelComplete();
      }
      return;
    }

    // For other levels, clear when waves are finished and all active enemies are dead
    const activeEnemies = this.enemies.filter(e => e.active);
    if (this.waveIndex >= this.waves.length && activeEnemies.length === 0) {
      this.levelComplete();
    }
  }

  render(ctx) {
    this.clear();

    // 1. Draw Starfield
    this.stars.forEach(s => {
      let r = 0.5, alpha = 0.3;
      if (s.layer === 1) { r = 1; alpha = 0.5; }
      if (s.layer === 2) { r = 1.5; alpha = 0.8; }
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. Draw powerups
    this.powerups.forEach(p => {
      if (!p.active) return;
      ctx.strokeStyle = '#fff';
      ctx.fillStyle = p.type === 'SHIELD' ? '#4ecdc4' : p.type === 'RAPID' ? '#ff6b6b' : '#ffd93d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = "bold 9px 'DM Sans', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type[0], p.x, p.y);
    });

    // 3. Draw player bullets
    this.playerBullets.forEach(b => {
      if (!b.active) return;
      // trail
      b.trail.forEach((pos, i) => {
        const alpha = (i / 4) * 0.3;
        ctx.fillStyle = `rgba(78, 205, 196, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, 6, 2, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // main
      ctx.fillStyle = '#4ecdc4';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, 6, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Draw enemy bullets
    this.enemyBullets.forEach(b => {
      if (!b.active) return;
      b.trail.forEach((pos, i) => {
        const alpha = (i / 4) * 0.3;
        ctx.fillStyle = `rgba(255, 71, 87, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#ff4757';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Draw enemies
    this.enemies.forEach(e => {
      if (!e.active) return;
      ctx.save();
      ctx.translate(e.x, e.y);

      if (e.type === 'asteroid') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (e.type === 'scout') {
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath();
        ctx.moveTo(-12, -8);
        ctx.lineTo(12, 0);
        ctx.lineTo(-12, 8);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'bomber') {
        ctx.fillStyle = '#f53b57';
        ctx.beginPath();
        ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
        ctx.fill();
        // side fins
        ctx.fillStyle = '#ff3f34';
        ctx.fillRect(-10, -22, 6, 44);
      } else if (e.type === 'carrier' || e.type === 'boss') {
        ctx.fillStyle = '#ffd200';
        this.drawRoundedRect(ctx, -24, -20, 48, 40, 6);
        ctx.fill();
        // health indicators
        const hpPct = e.hp / e.maxHP;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-18, -14, 36, 4);
        ctx.fillStyle = '#00d4aa';
        ctx.fillRect(-18, -14, 36 * hpPct, 4);
      }

      ctx.restore();
    });

    // 6. Draw player ship (triangle pointing right)
    ctx.save();
    ctx.translate(this.player.x, this.player.y);

    // Engine thrust glow pulses
    const pulseRadius = 4 + Math.sin(this.totalTime / 120) * 2;
    ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(-14, 0, pulseRadius, 0, Math.PI * 2);
    ctx.fill();

    if (this.player.rapidTimer > 0) {
      // second glow
      ctx.beginPath();
      ctx.arc(-14, -6, pulseRadius * 0.8, 0, Math.PI * 2);
      ctx.arc(-14, 6, pulseRadius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Base body
    ctx.fillStyle = 'rgba(78, 205, 196, 0.9)';
    ctx.beginPath();
    ctx.moveTo(14, 0); // nose
    ctx.lineTo(-12, -9); // top wing
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 9); // bottom wing
    ctx.closePath();
    ctx.fill();

    // Shield hexagonal aura (Level 5 / 7 / 10 powerup active)
    if (this.player.shield > 0) {
      ctx.strokeStyle = 'rgba(78, 205, 196, 0.5)';
      ctx.fillStyle = 'rgba(78, 205, 196, 0.08)';
      ctx.lineWidth = 1.5;
      
      ctx.save();
      ctx.rotate(this.totalTime * 0.001);
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const sx = Math.cos(angle) * 26;
        const sy = Math.sin(angle) * 26;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // 7. Draw explosion particles
    this.particles.forEach(p => {
      if (!p.active) return;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.alpha, 0, Math.PI * 2);
      ctx.fill();
    });

    // 8. Draw UI alerts (WAVE slider banner overlays)
    if (this.waveAlertTimer > 0) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.font = "bold 20px 'DM Sans', sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Slide calculation (left to right transition)
      let offset = 0;
      if (this.waveAlertTimer > 1500) {
        offset = (this.waveAlertTimer - 1500) * 1.5; // sliding in
      } else if (this.waveAlertTimer < 300) {
        offset = (300 - this.waveAlertTimer) * -1.5; // sliding out
      }

      ctx.fillText(this.waveAlertText, this.W / 2 + offset, this.H / 2 - 40);
      ctx.restore();
    }
  }

  drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = AstroStrider;
export default AstroStrider;
