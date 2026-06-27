import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class MemoryGrid extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'memory-grid',
      description: 'Watch the sequence. Click the squares in the exact same order.',
      width: 500,
      height: 500
    });

    this.scoreEl = document.getElementById('game-score');
    this.livesEl = document.getElementById('game-lives');
    this.levelEl = document.getElementById('game-level');

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseClick(e));

    this.init();
  }

  onStart() {
    this.lives = 3;
    this.level = 1;
    this.gridSize = 4;
    
    this.sequence = [];
    this.playerIndex = 0;
    
    this.gameState = 'IDLE'; // IDLE, SHOWING, PLAYING, SUCCESS, FAIL
    this.stateTimer = 1000; // delay before first round
    
    this.flashIndex = -1;
    
    this.cells = [];
    this.setupGrid();
    
    this.updateUI();
    
    let runs = Storage.get('memory-grid_runs', 0);
    Storage.set('memory-grid_runs', runs + 1);
  }

  setupGrid() {
    this.cells = [];
    const padding = 10;
    const availableWidth = this.canvas.width - padding*2;
    const cellSize = availableWidth / this.gridSize;
    
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        this.cells.push({
          id: c * this.gridSize + r,
          x: padding + c * cellSize,
          y: padding + r * cellSize,
          w: cellSize,
          h: cellSize,
          scale: 1.0,
          color: '#1e1e2a', // default
          freq: 261.63 + ((c * this.gridSize + r) * 20) // ascending frequencies starting from Middle C
        });
      }
    }
  }

  nextRound() {
    this.level++;
    
    if (this.level === 5) {
      this.gridSize = 5;
      this.setupGrid();
    } else if (this.level === 10) {
      this.gridSize = 6;
      this.setupGrid();
    }
    
    this.playerIndex = 0;
    // Add one to sequence
    this.sequence.push(Math.floor(Math.random() * this.cells.length));
    
    this.gameState = 'SHOWING';
    this.flashIndex = 0;
    this.stateTimer = 500; // initial pause before showing
  }

  startFirstRound() {
    // Sequence starts at 3 squares
    this.sequence = [];
    for (let i = 0; i < 3; i++) {
      this.sequence.push(Math.floor(Math.random() * this.cells.length));
    }
    this.playerIndex = 0;
    this.gameState = 'SHOWING';
    this.flashIndex = 0;
    this.stateTimer = 500;
  }

  playTone(freq, type = 'sine') {
    if (window.Sound && window.Sound.isMuted) return;
    if (!window.audioCtx) {
      window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (window.audioCtx.state === 'suspended') window.audioCtx.resume();
    
    const osc = window.audioCtx.createOscillator();
    const gainNode = window.audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, window.audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, window.audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, window.audioCtx.currentTime + 0.5);
    
    osc.connect(gainNode);
    gainNode.connect(window.audioCtx.destination);
    
    osc.start();
    osc.stop(window.audioCtx.currentTime + 0.5);
  }

  handleMouseClick(e) {
    if (this.state !== 'PLAYING' || this.gameState !== 'PLAYING') return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Find clicked cell
    for (let cell of this.cells) {
      if (x > cell.x && x < cell.x + cell.w && y > cell.y && y < cell.y + cell.h) {
        this.clickCell(cell);
        break;
      }
    }
  }

  clickCell(cell) {
    // Check against sequence
    const expectedId = this.sequence[this.playerIndex];
    if (cell.id === expectedId) {
      // Correct
      this.playTone(cell.freq);
      this.score += 10;
      this.playerIndex++;
      
      // Animate hit
      cell.scale = 0.9;
      cell.color = '#00d4aa'; // Green
      
      if (this.playerIndex >= this.sequence.length) {
        // Round complete
        this.gameState = 'SUCCESS';
        this.stateTimer = 1000;
        Sound.playCoin();
      }
    } else {
      // Wrong
      this.playTone(100, 'sawtooth');
      Sound.playDamage();
      this.lives--;
      this.gameState = 'FAIL';
      this.stateTimer = 1500;
      
      // Animate fail
      cell.scale = 0.9;
      cell.color = '#ff6b6b'; // Red
      
      // Highlight the correct one too
      const correctCell = this.cells.find(c => c.id === expectedId);
      if (correctCell) correctCell.color = '#6c63ff';
      
      // Screen shake
      this.canvas.classList.add('shake');
      setTimeout(() => this.canvas.classList.remove('shake'), 200);

      if (this.lives <= 0) {
        setTimeout(() => this.gameOver(), 1500);
      }
    }
    this.updateUI();
  }

  update(deltaTime) {
    const dt = deltaTime / 1000;

    // Reset cell animations smoothly
    for (let cell of this.cells) {
      if (cell.scale < 1.0) cell.scale += 0.5 * dt;
      if (cell.scale > 1.0) cell.scale -= 2.0 * dt;
      if (cell.scale > 0.99 && cell.scale < 1.01) cell.scale = 1.0;
      
      if (this.gameState === 'PLAYING') {
        cell.color = '#1e1e2a'; // Restore default color if playing
      }
    }

    if (this.gameState === 'IDLE') {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        this.startFirstRound();
      }
    } else if (this.gameState === 'SHOWING') {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        if (this.flashIndex < this.sequence.length) {
          // Flash current
          const cellId = this.sequence[this.flashIndex];
          const cell = this.cells.find(c => c.id === cellId);
          if (cell) {
            cell.scale = 1.1; // Pop out
            cell.color = '#6c63ff'; // Blue glow
            this.playTone(cell.freq);
          }
          this.flashIndex++;
          this.stateTimer = 550; // 400ms highlight + 150ms gap
        } else {
          // Done showing
          this.gameState = 'PLAYING';
        }
      } else if (this.stateTimer <= 150) {
        // Clear color during the 150ms gap to make distinct flashes visible
        for (let cell of this.cells) cell.color = '#1e1e2a';
      }
    } else if (this.gameState === 'SUCCESS') {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        this.nextRound();
      }
    } else if (this.gameState === 'FAIL') {
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0 && this.lives > 0) {
        // Repeat same round
        this.playerIndex = 0;
        this.gameState = 'SHOWING';
        this.flashIndex = 0;
        this.stateTimer = 500;
        for (let cell of this.cells) cell.color = '#1e1e2a';
      }
    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
    if (this.livesEl) this.livesEl.innerText = '♥'.repeat(this.lives);
    if (this.levelEl) this.levelEl.innerText = this.level;
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let cell of this.cells) {
      const padding = 8;
      const cw = (cell.w - padding*2) * cell.scale;
      const ch = (cell.h - padding*2) * cell.scale;
      const cx = cell.x + padding + ((cell.w - padding*2) - cw)/2;
      const cy = cell.y + padding + ((cell.h - padding*2) - ch)/2;

      // Drop shadow / Inset effect
      this.ctx.fillStyle = '#05050a'; // Darker shadow
      this.ctx.beginPath();
      this.ctx.roundRect(cx + 4, cy + 4, cw, ch, 8);
      this.ctx.fill();

      // Main Block
      this.ctx.fillStyle = cell.color;
      if (cell.color === '#6c63ff') {
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#6c63ff';
      } else if (cell.color === '#00d4aa' || cell.color === '#ff6b6b') {
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = cell.color;
      }
      
      this.ctx.beginPath();
      this.ctx.roundRect(cx, cy, cw, ch, 8);
      this.ctx.fill();
      
      this.ctx.shadowBlur = 0; // reset
    }
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
