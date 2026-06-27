import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class WordPulse extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'word-pulse',
      description: 'Connect adjacent letters to form words. 60 seconds.',
      width: 500,
      height: 500
    });

    this.scoreEl = document.getElementById('game-score');
    this.timeEl = document.getElementById('game-time');

    this.gridSize = 4;
    this.cellSize = 100;
    this.offsetX = (500 - (this.gridSize * this.cellSize)) / 2;
    this.offsetY = (500 - (this.gridSize * this.cellSize)) / 2 + 20;

    // Mouse events for dragging
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));

    this.init();
  }

  onStart() {
    this.timeLeft = 60000; // 60 seconds
    this.grid = [];
    this.selectedPath = []; // Array of {c, r}
    this.isDragging = false;
    this.currentWord = "";
    
    // Generate grid
    const letters = "EAAAAIIOOUUNNRTLSCHDPB"; // Weighted random pool
    for (let c = 0; c < this.gridSize; c++) {
      this.grid[c] = [];
      for (let r = 0; r < this.gridSize; r++) {
        this.grid[c][r] = letters[Math.floor(Math.random() * letters.length)];
      }
    }
    
    this.statusMsg = "";
    this.statusTimer = 0;
    this.statusColor = '#fff';

    this.updateUI();
    
    let runs = Storage.get('word-pulse_runs', 0);
    Storage.set('word-pulse_runs', runs + 1);
  }

  onInput(key, event) {
    if (this.state !== 'PLAYING') return;

    if (key === 'enter') {
      this.submitWord();
    } else if (key === 'escape' || key === 'backspace') {
      this.clearSelection();
    }
  }

  getGridCoords(x, y) {
    const c = Math.floor((x - this.offsetX) / this.cellSize);
    const r = Math.floor((y - this.offsetY) / this.cellSize);
    if (c >= 0 && c < this.gridSize && r >= 0 && r < this.gridSize) {
      return { c, r };
    }
    return null;
  }

  onMouseDown(e) {
    if (this.state !== 'PLAYING') return;
    const pos = this.getMousePos(e);
    const coords = this.getGridCoords(pos.x, pos.y);
    
    if (coords) {
      this.isDragging = true;
      this.selectedPath = [coords];
      this.updateCurrentWord();
      Sound.playBlip();
    }
  }

  onMouseMove(e) {
    if (!this.isDragging || this.state !== 'PLAYING') return;
    const pos = this.getMousePos(e);
    const coords = this.getGridCoords(pos.x, pos.y);
    
    if (coords) {
      const last = this.selectedPath[this.selectedPath.length - 1];
      
      // If moved to a new adjacent cell
      if (coords.c !== last.c || coords.r !== last.r) {
        // Check adjacency
        const dc = Math.abs(coords.c - last.c);
        const dr = Math.abs(coords.r - last.r);
        
        if (dc <= 1 && dr <= 1) {
          // Check if not already in path
          if (!this.selectedPath.find(p => p.c === coords.c && p.r === coords.r)) {
            this.selectedPath.push(coords);
            this.updateCurrentWord();
            Sound.playBlip();
          }
        }
      }
    }
  }

  onMouseUp(e) {
    if (this.isDragging) {
      this.isDragging = false;
      // Auto submit on release
      if (this.selectedPath.length > 0) {
        this.submitWord();
      }
    }
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  updateCurrentWord() {
    this.currentWord = this.selectedPath.map(p => this.grid[p.c][p.r]).join('');
  }

  clearSelection() {
    this.selectedPath = [];
    this.currentWord = "";
  }

  submitWord() {
    if (this.currentWord.length < 3) {
      this.showStatus("TOO SHORT", '#ff6b6b');
      this.clearSelection();
      return;
    }

    // Fake validation: must have at least one vowel
    if (/[AEIOU]/.test(this.currentWord)) {
      Sound.playCoin();
      const pts = this.currentWord.length * 10;
      this.score += pts;
      this.showStatus(`+${pts}`, '#00d4aa');
      
      // Replace used letters
      for (let p of this.selectedPath) {
        const letters = "EAAAAIIOOUUNNRTLSCHDPB";
        this.grid[p.c][p.r] = letters[Math.floor(Math.random() * letters.length)];
      }
      this.updateUI();
    } else {
      Sound.playDamage();
      this.showStatus("INVALID", '#ff6b6b');
    }
    this.clearSelection();
  }

  showStatus(msg, color) {
    this.statusMsg = msg;
    this.statusColor = color;
    this.statusTimer = 1000;
  }

  update(deltaTime) {
    this.timeLeft -= deltaTime;
    if (this.timeLeft <= 0) {
      Sound.playGameOver();
      this.gameOver();
    }
    
    if (this.statusTimer > 0) {
      this.statusTimer -= deltaTime;
    }
    
    this.updateUI();
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
    if (this.timeEl) this.timeEl.innerText = `TIME: ${Math.ceil(Math.max(0, this.timeLeft / 1000))}`;
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw current word
    this.ctx.fillStyle = '#f0f0f8';
    this.ctx.font = '24px "Press Start 2P"';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.currentWord || "_", this.canvas.width/2, 40);

    // Draw status
    if (this.statusTimer > 0) {
      this.ctx.fillStyle = this.statusColor;
      this.ctx.font = '14px "Press Start 2P"';
      this.ctx.globalAlpha = this.statusTimer / 1000;
      this.ctx.fillText(this.statusMsg, this.canvas.width/2, 70);
      this.ctx.globalAlpha = 1.0;
    }

    // Draw glowing path line
    if (this.selectedPath.length > 0) {
      this.ctx.beginPath();
      for (let i = 0; i < this.selectedPath.length; i++) {
        const p = this.selectedPath[i];
        const cx = this.offsetX + p.c * this.cellSize + this.cellSize/2;
        const cy = this.offsetY + p.r * this.cellSize + this.cellSize/2;
        if (i === 0) this.ctx.moveTo(cx, cy);
        else this.ctx.lineTo(cx, cy);
      }
      this.ctx.strokeStyle = 'rgba(108, 99, 255, 0.6)'; // accent-1
      this.ctx.lineWidth = 12;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = '#6c63ff';
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }

    // Draw grid
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        const x = this.offsetX + c * this.cellSize;
        const y = this.offsetY + r * this.cellSize;
        const padding = 6;
        
        const isSelected = this.selectedPath.find(p => p.c === c && p.r === r);
        
        // Block
        this.ctx.fillStyle = isSelected ? '#6c63ff' : '#1e1e2a';
        this.ctx.beginPath();
        this.ctx.roundRect(x + padding, y + padding, this.cellSize - padding*2, this.cellSize - padding*2, 8);
        this.ctx.fill();
        
        // Border
        this.ctx.strokeStyle = isSelected ? '#fff' : '#2a2a3a';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Letter
        this.ctx.fillStyle = isSelected ? '#fff' : '#f0f0f8';
        this.ctx.font = '32px "DM Sans"';
        this.ctx.fontWeight = '600';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(this.grid[c][r], x + this.cellSize/2, y + this.cellSize/2);
      }
    }
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
