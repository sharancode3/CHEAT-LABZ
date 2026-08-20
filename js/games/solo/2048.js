import { GameBase } from '../../core/game-base.js';

export class Game2048 extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.gridSize = 4;
    this.grid = [];
    for (let i = 0; i < this.gridSize; i++) {
      this.grid.push(new Array(this.gridSize).fill(0));
    }
    
    // Spawn two initial tiles
    this.spawnTile();
    this.spawnTile();
    
    this.isAnimating = false;
    
    this.setupInput();
  }

  spawnTile() {
    let emptyCells = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    
    if (emptyCells.length > 0) {
      let cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver || this.isAnimating) return;
      
      let moved = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') moved = this.moveGrid(-1, 0);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') moved = this.moveGrid(1, 0);
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') moved = this.moveGrid(0, -1);
      if (e.code === 'ArrowRight' || e.code === 'KeyD') moved = this.moveGrid(0, 1);
      
      if (moved) {
        if (window.Sound) window.Sound.playTone(300, 'sine', 0.05);
        this.spawnTile();
        this.checkGameOver();
      }
    };
  }

  // Returns true if the grid changed state
  moveGrid(dr, dc) {
    let moved = false;
    
    // Create copy for comparison
    const oldGrid = JSON.stringify(this.grid);
    
    // Helper function to slide and merge a 1D array
    const processArray = (arr) => {
      // 1. Compress (remove zeros)
      let compressed = arr.filter(val => val !== 0);
      
      // 2. Merge
      for (let i = 0; i < compressed.length - 1; i++) {
        if (compressed[i] === compressed[i + 1]) {
          compressed[i] *= 2;
          this.score += compressed[i];
          compressed.splice(i + 1, 1);
          if (window.Sound) window.Sound.playTone(600 + compressed[i], 'square', 0.05);
        }
      }
      
      // 3. Re-pad with zeros
      while (compressed.length < this.gridSize) {
        compressed.push(0);
      }
      return compressed;
    };
    
    if (dc === -1) { // Left
      for (let r = 0; r < this.gridSize; r++) {
        this.grid[r] = processArray(this.grid[r]);
      }
    } else if (dc === 1) { // Right
      for (let r = 0; r < this.gridSize; r++) {
        this.grid[r] = processArray(this.grid[r].reverse()).reverse();
      }
    } else if (dr === -1) { // Up
      for (let c = 0; c < this.gridSize; c++) {
        let col = [];
        for (let r = 0; r < this.gridSize; r++) col.push(this.grid[r][c]);
        col = processArray(col);
        for (let r = 0; r < this.gridSize; r++) this.grid[r][c] = col[r];
      }
    } else if (dr === 1) { // Down
      for (let c = 0; c < this.gridSize; c++) {
        let col = [];
        for (let r = 0; r < this.gridSize; r++) col.push(this.grid[r][c]);
        col = processArray(col.reverse()).reverse();
        for (let r = 0; r < this.gridSize; r++) this.grid[r][c] = col[r];
      }
    }
    
    return oldGrid !== JSON.stringify(this.grid);
  }

  checkGameOver() {
    // 1. Check for empty cells
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] === 0) return false;
      }
    }
    
    // 2. Check horizontal merges
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize - 1; c++) {
        if (this.grid[r][c] === this.grid[r][c + 1]) return false;
      }
    }
    
    // 3. Check vertical merges
    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize - 1; r++) {
        if (this.grid[r][c] === this.grid[r + 1][c]) return false;
      }
    }
    
    // If we reach here, game is truly over
    this.lives = 0;
    this.isOver = true;
    if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.5);
  }

  update(delta) {
    // Handled purely by events
  }

  getTileColor(val) {
    const colors = {
      2: '#eee4da',
      4: '#ede0c8',
      8: '#f2b179',
      16: '#f59563',
      32: '#f67c5f',
      64: '#f65e3b',
      128: '#edcf72',
      256: '#edcc61',
      512: '#edc850',
      1024: '#edc53f',
      2048: '#edc22e'
    };
    return colors[val] || '#3c3a32';
  }
  
  getTextColor(val) {
    return val <= 4 ? '#776e65' : '#f9f6f2';
  }

  render(ctx) {
    this.clear();
    
    const boxSize = 120;
    const gap = 15;
    
    const gridW = (this.gridSize * boxSize) + ((this.gridSize - 1) * gap);
    const offsetX = (this.W - gridW) / 2;
    const offsetY = (this.H - gridW) / 2 + 50;
    
    // Draw Board Background
    ctx.fillStyle = '#bbada0';
    ctx.beginPath();
    ctx.roundRect(offsetX - gap, offsetY - gap, gridW + gap*2, gridW + gap*2, 10);
    ctx.fill();
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        const val = this.grid[r][c];
        const x = offsetX + c * (boxSize + gap);
        const y = offsetY + r * (boxSize + gap);
        
        ctx.fillStyle = val === 0 ? 'rgba(238, 228, 218, 0.35)' : this.getTileColor(val);
        ctx.beginPath();
        ctx.roundRect(x, y, boxSize, boxSize, 5);
        ctx.fill();
        
        if (val > 0) {
          ctx.fillStyle = this.getTextColor(val);
          // Auto size font
          if (val > 1000) ctx.font = 'bold 36px "JetBrains Mono"';
          else if (val > 100) ctx.font = 'bold 44px "JetBrains Mono"';
          else ctx.font = 'bold 54px "JetBrains Mono"';
          
          ctx.fillText(val.toString(), x + boxSize / 2, y + boxSize / 2);
        }
      }
    }
    
    // Header
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 60px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.fillText("2048", offsetX - gap, 100);
    
    // Score Box
    ctx.fillStyle = '#bbada0';
    ctx.beginPath();
    ctx.roundRect(offsetX + gridW - 140, 40, 160, 80, 5);
    ctx.fill();
    
    ctx.fillStyle = '#eee4da';
    ctx.font = 'bold 16px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText("SCORE", offsetX + gridW - 60, 65);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px "JetBrains Mono"';
    ctx.fillText(this.score.toString(), offsetX + gridW - 60, 95);
    
    if (this.isOver) {
      ctx.fillStyle = 'rgba(238, 228, 218, 0.73)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#776e65';
      ctx.font = 'bold 60px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText("Game Over!", this.W / 2, this.H / 2);
    }
  }
}

export default Game2048;
