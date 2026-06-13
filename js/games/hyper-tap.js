import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

class HyperTap extends GameShell {
  constructor() {
    super('game-canvas', {
      name: 'hyper-tap',
      description: 'Click the target before it disappears. Missing costs a life.',
      width: 500,
      height: 500
    });

    this.scoreEl = document.getElementById('game-score');
    this.livesEl = document.getElementById('game-lives');

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseClick(e));

    this.init();
  }

  onStart() {
    this.lives = 3;
    this.target = null;
    this.shockwaves = [];
    
    this.level = 1;
    this.baseRadius = 40;
    this.minRadius = 15;
    
    this.spawnTarget();
    this.updateUI();
    
    let runs = Storage.get('hyper-tap_runs', 0);
    Storage.set('hyper-tap_runs', runs + 1);
  }

  spawnTarget() {
    let r = Math.max(this.minRadius, this.baseRadius - this.level);
    
    this.target = {
      x: r + Math.random() * (this.canvas.width - r*2),
      y: r + Math.random() * (this.canvas.height - r*2),
      r: r,
      vx: (Math.random() - 0.5) * (50 + this.level * 10),
      vy: (Math.random() - 0.5) * (50 + this.level * 10),
      life: 2000 - Math.min(1200, this.level * 50), // gets faster
      maxLife: 2000 - Math.min(1200, this.level * 50)
    };
  }

  handleMouseClick(e) {
    if (this.state !== 'PLAYING' || !this.target) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check distance
    const dx = x - this.target.x;
    const dy = y - this.target.y;
    
    if (dx*dx + dy*dy <= this.target.r * this.target.r) {
      // Hit
      Sound.playCoin();
      this.score += 10;
      this.level++;
      
      this.createShockwave(this.target.x, this.target.y, this.target.r);
      this.spawnTarget();
      this.updateUI();
    } else {
      // Miss click
      this.loseLife();
      this.createShockwave(x, y, 10, '#ff6b6b');
    }
  }

  loseLife() {
    Sound.playDamage();
    this.lives--;
    this.updateUI();
    
    this.canvas.classList.add('shake');
    setTimeout(() => this.canvas.classList.remove('shake'), 200);

    if (this.lives <= 0) {
      this.target = null;
      Sound.playGameOver();
      this.gameOver();
    } else {
      this.spawnTarget();
    }
  }

  createShockwave(x, y, r, color = '#00d4aa') {
    this.shockwaves.push({
      x: x, y: y, r: r, maxR: r * 3, life: 1.0, color: color
    });
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;

    if (this.target) {
      this.target.life -= deltaTime;
      if (this.target.life <= 0) {
        // Timeout
        this.loseLife();
      } else {
        // Move
        this.target.x += this.target.vx * dt;
        this.target.y += this.target.vy * dt;
        
        // Bounce
        if (this.target.x - this.target.r < 0) {
          this.target.x = this.target.r;
          this.target.vx *= -1;
        } else if (this.target.x + this.target.r > this.canvas.width) {
          this.target.x = this.canvas.width - this.target.r;
          this.target.vx *= -1;
        }
        
        if (this.target.y - this.target.r < 0) {
          this.target.y = this.target.r;
          this.target.vy *= -1;
        } else if (this.target.y + this.target.r > this.canvas.height) {
          this.target.y = this.canvas.height - this.target.r;
          this.target.vy *= -1;
        }
      }
    }

    // Shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      let sw = this.shockwaves[i];
      sw.life -= dt * 2;
      sw.r += dt * 50;
      if (sw.life <= 0) this.shockwaves.splice(i, 1);
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
    if (this.livesEl) this.livesEl.innerText = '♥'.repeat(this.lives);
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid lines
    this.ctx.strokeStyle = '#1e1e2a';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for(let i=0; i<this.canvas.width; i+=50) {
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, this.canvas.height);
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(this.canvas.width, i);
    }
    this.ctx.stroke();

    // Shockwaves
    for (let sw of this.shockwaves) {
      this.ctx.strokeStyle = sw.color;
      this.ctx.lineWidth = 2;
      this.ctx.globalAlpha = sw.life;
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1.0;

    // Target
    if (this.target) {
      const r = this.target.r;
      const x = this.target.x;
      const y = this.target.y;
      
      // Pulse animation based on life remaining
      const pulse = 1.0 + 0.1 * Math.sin((this.target.maxLife - this.target.life) / 100);
      const drawR = r * pulse;

      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.beginPath();
      this.ctx.arc(x, y, drawR, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#fff';
      this.ctx.beginPath();
      this.ctx.arc(x, y, drawR * 0.6, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.beginPath();
      this.ctx.arc(x, y, drawR * 0.2, 0, Math.PI * 2);
      this.ctx.fill();

      // Life indicator ring
      this.ctx.strokeStyle = '#6c63ff';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(x, y, drawR + 5, -Math.PI/2, -Math.PI/2 + (Math.PI*2 * (this.target.life / this.target.maxLife)));
      this.ctx.stroke();
    }
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
  new HyperTap();
});
