import { GameBase } from '../../core/game-base.js';

class GravityFlip extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.player = {
      x: 100,
      y: 400,
      w: 24,
      h: 24,
      vy: 0,
      dir: 1, // 1 = down, -1 = up
      gravity: 1600,
      isGrounded: false
    };

    this.spikes = []; // { x, y, type: 'up'/'down', w, h }
    this.coins = [];  // { x, y, radius, active }
    
    this.scrollSpeed = 250 + this.level * 25;
    this.coinsCollected = 0;

    this.spawnTimer = 0;
    this.score = 0;
    this.lives = 3;

    this.spawnInitialObstacles();
  }

  spawnInitialObstacles() {
    // Generate initial flat run
    this.spawnTimer = 1.0;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;

    // Movement & Gravity
    this.player.vy += this.player.gravity * this.player.dir * dt;
    this.player.y += this.player.vy * dt;

    // Floor/Ceiling bounds
    const groundY = 500;
    const ceilY = 100;

    if (this.player.y + this.player.h >= groundY && this.player.dir === 1) {
      this.player.y = groundY - this.player.h;
      this.player.vy = 0;
      this.player.isGrounded = true;
    } else if (this.player.y <= ceilY && this.player.dir === -1) {
      this.player.y = ceilY;
      this.player.vy = 0;
      this.player.isGrounded = true;
    } else {
      this.player.isGrounded = false;
    }

    // Input to flip gravity
    const inp = this.input;
    if (inp.wasPressedAny(inp.ACTIONS.ACTION) || inp.wasPressedAny(inp.ACTIONS.UP) || inp.wasMouseClicked()) {
      if (this.player.isGrounded) {
        this.player.dir *= -1;
        this.player.isGrounded = false;
      }
    }

    // Spawn Spikes and Coins
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = Math.max(0.6, 1.8 - this.level * 0.1);
      
      const type = Math.random() > 0.5 ? 'up' : 'down';
      const spikeY = type === 'up' ? groundY - 30 : ceilY;
      this.spikes.push({ x: 620, y: spikeY, type, w: 24, h: 30 });

      // Coin placement
      if (Math.random() < 0.6) {
        const coinY = type === 'up' ? ceilY + 40 : groundY - 60;
        this.coins.push({ x: 620 + 50, y: coinY, radius: 8, active: true });
      }
    }

    // Update Spikes
    this.spikes.forEach(s => {
      s.x -= this.scrollSpeed * dt;
      
      // Collision with player
      const pRect = { x: this.player.x, y: this.player.y, w: this.player.w, h: this.player.h };
      const sRect = { x: s.x, y: s.y, w: s.w, h: s.h };
      if (this.rectHit(pRect, sRect)) {
        this.lives--;
        this.spikes = [];
        this.coins = [];
        this.player.y = 300;
        this.player.vy = 0;
        this.player.dir = 1;
      }
    });
    this.spikes = this.spikes.filter(s => s.x > -50);

    // Update Coins
    this.coins.forEach(c => {
      if (!c.active) return;
      c.x -= this.scrollSpeed * dt;

      // Circle Hit
      const dist = this.distance(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, c.x, c.y);
      if (dist < c.radius + 15) {
        c.active = false;
        this.coinsCollected++;
        this.score += 20;

        const goal = this.getLevelGoal();
        if (this.coinsCollected >= goal.target) {
          this.levelComplete();
        }
      }
    });
    this.coins = this.coins.filter(c => c.x > -50);
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Floor and Ceiling
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, 0, 600, 100);
    ctx.fillRect(0, 500, 600, 100);

    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 100); ctx.lineTo(600, 100);
    ctx.moveTo(0, 500); ctx.lineTo(600, 500);
    ctx.stroke();

    // Draw Player
    ctx.fillStyle = '#6c63ff';
    ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);

    // Draw Spikes (Triangles)
    ctx.fillStyle = '#ef4444';
    this.spikes.forEach(s => {
      ctx.beginPath();
      if (s.type === 'up') {
        ctx.moveTo(s.x, s.y + s.h);
        ctx.lineTo(s.x + s.w / 2, s.y);
        ctx.lineTo(s.x + s.w, s.y + s.h);
      } else {
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.w / 2, s.y + s.h);
        ctx.lineTo(s.x + s.w, s.y);
      }
      ctx.closePath();
      ctx.fill();
    });

    // Draw Coins
    ctx.fillStyle = '#ffd93d';
    this.coins.forEach(c => {
      if (!c.active) return;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Coins', value: `${this.coinsCollected}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'coins', target: 5 },
      { type: 'coins', target: 6 },
      { type: 'coins', target: 8 },
      { type: 'coins', target: 10 },
      { type: 'coins', target: 12 },
      { type: 'coins', target: 14 },
      { type: 'coins', target: 16 },
      { type: 'coins', target: 18 },
      { type: 'coins', target: 20 },
      { type: 'coins', target: 25 }
    ];
    return goals[this.level];
  }
}

window.GameClass = GravityFlip;
