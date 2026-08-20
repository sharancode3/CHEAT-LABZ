import { GameBase } from '../../core/game-base.js';

export class MultiplayerAirHockey extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    
    // Physics constants
    this.friction = 0.99;
    
    // P1 (Top)
    this.p1 = {
      x: this.W / 2, y: 150,
      vX: 0, vY: 0,
      r: 40, mass: 10,
      color: '#38bdf8'
    };
    
    // P2 (Bottom)
    this.p2 = {
      x: this.W / 2, y: this.H - 150,
      vX: 0, vY: 0,
      r: 40, mass: 10,
      color: '#fb7185'
    };
    
    // Puck
    this.puck = {
      x: this.W / 2, y: this.H / 2,
      vX: 0, vY: 0,
      r: 25, mass: 5,
      color: '#eab308'
    };
    
    // Rink bounds
    this.rink = {
      x: 50, y: 50,
      w: 700, h: 700
    };
    
    // Goals (x is center, w is width)
    this.goalW = 200;
    this.goalX = this.rink.x + (this.rink.w - this.goalW) / 2;
    
    this.state = 'PLAYING'; // PLAYING, SERVE_DELAY
    this.serveDelay = 0;
    
    this.setupInput();
  }

  setupInput() {
    // Air Hockey is continuous movement, so we just check keys in update
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.state === 'SERVE_DELAY') {
      this.serveDelay -= delta;
      if (this.serveDelay <= 0) {
        this.resetPositions();
      }
      return;
    }
    
    // Apply Input Forces
    const speed = 2000;
    
    // P1 WASD
    if (this.input.keys['a'] || this.input.keys['A']) this.p1.vX -= speed * delta;
    if (this.input.keys['d'] || this.input.keys['D']) this.p1.vX += speed * delta;
    if (this.input.keys['w'] || this.input.keys['W']) this.p1.vY -= speed * delta;
    if (this.input.keys['s'] || this.input.keys['S']) this.p1.vY += speed * delta;
    
    // P2 Arrows
    if (this.input.keys['ArrowLeft']) this.p2.vX -= speed * delta;
    if (this.input.keys['ArrowRight']) this.p2.vX += speed * delta;
    if (this.input.keys['ArrowUp']) this.p2.vY -= speed * delta;
    if (this.input.keys['ArrowDown']) this.p2.vY += speed * delta;
    
    // Update Positions
    this.p1.x += this.p1.vX * delta;
    this.p1.y += this.p1.vY * delta;
    
    this.p2.x += this.p2.vX * delta;
    this.p2.y += this.p2.vY * delta;
    
    this.puck.x += this.puck.vX * delta;
    this.puck.y += this.puck.vY * delta;
    
    // Friction
    this.p1.vX *= 0.90; // High friction for paddles to stop fast
    this.p1.vY *= 0.90;
    this.p2.vX *= 0.90;
    this.p2.vY *= 0.90;
    this.puck.vX *= this.friction; // Low friction for puck
    this.puck.vY *= this.friction;
    
    // Constrain Paddles to their halves
    this.constrainPaddle(this.p1, this.rink.y, this.rink.y + this.rink.h / 2 - this.p1.r);
    this.constrainPaddle(this.p2, this.rink.y + this.rink.h / 2 + this.p2.r, this.rink.y + this.rink.h);
    
    // Puck Wall Collisions
    let bounced = false;
    if (this.puck.x - this.puck.r < this.rink.x) {
      this.puck.x = this.rink.x + this.puck.r; this.puck.vX *= -1; bounced = true;
    }
    if (this.puck.x + this.puck.r > this.rink.x + this.rink.w) {
      this.puck.x = this.rink.x + this.rink.w - this.puck.r; this.puck.vX *= -1; bounced = true;
    }
    
    // Top Wall & Goal
    if (this.puck.y - this.puck.r < this.rink.y) {
      if (this.puck.x > this.goalX && this.puck.x < this.goalX + this.goalW) {
        this.handleScore(2); // P2 scores in Top Goal
        return;
      } else {
        this.puck.y = this.rink.y + this.puck.r; this.puck.vY *= -1; bounced = true;
      }
    }
    
    // Bottom Wall & Goal
    if (this.puck.y + this.puck.r > this.rink.y + this.rink.h) {
      if (this.puck.x > this.goalX && this.puck.x < this.goalX + this.goalW) {
        this.handleScore(1); // P1 scores in Bottom Goal
        return;
      } else {
        this.puck.y = this.rink.y + this.rink.h - this.puck.r; this.puck.vY *= -1; bounced = true;
      }
    }
    
    if (bounced && window.Sound) window.Sound.playTone(300, 'square', 0.05);
    
    // Paddle-Puck Collisions (Elastic)
    this.resolveCollision(this.p1, this.puck);
    this.resolveCollision(this.p2, this.puck);
  }

  constrainPaddle(p, minY, maxY) {
    if (p.x - p.r < this.rink.x) { p.x = this.rink.x + p.r; p.vX = 0; }
    if (p.x + p.r > this.rink.x + this.rink.w) { p.x = this.rink.x + this.rink.w - p.r; p.vX = 0; }
    
    if (p.y - p.r < minY) { p.y = minY + p.r; p.vY = 0; }
    if (p.y + p.r > maxY) { p.y = maxY - p.r; p.vY = 0; }
  }

  resolveCollision(p, b) {
    // Distance
    const dx = b.x - p.x;
    const dy = b.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < p.r + b.r) {
      // Normal vector
      const nx = dx / dist;
      const ny = dy / dist;
      
      // Relative velocity
      const dvx = b.vX - p.vX;
      const dvy = b.vY - p.vY;
      
      // Velocity along normal
      const relVelAlongNormal = dvx * nx + dvy * ny;
      
      // Don't resolve if separating
      if (relVelAlongNormal > 0) return;
      
      // Restitution (bounciness)
      const e = 0.8;
      
      // Impulse scalar
      let j = -(1 + e) * relVelAlongNormal;
      j /= (1 / p.mass + 1 / b.mass);
      
      // Apply impulse
      const ix = j * nx;
      const iy = j * ny;
      
      // We only apply impulse to the puck to feel more arcade-like
      // Real physics would apply -ix/mass to paddle, but it feels better if paddles are "immovable"
      b.vX += ix / b.mass;
      b.vY += iy / b.mass;
      
      // Prevent sticking
      const overlap = (p.r + b.r - dist);
      b.x += nx * overlap;
      b.y += ny * overlap;
      
      if (window.Sound) window.Sound.playTone(600, 'sine', 0.1);
    }
  }

  handleScore(player) {
    this.state = 'SERVE_DELAY';
    this.serveDelay = 2.0;
    
    if (player === 1) {
      this.scoreP1++;
      if (window.Sound) window.Sound.playTone(800, 'sawtooth', 0.5);
    } else {
      this.scoreP2++;
      if (window.Sound) window.Sound.playTone(800, 'sawtooth', 0.5);
    }
    
    if (this.scoreP1 >= 7 || this.scoreP2 >= 7) {
      this.isOver = true;
      setTimeout(() => this.levelComplete(), 3000);
    }
  }

  resetPositions() {
    this.p1.x = this.W / 2;
    this.p1.y = 150;
    this.p1.vX = 0; this.p1.vY = 0;
    
    this.p2.x = this.W / 2;
    this.p2.y = this.H - 150;
    this.p2.vX = 0; this.p2.vY = 0;
    
    this.puck.x = this.W / 2;
    this.puck.y = this.H / 2;
    this.puck.vX = 0; this.puck.vY = 0;
    
    this.state = 'PLAYING';
  }

  render(ctx) {
    this.clear();
    
    // Draw Rink Back
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(this.rink.x, this.rink.y, this.rink.w, this.rink.h);
    
    // Draw Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 4;
    // Center line
    ctx.beginPath();
    ctx.moveTo(this.rink.x, this.rink.y + this.rink.h / 2);
    ctx.lineTo(this.rink.x + this.rink.w, this.rink.y + this.rink.h / 2);
    ctx.stroke();
    // Center circle
    ctx.beginPath();
    ctx.arc(this.W / 2, this.H / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw Goals
    ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
    ctx.fillRect(this.goalX, this.rink.y, this.goalW, 30); // P1 Goal Area
    
    ctx.fillStyle = 'rgba(251, 113, 133, 0.2)';
    ctx.fillRect(this.goalX, this.rink.y + this.rink.h - 30, this.goalW, 30); // P2 Goal Area
    
    // Rink Border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10;
    ctx.strokeRect(this.rink.x, this.rink.y, this.rink.w, this.rink.h);
    
    // Highlight Goals on Border
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath(); ctx.moveTo(this.goalX, this.rink.y); ctx.lineTo(this.goalX + this.goalW, this.rink.y); ctx.stroke();
    
    ctx.strokeStyle = '#fb7185';
    ctx.beginPath(); ctx.moveTo(this.goalX, this.rink.y + this.rink.h); ctx.lineTo(this.goalX + this.goalW, this.rink.y + this.rink.h); ctx.stroke();
    
    // Scores
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '80px "Press Start 2P"';
    ctx.textAlign = 'center';
    
    // P1 Score (Draw upside down for true tabletop feel? Nah keep it readable)
    ctx.fillText(this.scoreP1, this.W / 2, this.rink.y + 120);
    ctx.fillText(this.scoreP2, this.W / 2, this.rink.y + this.rink.h - 80);
    
    // Objects
    if (this.state === 'PLAYING') {
      // Puck
      ctx.fillStyle = this.puck.color;
      ctx.beginPath();
      ctx.arc(this.puck.x, this.puck.y, this.puck.r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Paddles
    ctx.fillStyle = this.p1.color;
    ctx.beginPath();
    ctx.arc(this.p1.x, this.p1.y, this.p1.r, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.p1.x, this.p1.y, this.p1.r / 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = this.p2.color;
    ctx.beginPath();
    ctx.arc(this.p2.x, this.p2.y, this.p2.r, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.p2.x, this.p2.y, this.p2.r / 2, 0, Math.PI * 2);
    ctx.fill();
    
    if (this.state === 'SERVE_DELAY' && !this.isOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = '#fff';
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText("GOAL!", this.W / 2, this.H / 2);
    }
    
    if (this.isOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '50px "Press Start 2P"';
      ctx.textAlign = 'center';
      if (this.scoreP1 > this.scoreP2) {
        ctx.fillText("P1 WINS MATCH!", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("P2 WINS MATCH!", this.W / 2, this.H / 2);
      }
    }
  }
}
