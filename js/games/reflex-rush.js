import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class ReflexRush extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'reflex-rush',
      description: 'Click the quadrant matching the WORD, ignore the COLOR of the text.',
      width: 600,
      height: 600
    });

    this.scoreEl = document.getElementById('game-score');
    this.livesEl = document.getElementById('game-lives');

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseClick(e));

    this.init();
  }

  onStart() {
    this.lives = 3;
    
    // Quadrants: 0: TL, 1: TR, 2: BL, 3: BR
    this.colors = [
      { name: 'RED', hex: '#ff4d4d' },
      { name: 'BLUE', hex: '#4d4dff' },
      { name: 'GREEN', hex: '#4dff4d' },
      { name: 'YELLOW', hex: '#ffff4d' }
    ];
    
    this.quadrants = [
      { id: 0, x: 0, y: 0, w: 300, h: 300, color: this.colors[0] },
      { id: 1, x: 300, y: 0, w: 300, h: 300, color: this.colors[1] },
      { id: 2, x: 0, y: 300, w: 300, h: 300, color: this.colors[2] },
      { id: 3, x: 300, y: 300, w: 300, h: 300, color: this.colors[3] }
    ];

    this.currentWord = null;
    this.currentColor = null;
    this.targetQuadrant = null;
    
    this.maxTime = 2000; // starts at 2s
    this.timeLeft = 0;
    
    this.gameState = 'WAITING';
    this.delayTimer = 0;
    this.tooEarlyMsg = false;
    
    this.flashAlpha = 0;
    this.flashColor = '#fff';
    
    this.startDelay();
    this.updateUI();
    
    let runs = Storage.get('reflex-rush_runs', 0);
    Storage.set('reflex-rush_runs', runs + 1);
  }

  startDelay() {
    this.gameState = 'WAITING';
    this.tooEarlyMsg = false;
    
    // Generate random delay between 1000ms and 3500ms using crypto
    const randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    const randomFraction = randomBuffer[0] / (0xFFFFFFFF + 1);
    this.delayTimer = 1000 + randomFraction * 2500;
  }

  nextPrompt() {
    this.gameState = 'PROMPT';
    const wordIdx = Math.floor(Math.random() * 4);
    let colorIdx = Math.floor(Math.random() * 4);
    
    // High chance for Stroop effect (mismatch)
    if (Math.random() > 0.3) {
      while (colorIdx === wordIdx) {
        colorIdx = Math.floor(Math.random() * 4);
      }
    }
    
    this.currentWord = this.colors[wordIdx];
    this.currentColor = this.colors[colorIdx];
    this.targetQuadrant = wordIdx;
    
    this.timeLeft = this.maxTime;
  }

  handleMouseClick(e) {
    if (this.state !== 'PLAYING') return;
    
    if (this.gameState === 'WAITING') {
      // Too early!
      this.tooEarlyMsg = true;
      this.loseLife();
      return;
    }
    
    if (this.gameState !== 'PROMPT') return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Determine quadrant
    let qIdx = -1;
    if (x < 300 && y < 300) qIdx = 0;
    else if (x >= 300 && y < 300) qIdx = 1;
    else if (x < 300 && y >= 300) qIdx = 2;
    else if (x >= 300 && y >= 300) qIdx = 3;

    if (qIdx === this.targetQuadrant) {
      // Correct
      Sound.playCoin();
      this.score += 100;
      this.maxTime = Math.max(600, this.maxTime - 50); // gets faster
      
      this.flashAlpha = 1.0; // full flash
      this.flashColor = '#4dff4d'; // green flash
      
      this.startDelay();
      this.updateUI();
    } else {
      // Wrong
      this.loseLife();
    }
  }

  loseLife() {
    Sound.playDamage();
    this.lives--;
    
    this.flashAlpha = 1.0; // full flash
    this.flashColor = '#ff4d4d'; // red flash
    
    this.canvas.classList.add('shake');
    setTimeout(() => this.canvas.classList.remove('shake'), 200);

    this.updateUI();

    if (this.lives <= 0) {
      setTimeout(() => { Sound.playGameOver(); this.gameOver(); }, 300);
    } else {
      this.startDelay();
    }
  }

  update(deltaTime) {
    if (this.gameState === 'WAITING' && !this.tooEarlyMsg) {
      this.delayTimer -= deltaTime;
      if (this.delayTimer <= 0) {
        this.nextPrompt();
      }
    } else if (this.gameState === 'PROMPT') {
      this.timeLeft -= deltaTime;
      if (this.timeLeft <= 0) {
        this.loseLife();
      }
    }
    
    if (this.flashAlpha > 0) {
      this.flashAlpha -= (deltaTime / 500);
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }

    }
  }

  updateUI() {
    if (this.scoreEl) this.scoreEl.innerText = this.score;
    if (this.livesEl) this.livesEl.innerText = '♥'.repeat(this.lives);
  }

  draw() {
    this.ctx.fillStyle = '#0a0a0f';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Quadrants
    for (let q of this.quadrants) {
      this.ctx.fillStyle = q.color.hex;
      this.ctx.globalAlpha = 0.2; // dim them slightly
      this.ctx.fillRect(q.x, q.y, q.w, q.h);
      
      // inner border
      this.ctx.strokeStyle = q.color.hex;
      this.ctx.globalAlpha = 0.8;
      this.ctx.lineWidth = 4;
      this.ctx.strokeRect(q.x + 10, q.y + 10, q.w - 20, q.h - 20);
    }
    this.ctx.globalAlpha = 1.0;

    // Crosshairs dividing quadrants
    this.ctx.strokeStyle = '#2a2a3a';
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(300, 0); this.ctx.lineTo(300, 600);
    this.ctx.moveTo(0, 300); this.ctx.lineTo(600, 300);
    this.ctx.stroke();

    // Timer bar around the center text
    const cx = 300;
    const cy = 300;
    
    // Draw Text Background Box
    this.ctx.fillStyle = '#1e1e2a';
    this.ctx.shadowBlur = 20;
    this.ctx.shadowColor = '#000';
    this.ctx.fillRect(cx - 200, cy - 80, 400, 160);
    this.ctx.shadowBlur = 0;

    // Text
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    if (this.gameState === 'WAITING') {
      this.ctx.fillStyle = this.tooEarlyMsg ? '#ff4d4d' : '#f0f0f8';
      this.ctx.font = '32px "Press Start 2P"';
      this.ctx.fillText(this.tooEarlyMsg ? "TOO EARLY!" : "WAIT...", cx, cy);
    } else if (this.gameState === 'PROMPT') {
      this.ctx.fillStyle = this.currentColor.hex;
      this.ctx.font = '64px "Press Start 2P"';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = this.currentColor.hex;
      this.ctx.fillText(this.currentWord.name, cx, cy);
      this.ctx.shadowBlur = 0;
      
      // Timer bar
      const ratio = Math.max(0, this.timeLeft / this.maxTime);
      this.ctx.fillStyle = ratio > 0.3 ? '#f0f0f8' : '#ff4d4d';
      this.ctx.fillRect(cx - 180, cy + 50, 360 * ratio, 10);
    }

    // Flash overlay
    if (this.flashAlpha > 0) {
      this.ctx.fillStyle = this.flashColor;
      this.ctx.globalAlpha = this.flashAlpha;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalAlpha = 1.0;
    }
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
