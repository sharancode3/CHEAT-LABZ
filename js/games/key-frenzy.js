import { GameShell } from './game-shell.js';
import { Sound } from '../core/sound.js';
import { GameState } from '../core/events.js';
import { Storage } from '../core/storage.js';

export default class KeyFrenzy extends GameShell {
  constructor(canvas, config = {}) {
    super(canvas || 'game-canvas', { ...config, 
      name: 'key-frenzy',
      description: 'Press the key shown. Blind rounds = remember the key. 3 lives.',
      width: 600,
      height: 400
    });

    this.scoreEl = document.getElementById('game-score');
    this.livesEl = document.getElementById('game-lives');
    this.missEl = document.getElementById('game-miss');

    this.letters = "abcdefghijklmnopqrstuvwxyz".split('');

    this.init();
  }

  onStart() {
    this.lives = 3;
    this.correctCount = 0;
    this.timePerKey = 1000;
    this.minTimePerKey = 300;
    
    this.currentKey = null;
    this.timer = 0;
    
    this.isBlind = false;
    this.stateTimer = 0; // for animating the hit/miss
    this.keyState = 'idle'; // idle, hit, miss
    
    this.updateUI();
    this.nextKey();
    
    let runs = Storage.get('key-frenzy_runs', 0);
    Storage.set('key-frenzy_runs', runs + 1);
  }

  nextKey() {
    this.currentKey = this.letters[Math.floor(Math.random() * this.letters.length)];
    this.timer = this.timePerKey;
    
    // Every 5th key is blind
    this.isBlind = (this.correctCount + 1) % 5 === 0;
    
    this.keyState = 'idle';
  }

  onInput(key, event) {
    if (this.keyState !== 'idle') return;
    
    // Ignore non-letter keys
    if (key.length > 1 || !this.letters.includes(key)) return;
    
    if (key === this.currentKey) {
      this.handleHit();
    } else {
      this.handleMiss();
    }
  }

  handleHit() {
    Sound.playCoin();
    this.keyState = 'hit';
    this.stateTimer = 200;
    
    this.correctCount++;
    let points = 10;
    
    // Time bonus
    const ratio = this.timer / this.timePerKey;
    if (ratio > 0.5) points += 5;
    
    this.score += points;
    
    // Decrease time per key every 10 correct
    if (this.correctCount % 10 === 0 && this.timePerKey > this.minTimePerKey) {
      this.timePerKey -= 50;
    }
    
    this.updateUI();
  }

  handleMiss() {
    Sound.playDamage();
    this.keyState = 'miss';
    this.stateTimer = 300;
    
    this.lives--;
    this.updateUI();
    
    this.missEl.classList.add('active');
    setTimeout(() => this.missEl.classList.remove('active'), 150);
  }

  update(deltaTime) {
    if (this.keyState === 'idle') {
      this.timer -= deltaTime;
      if (this.timer <= 0) {
        this.handleMiss();
      }
    } else {
      // Waiting for hit/miss animation to finish
      this.stateTimer -= deltaTime;
      if (this.stateTimer <= 0) {
        if (this.lives <= 0) {
          this.gameOver();
        } else {
          this.nextKey();
        }
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

    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    // Draw timer ring
    if (this.keyState === 'idle') {
      const radius = 60;
      const ratio = this.timer / this.timePerKey;
      
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, -Math.PI/2, -Math.PI/2 + (Math.PI*2 * ratio), false);
      this.ctx.strokeStyle = '#555570';
      this.ctx.lineWidth = 6;
      this.ctx.stroke();
    }

    // Draw Keycap
    let scale = 1.0;
    let bgColor = '#1e1e2a'; // bg-card-hover
    let textColor = '#f0f0f8';
    let text = this.isBlind ? '?' : this.currentKey.toUpperCase();

    if (this.keyState === 'hit') {
      scale = 1.2;
      bgColor = '#00d4aa'; // green/teal
      textColor = '#0a0a0f';
      text = this.currentKey.toUpperCase(); // reveal blind on hit
    } else if (this.keyState === 'miss') {
      scale = 0.9;
      bgColor = '#ff6b6b'; // red
      textColor = '#0a0a0f';
      text = this.currentKey.toUpperCase(); // reveal blind on miss
      this.ctx.translate((Math.random()-0.5)*10, (Math.random()-0.5)*10); // local shake
    }

    const kw = 80 * scale;
    const kh = 80 * scale;
    const kx = cx - kw/2;
    const ky = cy - kh/2;

    // Shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
    this.ctx.beginPath();
    this.ctx.roundRect(kx + 4, ky + 8, kw, kh, 8);
    this.ctx.fill();

    // Cap
    this.ctx.fillStyle = bgColor;
    this.ctx.beginPath();
    this.ctx.roundRect(kx, ky, kw, kh, 8);
    this.ctx.fill();

    // Text
    this.ctx.fillStyle = textColor;
    this.ctx.font = \`\${32 * scale}px "Press Start 2P"\`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, cx, cy);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform in case of shake
  }
}

window.GameState = GameState;

document.addEventListener('DOMContentLoaded', () => {
});
