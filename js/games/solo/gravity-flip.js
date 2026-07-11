import { GameBase } from '../../core/game-base.js';

class GravityFlip extends GameBase {
  static logicalWidth = 680;
  static logicalHeight = 320;

  init() {
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    this.player = {
      x: 120,
      y: 280, // floor is 290
      radius: 10,
      vy: 0,
      gravityDir: 1, // 1 = normal, -1 = inverted
      rotation: 0,
      targetRotation: 0,
      flipDuration: 0, // ms elapsed since flip
      isDead: false
    };

    this.gravity = 1400;
    this.scrollX = 0;
    this.scrollSpeed = 240 + this.level * 25;
    
    // Level boundary limits
    const lengths = [0, 3000, 3500, 4000, 4000, 4500, 4500, 5000, 5000, 5500, 6000];
    this.levelLength = lengths[this.level] || 6000;

    // Level data lists
    this.obstacles = []; // { x, y, type: 'spike_up' | 'spike_down' | 'moving_spike' | 'spike_wall' | 'flip_zone', w, h, angle }
    this.coins = []; // { id, x, y, radius, collected: false, scale: 1.0, popTimer: 0 }
    
    // Floor/Ceiling gaps definition
    this.gaps = []; // { xStart, xEnd }
    
    this.collectedCoinsSet = new Set();
    this.obstaclePointer = 0;
    this.coinPointer = 0;

    this.scoreFloaters = []; // { x, y, text, opacity, timer }

    this.generateLevelData();
  }

  generateLevelData() {
    const lvl = this.level;
    this.obstacles = [];
    this.coins = [];
    this.gaps = [];

    // Generate gaps in floor/ceiling for L6, L9, L10
    if (lvl === 6 || lvl === 9 || lvl === 10) {
      for (let x = 600; x < this.levelLength - 400; x += 1000) {
        this.gaps.push({ xStart: x, xEnd: x + 180 });
      }
    }

    // Populate level obstacles
    let nextX = 400;
    while (nextX < this.levelLength - 200) {
      const typeRoll = Math.random();
      
      // Spikes
      if (lvl === 1) {
        // Floor spikes only, generous spacing
        this.obstacles.push({ id: this.obstacles.length, x: nextX, y: 290, type: 'spike_up', w: 20, h: 22 });
        this.coins.push({ id: this.coins.length, x: nextX + 150, y: 150, radius: 8 });
        nextX += 450 + Math.random() * 200;
      } else if (lvl === 2) {
        if (typeRoll > 0.4) {
          this.obstacles.push({ id: this.obstacles.length, x: nextX, y: 290, type: 'spike_up', w: 20, h: 22 });
        } else {
          this.obstacles.push({ id: this.obstacles.length, x: nextX, y: 30, type: 'spike_down', w: 20, h: 22 });
        }
        this.coins.push({ id: this.coins.length, x: nextX + 100, y: 160, radius: 8 });
        nextX += 380 + Math.random() * 150;
      } else if (lvl === 3) {
        // Moving spikes
        this.obstacles.push({
          id: this.obstacles.length,
          x: nextX,
          y: 160,
          type: 'moving_spike',
          w: 22,
          h: 22,
          baseY: 160,
          range: 80,
          speed: 4
        });
        nextX += 400;
      } else if (lvl === 4) {
        // Tight corridors
        this.obstacles.push({ id: this.obstacles.length, x: nextX, y: 290, type: 'spike_up', w: 20, h: 22 });
        this.obstacles.push({ id: this.obstacles.length, x: nextX + 220, y: 30, type: 'spike_down', w: 20, h: 22 });
        nextX += 300;
      } else if (lvl === 5) {
        // Spike walls
        this.obstacles.push({ id: this.obstacles.length, x: nextX, y: 180, type: 'spike_wall', w: 24, h: 140 }); // gap is top
        nextX += 500;
      } else if (lvl === 7) {
        // Force flip zones
        this.obstacles.push({ id: this.obstacles.length, x: nextX, y: 160, type: 'flip_zone', w: 20, h: 280 });
        nextX += 450;
      } else {
        // Mix L8, L9, L10 obstacles
        if (typeRoll < 0.25) {
          this.obstacles.push({ id: this.obstacles.length, x: nextX, y: 290, type: 'spike_up', w: 20, h: 22 });
        } else if (typeRoll < 0.5) {
          this.obstacles.push({ id: this.obstacles.length, x: nextX, y: 30, type: 'spike_down', w: 20, h: 22 });
        } else if (typeRoll < 0.75) {
          this.obstacles.push({
            id: this.obstacles.length,
            x: nextX,
            y: 160,
            type: 'moving_spike',
            w: 22,
            h: 22,
            baseY: 160,
            range: 100,
            speed: 5
          });
        } else {
          this.obstacles.push({ id: this.obstacles.length, x: nextX, y: 200, type: 'spike_wall', w: 24, h: 120 });
        }
        this.coins.push({ id: this.coins.length, x: nextX + 120, y: 160, radius: 8 });
        nextX += 280 + Math.random() * 100;
      }
    }

    // Sort lists by X pos
    this.obstacles.sort((a, b) => a.x - b.x);
    this.coins.sort((a, b) => a.x - b.x);
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;

    // Edge Pulsing Float texts
    this.scoreFloaters.forEach(f => f.timer -= delta);
    this.scoreFloaters = this.scoreFloaters.filter(f => f.timer > 0);

    // Coin pops scale animations
    this.coins.forEach(c => {
      if (c.collected && c.popTimer > 0) {
        c.popTimer = Math.max(0, c.popTimer - delta);
        c.scale = 1.0 + (1.0 - c.popTimer / 200) * 1.5;
      }
    });

    // Handle gravity flips rotation
    if (this.player.rotation !== this.player.targetRotation) {
      this.player.flipDuration += delta;
      const progress = Math.min(1.0, this.player.flipDuration / 150); // 150ms flip rotation
      this.player.rotation = this.player.rotation + (this.player.targetRotation - this.player.rotation) * progress;
    }

    // Game loop delta movement updates
    this.scrollX += this.scrollSpeed * dt;

    // Check level clear end criteria
    if (this.scrollX >= this.levelLength) {
      this.levelComplete();
      return;
    }

    // Apply gravity
    this.player.vy += this.gravity * this.player.gravityDir * dt;
    this.player.y += this.player.vy * dt;

    // Verify gaps in floor/ceiling boundaries
    let floorY = 290;
    let ceilY = 30;

    const currentX = this.scrollX + this.player.x;
    const inGap = this.gaps.some(g => currentX >= g.xStart && currentX <= g.xEnd);

    if (inGap) {
      // In a void gap: no floor/ceiling support!
      // If player crosses bottom/top boundary, they die
      if (this.player.y <= 0 || this.player.y >= this.H) {
        this.triggerDeath();
      }
    } else {
      // Normal floor boundaries
      if (this.player.y + this.player.radius >= floorY && this.player.gravityDir === 1) {
        this.player.y = floorY - this.player.radius;
        this.player.vy = 0;
      } else if (this.player.y - this.player.radius <= ceilY && this.player.gravityDir === -1) {
        this.player.y = ceilY + this.player.radius;
        this.player.vy = 0;
      }
    }

    // Touch top/bottom screen bound is death
    if (this.player.y - this.player.radius < 0 || this.player.y + this.player.radius > this.H) {
      this.triggerDeath();
      return;
    }

    // Keyboard Space key gravity flip triggers
    const inp = this.input;
    if (inp.wasPressed(' ') || inp.clicked) {
      // Check if player is on ground or ceiling
      const onFloor = Math.abs(this.player.y + this.player.radius - floorY) < 4;
      const onCeiling = Math.abs(this.player.y - this.player.radius - ceilY) < 4;

      if ((onFloor && this.player.gravityDir === 1) || (onCeiling && this.player.gravityDir === -1)) {
        this.player.gravityDir *= -1;
        this.player.vy *= 0.3; // dampen velocity
        this.player.targetRotation = this.player.gravityDir === 1 ? 0 : Math.PI;
        this.player.flipDuration = 0;
      }
    }

    // Obstacle pointer scans
    while (this.obstaclePointer < this.obstacles.length && this.obstacles[this.obstaclePointer].x - this.scrollX < -100) {
      this.obstaclePointer++;
    }

    // Collision check: Spikes in screen scope
    const screenWidth = this.W;
    for (let i = this.obstaclePointer; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      const relX = obs.x - this.scrollX;
      if (relX > screenWidth + 50) break; // sorted by X, break early

      // Update moving obstacle position coordinates
      if (obs.type === 'moving_spike') {
        const oscTime = this.scrollX * 0.01;
        obs.y = obs.baseY + Math.sin(oscTime) * obs.range;
      }

      // Check collision
      if (this.checkCollision(this.player, obs)) {
        this.triggerDeath();
        return;
      }
    }

    // Coin pointer scans
    while (this.coinPointer < this.coins.length && this.coins[this.coinPointer].x - this.scrollX < -100) {
      this.coinPointer++;
    }

    // Collision check: Coins
    for (let i = this.coinPointer; i < this.coins.length; i++) {
      const coin = this.coins[i];
      const relX = coin.x - this.scrollX;
      if (relX > screenWidth + 50) break;

      if (!coin.collected && this.collectedCoinsSet.has(coin.id) === false) {
        const dist = Math.hypot(this.player.x - relX, this.player.y - coin.y);
        if (dist <= this.player.radius + coin.radius) {
          // Collected!
          coin.collected = true;
          coin.popTimer = 200;
          this.collectedCoinsSet.add(coin.id);
          const earn = 10 * this.level;
          this.score += earn;

          this.scoreFloaters.push({
            x: relX,
            y: coin.y,
            text: `+${earn}`,
            timer: 600
          });
        }
      }
    }
  }

  checkCollision(player, obs) {
    const relX = obs.x - this.scrollX;

    // Check trigger flip force zone
    if (obs.type === 'flip_zone') {
      const inZoneX = Math.abs(player.x - relX) <= (obs.w / 2 + player.radius);
      if (inZoneX) {
        // Forced flip!
        if (player.gravityDir === 1) {
          player.gravityDir = -1;
          player.targetRotation = Math.PI;
          player.flipDuration = 0;
        }
      }
      return false;
    }

    // Spike collision logic (triangle vs circle or rect vs circle)
    if (obs.type === 'spike_up') {
      // Triangle bounds: (relX-w/2, 290), (relX+w/2, 290), (relX, 290-h)
      // Standard AABB fallback
      return player.x + player.radius >= relX - obs.w / 2 &&
             player.x - player.radius <= relX + obs.w / 2 &&
             player.y + player.radius >= 290 - obs.h;
    } else if (obs.type === 'spike_down') {
      // Ceiling spike bounds
      return player.x + player.radius >= relX - obs.w / 2 &&
             player.x - player.radius <= relX + obs.w / 2 &&
             player.y - player.radius <= 30 + obs.h;
    } else if (obs.type === 'spike_wall') {
      // Column block
      return player.x + player.radius >= relX - obs.w / 2 &&
             player.x - player.radius <= relX + obs.w / 2 &&
             player.y + player.radius >= obs.y && player.y - player.radius <= obs.y + obs.h;
    } else if (obs.type === 'moving_spike') {
      // circle obstacle
      return Math.hypot(player.x - relX, player.y - obs.y) <= player.radius + obs.w / 2;
    }
    return false;
  }

  triggerDeath() {
    this.lives--;
    if (this.lives <= 0) {
      this.isOver = true;
      this.gameOver();
    } else {
      // Restart round checkpoint back offset
      this.scrollX = Math.max(0, this.scrollX - 400);
      this.player.y = 150;
      this.player.vy = 0;
      this.player.gravityDir = 1;
      this.player.targetRotation = 0;
      this.player.rotation = 0;
    }
  }

  render(ctx) {
    this.clear();

    const cx = this.W / 2;

    // Draw Parallax Geometric Background
    // Layer 1: Far (0.2x speed)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    for (let i = 0; i < 4; i++) {
      const farX = (i * 250 - this.scrollX * 0.2) % (this.W + 250);
      const px = farX < 0 ? farX + this.W + 250 : farX;
      ctx.beginPath();
      ctx.moveTo(px - 100, 320);
      ctx.lineTo(px, 120);
      ctx.lineTo(px + 100, 320);
      ctx.fill();
    }

    // Layer 2: Near (0.5x speed)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let i = 0; i < 5; i++) {
      const nearX = (i * 200 - this.scrollX * 0.5) % (this.W + 200);
      const px = nearX < 0 ? nearX + this.W + 200 : nearX;
      ctx.fillRect(px, 160, 40, 160);
    }

    // Draw Floor & Ceiling lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    
    // Draw floors with potential GAPs
    let currentDrawX = 0;
    this.gaps.forEach(g => {
      const relStart = g.xStart - this.scrollX;
      const relEnd = g.xEnd - this.scrollX;
      
      // Draw floor up to gap start
      if (relStart > currentDrawX) {
        ctx.beginPath();
        ctx.moveTo(currentDrawX, 290);
        ctx.lineTo(relStart, 290);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(currentDrawX, 30);
        ctx.lineTo(relStart, 30);
        ctx.stroke();
      }
      currentDrawX = relEnd;
    });

    if (currentDrawX < this.W) {
      ctx.beginPath();
      ctx.moveTo(currentDrawX, 290);
      ctx.lineTo(this.W, 290);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(currentDrawX, 30);
      ctx.lineTo(this.W, 30);
      ctx.stroke();
    }

    // Draw obstacles in screen scope
    this.obstacles.forEach(obs => {
      const relX = obs.x - this.scrollX;
      if (relX < -50 || relX > this.W + 50) return;

      if (obs.type === 'spike_up') {
        ctx.fillStyle = '#ff7675'; // Danger color
        ctx.beginPath();
        ctx.moveTo(relX - obs.w / 2, 290);
        ctx.lineTo(relX + obs.w / 2, 290);
        ctx.lineTo(relX, 290 - obs.h);
        ctx.fill();
      } else if (obs.type === 'spike_down') {
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.moveTo(relX - obs.w / 2, 30);
        ctx.lineTo(relX + obs.w / 2, 30);
        ctx.lineTo(relX, 30 + obs.h);
        ctx.fill();
      } else if (obs.type === 'spike_wall') {
        ctx.fillStyle = 'rgba(255, 118, 117, 0.4)';
        ctx.strokeStyle = '#ff7675';
        ctx.lineWidth = 1.5;
        ctx.fillRect(relX - obs.w / 2, obs.y, obs.w, obs.h);
        ctx.strokeRect(relX - obs.w / 2, obs.y, obs.w, obs.h);
      } else if (obs.type === 'moving_spike') {
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.arc(relX, obs.y, obs.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (obs.type === 'flip_zone') {
        ctx.fillStyle = 'rgba(85, 239, 196, 0.08)';
        ctx.strokeStyle = 'rgba(85, 239, 196, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.fillRect(relX - obs.w / 2, 30, obs.w, 260);
        ctx.strokeRect(relX - obs.w / 2, 30, obs.w, 260);
      }
    });

    // Draw Coins
    this.coins.forEach(c => {
      const relX = c.x - this.scrollX;
      if (relX < -30 || relX > this.W + 30) return;

      if (!c.collected || c.popTimer > 0) {
        ctx.save();
        ctx.translate(relX, c.y);
        ctx.scale(c.scale, c.scale);
        
        ctx.fillStyle = '#55efc4'; // Accent
        ctx.globalAlpha = c.collected ? c.popTimer / 200 : 1.0;
        
        // pulsing scaling coin visual
        const pulse = 1.0 + Math.sin(this.scrollX * 0.02 + c.id) * 0.15;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
    });

    // Render score floaters
    ctx.font = "bold 11px 'DM Sans', sans-serif";
    ctx.textAlign = 'center';
    this.scoreFloaters.forEach(f => {
      ctx.fillStyle = `rgba(85, 239, 196, ${f.timer / 600})`;
      const dy = 25 * (1.0 - f.timer / 600);
      ctx.fillText(f.text, f.x, f.y - dy);
    });

    // Draw gravity indicator arrow near player
    ctx.strokeStyle = '#55efc4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(this.player.x - 20, this.player.y);
    ctx.lineTo(this.player.x - 20, this.player.y - 12 * this.player.gravityDir);
    // arrow cap
    ctx.moveTo(this.player.x - 24, this.player.y - 8 * this.player.gravityDir);
    ctx.lineTo(this.player.x - 20, this.player.y - 12 * this.player.gravityDir);
    ctx.lineTo(this.player.x - 16, this.player.y - 8 * this.player.gravityDir);
    ctx.stroke();

    // Draw Player square (applying rotations)
    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.rotate(this.player.rotation);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#55efc4';
    ctx.lineWidth = 2;
    ctx.fillRect(-this.player.radius, -this.player.radius, this.player.radius * 2, this.player.radius * 2);
    ctx.strokeRect(-this.player.radius, -this.player.radius, this.player.radius * 2, this.player.radius * 2);
    ctx.restore();

    // Level progress bar at top
    const prg = Math.min(1.0, this.scrollX / this.levelLength);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, this.W, 3);
    ctx.fillStyle = '#55efc4';
    ctx.fillRect(0, 0, this.W * prg, 3);

    // Muted distance bottom indicator
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`DIST: ${Math.round(this.scrollX)} / ${this.levelLength}m`, 24, this.H - 20);

    ctx.textAlign = 'right';
    ctx.fillText(`SCORE: ${this.score}`, this.W - 24, this.H - 20);
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = GravityFlip;
export default GravityFlip;
