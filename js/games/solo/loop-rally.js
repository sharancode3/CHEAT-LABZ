import { GameBase } from '../../core/game-base.js';

class LoopRally extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.paddleW = 85;
    this.paddleH = 12;
    this.ballRadius = 7;
    
    this.player = { x: 300 - this.paddleW / 2, y: 550, speed: 450 };
    this.ai = { x: 300 - this.paddleW / 2, y: 50 };
    
    // Support multiple balls
    this.balls = [{ x: 300, y: 300, vx: 0, vy: 0, speed: 380, trail: [] }];
    this.obstacles = [];
    this.wallZones = []; // { x, y, w, h }
    this.rallies = 0;
    this.lastPaddleHit = null;

    this.paddleShrinkAmount = 0;
    this.powerBallTimer = 0;

    this.setupLevel();
    this.resetBalls();
  }

  setupLevel() {
    const lvl = this.level;
    // Level 3, 10: Power Balls setup
    // Level 4, 10: Shrinking paddles
    // Level 5, 10: Obstacle in center
    if (lvl === 5 || lvl === 10) {
      this.obstacles.push({ x: 300, y: 300, radius: 25 });
    }
    // Level 6, 10: Two balls
    if (lvl === 6 || lvl === 10) {
      this.balls.push({ x: 300, y: 300, vx: 0, vy: 0, speed: 380, trail: [] });
    }
    // Level 7: Paddle splits - handled in render/collision
    // Level 9, 10: Wall zones
    if (lvl === 9 || lvl === 10) {
      this.wallZones.push({ x: 0, y: 250, w: 20, h: 100, active: true });
      this.wallZones.push({ x: 580, y: 250, w: 20, h: 100, active: true });
    }
  }

  resetBalls() {
    this.balls.forEach((ball, i) => {
      ball.x = 300;
      ball.y = 300 + (i * 20);
      const angle = (Math.random() - 0.5) * (Math.PI / 4);
      const dir = Math.random() > 0.5 ? 1 : -1;
      ball.vx = ball.speed * Math.sin(angle);
      ball.vy = ball.speed * Math.cos(angle) * dir;
      ball.trail = [];
    });
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;

    // Read Input
    const inp = this.input;
    if (inp.isHeldAny(inp.ACTIONS.LEFT)) {
      this.player.x -= this.player.speed * dt;
    }
    if (inp.isHeldAny(inp.ACTIONS.RIGHT)) {
      this.player.x += this.player.speed * dt;
    }

    // Shrinking paddle calculation (Level 4)
    if (this.level === 4 || this.level === 10) {
      const shrinkFactor = Math.floor(this.rallies / 5);
      this.paddleShrinkAmount = Math.min(40, shrinkFactor * 2);
    }
    const currentPaddleW = this.paddleW - this.paddleShrinkAmount;

    // Clamping Player
    this.player.x = this.clamp(this.player.x, 0, 600 - currentPaddleW);

    // Ball Power Speed timer
    if (this.powerBallTimer > 0) {
      this.powerBallTimer -= delta;
    }

    // AI movement logic (target first ball)
    const targetBall = this.balls[0];
    if (targetBall) {
      let aiSpeed = 2 + (this.level * 0.6); // Beatable speeds
      if (this.level === 5) aiSpeed = 7;
      if (this.level >= 9) aiSpeed = 8;
      
      const aiTarget = targetBall.x - currentPaddleW / 2;
      const diff = aiTarget - this.ai.x;
      this.ai.x += this.clamp(diff, -aiSpeed, aiSpeed);
      this.ai.x = this.clamp(this.ai.x, 0, 600 - currentPaddleW);
    }

    // Update Balls
    this.balls.forEach(ball => {
      // Trail
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 5) ball.trail.shift();

      let currentSpeed = ball.speed;
      if (this.powerBallTimer > 0) currentSpeed *= 2;

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Bounce off walls
      if (ball.x - this.ballRadius <= 0) {
        ball.x = this.ballRadius;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x + this.ballRadius >= 600) {
        ball.x = 600 - this.ballRadius;
        ball.vx = -Math.abs(ball.vx);
      }

      // Check Wall Zones (Level 9, 10)
      this.wallZones.forEach(zone => {
        if (this.rectHit({ x: ball.x - this.ballRadius, y: ball.y - this.ballRadius, w: this.ballRadius * 2, h: this.ballRadius * 2 }, zone)) {
          this.score = Math.max(0, this.score - 5);
          ball.vx *= -1;
        }
      });

      // Obstacle collision (Level 5, 10)
      this.obstacles.forEach(obs => {
        const dist = this.distance(ball.x, ball.y, obs.x, obs.y);
        if (dist <= obs.radius + this.ballRadius) {
          // Reflect off normal
          const nx = (ball.x - obs.x) / dist;
          const ny = (ball.y - obs.y) / dist;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * dot * nx;
          ball.vy -= 2 * dot * ny;
        }
      });

      // Player Paddle Collision
      if (ball.vy > 0 && ball.y + this.ballRadius >= this.player.y && ball.y <= this.player.y + this.paddleH) {
        // Check X overlap
        const isHit = this.checkPaddleCollision(ball.x, this.player.x, currentPaddleW);
        if (isHit) {
          this.processPaddleHit(ball, this.player.x, currentPaddleW);
          this.rallies++;
          this.score += 10;
        }
      }

      // AI Paddle Collision
      if (ball.vy < 0 && ball.y - this.ballRadius <= this.ai.y + this.paddleH && ball.y >= this.ai.y) {
        const isHit = this.checkPaddleCollision(ball.x, this.ai.x, currentPaddleW);
        if (isHit) {
          this.processPaddleHit(ball, this.ai.x, currentPaddleW);
          this.rallies++;
        }
      }

      // Out of bounds
      if (ball.y < 0 || ball.y > 600) {
        this.lives--;
        this.resetBalls();
      }
    });

    // Check Goal
    const goal = this.getLevelGoal();
    if (this.rallies >= goal.target) {
      this.levelComplete();
    }
  }

  checkPaddleCollision(ballX, paddleX, paddleW) {
    if (this.level === 7) {
      // Split paddle: left half and right half with gap in middle
      const half = paddleW / 2.5;
      const leftHit = ballX >= paddleX && ballX <= paddleX + half;
      const rightHit = ballX >= paddleX + paddleW - half && ballX <= paddleX + paddleW;
      return leftHit || rightHit;
    }
    return ballX >= paddleX && ballX <= paddleX + paddleW;
  }

  processPaddleHit(ball, paddleX, paddleW) {
    // Relative position normalized to 0.0 - 1.0
    let relativeX = (ball.x - paddleX) / paddleW;
    relativeX = this.clamp(relativeX, 0.0, 1.0);
    
    // Zone 0 to 6
    const zone = Math.floor(relativeX * 7);
    const angleDeg = (zone - 3) * 20; // -60 to 60 deg
    const angleRad = angleDeg * (Math.PI / 180);

    const dir = ball.vy > 0 ? -1 : 1;
    let currentSpeed = ball.speed;
    if (this.powerBallTimer > 0) currentSpeed *= 2;

    ball.vx = currentSpeed * Math.sin(angleRad);
    ball.vy = currentSpeed * Math.cos(angleRad) * dir;

    // Power ball trigger
    if (this.level === 3 && Math.random() < 0.3) {
      this.powerBallTimer = 2000; // 2 seconds double speed
    }

    // Reverse ball trigger
    if (this.level === 8 && Math.random() < 0.2) {
      ball.vx *= -1;
      ball.vy *= -1;
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 600);
    grad.addColorStop(0, '#0a0a0f');
    grad.addColorStop(0.1, '#111118');
    grad.addColorStop(0.9, '#111118');
    grad.addColorStop(1, '#0a0a0f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 600);

    // Dashed center line
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.lineTo(600, 300);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    const currentPaddleW = this.paddleW - this.paddleShrinkAmount;

    // Draw Player
    ctx.fillStyle = '#6c63ff';
    if (this.level === 7) {
      const half = currentPaddleW / 2.5;
      this.drawRoundedRect(this.player.x, this.player.y, half, this.paddleH, 4);
      this.drawRoundedRect(this.player.x + currentPaddleW - half, this.player.y, half, this.paddleH, 4);
    } else {
      this.drawRoundedRect(this.player.x, this.player.y, currentPaddleW, this.paddleH, 4);
    }

    // Draw AI
    ctx.fillStyle = '#ef4444';
    if (this.level === 7) {
      const half = currentPaddleW / 2.5;
      this.drawRoundedRect(this.ai.x, this.ai.y, half, this.paddleH, 4);
      this.drawRoundedRect(this.ai.x + currentPaddleW - half, this.ai.y, half, this.paddleH, 4);
    } else {
      this.drawRoundedRect(this.ai.x, this.ai.y, currentPaddleW, this.paddleH, 4);
    }

    // Draw Obstacles (Level 5, 10)
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.obstacles.forEach(obs => {
      ctx.beginPath();
      ctx.arc(obs.x, obs.y, obs.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw Wall Zones (Level 9, 10)
    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    this.wallZones.forEach(zone => {
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h);
    });

    // Draw Balls with Motion Blur Trail
    this.balls.forEach(ball => {
      ball.trail.forEach((pos, index) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 * (index + 1)})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, this.ballRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Active Ball
      ctx.fillStyle = this.powerBallTimer > 0 ? '#ffd93d' : '#ffffff';
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, this.ballRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  drawRoundedRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Rallies', value: this.rallies },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null, // index 0 unused
      { type: 'rallies', target: 15 },
      { type: 'rallies', target: 20 },
      { type: 'rallies', target: 25 },
      { type: 'rallies', target: 30 },
      { type: 'rallies', target: 35 },
      { type: 'rallies', target: 40 },
      { type: 'rallies', target: 45 },
      { type: 'rallies', target: 50 },
      { type: 'rallies', target: 55 },
      { type: 'rallies', target: 60 }
    ];
    return goals[this.level];
  }
}

window.GameClass = LoopRally;
