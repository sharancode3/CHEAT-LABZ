import { GameBase } from '../../core/game-base.js';

export class WordScramble extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.dictionary = [
      "TIME", "CODE", "GAME", "PLAY", "STAR", "NODE",
      "REACT", "LOGIC", "SPEED", "SPACE", "LASER", "BOARD",
      "PUZZLE", "MATRIX", "SYSTEM", "ENGINE", "MEMORY",
      "NETWORK", "PROGRAM", "MONITOR", "BROWSER"
    ];
    
    this.timer = 60.0;
    this.streak = 0;
    this.wordsSolved = 0;
    
    this.currentInput = '';
    
    this.nextWord();
    
    this.setupInput();
  }

  nextWord() {
    // Pick a word that isn't the previous one
    let newWord = this.currentWord;
    while (!newWord || newWord === this.currentWord) {
      newWord = this.dictionary[Math.floor(Math.random() * this.dictionary.length)];
    }
    
    this.currentWord = newWord;
    
    // Fisher-Yates Shuffle
    let arr = this.currentWord.split('');
    let attempts = 0;
    
    // Ensure it's actually scrambled
    while (arr.join('') === this.currentWord && attempts < 10) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      attempts++;
    }
    
    this.scrambled = arr.join('');
    this.currentInput = '';
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      if (e.code === 'Enter') {
        this.submitWord();
      } else if (e.code === 'Backspace') {
        this.currentInput = this.currentInput.slice(0, -1);
        if (window.Sound) window.Sound.playTone(600, 'square', 0.02);
      } else if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
        if (this.currentInput.length < this.currentWord.length) {
          this.currentInput += e.key.toUpperCase();
          if (window.Sound) window.Sound.playTone(400, 'square', 0.02);
        }
      }
    };
  }

  submitWord() {
    if (this.currentInput.length === 0) return;
    
    if (this.currentInput === this.currentWord) {
      // Correct
      this.streak++;
      this.wordsSolved++;
      
      const timeGain = this.currentWord.length * 1.5;
      this.timer += timeGain;
      
      const pts = Math.pow(this.currentWord.length, 2) * 50 * (1 + (this.streak * 0.1));
      this.score += Math.floor(pts);
      
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.2);
      this.nextWord();
    } else {
      // Incorrect
      this.streak = 0;
      this.timer -= 3.0; // Penalty
      
      this.currentInput = '';
      
      if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.2);
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    this.timer -= delta;
    if (this.timer <= 0) {
      this.timer = 0;
      this.isOver = true;
      this.lives = 0;
      if (window.Sound) window.Sound.playTone(100, 'square', 0.5);
      
      setTimeout(() => this.levelComplete(), 2000);
    }
  }

  render(ctx) {
    this.clear();
    
    // Draw Timer Bar
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, this.W, 20);
    
    let timeColor = '#10b981'; // Green
    if (this.timer < 10) timeColor = '#ef4444'; // Red
    else if (this.timer < 20) timeColor = '#facc15'; // Yellow
    
    ctx.fillStyle = timeColor;
    ctx.fillRect(0, 0, this.W * (Math.min(this.timer, 120) / 120), 20);
    
    // Time Text
    ctx.font = '24px "JetBrains Mono"';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.timer.toFixed(1)}s`, this.W / 2, 60);
    
    // Streak
    ctx.fillStyle = '#a855f7';
    ctx.fillText(`STREAK: ${this.streak}x`, this.W - 120, 60);
    
    // Scrambled Word Box
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 4;
    ctx.fillRect(this.W / 2 - 200, 150, 400, 100);
    ctx.strokeRect(this.W / 2 - 200, 150, 400, 100);
    
    ctx.fillStyle = '#fff';
    ctx.font = '60px "Press Start 2P"';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.scrambled, this.W / 2, 205);
    
    // Input Box
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.fillRect(this.W / 2 - 200, 300, 400, 80);
    ctx.strokeRect(this.W / 2 - 200, 300, 400, 80);
    
    ctx.fillStyle = '#38bdf8';
    ctx.font = '40px "Press Start 2P"';
    
    let displayStr = this.currentInput;
    if (Math.floor(Date.now() / 500) % 2 === 0) displayStr += '_';
    
    ctx.fillText(displayStr, this.W / 2, 345);
    
    // Instructions
    ctx.fillStyle = '#64748b';
    ctx.font = '20px "JetBrains Mono"';
    ctx.fillText("TYPE THE UNSCRAMBLED WORD AND PRESS ENTER", this.W / 2, 450);
    ctx.fillStyle = '#ef4444';
    ctx.fillText("WRONG GUESS: -3.0s", this.W / 2, 480);
    
    if (this.isOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#fff';
      ctx.font = '50px "Press Start 2P"';
      ctx.fillText("TIME'S UP!", this.W / 2, this.H / 2 - 50);
      
      ctx.font = '30px "JetBrains Mono"';
      ctx.fillStyle = '#10b981';
      ctx.fillText(`WORDS SOLVED: ${this.wordsSolved}`, this.W / 2, this.H / 2 + 30);
    }
  }
}

export default WordScramble;
