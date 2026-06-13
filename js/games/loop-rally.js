import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class LoopRally extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'loop-rally',
      description: 'Rally with the AI. Don\\'t let the ball past you. 3 lives.',
      width: 500,
      height: 700
    });

    // Elements
    this.scoreEl = document.getElementById('game-score');
    this.livesEl = document.getElementById('game-lives');
    this.spikeEl = document.getElementById('game-spike');

    // Game objects
    this.paddleW = 80;
    this.paddleH = 12;
    this.ballRadius = 6;
    
    this.player = { x: 250 - 40, y: 650, speed: 400 }; // speed in px/s
    this.ai = { x: 250 - 40, y: 38, speed: 200 };
    this.ball = { x: 250, y: 350, vx: 0, vy: 300, baseVy: 300 };
    
    this.ballTrail = [];
    this.lives = 3;
    
    // Input state
    this.keys = { left: false, right: false };
    
    // Spike mechanic
    this.isSpike = false;
    this.spikeTimer = 0;

    // Mouse control
    this.canvas.addEventListener('mousemove', (e) => {
      if (this.state === 'PLAYING') {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        let x = (e.clientX - rect.left) * scaleX;
        this.player.x = x - this.paddleW / 2;
        this.constrainPlayer();
      }
    });

    this.init();
  }

  onStart() {
    this.lives = 3;
    this.resetBall();
    this.player.x = this.canvas.width/2 - this.paddleW/2;
    this.ai.x = this.canvas.width/2 - this.paddleW/2;
    this.keys = { left: false, right: false };
    this.ball.baseVy = 300;
    this.isSpike = false;
    this.spikeTimer = 0;
    
    this.updateUI();
    
    let runs = Storage.get('loop-rally_runs', 0);
    Storage.set('loop-rally_runs', runs + 1);
  }

  resetBall() {
    this.ball.x = this.canvas.width/2;
    this.ball.y = this.canvas.height/2;
    this.ball.vy = this.ball.baseVy * (Math.random() > 0.5 ? 1 : -1);
    this.ball.vx = (Math.random() - 0.5) * 200;
    this.ballTrail = [];
  }

  onInput(key, event) {
    if (key === 'arrowleft' || key === 'a') this.keys.left = true;
    if (key === 'arrowright' || key === 'd') this.keys.right = true;
  }

  onKeyUp(key, event) {
    if (key === 'arrowleft' || key === 'a') this.keys.left = false;
    if (key === 'arrowright' || key === 'd') this.keys.right = false;
  }

  constrainPlayer() {
    if (this.player.x < 0) this.player.x = 0;
    if (this.player.x + this.paddleW > this.canvas.width) this.player.x = this.canvas.width - this.paddleW;
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;

    // Move player
    if (this.keys.left) this.player.x -= this.player.speed * dt;
    if (this.keys.right) this.player.x += this.player.speed * dt;
    this.constrainPlayer();

    // Move AI (scales 0.6 to 1.0 of ball speed based on score)
    const diffFactor = Math.min(1.0, 0.6 + (this.score / 50) * 0.4);
    const targetAiSpeed = Math.abs(this.ball.vy) * diffFactor;
    
    // AI moves towards ball x
    const aiCenter = this.ai.x + this.paddleW/2;
    if (aiCenter < this.ball.x - 10) {
      this.ai.x += targetAiSpeed * dt;
    } else if (aiCenter > this.ball.x + 10) {
      this.ai.x -= targetAiSpeed * dt;
    }
    // Constrain AI
    if (this.ai.x < 0) this.ai.x = 0;
    if (this.ai.x + this.paddleW > this.canvas.width) this.ai.x = this.canvas.width - this.paddleW;

    // Spike logic
    if (this.isSpike) {
      this.spikeTimer -= deltaTime;
      if (this.spikeTimer <= 0) {
        this.isSpike = false;
        this.spikeEl.classList.remove('active');
        // revert speed
        this.ball.vx /= 2;
        this.ball.vy /= 2;
      }
    }

    // Move ball
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Track trail
    this.ballTrail.push({x: this.ball.x, y: this.ball.y});
    if (this.ballTrail.length > 5) this.ballTrail.shift();

    // Wall bounce
    if (this.ball.x - this.ballRadius < 0) {
      this.ball.x = this.ballRadius;
      this.ball.vx *= -1;
      Sound.playBlip();
    } else if (this.ball.x + this.ballRadius > this.canvas.width) {
      this.ball.x = this.canvas.width - this.ballRadius;
      this.ball.vx *= -1;
      Sound.playBlip();
    }

    // Paddle collision
    this.checkPaddleCollision(this.player, true);
    this.checkPaddleCollision(this.ai, false);

    // Scoring / Life lost
    if (this.ball.y > this.canvas.height) {
      this.loseLife();
    } else if (this.ball.y < 0) {
      // AI missed, player scored
      this.scorePoint();
    }
  }

  checkPaddleCollision(paddle, isPlayer) {
    // Basic AABB / Circle check
    if (this.ball.x + this.ballRadius > paddle.x &&
        this.ball.x - this.ballRadius < paddle.x + this.paddleW &&
        this.ball.y + this.ballRadius > paddle.y &&
        this.ball.y - this.ballRadius < paddle.y + this.paddleH) {
          
        Sound.playBlip();

        // Push ball out
        if (isPlayer) {
          this.ball.y = paddle.y - this.ballRadius;
          this.ball.vy = -Math.abs(this.ball.vy);
        } else {
          this.ball.y = paddle.y + this.paddleH + this.ballRadius;
          this.ball.vy = Math.abs(this.ball.vy);
        }

        // Curved shot - change vx based on where it hit the paddle
        const hitPos = (this.ball.x - (paddle.x + this.paddleW/2)) / (this.paddleW/2); // -1 to 1
        const maxBounceAngle = Math.PI / 3; // 60 degrees
        const speed = Math.sqrt(this.ball.vx*this.ball.vx + this.ball.vy*this.ball.vy);
        
        const angle = hitPos * maxBounceAngle;
        
        // Calculate new velocity
        this.ball.vx = speed * Math.sin(angle);
        this.ball.vy = speed * Math.cos(angle) * (isPlayer ? -1 : 1);
    }
  }

  scorePoint() {
    Sound.playCoin();
    this.score++;
    
    // Speed increase every 5 rallies
    if (this.score % 5 === 0) {
      this.ball.baseVy *= 1.05;
    }
    
    // Speed spike every 10 points
    if (this.score % 10 === 0) {
      this.triggerSpike();
    } else {
      this.resetBall();
      this.ball.vy = this.ball.baseVy; // towards player
    }
    
    this.updateUI();
  }

  triggerSpike() {
    this.isSpike = true;
    this.spikeTimer = 2000;
    this.spikeEl.classList.add('active');
    
    this.resetBall();
    this.ball.vy = this.ball.baseVy * 2; // 2x speed for spike
    this.ball.vx *= 2;
  }

  loseLife() {
    Sound.playDamage();
    this.lives--;
    this.updateUI();
    
    // Screen shake
    this.canvas.classList.add('shake');
    setTimeout(() => this.canvas.classList.remove('shake'), 200);

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.resetBall();
      this.ball.vy = -this.ball.baseVy; // towards AI
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
    if (this.livesEl) {
      this.livesEl.innerText = '♥'.repeat(this.lives);
    }
  }

  draw() {
    // Clear
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Center line
    this.ctx.setLineDash([10, 15]);
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.canvas.height/2);
    this.ctx.lineTo(this.canvas.width, this.canvas.height/2);
    this.ctx.strokeStyle = '#2a2a3a';
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Paddles
    this.ctx.fillStyle = '#f0f0f8'; // Player
    this.ctx.beginPath();
    this.ctx.roundRect(this.player.x, this.player.y, this.paddleW, this.paddleH, 6);
    this.ctx.fill();

    this.ctx.fillStyle = '#ff6b6b'; // AI (red)
    this.ctx.beginPath();
    this.ctx.roundRect(this.ai.x, this.ai.y, this.paddleW, this.paddleH, 6);
    this.ctx.fill();

    // Ball Trail
    for (let i = 0; i < this.ballTrail.length; i++) {
      const pos = this.ballTrail[i];
      const alpha = (i + 1) / this.ballTrail.length * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, this.ballRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = \`rgba(108, 99, 255, \${alpha})\`; // Accent 1
      this.ctx.fill();
    }

    // Ball
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ballRadius, 0, Math.PI * 2);
    this.ctx.fillStyle = this.isSpike ? '#ffd93d' : '#6c63ff'; // Yellow if spike, purple otherwise
    this.ctx.fill();
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
