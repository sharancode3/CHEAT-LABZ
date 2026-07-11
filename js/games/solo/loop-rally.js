import { GameBase } from '../../core/game-base.js';

class LoopRally extends GameBase {
  static logicalWidth = 480;
  static logicalHeight = 640;

  init() {
    this.paddleW = 80;
    this.paddleH = 12;
    this.ballRadius = 7;

    // Reset components
    this.player = { x: 240 - this.paddleW / 2, y: 580, w: this.paddleW, h: this.paddleH };
    this.ai = { x: 240 - this.paddleW / 2, y: 48, w: this.paddleW, h: this.paddleH };

    this.balls = [{
      x: 240,
      y: 320,
      vx: 0,
      vy: 1, // unit vector components
      speed: 1.0, // multiplier
      trail: []
    }];

    this.obstacles = [];
    this.powerZones = [];
    this.invisibleZoneTimer = 0;
    this.invisibleZoneWarning = false;
    this.invisibleActive = false;

    this.rallies = 0;
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    this.speedSpikeTimer = 0; // for Speed spike active (Level 6/10)
    
    this.aiLearningMultiplier = 1.0; // for AI learning speed (Level 9/10)
    
    this.setupLevel();
    this.spawnBall(0); // init speeds
  }

  setupLevel() {
    const lvl = this.level;

    // Center obstacle in level 5, 7, 10
    if (lvl === 5 || lvl === 7 || lvl === 10) {
      this.obstacles.push({ x: 240 - 40, y: 320 - 10, w: 80, h: 20 });
    }

    // Power zones in level 3, 10
    if (lvl === 3 || lvl === 10) {
      this.powerZones.push({ x: 120, y: 240, r: 25 }, { x: 360, y: 400, r: 25 });
    }
  }

  spawnBall(idx, customY = 320) {
    const ball = this.balls[idx];
    if (!ball) return;
    ball.x = 240;
    ball.y = customY;
    
    // Random angle heading down or up
    const angle = (Math.random() - 0.5) * (Math.PI / 3); // -30 to +30 deg
    const dir = Math.random() > 0.5 ? 1 : -1;
    
    ball.vx = Math.sin(angle);
    ball.vy = Math.cos(angle) * dir;
    ball.speed = 1.0;
    ball.trail = [];
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;
    const inp = this.input;

    // Speed spike timer
    if (this.speedSpikeTimer > 0) {
      this.speedSpikeTimer = Math.max(0, this.speedSpikeTimer - delta);
    }

    // Invisible zone logic (Level 8 / 10)
    if (this.level === 8 || this.level === 10) {
      this.invisibleZoneTimer += delta;
      if (this.invisibleZoneTimer >= 8000) {
        this.invisibleZoneTimer = 0;
        this.invisibleZoneWarning = false;
        this.invisibleActive = false;
      } else if (this.invisibleZoneTimer >= 5000) {
        this.invisibleActive = true;
        this.invisibleZoneWarning = false;
      } else if (this.invisibleZoneTimer >= 2000) {
        this.invisibleZoneWarning = true;
      }
    }

    // Player inputs (Keyboard + Mouse fallback)
    const basePlayerSpeed = 350;
    if (inp.isHeldAny(['ArrowLeft', 'a', 'A'])) {
      this.player.x -= basePlayerSpeed * dt;
    }
    if (inp.isHeldAny(['ArrowRight', 'd', 'D'])) {
      this.player.x += basePlayerSpeed * dt;
    }

    // Mouse movement override
    if (inp.mouse.x !== undefined) {
      const currentW = this.getPlayerWidth();
      this.player.x = inp.mouse.x - currentW / 2;
    }

    // Clamp player paddle bounds
    const currentW = this.getPlayerWidth();
    this.player.w = currentW;
    this.player.x = this.clamp(this.player.x, 0, this.W - currentW);

    // AI logic (Follow first active ball)
    const activeBalls = this.balls.filter(b => b.y < 500); // only look at balls not past paddle
    const targetBall = activeBalls[0] || this.balls[0];

    if (targetBall) {
      const aiTarget = targetBall.x;
      const aiCenter = this.ai.x + this.ai.w / 2;
      const diff = aiTarget - aiCenter;
      
      const reactionSpeed = this.getAIReactionSpeed();
      // Apply movement step
      this.ai.x += diff * reactionSpeed * (delta / 16) * this.aiLearningMultiplier;
      this.ai.x = this.clamp(this.ai.x, 0, this.W - this.ai.w);
    }

    // Two ball spawning modifier check (Level 7)
    if (this.level === 7 && this.rallies >= 20 && this.balls.length === 1) {
      this.balls.push({
        x: 240,
        y: 320,
        vx: 0,
        vy: -1,
        speed: 1.0,
        trail: []
      });
      this.spawnBall(1, 280);
    }

    // Move balls and resolve bounces
    this.balls.forEach((ball, idx) => {
      // Record trail
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 8) ball.trail.shift();

      // Determine actual speed magnitude
      let speedMag = 300 * ball.speed;
      if (this.speedSpikeTimer > 0) {
        speedMag *= 2.0; // 2x speed spike
      }

      // Step position
      ball.x += ball.vx * speedMag * dt;
      ball.y += ball.vy * speedMag * dt;

      // Bounce left/right walls
      if (ball.x - this.ballRadius < 0) {
        ball.x = this.ballRadius;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x + this.ballRadius > this.W) {
        ball.x = this.W - this.ballRadius;
        ball.vx = -Math.abs(ball.vx);
      }

      // Check center obstacle collisions (Level 5 / 7 / 10)
      this.obstacles.forEach(obs => {
        if (this.rectHitBall(obs, ball)) {
          // Bounce off box obstacle
          const midX = obs.x + obs.w / 2;
          const midY = obs.y + obs.h / 2;
          if (Math.abs(ball.x - midX) > Math.abs(ball.y - midY)) {
            ball.vx = Math.sign(ball.x - midX) * Math.abs(ball.vx);
          } else {
            ball.vy = Math.sign(ball.y - midY) * Math.abs(ball.vy);
          }
        }
      });

      // Check power zones collisions (Level 3 / 10)
      this.powerZones.forEach(zone => {
        const d = this.dist(ball.x, ball.y, zone.x, zone.y);
        if (d < zone.r + this.ballRadius) {
          // bounce randomly
          const randomAngle = (Math.random() - 0.5) * (Math.PI / 2);
          ball.vx = Math.sin(randomAngle);
          ball.vy = Math.cos(randomAngle) * Math.sign(ball.vy);
          // push slightly away
          ball.x += ball.vx * 5;
          ball.y += ball.vy * 5;
        }
      });

      // Player Paddle collision (Bottom)
      if (this.rectHitBall(this.player, ball) && ball.vy > 0) {
        ball.y = this.player.y - this.ballRadius;
        const relativeX = (ball.x - this.player.x) / this.player.w;
        const bounceAngle = (this.clamp(relativeX, 0, 1) - 0.5) * (120 * Math.PI / 180);
        
        ball.vx = Math.sin(bounceAngle);
        ball.vy = -Math.cos(bounceAngle);

        this.rallies++;
        this.score = this.rallies;

        // Ball speed increases
        if (this.level >= 2 && this.rallies % 5 === 0) {
          ball.speed += 0.05;
        }

        // Speed spike triggers (Level 6 / 10)
        if ((this.level === 6 || this.level === 10) && this.rallies % 20 === 0) {
          this.speedSpikeTimer = 3000; // 3 seconds
        }

        // Check if next level clear
        if (this.rallies >= this.getTargetRallies()) {
          this.levelComplete();
        }
      }

      // AI Paddle collision (Top)
      if (this.rectHitBall(this.ai, ball) && ball.vy < 0) {
        ball.y = this.ai.y + this.ai.h + this.ballRadius;
        const relativeX = (ball.x - this.ai.x) / this.ai.w;
        const bounceAngle = (this.clamp(relativeX, 0, 1) - 0.5) * (120 * Math.PI / 180);
        
        ball.vx = Math.sin(bounceAngle);
        ball.vy = Math.cos(bounceAngle);
      }

      // Enforcement of minimum vertical speeds to avoid horizontal locking
      if (Math.abs(ball.vy) < 0.2) {
        ball.vy = 0.2 * Math.sign(ball.vy || 1);
        const norm = Math.hypot(ball.vx, ball.vy);
        ball.vx /= norm;
        ball.vy /= norm;
      }

      // Out of bounds checking (top/bottom)
      if (ball.y < 0) {
        // AI missed, respawn ball heading down towards player
        this.spawnBall(idx, 150);
      } else if (ball.y > this.H) {
        // Player missed
        this.lives--;
        // If AI learning active (Level 9 / 10), make AI faster after miss
        if (this.level === 9 || this.level === 10) {
          this.aiLearningMultiplier += 0.01;
        }
        if (this.lives > 0) {
          this.spawnBall(idx, 400);
        }
      }
    });
  }

  getPlayerWidth() {
    let w = this.paddleW;
    if (this.level === 4 || this.level === 10) {
      // Decrease width by 2px every 15 rallies
      const steps = Math.floor(this.rallies / 15);
      w = Math.max(30, this.paddleW - (steps * 2));
    }
    return w;
  }

  getAIReactionSpeed() {
    const speeds = [0, 0.04, 0.055, 0.07, 0.085, 0.10, 0.11, 0.12, 0.13, 0.14, 0.15];
    return speeds[this.level] || 0.04;
  }

  getTargetRallies() {
    return this.level * 10;
  }

  rectHitBall(rect, ball) {
    // standard AABB intersection
    return (
      ball.x + this.ballRadius > rect.x &&
      ball.x - this.ballRadius < rect.x + rect.w &&
      ball.y + this.ballRadius > rect.y &&
      ball.y - this.ballRadius < rect.y + rect.h
    );
  }

  render(ctx) {
    this.clear();

    // Dash line at H / 2
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(0, this.H / 2);
    ctx.lineTo(this.W, this.H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Large score background indicators
    ctx.font = "28px 'JetBrains Mono', monospace";
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.textAlign = 'center';
    ctx.fillText(this.rallies.toString(), this.W / 2, this.H / 2 + 50);

    // Draw central obstacle (Level 5 / 7 / 10)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    this.obstacles.forEach(obs => {
      this.drawRoundedRect(ctx, obs.x, obs.y, obs.w, obs.h, 4);
      ctx.fill();
    });

    // Draw Power zones (Level 3 / 10)
    this.powerZones.forEach(zone => {
      ctx.strokeStyle = 'rgba(108, 99, 255, 0.3)';
      ctx.fillStyle = 'rgba(108, 99, 255, 0.05)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // Draw AI Paddle
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    this.drawRoundedRect(ctx, this.ai.x, this.ai.y, this.ai.w, this.ai.h, 4);
    ctx.fill();

    // Draw Player Paddle (handle invisibility overlay Level 8 / 10)
    if (!this.invisibleActive) {
      ctx.fillStyle = 'rgba(108, 99, 255, 0.9)';
      this.drawRoundedRect(ctx, this.player.x, this.player.y, this.player.w, this.player.h, 4);
      ctx.fill();
    }

    // Invisible warning indicator
    if (this.invisibleZoneWarning) {
      ctx.fillStyle = 'rgba(255, 71, 87, 0.4)';
      ctx.font = "10px 'DM Sans', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText("WARNING: PADDLE CLOAKING ACTIVE", this.W / 2, this.H - 80);
    }

    // Draw Balls
    this.balls.forEach(ball => {
      // Trail rendering
      ball.trail.forEach((pos, i) => {
        const alpha = (i / 8) * 0.35;
        const r = 3 + (i / 8) * 4;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Main ball
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, this.ballRadius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Speed spike border indicator (Level 6 / 10)
    if (this.speedSpikeTimer > 0) {
      const pulseWidth = 2.5 + Math.sin(this.totalTime / 100) * 1.5;
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.6)';
      ctx.lineWidth = pulseWidth;
      ctx.strokeRect(0, 0, this.W, this.H);
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

window.GameClass = LoopRally;
export default LoopRally;
