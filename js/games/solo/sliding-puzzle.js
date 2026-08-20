import { GameBase } from '../../core/game-base.js';

export class SlidingPuzzle extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    // 4x4 for a standard 15-puzzle
    this.size = 4;
    this.board = []; // 1D array for easier inversion math
    this.emptyIndex = 15;
    
    this.generateSolvableBoard();
    
    this.moves = 0;
    this.setupInput();
  }

  generateSolvableBoard() {
    const numTiles = this.size * this.size;
    let solvable = false;
    
    while (!solvable) {
      // 1. Generate array 0 to 15 (0 is empty)
      this.board = Array.from({length: numTiles}, (_, i) => i);
      
      // 2. Shuffle
      for (let i = this.board.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.board[i], this.board[j]] = [this.board[j], this.board[i]];
      }
      
      this.emptyIndex = this.board.indexOf(0);
      
      // 3. Verify solvability
      let inversions = 0;
      for (let i = 0; i < numTiles - 1; i++) {
        for (let j = i + 1; j < numTiles; j++) {
          if (this.board[i] !== 0 && this.board[j] !== 0 && this.board[i] > this.board[j]) {
            inversions++;
          }
        }
      }
      
      if (this.size % 2 !== 0) {
        // Odd grid: Inversions must be even
        solvable = inversions % 2 === 0;
      } else {
        // Even grid: (Inversions + empty row from bottom) must be odd
        const rowFromBottom = this.size - Math.floor(this.emptyIndex / this.size);
        solvable = (inversions + rowFromBottom) % 2 !== 0;
      }
      
      // Check if it's already solved (edge case)
      let isSolved = true;
      for (let i = 0; i < numTiles - 1; i++) {
        if (this.board[i] !== i + 1) isSolved = false;
      }
      if (isSolved) solvable = false;
    }
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      const boxSize = 120;
      const gap = 10;
      const gridW = (this.size * boxSize) + ((this.size - 1) * gap);
      const offsetX = (this.W - gridW) / 2;
      const offsetY = 150;
      
      // Which col and row did we click?
      if (e.x >= offsetX && e.x <= offsetX + gridW &&
          e.y >= offsetY && e.y <= offsetY + gridW) {
        
        let c = Math.floor((e.x - offsetX) / (boxSize + gap));
        let r = Math.floor((e.y - offsetY) / (boxSize + gap));
        
        // Ensure click isn't in a gap
        const cellX = offsetX + c * (boxSize + gap);
        const cellY = offsetY + r * (boxSize + gap);
        if (e.x <= cellX + boxSize && e.y <= cellY + boxSize) {
          this.attemptMove(r, c);
        }
      }
    };
  }

  attemptMove(r, c) {
    const clickIdx = r * this.size + c;
    const emptyR = Math.floor(this.emptyIndex / this.size);
    const emptyC = this.emptyIndex % this.size;
    
    // Manhattan distance must be exactly 1
    const dist = Math.abs(r - emptyR) + Math.abs(c - emptyC);
    
    if (dist === 1) {
      // Swap
      [this.board[this.emptyIndex], this.board[clickIdx]] = [this.board[clickIdx], this.board[this.emptyIndex]];
      this.emptyIndex = clickIdx;
      
      this.moves++;
      if (window.Sound) window.Sound.playTone(300, 'square', 0.05);
      
      this.checkWin();
    }
  }

  checkWin() {
    let won = true;
    for (let i = 0; i < this.board.length - 1; i++) {
      if (this.board[i] !== i + 1) {
        won = false;
        break;
      }
    }
    // Check empty is last
    if (this.board[this.board.length - 1] !== 0) won = false;
    
    if (won) {
      this.isOver = true;
      this.score += Math.max(0, 10000 - (this.moves * 50));
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.3);
      setTimeout(() => this.levelComplete(), 2000);
    }
  }

  update(delta) {
    //
  }

  render(ctx) {
    this.clear();
    
    const boxSize = 120;
    const gap = 10;
    const gridW = (this.size * boxSize) + ((this.size - 1) * gap);
    const offsetX = (this.W - gridW) / 2;
    const offsetY = 150;
    
    // Title & Moves
    ctx.fillStyle = '#fff';
    ctx.font = '40px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("SLIDING PUZZLE", this.W / 2, 70);
    
    ctx.font = '20px "JetBrains Mono"';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`MOVES: ${this.moves}`, this.W / 2, 110);
    
    // Draw Board
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(offsetX - 20, offsetY - 20, gridW + 40, gridW + 40);
    
    ctx.font = '50px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < this.board.length; i++) {
      const val = this.board[i];
      if (val === 0) continue; // Skip empty space
      
      const r = Math.floor(i / this.size);
      const c = i % this.size;
      
      const x = offsetX + c * (boxSize + gap);
      const y = offsetY + r * (boxSize + gap);
      
      // Calculate color based on position correctness
      const correctI = val - 1;
      const isCorrect = correctI === i;
      
      ctx.fillStyle = isCorrect ? '#10b981' : '#334155';
      ctx.fillRect(x, y, boxSize, boxSize);
      
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, boxSize, boxSize);
      
      // Parallax text shadow effect
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillText(val, x + boxSize/2 + 3, y + boxSize/2 + 3);
      
      ctx.fillStyle = '#fff';
      ctx.fillText(val, x + boxSize/2, y + boxSize/2);
    }
    
    if (this.isOver) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }
}
