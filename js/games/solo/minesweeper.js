import { GameBase } from '../../core/game-base.js';

export class Minesweeper extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.rows = 12;
    this.cols = 12;
    this.totalMines = 20;
    
    if (this.level === 1) {
      this.rows = 9; this.cols = 9; this.totalMines = 10;
    } else if (this.level > 2) {
      this.rows = 16; this.cols = 16; this.totalMines = 40;
    }
    
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      let row = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({
          hasMine: false,
          isRevealed: false,
          isFlagged: false,
          neighborMines: 0
        });
      }
      this.grid.push(row);
    }
    
    this.isFirstClick = true;
    this.minesFlagged = 0;
    this.cellsRevealed = 0;
    
    this.setupInput();
  }

  generateMines(firstR, firstC) {
    let minesPlaced = 0;
    while (minesPlaced < this.totalMines) {
      const r = Math.floor(Math.random() * this.rows);
      const c = Math.floor(Math.random() * this.cols);
      
      // Ensure we don't place a mine on the first click, or its 8 neighbors
      if (!this.grid[r][c].hasMine && 
          Math.max(Math.abs(r - firstR), Math.abs(c - firstC)) > 1) {
        this.grid[r][c].hasMine = true;
        minesPlaced++;
      }
    }
    
    // Calculate neighbor counts
    const dirs = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[r][c].hasMine) {
          let count = 0;
          for (const [dr, dc] of dirs) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
              if (this.grid[nr][nc].hasMine) count++;
            }
          }
          this.grid[r][c].neighborMines = count;
        }
      }
    }
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      const boxSize = Math.floor(600 / Math.max(this.rows, this.cols));
      const gridW = this.cols * boxSize;
      const gridH = this.rows * boxSize;
      const offsetX = (this.W - gridW) / 2;
      const offsetY = 120;
      
      if (e.x >= offsetX && e.x < offsetX + gridW &&
          e.y >= offsetY && e.y < offsetY + gridH) {
        
        let c = Math.floor((e.x - offsetX) / boxSize);
        let r = Math.floor((e.y - offsetY) / boxSize);
        
        // Button 0 is left click, button 2 is right click
        if (e.button === 0) {
          this.revealCell(r, c);
        } else if (e.button === 2) {
          this.toggleFlag(r, c);
        }
      }
    };
  }

  revealCell(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return;
    
    const cell = this.grid[r][c];
    if (cell.isRevealed || cell.isFlagged) return;
    
    if (this.isFirstClick) {
      this.isFirstClick = false;
      this.generateMines(r, c);
    }
    
    cell.isRevealed = true;
    this.cellsRevealed++;
    
    if (cell.hasMine) {
      // GAME OVER
      this.isOver = true;
      this.lives = 0;
      if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.8);
      return;
    }
    
    if (window.Sound) window.Sound.playTone(600 + (this.cellsRevealed * 2), 'sine', 0.02);
    this.score += 10;
    
    // Flood fill
    if (cell.neighborMines === 0) {
      const dirs = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
      for (const [dr, dc] of dirs) {
        this.revealCell(r + dr, c + dc);
      }
    }
    
    this.checkWin();
  }

  toggleFlag(r, c) {
    if (this.isFirstClick) return; // Don't allow flags before first click
    
    const cell = this.grid[r][c];
    if (cell.isRevealed) return;
    
    cell.isFlagged = !cell.isFlagged;
    if (cell.isFlagged) {
      this.minesFlagged++;
      if (window.Sound) window.Sound.playTone(800, 'square', 0.05);
    } else {
      this.minesFlagged--;
      if (window.Sound) window.Sound.playTone(400, 'square', 0.05);
    }
  }

  checkWin() {
    const totalSafeCells = (this.rows * this.cols) - this.totalMines;
    if (this.cellsRevealed === totalSafeCells) {
      this.isOver = true;
      this.score += 2000;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.3);
      setTimeout(() => this.levelComplete(), 2000);
    }
  }

  update(delta) {
    //
  }

  render(ctx) {
    this.clear();
    
    const boxSize = Math.floor(600 / Math.max(this.rows, this.cols));
    const gridW = this.cols * boxSize;
    const gridH = this.rows * boxSize;
    const offsetX = (this.W - gridW) / 2;
    const offsetY = 120;
    
    // Header
    ctx.fillStyle = '#fff';
    ctx.font = '30px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("MINESWEEPER", this.W / 2, 50);
    
    ctx.font = '20px "JetBrains Mono"';
    ctx.fillStyle = '#ef4444';
    ctx.fillText(`MINES: ${this.totalMines - this.minesFlagged}`, this.W / 2, 90);
    
    ctx.font = '24px "JetBrains Mono"';
    ctx.textBaseline = 'middle';
    
    const colors = [
      '', '#3b82f6', '#10b981', '#ef4444', 
      '#6366f1', '#8b5cf6', '#14b8a6', '#000000', '#64748b'
    ];
    
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        const x = offsetX + c * boxSize;
        const y = offsetY + r * boxSize;
        
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, boxSize, boxSize);
        
        if (cell.isRevealed) {
          if (cell.hasMine) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x + 1, y + 1, boxSize - 2, boxSize - 2);
            ctx.fillStyle = '#fff';
            ctx.fillText('*', x + boxSize/2, y + boxSize/2 + 4);
          } else {
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(x + 1, y + 1, boxSize - 2, boxSize - 2);
            
            if (cell.neighborMines > 0) {
              ctx.fillStyle = colors[cell.neighborMines] || '#fff';
              ctx.fillText(cell.neighborMines.toString(), x + boxSize/2, y + boxSize/2);
            }
          }
        } else {
          // Unrevealed
          ctx.fillStyle = '#334155';
          ctx.fillRect(x + 1, y + 1, boxSize - 2, boxSize - 2);
          
          // Bevel effect
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + boxSize, y);
          ctx.lineTo(x + boxSize - 4, y + 4);
          ctx.lineTo(x + 4, y + 4);
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + boxSize);
          ctx.lineTo(x + 4, y + boxSize - 4);
          ctx.lineTo(x + 4, y + 4);
          ctx.fill();
          
          if (cell.isFlagged) {
            ctx.fillStyle = '#ef4444';
            ctx.fillText('F', x + boxSize/2, y + boxSize/2);
          }
        }
      }
    }
    
    if (this.isOver) {
      if (this.lives === 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.fillRect(0, 0, this.W, this.H);
        ctx.fillStyle = '#fff';
        ctx.font = '50px "Press Start 2P"';
        ctx.fillText("BOOM!", this.W / 2, this.H / 2);
      } else {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.fillRect(0, 0, this.W, this.H);
        ctx.fillStyle = '#fff';
        ctx.font = '50px "Press Start 2P"';
        ctx.fillText("CLEARED!", this.W / 2, this.H / 2);
      }
    }
  }
}

export default Minesweeper;
