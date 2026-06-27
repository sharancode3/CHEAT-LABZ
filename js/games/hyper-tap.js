import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class HyperTap extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
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
      cx: this.canvas.width / 2,
      cy: this.canvas.height / 2,
      A: (this.canvas.width / 2) - r - 10,
      B: (this.canvas.height / 2) - r - 10,
      a: 2 + Math.random() * this.level,
      b: 3 + Math.random() * this.level,
      d: Math.random() * Math.PI,
      time: 0,
      r: r,
      life: 2000 - Math.min(1200, this.level * 50),
      maxLife: 2000 - Math.min(1200, this.level * 50)
    };
    
    // Set initial position
    this.target.x = this.target.cx + this.target.A * Math.sin(this.target.a * this.target.time + this.target.d);
    this.target.y = this.target.cy + this.target.B * Math.sin(this.target.b * this.target.time);
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
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist <= this.target.r) {
      // Hit
      Sound.playCoin();
      // Distance-based score: Max 100 points, minus dist*2
      const points = Math.max(10, Math.floor(100 - dist * 2));
      this.score += points;
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
        // Move along Lissajous curve
        this.target.time += dt;
        this.target.x = this.target.cx + this.target.A * Math.sin(this.target.a * this.target.time + this.target.d);
        this.target.y = this.target.cy + this.target.B * Math.sin(this.target.b * this.target.time);
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
});
