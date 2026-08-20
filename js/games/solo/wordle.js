import { GameBase } from '../../core/game-base.js';

export class Wordle extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.dictionary = [
      "REACT", "LOGIC", "SPEED", "SPACE", "LASER", "BOARD",
      "PIXEL", "FRAME", "MOUSE", "CLICK", "SOUND", "SCORE",
      "GAMES", "CHEAT", "LEVEL", "DEBUG", "CRASH", "ARRAY",
      "BLOCK", "STACK", "QUEUE"
    ];
    
    this.target = this.dictionary[Math.floor(Math.random() * this.dictionary.length)];
    
    // Grid: 6 rows (attempts), 5 cols (letters)
    this.grid = [];
    for (let r = 0; r < 6; r++) {
      let row = [];
      for (let c = 0; c < 5; c++) {
        row.push({ char: '', status: 0 }); // 0 = empty/grey, 1 = yellow, 2 = green
      }
      this.grid.push(row);
    }
    
    this.currentRow = 0;
    this.currentCol = 0;
    
    // Virtual Keyboard states
    this.keyStates = {}; // char -> status
    
    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      const key = e.key.toUpperCase();
      
      if (key === 'ENTER') {
        this.submitGuess();
      } else if (key === 'BACKSPACE') {
        if (this.currentCol > 0) {
          this.currentCol--;
          this.grid[this.currentRow][this.currentCol].char = '';
          if (window.Sound) window.Sound.playTone(600, 'square', 0.02);
        }
      } else if (key.length === 1 && key >= 'A' && key <= 'Z') {
        if (this.currentCol < 5) {
          this.grid[this.currentRow][this.currentCol].char = key;
          this.currentCol++;
          if (window.Sound) window.Sound.playTone(400, 'square', 0.02);
        }
      }
    };
  }

  submitGuess() {
    if (this.currentCol !== 5) return;
    
    const guessRow = this.grid[this.currentRow];
    let guessStr = '';
    for (let i = 0; i < 5; i++) guessStr += guessRow[i].char;
    
    // Basic dictionary check could go here, but for now we accept any 5 letters
    
    // 2-Pass Evaluation Algorithm
    const targetCounts = {};
    const result = [0, 0, 0, 0, 0]; // 0: Grey, 1: Yellow, 2: Green
    
    // Pass 1: Mark Greens and populate frequency map
    let greens = 0;
    for (let i = 0; i < 5; i++) {
      if (guessStr[i] === this.target[i]) {
        result[i] = 2; // CORRECT
        greens++;
      } else {
        targetCounts[this.target[i]] = (targetCounts[this.target[i]] || 0) + 1;
      }
    }
    
    // Pass 2: Mark Yellows
    for (let i = 0; i < 5; i++) {
      if (result[i] !== 2) {
        const char = guessStr[i];
        if (targetCounts[char] && targetCounts[char] > 0) {
          result[i] = 1; // PRESENT
          targetCounts[char]--;
        } else {
          result[i] = 0; // ABSENT
        }
      }
    }
    
    // Apply visual status and keyboard state
    for (let i = 0; i < 5; i++) {
      const char = guessStr[i];
      const st = result[i];
      
      // +1 to visually distinguish 'submitted grey' (1) from 'empty grey' (0)
      // Actually let's use: 0=empty, 1=grey, 2=yellow, 3=green
      // Remap result array: 0 -> 1, 1 -> 2, 2 -> 3
      const mappedStatus = st + 1;
      guessRow[i].status = mappedStatus;
      
      // Update virtual keyboard mapping (only upgrade status, never downgrade)
      if (!this.keyStates[char] || this.keyStates[char] < mappedStatus) {
        this.keyStates[char] = mappedStatus;
      }
    }
    
    if (greens === 5) {
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.2);
      this.score += 500 + ((6 - this.currentRow) * 100);
      this.isOver = true;
      setTimeout(() => this.levelComplete(), 2000);
    } else {
      if (window.Sound) window.Sound.playTone(200, 'sawtooth', 0.1);
      this.currentRow++;
      this.currentCol = 0;
      
      if (this.currentRow >= 6) {
        this.lives = 0;
        this.isOver = true;
        if (window.Sound) window.Sound.playTone(100, 'square', 0.5);
      }
    }
  }

  update(delta) {
    //
  }

  render(ctx) {
    this.clear();
    
    const boxSize = 80;
    const gap = 10;
    
    const gridW = (5 * boxSize) + (4 * gap);
    const gridH = (6 * boxSize) + (5 * gap);
    
    const offsetX = (this.W - gridW) / 2;
    const offsetY = 100;
    
    ctx.font = '40px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = this.grid[r][c];
        const cx = offsetX + c * (boxSize + gap);
        const cy = offsetY + r * (boxSize + gap);
        
        let bgColor = '#0f172a';
        let borderColor = '#334155';
        
        if (cell.status === 1) { // Grey
          bgColor = '#334155';
          borderColor = '#334155';
        } else if (cell.status === 2) { // Yellow
          bgColor = '#ca8a04';
          borderColor = '#ca8a04';
        } else if (cell.status === 3) { // Green
          bgColor = '#10b981';
          borderColor = '#10b981';
        } else {
          // Empty, but might be active row
          if (r === this.currentRow && cell.char !== '') {
            borderColor = '#94a3b8'; // Typed but not submitted
          }
        }
        
        ctx.fillStyle = bgColor;
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 4;
        
        ctx.fillRect(cx, cy, boxSize, boxSize);
        ctx.strokeRect(cx, cy, boxSize, boxSize);
        
        if (cell.char) {
          ctx.fillStyle = '#fff';
          ctx.fillText(cell.char, cx + boxSize / 2, cy + boxSize / 2 + 5);
        }
      }
    }
    
    // Game Over Text
    if (this.isOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.8)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#fff';
      if (this.lives === 0) {
        ctx.fillStyle = '#ef4444';
        ctx.fillText(`TARGET WAS:`, this.W / 2, this.H / 2 - 40);
        ctx.fillStyle = '#fff';
        ctx.fillText(this.target, this.W / 2, this.H / 2 + 40);
      } else {
        ctx.fillStyle = '#10b981';
        ctx.fillText(`SYSTEM DECRYPTED`, this.W / 2, this.H / 2);
      }
    }
  }
}

export default Wordle;
