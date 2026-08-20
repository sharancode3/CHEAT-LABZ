import { GameBase } from '../../core/game-base.js';

export class MultiplayerPong extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.paddleW = 20;
    this.paddleH = 120;
    this.paddleSpeed = 400;
    
    this.p1 = { x: 40, y: this.H / 2 - this.paddleH / 2, vY: 0, score: 0 };
    this.p2 = { x: this.W - 60, y: this.H / 2 - this.paddleH / 2, vY: 0, score: 0 };
    
    this.ball = { x: this.W / 2, y: this.H / 2, r: 10, vX: 0, vY: 0, speed: 400 };
    
    this.state = 'SERVE';
    this.serveDelay = 2.0;
    this.server = 1;
  }

  serve() {
    this.ball.x = this.W / 2;
    this.ball.y = this.H / 2;
    
    const angle = (Math.random() * Math.PI / 4) - (Math.PI / 8); // Slight vertical angle
    
    // Serve towards whoever got scored on
    const dir = this.server === 1 ? -1 : 1;
    
    this.ball.speed = 400;
    this.ball.vX = Math.cos(angle) * this.ball.speed * dir;
    this.ball.vY = Math.sin(angle) * this.ball.speed;
    
    this.state = 'PLAYING';
    if (window.Sound) window.Sound.playTone(800, 'sine', 0.1);
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.state === 'SERVE') {
      this.serveDelay -= delta;
      if (this.serveDelay <= 0) {
        this.serve();
      }
      return;
    }
    
    // --- Input & Physics ---
    
    // P1 (W/S)
    this.p1.vY = 0;
    if (this.input.keys['KeyW']) this.p1.vY = -this.paddleSpeed;
    if (this.input.keys['KeyS']) this.p1.vY = this.paddleSpeed;
    
    // P2 (Up/Down)
    this.p2.vY = 0;
    if (this.input.keys['ArrowUp']) this.p2.vY = -this.paddleSpeed;
    if (this.input.keys['ArrowDown']) this.p2.vY = this.paddleSpeed;
    
    // Move paddles
    this.p1.y = Math.max(0, Math.min(this.H - this.paddleH, this.p1.y + this.p1.vY * delta));
    this.p2.y = Math.max(0, Math.min(this.H - this.paddleH, this.p2.y + this.p2.vY * delta));
    
    // Move Ball
    this.ball.x += this.ball.vX * delta;
    this.ball.y += this.ball.vY * delta;
    
    // Wall bounce (Top / Bottom)
    if (this.ball.y - this.ball.r < 0) {
      this.ball.y = this.ball.r;
      this.ball.vY *= -1;
      if (window.Sound) window.Sound.playTone(300, 'square', 0.05);
    } else if (this.ball.y + this.ball.r > this.H) {
      this.ball.y = this.H - this.ball.r;
      this.ball.vY *= -1;
      if (window.Sound) window.Sound.playTone(300, 'square', 0.05);
    }
    
    // Paddle Collisions
    const checkPaddle = (p, isLeft) => {
      // Basic AABB / Circle overlap
      if (this.ball.x + this.ball.r > p.x && 
          this.ball.x - this.ball.r < p.x + this.paddleW &&
          this.ball.y + this.ball.r > p.y &&
          this.ball.y - this.ball.r < p.y + this.paddleH) {
        
        // Prevent getting stuck inside
        if (isLeft) this.ball.x = p.x + this.paddleW + this.ball.r;
        else this.ball.x = p.x - this.ball.r;
        
        // Base bounce
        this.ball.vX *= -1;
        
        // Hyper-Rally Mechanic: Smash velocity if moving
        // vy += V_paddle * 0.35
        this.ball.vY += p.vY * 0.35;
        
        // Accelerate
        const currentSpeed = Math.sqrt(this.ball.vX*this.ball.vX + this.ball.vY*this.ball.vY);
        const newSpeed = currentSpeed * 1.05; // 5% increase
        const normalize = newSpeed / currentSpeed;
        
        this.ball.vX *= normalize;
        this.ball.vY *= normalize;
        
        if (window.Sound) window.Sound.playTone(600, 'sine', 0.1);
      }
    };
    
    if (this.ball.vX < 0) checkPaddle(this.p1, true);
    else checkPaddle(this.p2, false);
    
    // Scoring
    if (this.ball.x < 0) {
      this.handleScore(2);
    } else if (this.ball.x > this.W) {
      this.handleScore(1);
    }
  }

  handleScore(player) {
    if (player === 1) {
      this.p1.score++;
      this.server = 2; // Loser serves
    } else {
      this.p2.score++;
      this.server = 1;
    }
    
    if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.3);
    
    this.checkWin();
    
    if (!this.isOver) {
      this.state = 'SERVE';
      this.serveDelay = 1.0;
    }
  }

  checkWin() {
    let winner = 0;
    if (this.p1.score >= 10) winner = 1;
    if (this.p2.score >= 10) winner = 2;
    
    // Mercy Rule: Lead >= 5 points at score >= 7
    if (this.p1.score >= 7 && this.p1.score - this.p2.score >= 5) winner = 1;
    if (this.p2.score >= 7 && this.p2.score - this.p1.score >= 5) winner = 2;
    
    if (winner !== 0) {
      this.isOver = true;
      this.winner = winner;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
      setTimeout(() => this.levelComplete(), 3000);
    }
  }

  render(ctx) {
    this.clear();
    
    // Center dashed line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(this.W / 2, 0);
    ctx.lineTo(this.W / 2, this.H);
    ctx.stroke();
    ctx.setLineDash([]); // Reset
    
    // Scores
    ctx.fillStyle = '#38bdf8';
    ctx.font = '80px "Press Start 2P"';
    ctx.textAlign = 'right';
    ctx.fillText(this.p1.score, this.W / 2 - 40, 100);
    
    ctx.fillStyle = '#fb7185';
    ctx.textAlign = 'left';
    ctx.fillText(this.p2.score, this.W / 2 + 40, 100);
    
    // Paddles
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(this.p1.x, this.p1.y, this.paddleW, this.paddleH);
    
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(this.p2.x, this.p2.y, this.paddleW, this.paddleH);
    
    // Ball
    if (this.state === 'PLAYING') {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
      ctx.fill();
      
      // Speed trail effect based on velocity
      const speed = Math.sqrt(this.ball.vX*this.ball.vX + this.ball.vY*this.ball.vY);
      if (speed > 800) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.arc(this.ball.x - this.ball.vX * 0.02, this.ball.y - this.ball.vY * 0.02, this.ball.r * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    if (this.isOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '50px "Press Start 2P"';
      ctx.textAlign = 'center';
      if (this.winner === 1) {
        ctx.fillText("P1 WINS MATCH!", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("P2 WINS MATCH!", this.W / 2, this.H / 2);
      }
    }
  }
}
