import { GameBase } from '../../core/game-base.js';

export class Pong extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    
    this.paddleW = 12;
    this.paddleH = 120;
    
    this.paddle1 = {
      x: 30,
      y: this.H / 2 - this.paddleH / 2,
      v: 0
    };
    
    this.paddle2 = {
      x: this.W - 30 - this.paddleW,
      y: this.H / 2 - this.paddleH / 2,
      v: 0
    };
    
    this.ball = {
      x: this.W / 2,
      y: this.H / 2,
      vx: 0,
      vy: 0,
      r: 8,
      baseSpeed: 350,
      currentSpeed: 350,
      maxSpeed: 1200
    };
    
    this.paddleSpeed = 600;
    
    this.gameState = 'STARTING'; // STARTING, PLAYING, POINT_SCORED, MATCH_OVER
    this.stateTimer = 1.5;
    this.lastScorer = 1; // 1 or 2
    this.matchWinner = null;
  }

  resetBall() {
    this.ball.x = this.W / 2;
    this.ball.y = this.H / 2;
    this.ball.currentSpeed = this.ball.baseSpeed;
    
    // Launch towards last scorer
    const dir = this.lastScorer === 1 ? -1 : 1;
    this.ball.vx = dir * this.ball.currentSpeed;
    
    // Random slight vertical angle
    const angle = (Math.random() - 0.5) * Math.PI / 4; // -22.5 to 22.5 degrees
    this.ball.vy = this.ball.currentSpeed * Math.sin(angle);
    this.ball.vx = dir * this.ball.currentSpeed * Math.cos(angle);
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.gameState === 'STARTING') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.resetBall();
        this.gameState = 'PLAYING';
      }
    } else if (this.gameState === 'POINT_SCORED') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        if (this.scoreP1 >= 7 || this.scoreP2 >= 7) {
          this.gameState = 'MATCH_OVER';
          this.matchWinner = this.scoreP1 >= 7 ? 1 : 2;
          this.stateTimer = 3.0; // Show win screen for 3s
        } else {
          this.resetBall();
          this.gameState = 'PLAYING';
        }
      }
    } else if (this.gameState === 'MATCH_OVER') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        if (this.matchWinner === 1) {
          this.score += 5000;
          this.levelComplete();
        } else {
          this.lives -= 1;
          if (this.lives > 0) {
            this.init(); // Reset match
          }
        }
      }
    } else if (this.gameState === 'PLAYING') {
      this.updatePlaying(delta);
    }
  }

  updatePlaying(delta) {
    // Player 1 Input
    this.paddle1.v = 0;
    if (this.input.keys['W'] || this.input.keys['ArrowUp']) {
      this.paddle1.v = -this.paddleSpeed;
    } else if (this.input.keys['S'] || this.input.keys['ArrowDown']) {
      this.paddle1.v = this.paddleSpeed;
    }
    
    // AI Paddle (Player 2)
    const aiCenter = this.paddle2.y + this.paddleH / 2;
    
    // AI mistake factor based on level (1-10)
    // Level 1: Slow reaction, Level 10: Perfect reaction
    const levelFactor = Math.min(10, this.level) / 10;
    const aiReactionDelay = 1.0 - levelFactor; 
    
    // AI only tracks if ball is moving towards it, or if it's very close
    if (this.ball.vx > 0) {
      if (this.ball.y < aiCenter - 10) {
        this.paddle2.v = -this.paddleSpeed * (0.5 + levelFactor * 0.5);
      } else if (this.ball.y > aiCenter + 10) {
        this.paddle2.v = this.paddleSpeed * (0.5 + levelFactor * 0.5);
      } else {
        this.paddle2.v = 0;
      }
    } else {
      // Return to center slowly
      const center = this.H / 2;
      if (aiCenter < center - 10) this.paddle2.v = this.paddleSpeed * 0.3;
      else if (aiCenter > center + 10) this.paddle2.v = -this.paddleSpeed * 0.3;
      else this.paddle2.v = 0;
    }

    // Update Paddle Positions
    this.paddle1.y += this.paddle1.v * delta;
    this.paddle2.y += this.paddle2.v * delta;

    // Clamp Paddles
    this.paddle1.y = Math.max(0, Math.min(this.H - this.paddleH, this.paddle1.y));
    this.paddle2.y = Math.max(0, Math.min(this.H - this.paddleH, this.paddle2.y));

    // Update Ball
    this.ball.x += this.ball.vx * delta;
    this.ball.y += this.ball.vy * delta;

    // Ball Wall Collisions (Top/Bottom)
    if (this.ball.y - this.ball.r <= 0) {
      this.ball.y = this.ball.r;
      this.ball.vy *= -1;
      this.playBounceSound();
    } else if (this.ball.y + this.ball.r >= this.H) {
      this.ball.y = this.H - this.ball.r;
      this.ball.vy *= -1;
      this.playBounceSound();
    }

    // Ball Paddle 1 Collision
    if (this.ball.vx < 0 && 
        this.ball.x - this.ball.r <= this.paddle1.x + this.paddleW &&
        this.ball.x + this.ball.r >= this.paddle1.x &&
        this.ball.y >= this.paddle1.y &&
        this.ball.y <= this.paddle1.y + this.paddleH) {
      
      this.ball.x = this.paddle1.x + this.paddleW + this.ball.r;
      this.applyPaddleHit(this.paddle1, 1);
    }

    // Ball Paddle 2 Collision
    if (this.ball.vx > 0 && 
        this.ball.x + this.ball.r >= this.paddle2.x &&
        this.ball.x - this.ball.r <= this.paddle2.x + this.paddleW &&
        this.ball.y >= this.paddle2.y &&
        this.ball.y <= this.paddle2.y + this.paddleH) {
      
      this.ball.x = this.paddle2.x - this.ball.r;
      this.applyPaddleHit(this.paddle2, -1);
    }

    // Scoring
    if (this.ball.x + this.ball.r < 0) {
      this.scoreP2++;
      this.lastScorer = 2;
      this.gameState = 'POINT_SCORED';
      this.stateTimer = 1.0;
      this.playScoreSound();
    } else if (this.ball.x - this.ball.r > this.W) {
      this.scoreP1++;
      this.lastScorer = 1;
      this.gameState = 'POINT_SCORED';
      this.stateTimer = 1.0;
      this.playScoreSound();
      this.score += 150;
    }
  }

  applyPaddleHit(paddle, xDir) {
    // Relative Intersect Y [-1.0, 1.0]
    const relativeIntersectY = (this.ball.y - (paddle.y + this.paddleH / 2)) / (this.paddleH / 2);
    
    // Max bounce angle 60 degrees
    const bounceAngle = relativeIntersectY * (Math.PI / 3);
    
    // Increase speed by 5%
    this.ball.currentSpeed = Math.min(this.ball.maxSpeed, this.ball.currentSpeed * 1.05);
    
    this.ball.vx = xDir * this.ball.currentSpeed * Math.cos(bounceAngle);
    this.ball.vy = this.ball.currentSpeed * Math.sin(bounceAngle);
    
    this.playBounceSound();
    
    // Add particle effect or screen shake here if desired
    this.score += 10; // 10 points per successful return
  }

  playBounceSound() {
    if (window.Sound) {
      window.Sound.playTone(400 + Math.random() * 100, 'square', 0.05);
    }
  }

  playScoreSound() {
    if (window.Sound) {
      window.Sound.playTone(150, 'sawtooth', 0.3);
    }
  }

  render(ctx) {
    this.clear();
    
    // Draw Center Line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(this.W / 2, 0);
    ctx.lineTo(this.W / 2, this.H);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw Scores
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '64px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(this.scoreP1, this.W / 4, 100);
    ctx.fillText(this.scoreP2, (this.W / 4) * 3, 100);
    
    // Draw Paddles
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 15;
    
    ctx.fillRect(this.paddle1.x, this.paddle1.y, this.paddleW, this.paddleH);
    
    ctx.fillStyle = '#f43f5e';
    ctx.shadowColor = '#f43f5e';
    ctx.fillRect(this.paddle2.x, this.paddle2.y, this.paddleW, this.paddleH);
    
    // Draw Ball
    if (this.gameState === 'PLAYING' || this.gameState === 'STARTING') {
      ctx.fillStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Draw Overlays
    ctx.shadowBlur = 0;
    if (this.gameState === 'STARTING') {
      ctx.fillStyle = '#fff';
      ctx.font = '30px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText("GET READY", this.W / 2, this.H / 2 + 50);
    } else if (this.gameState === 'MATCH_OVER') {
      ctx.fillStyle = this.matchWinner === 1 ? '#38bdf8' : '#f43f5e';
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 20;
      ctx.fillText(this.matchWinner === 1 ? "YOU WIN" : "AI WINS", this.W / 2, this.H / 2);
    }
  }
}
