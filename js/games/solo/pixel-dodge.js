import { GameBase } from '../../core/game-base.js';

class PixelDodge extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.playerVisualSize = 16;
    this.playerHitboxSize = 10;
    this.player = { x: 300, y: 300, speed: 300 };

    // Object Pool for Bullets
    this.bullets = [];
    for (let i = 0; i < 100; i++) {
      this.bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, size: 6, homing: false, bounces: 0 });
    }

    this.warnings = []; // Telegraph lines: { x1, y1, x2, y2, timer }
    this.timePlayed = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1500; // ms

    this.score = 0;
    this.lives = 3;
  }

  spawnBullet(x, y, vx, vy, size = 6, homing = false, bounces = 0) {
    const b = this.bullets.find(bullet => !bullet.active);
    if (b) {
      b.active = true;
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.vy = vy;
      b.size = size;
      b.homing = homing;
      b.bounces = bounces;
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.timePlayed += delta;
    this.score = Math.floor(this.timePlayed / 1000);

    const dt = delta / 1000;

    // Movement: Keyboard support (WASD and Arrows)
    const inp = this.input;
    let dx = 0;
    let dy = 0;

    if (inp.isHeldAny(inp.ACTIONS.LEFT)) dx = -1;
    if (inp.isHeldAny(inp.ACTIONS.RIGHT)) dx = 1;
    if (inp.isHeldAny(inp.ACTIONS.UP)) dy = -1;
    if (inp.isHeldAny(inp.ACTIONS.DOWN)) dy = 1;

    // Normalize diagonal speed
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707;
      dy *= 0.707;
    }

    this.player.x += dx * this.player.speed * dt;
    this.player.y += dy * this.player.speed * dt;

    // Mouse control fallback
    const m = inp.getMousePos();
    if (inp.isMouseHeld()) {
      this.player.x = m.x;
      this.player.y = m.y;
    }

    this.player.x = this.clamp(this.player.x, 10, 590);
    this.player.y = this.clamp(this.player.y, 10, 590);

    // Update Warnings
    this.warnings.forEach(w => {
      w.timer -= delta;
      if (w.timer <= 0) {
        // Trigger bullet spawn
        this.spawnBullet(w.x1, w.y1, w.vx, w.vy, w.size || 6, w.homing, w.bounces);
        w.active = false;
      }
    });
    this.warnings = this.warnings.filter(w => w.timer > 0);

    // Bullet Spawning Choreography
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.triggerPattern();
    }

    // Update Bullets & Collisions
    const px = this.player.x;
    const py = this.player.y;
    const halfHit = this.playerHitboxSize / 2;

    this.bullets.forEach(b => {
      if (!b.active) return;

      // Homing algorithm (Level 6+)
      if (b.homing) {
        const dx = px - b.x;
        const dy = py - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          b.vx = (dx / dist) * 150;
          b.vy = (dy / dist) * 150;
        }
      }

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Bouncing off walls (Level 7)
      if (b.bounces > 0) {
        if (b.x <= 0 || b.x >= 600) {
          b.vx *= -1;
          b.bounces--;
        }
        if (b.y <= 0 || b.y >= 600) {
          b.vy *= -1;
          b.bounces--;
        }
      } else {
        // Offscreen check
        if (b.x < -20 || b.x > 620 || b.y < -20 || b.y > 620) {
          b.active = false;
        }
      }

      // Check collision
      const dist = Math.hypot(b.x - px, b.y - py);
      if (dist < halfHit + b.size) {
        this.lives--;
        b.active = false;
        this.player.x = 300;
        this.player.y = 300;
      }
    });

    // Check Goal
    const goal = this.getLevelGoal();
    if (this.score >= goal.target) {
      this.levelComplete();
    }
  }

  triggerPattern() {
    const lvl = this.level;
    
    // Level 1: Rain from top only
    if (lvl === 1) {
      const rx = this.randomInt(50, 550);
      this.queueTelegraph(rx, 0, 0, 150);
    }
    // Level 2: Top and Side
    else if (lvl === 2) {
      this.queueTelegraph(this.randomInt(50, 550), 0, 0, 150);
      this.queueTelegraph(0, this.randomInt(50, 550), 150, 0);
    }
    // Level 3: Center spiral
    else if (lvl === 3) {
      for (let i = 0; i < 4; i++) {
        const angle = (this.timePlayed / 200) + (i * Math.PI / 2);
        this.queueTelegraph(300, 300, Math.cos(angle) * 150, Math.sin(angle) * 150);
      }
    }
    // Level 4: Cross pattern (4 sides)
    else if (lvl === 4) {
      this.queueTelegraph(this.randomInt(50, 550), 0, 0, 150);
      this.queueTelegraph(this.randomInt(50, 550), 600, 0, -150);
      this.queueTelegraph(0, this.randomInt(50, 550), 150, 0);
      this.queueTelegraph(600, this.randomInt(50, 550), -150, 0);
    }
    // Level 5: Wave pattern
    else if (lvl === 5) {
      for (let i = 0; i < 5; i++) {
        const rx = 50 + (i * 120);
        const vy = 120;
        const vx = Math.sin(this.timePlayed / 500) * 80;
        this.queueTelegraph(rx, 0, vx, vy);
      }
    }
    // Level 6: Homing bullets
    else if (lvl === 6) {
      this.queueTelegraph(this.randomInt(0, 600), 0, 0, 100, 6, true);
    }
    // Level 7: Bouncing bullets
    else if (lvl === 7) {
      this.queueTelegraph(0, this.randomInt(100, 500), 120, 120, 6, false, 1);
    }
    // Level 8: Expanding rings from center
    else if (lvl === 8) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 6) {
        this.queueTelegraph(300, 300, Math.cos(angle) * 100, Math.sin(angle) * 100);
      }
    }
    // Level 9 & 10: Mixed patterns
    else {
      // Pick a pattern at random
      const r = Math.random();
      if (r < 0.25) {
        this.queueTelegraph(300, 300, 0, 0, 8, true); // Homing
      } else if (r < 0.5) {
        // Expanding ring
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
          this.queueTelegraph(300, 300, Math.cos(angle) * 120, Math.sin(angle) * 120);
        }
      } else {
        this.queueTelegraph(this.randomInt(0, 600), 0, 0, 150, 6, false, 1);
        this.queueTelegraph(0, this.randomInt(0, 600), 150, 0, 6, false, 1);
      }
    }
  }

  queueTelegraph(x1, y1, vx, vy, size = 6, homing = false, bounces = 0) {
    this.warnings.push({
      x1, y1,
      vx, vy,
      size, homing, bounces,
      timer: 500 // 0.5 seconds telegraph
    });
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Telegraph Warning lines
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    this.warnings.forEach(w => {
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      // Project the path out slightly for indicator line
      ctx.lineTo(w.x1 + w.vx * 3, w.y1 + w.vy * 3);
      ctx.stroke();
    });

    // Draw Bullets
    ctx.fillStyle = '#ef4444';
    this.bullets.forEach(b => {
      if (!b.active) return;
      ctx.fillStyle = b.homing ? '#ffd93d' : '#ef4444';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Player
    ctx.fillStyle = '#6c63ff';
    ctx.fillRect(this.player.x - this.playerVisualSize / 2, this.player.y - this.playerVisualSize / 2, this.playerVisualSize, this.playerVisualSize);

    // Optional: Draw Hitbox guide lightly
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.strokeRect(this.player.x - this.playerHitboxSize / 2, this.player.y - this.playerHitboxSize / 2, this.playerHitboxSize, this.playerHitboxSize);
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Time', value: this.score },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'time', target: 20 },
      { type: 'time', target: 25 },
      { type: 'time', target: 30 },
      { type: 'time', target: 35 },
      { type: 'time', target: 40 },
      { type: 'time', target: 45 },
      { type: 'time', target: 50 },
      { type: 'time', target: 55 },
      { type: 'time', target: 60 },
      { type: 'time', target: 65 }
    ];
    return goals[this.level];
  }
}

window.GameClass = PixelDodge;
