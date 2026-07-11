import { GameBase } from '../../core/game-base.js';

class PixelDodge extends GameBase {
  static logicalWidth = 500;
  static logicalHeight = 500;

  init() {
    this.score = 0;
    this.lives = 1; // One hit = game over
    this.isOver = false;

    this.player = {
      x: 250,
      y: 350,
      speed: 240,
      radius: 7, // 14x14 visual
      hitboxRadius: 4, // 8x8 hitbox
      deadTimer: 0,
      isDead: false
    };

    // Object Pool for Bullets (Pre-allocate 150 objects to prevent any GC pauses)
    this.bullets = [];
    for (let i = 0; i < 150; i++) {
      this.bullets.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 4,
        trail: [] // Array of {x, y} for trailing positions
      });
    }

    // Safe zone stats
    this.safeZone = {
      x: 0,
      y: 0,
      w: 80,
      h: 80,
      active: false,
      timer: 0
    };

    this.warningLines = []; // Array of { x1, y1, x2, y2, duration }
    this.timeSurvived = 0; // ms
    this.patternTime = 0;
    this.levelDuration = 20000; // ms
    
    // Spawn scripting
    this.spawnEvents = [];
    this.eventPointer = 0;

    this.flashRedTimer = 0;

    this.buildLevelScript();
  }

  buildLevelScript() {
    const lvl = this.level;
    this.timeSurvived = 0;
    this.patternTime = 0;
    this.eventPointer = 0;
    this.spawnEvents = [];
    this.warningLines = [];

    // Level Durations: L1:20s, L2:25s, L3:28s, L4:30s, L5:32s, L6:35s, L7:38s, L8:40s, L9:45s, L10:60s
    const durations = [0, 20000, 25000, 28000, 30000, 32000, 35000, 38000, 40000, 45000, 60000];
    this.levelDuration = durations[lvl] || 60000;

    // Generate patterns based on level
    // We populate spawnEvents with: { time: ms, type: 'RAIN'|'SPIRAL'|'CROSS'|'WALL'|'CONVERGE', config: {...} }
    const totalMs = this.levelDuration;

    for (let t = 500; t < totalMs - 1000; t += 2000) {
      if (lvl === 1) {
        this.spawnEvents.push({ time: t, type: 'RAIN', count: 4, speed: 100 });
      } else if (lvl === 2) {
        this.spawnEvents.push({ time: t, type: 'RAIN', count: 5, speed: 120, diagonal: true });
      } else if (lvl === 3) {
        if (t % 4000 === 0) {
          this.spawnEvents.push({ time: t, type: 'SPIRAL', count: 12, speed: 130 });
        } else {
          this.spawnEvents.push({ time: t, type: 'RAIN', count: 4, speed: 120 });
        }
      } else if (lvl === 4) {
        if (t % 4000 === 0) {
          this.spawnEvents.push({ time: t, type: 'CROSS', count: 8, speed: 110 });
        } else {
          this.spawnEvents.push({ time: t, type: 'RAIN', count: 6, speed: 130 });
        }
      } else if (lvl === 5) {
        if (t % 5000 === 0) {
          this.spawnEvents.push({ time: t, type: 'WALL', dir: 'left', speed: 120 });
        } else {
          this.spawnEvents.push({ time: t, type: 'RAIN', count: 5, speed: 130 });
        }
      } else if (lvl === 6) {
        if (t % 4000 === 0) {
          this.spawnEvents.push({ time: t, type: 'CONVERGE', speed: 160 });
        } else {
          this.spawnEvents.push({ time: t, type: 'SPIRAL', count: 8, speed: 140 });
        }
      } else if (lvl === 7) {
        // Multiple patterns overlapping
        if (t % 4000 === 0) {
          this.spawnEvents.push({ time: t, type: 'CROSS', count: 8, speed: 120 });
        }
        if (t % 3000 === 0) {
          this.spawnEvents.push({ time: t, type: 'RAIN', count: 4, speed: 140 });
        }
      } else if (lvl === 8) {
        // Narrows gap wall
        if (t % 6000 === 0) {
          this.spawnEvents.push({ time: t, type: 'WALL', dir: 'right', gapNarrow: true, speed: 150 });
        } else {
          this.spawnEvents.push({ time: t, type: 'RAIN', count: 6, speed: 160 });
          this.spawnEvents.push({ time: t + 1000, type: 'CONVERGE', speed: 180 });
        }
      } else if (lvl === 9) {
        // All patterns rapid succession
        const r = Math.floor((t / 2000) % 5);
        const types = ['RAIN', 'SPIRAL', 'CROSS', 'WALL', 'CONVERGE'];
        this.spawnEvents.push({ time: t, type: types[r], count: 8, speed: 170 });
      } else if (lvl === 10) {
        // L10: All simultaneously, fast
        this.spawnEvents.push({ time: t, type: 'RAIN', count: 6, speed: 200 });
        if (t % 4000 === 0) {
          this.spawnEvents.push({ time: t, type: 'SPIRAL', count: 16, speed: 180 });
        }
        if (t % 5000 === 0) {
          this.spawnEvents.push({ time: t, type: 'WALL', dir: 'left', speed: 170 });
        }
        if (t % 3000 === 0) {
          this.spawnEvents.push({ time: t, type: 'CONVERGE', speed: 200 });
        }
      }
    }

    // Sort events by time
    this.spawnEvents.sort((a, b) => a.time - b.time);
  }

  spawnBullet(x, y, vx, vy, radius = 4) {
    const b = this.bullets.find(bl => !bl.active);
    if (b) {
      b.active = true;
      b.x = x;
      b.y = y;
      b.vx = vx;
      b.vy = vy;
      b.radius = radius;
      b.trail = [];
    }
  }

  triggerPattern(ev) {
    const cx = 250;
    const cy = 250;

    switch (ev.type) {
      case 'RAIN': {
        const count = ev.count || 4;
        const speed = ev.speed || 100;
        const diag = ev.diagonal || false;
        for (let i = 0; i < count; i++) {
          const rx = this.rand(20, 480);
          const vx = diag ? this.rand(-40, 40) : 0;
          this.spawnBullet(rx, -10, vx, speed);
        }
        break;
      }
      case 'SPIRAL': {
        const count = ev.count || 12;
        const speed = ev.speed || 120;
        const angleStep = (Math.PI * 2) / count;
        // subtle rotation factor based on time
        const startAngle = (this.patternTime / 1000) * 0.5;
        for (let i = 0; i < count; i++) {
          const angle = startAngle + i * angleStep;
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;
          this.spawnBullet(cx, cy, vx, vy);
        }
        break;
      }
      case 'CROSS': {
        const count = ev.count || 8;
        const speed = ev.speed || 120;
        // spawn from edges
        for (let i = 0; i < count; i++) {
          const edge = i % 4;
          const offset = this.rand(50, 450);
          if (edge === 0) this.spawnBullet(offset, -10, 0, speed); // top
          else if (edge === 1) this.spawnBullet(offset, 510, 0, -speed); // bottom
          else if (edge === 2) this.spawnBullet(-10, offset, speed, 0); // left
          else if (edge === 3) this.spawnBullet(510, offset, -speed, 0); // right
        }
        break;
      }
      case 'WALL': {
        const dir = ev.dir || 'left';
        const speed = ev.speed || 120;
        const isNarrow = ev.gapNarrow || false;
        
        // vertical wall moving horizontally or horizontal wall moving vertically
        // let's do vertical wall sweeping across
        const gapSize = isNarrow ? 60 : 100;
        const gapY = this.rand(60, 440 - gapSize);

        const startX = dir === 'left' ? -10 : 510;
        const vx = dir === 'left' ? speed : -speed;

        // Spawn vertical line of bullets
        for (let y = 10; y < 500; y += 18) {
          if (y < gapY || y > gapY + gapSize) {
            this.spawnBullet(startX, y, vx, 0, 5);
          }
        }
        break;
      }
      case 'CONVERGE': {
        const speed = ev.speed || 160;
        // spawn 4 bullets aiming at player
        const angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
        angles.forEach(a => {
          const sx = cx + Math.cos(a) * 230;
          const sy = cy + Math.sin(a) * 230;

          // aim vector
          const dx = this.player.x - sx;
          const dy = this.player.y - sy;
          const dist = Math.hypot(dx, dy) || 1;
          const vx = (dx / dist) * speed;
          const vy = (dy / dist) * speed;

          // add warning line
          this.warningLines.push({
            x1: sx,
            y1: sy,
            x2: this.player.x,
            y2: this.player.y,
            duration: 500
          });

          // delay actual spawn by 500ms
          setTimeout(() => {
            if (!this.isOver && !this.isPaused) {
              this.spawnBullet(sx, sy, vx, vy, 5);
            }
          }, 500);
        });
        break;
      }
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.player.isDead) {
      this.player.deadTimer += delta;
      if (this.player.deadTimer >= 200) {
        this.isOver = true;
        this.gameOver();
      }
      return;
    }

    this.timeSurvived += delta;
    this.patternTime += delta;
    this.score = Math.floor(this.timeSurvived * this.level);

    if (this.flashRedTimer > 0) {
      this.flashRedTimer = Math.max(0, this.flashRedTimer - delta);
    }

    // Check level clear
    if (this.timeSurvived >= this.levelDuration) {
      this.levelComplete();
      return;
    }

    // Process Warnings Duration
    this.warningLines.forEach((w, idx) => {
      w.duration = Math.max(0, w.duration - delta);
    });
    this.warningLines = this.warningLines.filter(w => w.duration > 0);

    // Spawn safe zone every 15 seconds
    const sec = Math.floor(this.timeSurvived / 1000);
    if (sec > 0 && sec % 15 === 0 && !this.safeZone.active && this.safeZone.timer === 0) {
      this.safeZone.active = true;
      this.safeZone.x = this.rand(40, 380);
      this.safeZone.y = this.rand(40, 380);
      this.safeZone.timer = 5000; // stays for 5s
    }

    // Safe zone update
    if (this.safeZone.active) {
      this.safeZone.timer -= delta;
      if (this.safeZone.timer <= 0) {
        this.safeZone.active = false;
        this.safeZone.timer = 0;
      } else {
        // Check if player is inside safe zone
        const px = this.player.x;
        const py = this.player.y;
        const sz = this.safeZone;
        if (px >= sz.x && px <= sz.x + sz.w && py >= sz.y && py <= sz.y + sz.h) {
          // Stay inside bonus
          this.score += Math.floor(delta * 0.05); // dynamic tick score increment
        }
      }
    }

    // Tick events
    while (this.eventPointer < this.spawnEvents.length && this.spawnEvents[this.eventPointer].time <= this.patternTime) {
      this.triggerPattern(this.spawnEvents[this.eventPointer]);
      this.eventPointer++;
    }

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

    const dt = delta / 1000;
    this.player.x += dx * this.player.speed * dt;
    this.player.y += dy * this.player.speed * dt;

    // Clamp
    this.player.x = this.clamp(this.player.x, this.player.radius, 500 - this.player.radius);
    this.player.y = this.clamp(this.player.y, this.player.radius, 500 - this.player.radius);

    // Update Bullets
    this.bullets.forEach(b => {
      if (!b.active) return;
      
      // Update trail history (max 4 steps)
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 4) b.trail.shift();

      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // check boundary
      if (b.x < -30 || b.x > 530 || b.y < -30 || b.y > 530) {
        b.active = false;
        b.trail = [];
      }

      // Check collision with player hitbox
      const hDist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
      if (hDist <= b.radius + this.player.hitboxRadius) {
        // Hit! Player dies
        this.player.isDead = true;
        this.flashRedTimer = 200;
      }
    });
  }

  render(ctx) {
    // Pure dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, this.W, this.H);

    // Canvas red flash on hit
    if (this.flashRedTimer > 0) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // Render safe zone
    if (this.safeZone.active) {
      const pulseScale = 1.0 + Math.sin(this.timeSurvived * 0.005) * 0.05;
      ctx.strokeStyle = '#00d4aa';
      ctx.lineWidth = 2;
      ctx.save();
      ctx.translate(this.safeZone.x + this.safeZone.w / 2, this.safeZone.y + this.safeZone.h / 2);
      ctx.scale(pulseScale, pulseScale);
      ctx.strokeRect(-this.safeZone.w / 2, -this.safeZone.h / 2, this.safeZone.w, this.safeZone.h);
      ctx.restore();
    }

    // Draw warning lines
    this.warningLines.forEach(w => {
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      ctx.stroke();
    });

    // Draw bullets trail and circle
    this.bullets.forEach(b => {
      if (!b.active) return;
      
      // Draw trails
      b.trail.forEach((pos, i) => {
        const opacity = 0.3 * (i / b.trail.length);
        const radius = b.radius * (0.4 + 0.6 * (i / b.trail.length));
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Main bullet
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Player
    if (this.player.isDead) {
      // Expand circle outward
      const progress = Math.min(1.0, this.player.deadTimer / 200);
      const rad = 7 + progress * 23;
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, rad, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // White square visual
      ctx.fillStyle = '#ffffff';
      const size = this.player.radius * 2;
      ctx.fillRect(this.player.x - this.player.radius, this.player.y - this.player.radius, size, size);

      // Hitbox dot (optional indicator)
      ctx.fillStyle = '#e17055';
      ctx.fillRect(this.player.x - 2, this.player.y - 2, 4, 4);
    }

    // Top Center Survival Timer
    const remainingSec = Math.max(0, (this.levelDuration - this.timeSurvived) / 1000);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = "bold 26px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(`${remainingSec.toFixed(2)}s`, this.W / 2, 50);

    // Muted bottom indicators
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${this.score}`, 24, this.H - 24);
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = PixelDodge;
export default PixelDodge;
