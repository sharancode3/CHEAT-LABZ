import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class GravityFlip extends GameBase {
  static get logicalWidth() { return 700; }
  static get logicalHeight() { return 400; }
  
  constructor(canvas, container) {
    super(canvas, container);

    this.player = {
      x: 100, y: 200,
      w: 28, h: 28,
      vy: 0,
      gravity: 2100,
      dir: 1, // 1 = down, -1 = up
      angle: 0,
      isGrounded: false
    };

    this.baseSpeed = 320;
    this.speed = 320;
    
    this.spikes = [];
    this.particles = [];
    this.trail = [];
    
    this.spawnTimer = 0;
    this.seed = 8888;
    this.targetAngle = 0;
    this.groundH = 40;

    // Death sequence
    this.dyingTimer = 0;
    this.isDying = false;
  }

  init() {
    this.player = {
      x: 100, y: 200,
      w: 28, h: 28,
      vy: 0,
      gravity: 2100,
      dir: 1,
      angle: 0,
      isGrounded: false
    };

    this.score = 0;
    this.distance = 0;
    this.speed = this.baseSpeed;
    
    this.spikes = [];
    this.particles = [];
    this.trail = [];
    this.spawnTimer = 0;
    this.seed = 8888;
    this.targetAngle = 0;
    
    this.isDying = false;
    this.dyingTimer = 0;

    let runs = Storage.get('gravity-flip_runs', 0);
    Storage.set('gravity-flip_runs', runs + 1);
  }

  onInput(key, event) {
    const k = key.toLowerCase();
    if ((k === ' ' || k === 'enter' || k === 'arrowup' || k === 'w') && this.state === 'PLAYING' && !this.isDying) {
      this.flipGravity();
    }
  }

  onMouseDown(x, y, event) {
    if (this.state === 'PLAYING' && !this.isDying) {
      this.flipGravity();
    }
  }

  flipGravity() {
    this.player.dir *= -1;
    this.player.isGrounded = false;
    this.targetAngle = this.player.dir === 1 ? 0 : Math.PI;
    this.container.audio.play('blip');
    this.container.shake(50, 1.2);
    
    // Spawn jump dust burst
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: this.player.x + this.player.w / 2,
        y: this.player.y + (this.player.dir === 1 ? 0 : this.player.h),
        vx: (Math.random() - 0.5) * 80 - this.speed * 0.2,
        vy: this.player.dir * (Math.random() * 40 + 20),
        life: 250 + Math.random() * 150,
        maxLife: 400,
        color: 'rgba(255,255,255,0.45)'
      });
    }
  }

  seedRandom() {
    let t = this.seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }

  spawnSpike() {
    const side = this.seedRandom() > 0.55 ? 1 : 0; // 0=bottom, 1=top
    const isDouble = this.seedRandom() > 0.75;
    
    const count = isDouble ? 2 : 1;
    for (let i = 0; i < count; i++) {
      this.spikes.push({
        x: this.width + i * 36,
        y: side === 0 ? this.height - this.groundH : this.groundH,
        w: 26,
        h: 36,
        side: side // 0=bottom, 1=top
      });
    }
  }

  createGroundedSparks() {
    const py = this.player.dir === 1 ? this.player.y + this.player.h : this.player.y;
    this.particles.push({
      x: this.player.x + Math.random() * this.player.w,
      y: py,
      vx: -this.speed * 0.8 - Math.random() * 50,
      vy: (Math.random() - 0.5) * 20,
      life: 150 + Math.random() * 150,
      maxLife: 300,
      color: '#00f0ff'
    });
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;

    if (this.isDying) {
      this.dyingTimer -= deltaTime;
      // Spawn particles during death dissolve
      if (Math.random() > 0.4) {
        this.particles.push({
          x: this.player.x + Math.random() * this.player.w,
          y: this.player.y + Math.random() * this.player.h,
          vx: (Math.random() - 0.5) * 100,
          vy: (Math.random() - 0.5) * 100,
          life: 300,
          maxLife: 300,
          color: '#00f0ff'
        });
      }

      // Update particles
      this.particles.forEach(p => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= deltaTime;
      });
      this.particles = this.particles.filter(p => p.life > 0);

      if (this.dyingTimer <= 0) {
        this.finishGame();
      }
      return;
    }

    // Progression speed increments
    this.distance += (this.speed * dt) / 9;
    this.score = Math.floor(this.distance);
    this.speed = this.baseSpeed + this.distance * 0.65;

    // Movement & gravity
    if (!this.player.isGrounded) {
      this.player.vy += this.player.gravity * this.player.dir * dt;
    }

    this.player.y += this.player.vy * dt;

    // Boundary check ground contacts
    this.player.isGrounded = false;
    if (this.player.y + this.player.h >= this.height - this.groundH) {
      this.player.y = this.height - this.groundH - this.player.h;
      this.player.vy = 0;
      if (this.player.dir === 1) {
        this.player.isGrounded = true;
      }
    } else if (this.player.y <= this.groundH) {
      this.player.y = this.groundH;
      this.player.vy = 0;
      if (this.player.dir === -1) {
        this.player.isGrounded = true;
      }
    }

    // Spark particles for sliding feel
    if (this.player.isGrounded) {
      this.createGroundedSparks();
    }

    // Rotate player box visually
    let angleDiff = this.targetAngle - this.player.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.player.angle += angleDiff * 16 * dt;

    // Update trail coordinates
    this.trail.push({ x: this.player.x, y: this.player.y });
    if (this.trail.length > 8) this.trail.shift();

    // Spikes spawning
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnSpike();
      this.spawnTimer = Math.max(480, 1400 + this.seedRandom() * 1100 - (this.speed * 0.8));
    }

    // Check spike collisions
    const shrinkX = 5;
    const shrinkY = 4;
    for (let i = this.spikes.length - 1; i >= 0; i--) {
      const s = this.spikes[i];
      s.x -= this.speed * dt;

      // Exact intersection checks
      if (this.player.x + this.player.w - shrinkX > s.x &&
          this.player.x + shrinkX < s.x + s.w) {
        
        let hit = false;
        if (s.side === 0) {
          // Bottom spike y intersection
          if (this.player.y + this.player.h > s.y + shrinkY) hit = true;
        } else {
          // Top spike y intersection
          if (this.player.y < s.y + s.h - shrinkY) hit = true;
        }

        if (hit) {
          this.triggerDeath();
          return;
        }
      }

      if (s.x < -40) {
        this.spikes.splice(i, 1);
      }
    }

    // Update general dust/sparks particles
    this.particles.forEach(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
    });
    this.particles = this.particles.filter(p => p.life > 0);
  }

  triggerDeath() {
    this.isDying = true;
    this.dyingTimer = 650; // 650ms dissolve phase
    this.container.audio.play('damage');
    this.container.shake(250, 4.5);
  }

  finishGame() {
    const baseScore = this.score;
    const coins = Math.floor(baseScore / 220);

    this.scoreBreakdown = {
      rows: [
        { label: 'Distance Flipped', value: `${baseScore}m`, points: baseScore }
      ],
      total: baseScore,
      coinsEarned: coins
    };

    if (window.awardCoins && coins > 0) {
      window.awardCoins(coins, 'Gravity Flip Score');
    }

    this.container.audio.play('gameover');
    this.gameOver();
  }

  render(ctx) {
    // 1. Dark background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Ceiling / Floor boundaries
    ctx.fillStyle = '#14141f';
    ctx.fillRect(0, 0, this.width, this.groundH);
    ctx.fillRect(0, this.height - this.groundH, this.width, this.groundH);

    // Grid scrolling speed illusion lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2.0;
    const offset = -(this.distance * 11) % 40;
    ctx.beginPath();
    for (let x = offset; x < this.width; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.groundH);
      ctx.moveTo(x, this.height - this.groundH);
      ctx.lineTo(x, this.height);
    }
    ctx.stroke();

    // Borders dividing lines
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundH);
    ctx.lineTo(this.width, this.groundH);
    ctx.moveTo(0, this.height - this.groundH);
    ctx.lineTo(this.width, this.height - this.groundH);
    ctx.stroke();

    // 3. Spikes Obstacles (Red triangles pointing correctly)
    ctx.fillStyle = '#ff3b30';
    for (let s of this.spikes) {
      ctx.beginPath();
      if (s.side === 0) {
        // bottom pointing up
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.w / 2, s.y - s.h);
        ctx.lineTo(s.x + s.w, s.y);
      } else {
        // top pointing down
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.w / 2, s.y + s.h);
        ctx.lineTo(s.x + s.w, s.y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // 4. Particles (Trail particles & Sparks)
    for (let p of this.particles) {
      ctx.fillStyle = p.color || '#ffffff';
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1.0;

    // 5. Draw Player Box with rotation if alive
    if (!this.isDying) {
      // Draw ghost trail
      for (let i = 0; i < this.trail.length; i++) {
        const pt = this.trail[i];
        const alpha = ((i + 1) / this.trail.length) * 0.28;
        ctx.fillStyle = `rgba(0, 240, 255, ${alpha})`;
        ctx.fillRect(pt.x, pt.y, this.player.w, this.player.h);
      }

      ctx.save();
      ctx.translate(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2);
      ctx.rotate(this.player.angle);
      
      ctx.fillStyle = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f0ff';
      ctx.fillRect(-this.player.w / 2, -this.player.h / 2, this.player.w, this.player.h);
      ctx.shadowBlur = 0;

      // Pilot orientation eye dot
      ctx.fillStyle = '#060608';
      ctx.fillRect(4, -8, 5, 5);
      ctx.fillRect(4, 3, 5, 5);
      
      ctx.restore();
    }

    // Distance HUD Score
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(`SPEED: ${Math.floor(this.speed)} px/s`, 20, this.groundH + 30);
    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${this.score}`, this.width - 20, this.groundH + 30);
  }

  getControls() {
    return [
      { key: 'SPACE / CLICK', action: 'Switch ceiling/floor gravity' }
    ];
  }

  getFunStat() {
    return `Travelled ${this.score} meters down the gravity conduit`;
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
