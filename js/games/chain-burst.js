import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

class ChainBurst extends GameShell {
  constructor() {
    super('game-canvas', {
      name: 'chain-burst',
      description: 'Click ONCE to start a chain reaction. Hit the target number.',
      width: 600,
      height: 600
    });

    this.scoreEl = document.getElementById('game-score');
    this.targetEl = document.getElementById('game-target');
    this.levelEl = document.getElementById('game-level');

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseClick(e));

    this.init();
  }

  onStart() {
    this.level = 1;
    this.setupLevel();
    
    let runs = Storage.get('chain-burst_runs', 0);
    Storage.set('chain-burst_runs', runs + 1);
  }

  setupLevel() {
    this.dots = [];
    this.bursts = [];
    this.clicksAllowed = 1;
    this.hasClicked = false;
    this.hits = 0;
    
    // Level scaling
    this.totalDots = Math.min(5 + this.level * 4, 60);
    this.targetHits = Math.floor(this.totalDots * (0.2 + Math.min(this.level * 0.05, 0.6)));
    if (this.targetHits === 0) this.targetHits = 1;

    for (let i = 0; i < this.totalDots; i++) {
      this.dots.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 150,
        vy: (Math.random() - 0.5) * 150,
        r: 6,
        color: '#f0f0f8'
      });
    }

    this.updateUI();
  }

  handleMouseClick(e) {
    if (this.state !== 'PLAYING' || this.hasClicked) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    this.hasClicked = true;
    Sound.playBlip();
    this.createBurst(x, y);
  }

  createBurst(x, y) {
    // A burst expands to a max radius over its life, then fades
    this.bursts.push({
      x: x, y: y,
      r: 0,
      maxR: 45,
      life: 2000, // 2 seconds
      maxLife: 2000,
      color: \`hsl(\${Math.random() * 360}, 80%, 60%)\`
    });
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;

    // Move dots
    for (let d of this.dots) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      
      if (d.x < d.r) { d.x = d.r; d.vx *= -1; }
      if (d.x > this.canvas.width - d.r) { d.x = this.canvas.width - d.r; d.vx *= -1; }
      if (d.y < d.r) { d.y = d.r; d.vy *= -1; }
      if (d.y > this.canvas.height - d.r) { d.y = this.canvas.height - d.r; d.vy *= -1; }
    }

    // Update bursts
    let activeBursts = 0;
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      let b = this.bursts[i];
      b.life -= deltaTime;
      
      // Expansion logic (grows quickly, stays, then shrinks/fades)
      const progress = 1 - (b.life / b.maxLife); // 0 to 1
      if (progress < 0.2) {
        b.r = b.maxR * (progress / 0.2); // grow
      } else {
        b.r = b.maxR; // stay max
      }

      if (b.life <= 0) {
        this.bursts.splice(i, 1);
      } else {
        activeBursts++;
      }
    }

    // Check collisions
    for (let i = this.dots.length - 1; i >= 0; i--) {
      let d = this.dots[i];
      let hit = false;
      for (let b of this.bursts) {
        const dx = d.x - b.x;
        const dy = d.y - b.y;
        if (dx*dx + dy*dy <= (d.r + b.r) * (d.r + b.r)) {
          hit = true;
          break;
        }
      }
      if (hit) {
        this.createBurst(d.x, d.y);
        this.dots.splice(i, 1);
        this.hits++;
        Sound.playCoin();
        this.updateUI();
      }
    }

    // Level end condition
    if (this.hasClicked && activeBursts === 0) {
      if (this.hits >= this.targetHits) {
        // Win level
        Sound.playCoin();
        this.level++;
        this.score = this.level; // track levels as score for simplicity/leaderboard
        setTimeout(() => this.setupLevel(), 1000); // brief pause
      } else {
        // Lose game
        Sound.playDamage();
        setTimeout(() => { Sound.playGameOver(); this.gameOver(); }, 1000);
      }
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.hits;
    if (this.targetEl) this.targetEl.innerText = this.targetHits;
    if (this.levelEl) this.levelEl.innerText = \`LEVEL \${this.level}\`;
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Dots
    for (let d of this.dots) {
      this.ctx.fillStyle = d.color;
      this.ctx.beginPath();
      this.ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Bursts
    for (let b of this.bursts) {
      this.ctx.fillStyle = b.color;
      this.ctx.globalAlpha = Math.max(0, b.life / b.maxLife);
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1.0;
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
  new ChainBurst();
});
