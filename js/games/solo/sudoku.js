import { GameBase } from '../../core/game-base.js';

export class Sudoku extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.grid = [];
    for (let r = 0; r < 9; r++) {
      let row = [];
      for (let c = 0; c < 9; c++) {
        row.push({ val: 0, isGiven: false, isError: false, marks: new Set() });
      }
      this.grid.push(row);
    }
    
    this.solution = [];
    this.generateBoard();
    
    this.selectedR = -1;
    this.selectedC = -1;
    
    this.maxMistakes = 3;
    this.mistakes = 0;
    
    this.setupInput();
  }

  generateBoard() {
    // 1. Fill diagonal 3x3 boxes first (they are independent)
    for (let i = 0; i < 9; i = i + 3) {
      this.fillBox(i, i);
    }
    
    // 2. Solve the rest of the board using backtracking
    this.solveSudoku(0, 3);
    
    // Save solution
    for (let r = 0; r < 9; r++) {
      let row = [];
      for (let c = 0; c < 9; c++) {
        row.push(this.grid[r][c].val);
      }
      this.solution.push(row);
    }
    
    // 3. Dig holes based on difficulty
    let cluesToLeave = 38; // Medium-ish
    if (this.level === 1) cluesToLeave = 42; // Easy
    if (this.level > 2) cluesToLeave = 30; // Hard
    
    let cellsToRemove = 81 - cluesToLeave;
    
    while (cellsToRemove > 0) {
      let r = Math.floor(Math.random() * 9);
      let c = Math.floor(Math.random() * 9);
      if (this.grid[r][c].val !== 0) {
        this.grid[r][c].val = 0;
        cellsToRemove--;
      }
    }
    
    // Mark givens
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.grid[r][c].val !== 0) {
          this.grid[r][c].isGiven = true;
        }
      }
    }
  }

  fillBox(rowStart, colStart) {
    let num;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        do {
          num = Math.floor(Math.random() * 9) + 1;
        } while (!this.unUsedInBox(rowStart, colStart, num));
        this.grid[rowStart + i][colStart + j].val = num;
      }
    }
  }

  unUsedInBox(rowStart, colStart, num) {
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (this.grid[rowStart + i][colStart + j].val === num) return false;
      }
    }
    return true;
  }

  checkIfSafe(i, j, num) {
    return (
      this.unUsedInRow(i, num) &&
      this.unUsedInCol(j, num) &&
      this.unUsedInBox(i - (i % 3), j - (j % 3), num)
    );
  }

  unUsedInRow(i, num) {
    for (let j = 0; j < 9; j++) {
      if (this.grid[i][j].val === num) return false;
    }
    return true;
  }

  unUsedInCol(j, num) {
    for (let i = 0; i < 9; i++) {
      if (this.grid[i][j].val === num) return false;
    }
    return true;
  }

  solveSudoku(row, col) {
    if (row === 8 && col === 9) return true;
    if (col === 9) {
      row++;
      col = 0;
    }
    if (this.grid[row][col].val !== 0) return this.solveSudoku(row, col + 1);

    for (let num = 1; num <= 9; num++) {
      if (this.checkIfSafe(row, col, num)) {
        this.grid[row][col].val = num;
        if (this.solveSudoku(row, col + 1)) return true;
        this.grid[row][col].val = 0;
      }
    }
    return false;
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      const boxSize = 60;
      const offsetX = (this.W - 9 * boxSize) / 2;
      const offsetY = 100;
      
      if (e.x >= offsetX && e.x <= offsetX + 9 * boxSize &&
          e.y >= offsetY && e.y <= offsetY + 9 * boxSize) {
        
        let c = Math.floor((e.x - offsetX) / boxSize);
        let r = Math.floor((e.y - offsetY) / boxSize);
        
        this.selectedR = r;
        this.selectedC = c;
      } else {
        this.selectedR = -1;
        this.selectedC = -1;
      }
    };
    
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      if (this.selectedR !== -1 && this.selectedC !== -1) {
        const cell = this.grid[this.selectedR][this.selectedC];
        
        if (!cell.isGiven) {
          if (e.key >= '1' && e.key <= '9') {
            const num = parseInt(e.key, 10);
            
            // Check if correct against solution
            if (this.solution[this.selectedR][this.selectedC] === num) {
              cell.val = num;
              cell.isError = false;
              if (window.Sound) window.Sound.playTone(400, 'sine', 0.1);
              this.score += 50;
              this.checkWin();
            } else {
              cell.val = num;
              cell.isError = true;
              this.mistakes++;
              this.score = Math.max(0, this.score - 20);
              if (window.Sound) window.Sound.playTone(150, 'square', 0.2);
              
              if (this.mistakes >= this.maxMistakes) {
                this.isOver = true;
                this.lives = 0;
                if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.5);
              }
            }
          } else if (e.code === 'Backspace' || e.code === 'Delete') {
            cell.val = 0;
            cell.isError = false;
          }
        }
      }
    };
  }

  checkWin() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.grid[r][c].val === 0 || this.grid[r][c].isError) return;
      }
    }
    
    this.isOver = true;
    this.score += 1000;
    if (window.Sound) window.Sound.playTone(800, 'sine', 0.3);
    setTimeout(() => this.levelComplete(), 2000);
  }

  update(delta) {
    //
  }

  render(ctx) {
    this.clear();
    
    const boxSize = 60;
    const gridW = 9 * boxSize;
    const offsetX = (this.W - gridW) / 2;
    const offsetY = 100;
    
    ctx.font = '30px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Draw cells
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const x = offsetX + c * boxSize;
        const y = offsetY + r * boxSize;
        const cell = this.grid[r][c];
        
        ctx.fillStyle = '#0f172a';
        
        if (this.selectedR === r && this.selectedC === c) {
          ctx.fillStyle = '#334155'; // Highlight selected
        } else if (this.selectedR !== -1 && this.selectedC !== -1) {
          // Highlight same row/col/box
          if (this.selectedR === r || this.selectedC === c || 
             (Math.floor(this.selectedR/3) === Math.floor(r/3) && Math.floor(this.selectedC/3) === Math.floor(c/3))) {
            ctx.fillStyle = '#1e293b';
          }
          // Highlight same number
          if (cell.val !== 0 && cell.val === this.grid[this.selectedR][this.selectedC].val) {
            ctx.fillStyle = '#475569';
          }
        }
        
        ctx.fillRect(x, y, boxSize, boxSize);
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, boxSize, boxSize);
        
        if (cell.val !== 0) {
          if (cell.isGiven) ctx.fillStyle = '#94a3b8'; // Given
          else if (cell.isError) ctx.fillStyle = '#ef4444'; // Error
          else ctx.fillStyle = '#38bdf8'; // Correct user input
          
          ctx.fillText(cell.val, x + boxSize / 2, y + boxSize / 2);
        }
      }
    }
    
    // Draw thick lines for 3x3 boxes
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 9; i += 3) {
      ctx.beginPath();
      ctx.moveTo(offsetX + i * boxSize, offsetY);
      ctx.lineTo(offsetX + i * boxSize, offsetY + gridW);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + i * boxSize);
      ctx.lineTo(offsetX + gridW, offsetY + i * boxSize);
      ctx.stroke();
    }
    
    // Mistakes HUD
    ctx.fillStyle = this.mistakes === 2 ? '#ef4444' : '#fff';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'left';
    ctx.fillText(`MISTAKES: ${this.mistakes}/${this.maxMistakes}`, offsetX, 50);
    
    if (this.isOver) {
      ctx.fillStyle = this.lives === 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }
}

export default Sudoku;
