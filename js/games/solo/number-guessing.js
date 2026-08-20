import { GameBase } from '../../core/game-base.js';

export class NumberGuessing extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.minBound = 1;
    this.maxBound = 100;
    this.target = Math.floor(Math.random() * 100) + 1;
    
    this.attemptsLeft = 7;
    this.maxAttempts = 7;
    
    this.history = []; // { guess, result, heat }
    
    this.currentInput = '';
    
    // For rendering bounds dynamically
    this.currentMin = 1;
    this.currentMax = 100;
    
    this.gameState = 'PLAYING'; // PLAYING, WON, LOST
    
    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver || this.gameState !== 'PLAYING') return;
      
      if (e.key >= '0' && e.key <= '9') {
        if (this.currentInput.length < 3) {
          this.currentInput += e.key;
          if (window.Sound) window.Sound.playTone(400, 'square', 0.02);
        }
      } else if (e.code === 'Backspace') {
        this.currentInput = this.currentInput.slice(0, -1);
      } else if (e.code === 'Enter') {
        this.submitGuess();
      }
    };
  }

  submitGuess() {
    if (this.currentInput === '') return;
    
    const guess = parseInt(this.currentInput, 10);
    this.currentInput = '';
    
    if (isNaN(guess)) return;
    
    this.attemptsLeft--;
    
    let result = '';
    let heat = 1.0 - (Math.abs(guess - this.target) / (this.maxBound - this.minBound));
    heat = Math.max(0, Math.min(1, heat));
    
    if (guess === this.target) {
      result = 'CORRECT';
      this.gameState = 'WON';
      this.score += Math.max(100, 1000 - ((this.maxAttempts - this.attemptsLeft) * 150));
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.2);
    } else if (guess < this.target) {
      result = 'HIGHER';
      if (guess >= this.currentMin) this.currentMin = guess + 1;
      if (window.Sound) window.Sound.playTone(300, 'sawtooth', 0.1);
    } else {
      result = 'LOWER';
      if (guess <= this.currentMax) this.currentMax = guess - 1;
      if (window.Sound) window.Sound.playTone(200, 'sawtooth', 0.1);
    }
    
    this.history.unshift({ guess, result, heat }); // Add to front
    
    if (this.gameState === 'PLAYING' && this.attemptsLeft <= 0) {
      this.gameState = 'LOST';
      this.lives = 0;
      this.isOver = true;
    } else if (this.gameState === 'WON') {
      setTimeout(() => this.levelComplete(), 1500); // 1.5s delay before advancing
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    // Handled by input event
  }

  render(ctx) {
    this.clear();
    
    // Bounds Radar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(50, 50, this.W - 100, 40);
    
    // Draw current bounds
    const totalRange = this.maxBound - this.minBound;
    const startRatio = (this.currentMin - this.minBound) / totalRange;
    const endRatio = (this.currentMax - this.minBound) / totalRange;
    
    const radarW = this.W - 100;
    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)'; // Green safe zone
    ctx.fillRect(50 + startRatio * radarW, 50, (endRatio - startRatio) * radarW, 40);
    
    ctx.fillStyle = '#fff';
    ctx.font = '20px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(this.minBound, 50, 40);
    ctx.fillText(this.maxBound, this.W - 50, 40);
    
    // Current Input Area
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.fillRect(this.W / 2 - 100, 120, 200, 80);
    ctx.strokeRect(this.W / 2 - 100, 120, 200, 80);
    
    ctx.fillStyle = '#fff';
    ctx.font = '40px "Press Start 2P"';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentInput + (Math.floor(Date.now() / 500) % 2 === 0 ? '_' : ''), this.W / 2, 160);
    
    // Stats
    ctx.font = '20px "JetBrains Mono"';
    ctx.fillStyle = this.attemptsLeft <= 2 ? '#ef4444' : '#fff';
    ctx.fillText(`ATTEMPTS: ${this.attemptsLeft} / ${this.maxAttempts}`, this.W / 2, 240);
    
    // History
    let y = 300;
    for (let i = 0; i < this.history.length; i++) {
      const h = this.history[i];
      
      let color = '#fff';
      if (h.result === 'CORRECT') color = '#10b981';
      else if (h.result === 'HIGHER') color = '#38bdf8';
      else color = '#facc15';
      
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.fillText(`Guess: ${h.guess.toString().padStart(3, ' ')} -> ${h.result}`, 150, y);
      
      // Heat Bar
      if (h.result !== 'CORRECT') {
        ctx.fillStyle = '#333';
        ctx.fillRect(this.W - 350, y - 10, 200, 15);
        
        let heatColor = '#10b981';
        if (h.heat > 0.8) heatColor = '#ef4444'; // Red hot!
        else if (h.heat > 0.5) heatColor = '#facc15'; // Warm
        else heatColor = '#38bdf8'; // Cold
        
        ctx.fillStyle = heatColor;
        ctx.fillRect(this.W - 350, y - 10, 200 * h.heat, 15);
      }
      
      y += 40;
    }
    
    // Game Over Overlay
    if (this.gameState === 'WON') {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = '#10b981';
      ctx.font = '60px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText("CORRECT!", this.W / 2, this.H / 2);
    } else if (this.gameState === 'LOST') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = '#ef4444';
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(`TARGET WAS: ${this.target}`, this.W / 2, this.H / 2);
    }
  }
}

export default NumberGuessing;
