import { GameBase } from '../../core/game-base.js';

class AstroStrider extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.player = { x: 80, y: 300, w: 32, h: 20, speed: 300 };
    
    // Bullet Pool
    this.bullets = [];
    for (let i = 0; i < 40; i++) {
      this.bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, isEnemy: false });
    }

    this.enemies = []; // { active, x, y, vx, vy, type, hp, size }
    
    this.fireTimer = 0;
    this.fireInterval = 200; // ms
    
    this.spawnTimer = 0;
    this.spawnInterval = 2000; // ms

    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({ x: Math.random() * 600, y: Math.random() * 600, speed: 50 + Math.random() * 100 });
    }

    this.kills = 0;
    this.lives = 3;
    this.score = 0;
  }

  spawnBullet(x, y, vx, vy, isEnemy = false) {
    const b = this.bullets.find(bullet => !bullet.active);
    if (b) {
      b.active = true;
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.vy = vy;
      b.isEnemy = isEnemy;
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;

    // Movement (WASD and Arrows)
    const inp = this.input;
    let dy = 0;
    let dx = 0;
    if (inp.isHeldAny(inp.ACTIONS.UP)) dy = -1;
    if (inp.isHeldAny(inp.ACTIONS.DOWN)) dy = 1;
    if (inp.isHeldAny(inp.ACTIONS.LEFT)) dx = -1;
    if (inp.isHeldAny(inp.ACTIONS.RIGHT)) dx = 1;

    this.player.y += dy * this.player.speed * dt;
    this.player.x += dx * this.player.speed * dt;
    this.player.y = this.clamp(this.player.y, 10, 590);
    this.player.x = this.clamp(this.player.x, 10, 300); // Lock to left side

    // Fire Gun (Hold Action)
    this.fireTimer += delta;
    if (inp.isHeldAny(inp.ACTIONS.ACTION) && this.fireTimer >= this.fireInterval) {
      this.fireTimer = 0;
      this.spawnBullet(this.player.x + 16, this.player.y, 400, 0, false);
    }

    // Scroll stars
    this.stars.forEach(s => {
      s.x -= s.speed * dt;
      if (s.x < 0) s.x = 600;
    });

    // Spawn Enemies
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnEnemyWave();
    }

    // Update Enemies
    this.enemies.forEach(e => {
      if (!e.active) return;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Homing movement for ships
      if (e.type === 'ship' && e.x > 350) {
        e.vy = this.clamp(this.player.y - e.y, -100, 100);
      }

      // Shooting logic for ships
      if (e.type === 'ship' && Math.random() < 0.01) {
        this.spawnBullet(e.x - 16, e.y, -300, 0, true);
      }

      // Check collision with player
      const dist = this.distance(this.player.x, this.player.y, e.x, e.y);
      if (dist < e.size + 10) {
        this.lives--;
        e.active = false;
      }

      // Offscreen
      if (e.x < -50) e.active = false;
    });

    // Update Bullets
    this.bullets.forEach(b => {
      if (!b.active) return;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.x < -20 || b.x > 620) {
        b.active = false;
        return;
      }

      // Hit Check
      if (b.isEnemy) {
        const dist = this.distance(b.x, b.y, this.player.x, this.player.y);
        if (dist < 12) {
          this.lives--;
          b.active = false;
        }
      } else {
        // Player bullet hits enemies
        this.enemies.forEach(e => {
          if (!e.active) return;
          const dist = this.distance(b.x, b.y, e.x, e.y);
          if (dist < e.size) {
            e.hp--;
            b.active = false;
            if (e.hp <= 0) {
              e.active = false;
              this.kills++;
              this.score += e.type === 'boss' ? 500 : 50;
            }
          }
        });
      }
    });

    // Check Goal
    const goal = this.getLevelGoal();
    if (this.kills >= goal.target) {
      this.levelComplete();
    }
  }

  spawnEnemyWave() {
    const lvl = this.level;
    
    // Level 1: Asteroids only
    if (lvl === 1) {
      this.enemies.push({ active: true, x: 650, y: this.randomInt(50, 550), vx: -120, vy: 0, type: 'asteroid', hp: 1, size: 16 });
    }
    // Level 2: Asteroids + Ships (moving/shooting)
    else if (lvl === 2) {
      this.enemies.push({ active: true, x: 650, y: this.randomInt(50, 550), vx: -150, vy: 0, type: 'asteroid', hp: 1, size: 16 });
      if (Math.random() < 0.4) {
        this.enemies.push({ active: true, x: 650, y: this.randomInt(100, 500), vx: -100, vy: 0, type: 'ship', hp: 2, size: 12 });
      }
    }
    // Level 10: Boss Fight
    else if (lvl === 10) {
      if (this.enemies.filter(e => e.type === 'boss' && e.active).length === 0) {
        this.enemies.push({ active: true, x: 500, y: 300, vx: -20, vy: 0, type: 'boss', hp: 20, size: 40 });
      }
    }
    // General Scaling Levels
    else {
      // Formations
      const count = Math.min(4, Math.floor(lvl / 2));
      const startY = this.randomInt(100, 400);
      for (let i = 0; i < count; i++) {
        this.enemies.push({
          active: true,
          x: 650 + (i * 30),
          y: startY + (i * 30),
          vx: -150 - lvl * 10,
          vy: 0,
          type: Math.random() < 0.3 ? 'ship' : 'asteroid',
          hp: Math.random() < 0.3 ? 2 : 1,
          size: 15
        });
      }
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw stars
    ctx.fillStyle = '#ffffff';
    this.stars.forEach(s => {
      ctx.fillRect(s.x, s.y, 2, 2);
    });

    // Draw Player
    ctx.fillStyle = '#6c63ff';
    ctx.beginPath();
    ctx.moveTo(this.player.x - 16, this.player.y - 10);
    ctx.lineTo(this.player.x + 16, this.player.y);
    ctx.lineTo(this.player.x - 16, this.player.y + 10);
    ctx.closePath();
    ctx.fill();

    // Draw Enemies
    this.enemies.forEach(e => {
      if (!e.active) return;
      if (e.type === 'asteroid') {
        ctx.fillStyle = '#8888a8';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.type === 'ship') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(e.x + 12, e.y - 8);
        ctx.lineTo(e.x - 12, e.y);
        ctx.lineTo(e.x + 12, e.y + 8);
        ctx.closePath();
        ctx.fill();
      } else if (e.type === 'boss') {
        ctx.fillStyle = '#ffd93d';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fill();
        // HP text
        ctx.fillStyle = '#000';
        ctx.font = '12px DM Sans';
        ctx.textAlign = 'center';
        ctx.fillText(`HP: ${e.hp}`, e.x, e.y + 4);
      }
    });

    // Draw Bullets
    this.bullets.forEach(b => {
      if (!b.active) return;
      ctx.fillStyle = b.isEnemy ? '#ff5e7e' : '#00d4aa';
      ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
    });
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Kills', value: `${this.kills}/${this.getLevelGoal().target}` },
      { label: 'Score', value: this.score }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'kills', target: 5 },
      { type: 'kills', target: 10 },
      { type: 'kills', target: 15 },
      { type: 'kills', target: 20 },
      { type: 'kills', target: 25 },
      { type: 'kills', target: 30 },
      { type: 'kills', target: 35 },
      { type: 'kills', target: 40 },
      { type: 'kills', target: 45 },
      { type: 'kills', target: 50 }
    ];
    return goals[this.level];
  }
}

window.GameClass = AstroStrider;
