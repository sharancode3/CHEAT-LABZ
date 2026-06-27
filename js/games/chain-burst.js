import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class ChainBurst extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'chain-burst',
      description: 'Drag across 3 or more dots of the same color to burst them.',
      width: 500,
      height: 500
    });

    this.scoreEl = document.getElementById('game-score');
    this.targetEl = document.getElementById('game-target');
    this.levelEl = document.getElementById('game-level');

    this.isDragging = false;
    this.chain = [];
    
    this.canvas.addEventListener('mousedown', (e) => this.handleDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleUp(e));
    
    // Touch support
    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.handleDown(e.touches[0]); }, {passive: false});
    this.canvas.addEventListener('touchmove', (e) => { e.preventDefault(); this.handleMove(e.touches[0]); }, {passive: false});
    this.canvas.addEventListener('touchend', (e) => { e.preventDefault(); this.handleUp(e); }, {passive: false});

    this.init();
  }

  onStart() {
    this.level = 1;
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    
    this.gridW = 7;
    this.gridH = 7;
    this.cellSize = this.canvas.width / this.gridW;
    
    this.colors = ['#ff4d4d', '#4dff4d', '#4d4dff', '#ffff4d', '#ff4dff'];
    this.dots = [];
    this.particles = [];
    
    this.fillGrid();
    
    let runs = Storage.get('chain-burst_runs', 0);
    Storage.set('chain-burst_runs', runs + 1);
  }

  fillGrid() {
    for (let x = 0; x < this.gridW; x++) {
      for (let y = 0; y < this.gridH; y++) {
        const existing = this.dots.find(d => d.gx === x && d.gy === y);
        if (!existing) {
          this.dots.push({
            gx: x, gy: y,
            x: x * this.cellSize + this.cellSize/2,
            y: y * this.cellSize + this.cellSize/2 - this.canvas.height, // spawn above
            color: this.colors[Math.floor(Math.random() * this.colors.length)],
            vy: 0,
            r: this.cellSize * 0.4
          });
        }
      }
    }
  }

  getDotAt(x, y) {
    for (let d of this.dots) {
      const dx = x - d.x;
      const dy = y - d.y;
      if (dx*dx + dy*dy <= d.r * d.r) return d;
    }
    return null;
  }

  handleDown(e) {
    if (this.state !== 'PLAYING') return;
    const {x, y} = this.getCoords(e);
    const dot = this.getDotAt(x, y);
    if (dot) {
      this.isDragging = true;
      this.chain = [dot];
      Sound.playBlip();
    }
  }

  handleMove(e) {
    if (!this.isDragging || this.state !== 'PLAYING') return;
    const {x, y} = this.getCoords(e);
    const dot = this.getDotAt(x, y);
    
    if (dot && !this.chain.includes(dot)) {
      const last = this.chain[this.chain.length - 1];
      // Check adjacent and same color
      const dx = Math.abs(dot.gx - last.gx);
      const dy = Math.abs(dot.gy - last.gy);
      if (dx <= 1 && dy <= 1 && dot.color === last.color) {
        this.chain.push(dot);
        Sound.playBlip();
      }
    } else if (dot && this.chain.length > 1 && dot === this.chain[this.chain.length - 2]) {
      // Allow backtracking
      this.chain.pop();
    }
  }

  handleUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;
    
    if (this.chain.length >= 3) {
      // Burst
      Sound.playCoin();
      const pts = this.chain.length * this.chain.length * 10 * this.combo;
      this.score += pts;
      this.combo++;
      this.comboTimer = 2000; // 2 seconds to keep combo
      
      for (let d of this.chain) {
        // remove
        this.dots = this.dots.filter(dot => dot !== d);
        this.createExplosion(d.x, d.y, d.color);
      }
      
      this.applyGravity();
      this.fillGrid();
      this.updateUI();
    }
    
    this.chain = [];
  }

  getCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  applyGravity() {
    for (let x = 0; x < this.gridW; x++) {
      let col = this.dots.filter(d => d.gx === x).sort((a,b) => b.gy - a.gy);
      let targetY = this.gridH - 1;
      for (let d of col) {
        d.gy = targetY;
        targetY--;
      }
    }
  }

  createExplosion(x, y, color) {
    for(let i=0; i<10; i++) {
      this.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 300,
        maxLife: 300,
        color
      });
    }
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;

    // Combo
    if (this.comboTimer > 0) {
      this.comboTimer -= deltaTime;
      if (this.comboTimer <= 0) {
        this.combo = 1;
        this.updateUI();
      }
    }

    // Move dots
    for (let d of this.dots) {
      const targetY = d.gy * this.cellSize + this.cellSize/2;
      if (d.y < targetY) {
        d.vy += 1500 * dt; // gravity
        d.y += d.vy * dt;
        if (d.y >= targetY) {
          d.y = targetY;
          d.vy = 0;
        }
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
    if (this.levelEl) this.levelEl.innerText = `COMBO x${this.combo}`;
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Chain lines
    if (this.chain.length > 1) {
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 4;
      this.ctx.globalAlpha = 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(this.chain[0].x, this.chain[0].y);
      for(let i=1; i<this.chain.length; i++) {
        this.ctx.lineTo(this.chain[i].x, this.chain[i].y);
      }
      this.ctx.stroke();
      this.ctx.globalAlpha = 1.0;
    }

    // Dots
    for (let d of this.dots) {
      this.ctx.fillStyle = d.color;
      this.ctx.beginPath();
      let r = d.r;
      if (this.chain.includes(d)) {
        r *= 1.2;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = d.color;
      } else {
        this.ctx.shadowBlur = 0;
      }
      this.ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }

    // Particles
    for (let p of this.particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life / p.maxLife;
      this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    this.ctx.globalAlpha = 1.0;
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
