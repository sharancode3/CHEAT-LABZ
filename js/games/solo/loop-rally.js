import { GameBase } from '../../core/game-base.js';
import { Storage } from '../../core/storage.js';

export default class LoopRally extends GameBase {
  static get logicalWidth() { return 500; }
  static get logicalHeight() { return 700; }
  
  constructor(canvas, container) {
    super(canvas, container);

    // Paddle sizes
    this.paddleW = 85;
    this.paddleH = 12;
    this.ballRadius = 7;
    
    // Game entities
    this.player = { x: 0, y: 650, speed: 450 };
    this.ai = { x: 0, y: 38, speed: 220 };
    this.ball = { x: 0, y: 0, vx: 0, vy: 0, speed: 380, baseVy: 320 };
    this.ballTrail = [];
    
    // State
    this.keys = { left: false, right: false };
    this.aiSpeedFactor = 0.05; // ease target multiplier
    
    // Spike & glow timers
    this.isSpike = false;
    this.spikeTimer = 0;
    this.spikeWarningTimer = 0;
    this.timePlayed = 0;

    // Juice timers
    this.wallHitFlashLeft = 0;
    this.wallHitFlashRight = 0;
    this.scorePulseTimer = 0;
    this.scorePulseSide = ''; // 'player' or 'ai'
    this.redFlashTimer = 0;
  }

  init() {
    this.score = 0;
    this.lives = 3;
    this.timePlayed = 0;

    this.player.x = this.width / 2 - this.paddleW / 2;
    this.ai.x = this.width / 2 - this.paddleW / 2;
    this.aiSpeedFactor = 0.05;
    
    this.ball.speed = 380;
    this.ball.baseVy = 320;
    this.isSpike = false;
    this.spikeTimer = 0;
    this.spikeWarningTimer = 0;

    this.wallHitFlashLeft = 0;
    this.wallHitFlashRight = 0;
    this.scorePulseTimer = 0;
    this.scorePulseSide = '';
    this.redFlashTimer = 0;

    this.resetBall();

    let runs = Storage.get('loop-rally_runs', 0);
    Storage.set('loop-rally_runs', runs + 1);
  }

  resetBall() {
    this.ball.x = this.width / 2;
    this.ball.y = this.height / 2;
    
    const angle = (Math.random() - 0.5) * (Math.PI / 4); // Random angle within 45 deg
    const dir = Math.random() > 0.5 ? 1 : -1;
    this.ball.vx = this.ball.speed * Math.sin(angle);
    this.ball.vy = this.ball.speed * Math.cos(angle) * dir;
    this.ballTrail = [];
  }

  onInput(key, event) {
    const k = key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') this.keys.left = true;
    if (k === 'arrowright' || k === 'd') this.keys.right = true;
  }

  onKeyUp(key, event) {
    const k = key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') this.keys.left = false;
    if (k === 'arrowright' || k === 'd') this.keys.right = false;
  }

  constrainPlayer() {
    if (this.player.x < 0) this.player.x = 0;
    if (this.player.x + this.paddleW > this.width) this.player.x = this.width - this.paddleW;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;
    this.timePlayed += deltaTime;

    // Handle juice timers
    if (this.wallHitFlashLeft > 0) this.wallHitFlashLeft -= deltaTime;
    if (this.wallHitFlashRight > 0) this.wallHitFlashRight -= deltaTime;
    if (this.scorePulseTimer > 0) this.scorePulseTimer -= deltaTime;
    if (this.redFlashTimer > 0) this.redFlashTimer -= deltaTime;

    // Spike warning scheduler
    if (this.spikeWarningTimer > 0) {
      this.spikeWarningTimer -= deltaTime;
      if (this.spikeWarningTimer <= 0) {
        this.triggerSpike();
      }
      return; // Freeze game actions during visual warning flash
    }

    // Move player paddle
    if (this.keys.left) this.player.x -= this.player.speed * dt;
    if (this.keys.right) this.player.x += this.player.speed * dt;
    this.constrainPlayer();

    // Mouse steering tracking
    const m = this.container.input.getMousePosition();
    if (m && m.x > 0) {
      this.player.x = m.x - this.paddleW / 2;
      this.constrainPlayer();
    }

    // AI paddle ease tracking: Target is ball horizontal center
    const targetX = this.ball.x - this.paddleW / 2;
    this.ai.x += (targetX - this.ai.x) * this.aiSpeedFactor;
    
    // AI boundary constraints
    if (this.ai.x < 0) this.ai.x = 0;
    if (this.ai.x + this.paddleW > this.width) this.ai.x = this.width - this.paddleW;

    // Active speed spikes
    if (this.isSpike) {
      this.spikeTimer -= deltaTime;
      if (this.spikeTimer <= 0) {
        this.isSpike = false;
        // Revert ball speed back to base
        this.ball.speed = 380 + this.score * 5;
        const speedRatio = this.ball.speed / Math.hypot(this.ball.vx, this.ball.vy);
        this.ball.vx *= speedRatio;
        this.ball.vy *= speedRatio;
      }
    }

    // Move ball
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Track trail segments
    this.ballTrail.push({ x: this.ball.x, y: this.ball.y });
    if (this.ballTrail.length > 6) this.ballTrail.shift();

    // Side walls bounce
    if (this.ball.x - this.ballRadius < 0) {
      this.ball.x = this.ballRadius;
      this.ball.vx = Math.abs(this.ball.vx);
      this.wallHitFlashLeft = 150;
      this.container.audio.play('blip');
    } else if (this.ball.x + this.ballRadius > this.width) {
      this.ball.x = this.width - this.ballRadius;
      this.ball.vx = -Math.abs(this.ball.vx);
      this.wallHitFlashRight = 150;
      this.container.audio.play('blip');
    }

    // Paddle collision steps
    this.checkPaddleCollision(this.player, true);
    this.checkPaddleCollision(this.ai, false);

    // Scoring conditions
    if (this.ball.y > this.height) {
      this.loseLife();
    } else if (this.ball.y < 0) {
      this.scorePoint();
    }
  }

  checkPaddleCollision(paddle, isPlayer) {
    if (this.ball.x + this.ballRadius > paddle.x &&
        this.ball.x - this.ballRadius < paddle.x + this.paddleW &&
        this.ball.y + this.ballRadius > paddle.y &&
        this.ball.y - this.ballRadius < paddle.y + this.paddleH) {
      
      this.container.audio.play('blip');
      this.container.shake(80, 2.5);

      // Lock position outside paddle boundaries
      if (isPlayer) {
        this.ball.y = paddle.y - this.ballRadius;
      } else {
        this.ball.y = paddle.y + this.paddleH + this.ballRadius;
      }

      // Zone Reflection Angle System (7 distinct segments)
      const relativeX = Math.max(0, Math.min(1.0, (this.ball.x - paddle.x) / this.paddleW));
      const zone = Math.floor(relativeX * 7);
      
      // Map zones to reflection angles in radians
      const angleMap = [
        -Math.PI / 3, // Zone 0: -60 deg
        -Math.PI / 4.5, // Zone 1: -40 deg
        -Math.PI / 9, // Zone 2: -20 deg
        0,            // Zone 3: 0 deg straight back
        Math.PI / 9,  // Zone 4: +20 deg
        Math.PI / 4.5, // Zone 5: +40 deg
        Math.PI / 3   // Zone 6: +60 deg
      ];

      const reflectionAngle = angleMap[zone] || 0;
      const speed = this.ball.speed;

      this.ball.vx = speed * Math.sin(reflectionAngle);
      this.ball.vy = speed * Math.cos(reflectionAngle) * (isPlayer ? -1 : 1);

      // Stuck safeguard (Enforce min vertical speed of 30% total magnitude)
      const minVy = speed * 0.3;
      if (Math.abs(this.ball.vy) < minVy) {
        this.ball.vy = minVy * Math.sign(this.ball.vy);
        // Normalize vx to preserve overall velocity magnitude
        this.ball.vx = Math.sqrt(speed * speed - this.ball.vy * this.ball.vy) * Math.sign(this.ball.vx);
      }
    }
  }

  scorePoint() {
    this.container.audio.play('coin');
    this.score++;

    this.scorePulseTimer = 300;
    this.scorePulseSide = 'player';

    // Ease AI tracking speed factor (capped at 0.15)
    if (this.score % 5 === 0) {
      this.aiSpeedFactor = Math.min(0.15, this.aiSpeedFactor + 0.005);
      this.ball.speed += 15;
    }

    // Schedule 2x speed spikes every 10 points
    if (this.score % 10 === 0) {
      this.spikeWarningTimer = 500; // trigger visual glow phase
    } else {
      this.resetBall();
    }
  }

  triggerSpike() {
    this.isSpike = true;
    this.spikeTimer = 2200;
    this.resetBall();
    // Double speeds
    this.ball.vx *= 1.8;
    this.ball.vy *= 1.8;
  }

  loseLife() {
    this.container.audio.play('damage');
    this.lives--;
    this.redFlashTimer = 100;

    this.scorePulseTimer = 300;
    this.scorePulseSide = 'ai';

    this.container.shake(200, 4);

    if (this.lives <= 0) {
      this.finishGame();
    } else {
      this.resetBall();
    }
  }

  finishGame() {
    const timePlayed = this.timePlayed || 0;
    const baseScore = this.score * 500;
    const timeBonus = Math.floor(timePlayed / 1000) * 10;
    const maxSpeedBonus = Math.floor(this.ball.speed) * 2;
    const totalScore = baseScore + timeBonus + maxSpeedBonus;
    
    const coinsEarned = Math.floor(totalScore / 100);

    this.scoreBreakdown = {
      rows: [
        { label: 'Rallies Won', value: this.score, points: baseScore },
        { label: 'Survival Time', value: `${Math.floor(timePlayed / 1000)}s`, points: timeBonus },
        { label: 'Top Ball Speed', value: `${Math.floor(this.ball.speed)} px/s`, points: maxSpeedBonus }
      ],
      total: totalScore,
      coinsEarned: coinsEarned
    };

    this.score = totalScore;

    if (window.awardCoins && coinsEarned > 0) {
      window.awardCoins(coinsEarned, 'Loop Rally Match');
    }

    this.gameOver();
  }

  render(ctx) {
    // 1. Clear background
    ctx.fillStyle = '#060608';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Score field pulse
    if (this.scorePulseTimer > 0) {
      const alpha = this.scorePulseTimer / 300;
      ctx.fillStyle = this.scorePulseSide === 'player' 
        ? `rgba(108, 99, 255, ${alpha * 0.12})` 
        : `rgba(255, 107, 107, ${alpha * 0.12})`;
      if (this.scorePulseSide === 'player') {
        ctx.fillRect(0, this.height / 2, this.width, this.height / 2);
      } else {
        ctx.fillRect(0, 0, this.width, this.height / 2);
      }
    }

    // 3. Center line dividing field
    ctx.setLineDash([8, 12]);
    ctx.beginPath();
    ctx.moveTo(0, this.height / 2);
    ctx.lineTo(this.width, this.height / 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Draw wall hit flashes
    if (this.wallHitFlashLeft > 0) {
      const alpha = this.wallHitFlashLeft / 150;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.45})`;
      ctx.fillRect(0, 0, 5, this.height);
    }
    if (this.wallHitFlashRight > 0) {
      const alpha = this.wallHitFlashRight / 150;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.45})`;
      ctx.fillRect(this.width - 5, 0, 5, this.height);
    }

    // 5. Draw Paddles
    ctx.fillStyle = '#ffffff'; // Player (white)
    ctx.beginPath();
    ctx.roundRect(this.player.x, this.player.y, this.paddleW, this.paddleH, 5);
    ctx.fill();

    ctx.fillStyle = '#ff6b6b'; // AI (red)
    ctx.beginPath();
    ctx.roundRect(this.ai.x, this.ai.y, this.paddleW, this.paddleH, 5);
    ctx.fill();

    // 6. Draw Ball Trails
    for (let i = 0; i < this.ballTrail.length; i++) {
      const pos = this.ballTrail[i];
      const alpha = ((i + 1) / this.ballTrail.length) * 0.4;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, this.ballRadius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(108, 99, 255, ${alpha})`;
      ctx.fill();
    }

    // 7. Draw Ball (yellow if spike, pulsing neon blue otherwise)
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = this.isSpike ? '#ffcc00' : '#00f0ff';
    ctx.shadowBlur = this.isSpike ? 15 : 8;
    ctx.shadowColor = this.isSpike ? '#ffcc00' : '#00f0ff';
    ctx.fill();
    ctx.shadowBlur = 0;

    // 8. Draw red damage indicators
    if (this.redFlashTimer > 0) {
      const alpha = this.redFlashTimer / 100;
      ctx.fillStyle = `rgba(255, 59, 48, ${alpha * 0.3})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // 9. Speed warning screen glow overlay
    if (this.spikeWarningTimer > 0) {
      const alpha = Math.sin(performance.now() / 50) * 0.5 + 0.5;
      ctx.strokeStyle = `rgba(249, 115, 22, ${alpha})`;
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, this.width, this.height);

      ctx.fillStyle = '#f97316';
      ctx.font = "bold 14px 'Press Start 2P', monospace";
      ctx.textAlign = 'center';
      ctx.fillText("SPIKE COMING!", this.width / 2, this.height / 2 - 30);
    }
  }

  getControls() {
    return [
      { key: '← A / → D', action: 'Move Paddle Left/Right' },
      { key: 'MOUSE', action: 'Steer Paddle' }
    ];
  }

  getFunStat() {
    return `Rallies: ${this.score} | Target AI tracking multiplier: ${this.aiSpeedFactor.toFixed(3)}`;
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
