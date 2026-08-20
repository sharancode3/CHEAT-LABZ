import { GameBase } from '../../core/game-base.js';

export class ConnectFour extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.rows = 6;
    this.cols = 7;
    
    this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
    this.topRow = Array(this.cols).fill(this.rows - 1);
    
    this.currentTurn = 1; // 1 = P1 (Red), 2 = AI (Yellow)
    this.gameState = 'PLAYING'; // PLAYING, DROPPING, WIN, DRAW
    this.stateTimer = 0;
    this.winner = null;
    
    // Animation state
    this.dropAnim = {
      active: false,
      col: 0,
      startRow: 0,
      targetRow: 0,
      currentRow: 0,
      player: 1
    };

    // Calculate grid rendering dimensions
    this.cellSize = 80;
    this.gridW = this.cols * this.cellSize;
    this.gridH = this.rows * this.cellSize;
    this.offsetX = (this.W - this.gridW) / 2;
    this.offsetY = (this.H - this.gridH) / 2;
    
    // Interactive hover
    this.hoverCol = -1;
    
    this.setupInput();
  }

  setupInput() {
    this.input.onMouseMove = (e) => {
      if (this.isPaused || this.isOver || this.gameState !== 'PLAYING' || this.currentTurn !== 1) return;
      
      const mx = this.input.mouse.x;
      if (mx >= this.offsetX && mx <= this.offsetX + this.gridW) {
        this.hoverCol = Math.floor((mx - this.offsetX) / this.cellSize);
      } else {
        this.hoverCol = -1;
      }
    };
    
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver || this.gameState !== 'PLAYING' || this.currentTurn !== 1) return;
      
      const mx = this.input.mouse.x;
      if (mx >= this.offsetX && mx <= this.offsetX + this.gridW) {
        const col = Math.floor((mx - this.offsetX) / this.cellSize);
        this.dropToken(col, 1);
      }
    };
  }
  
  dropToken(col, player) {
    if (this.topRow[col] < 0) return; // Column full
    
    const targetRow = this.topRow[col];
    this.topRow[col]--; // Update logical top
    
    this.dropAnim = {
      active: true,
      col: col,
      startRow: -1, // Start slightly above grid
      targetRow: targetRow,
      currentRow: -1,
      player: player,
      velocity: 0
    };
    
    this.gameState = 'DROPPING';
    if (window.Sound) window.Sound.playTone(800, 'square', 0.05); // drop start sound
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.gameState === 'PLAYING') {
      if (this.currentTurn === 2) {
        this.makeAIMove();
      }
    } else if (this.gameState === 'DROPPING') {
      this.updateDropAnimation(delta);
    } else if (this.gameState === 'WIN' || this.gameState === 'DRAW') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        if (this.winner === 1) {
          this.score += 5000;
          this.levelComplete();
        } else {
          this.lives -= 1;
          if (this.lives > 0) {
            this.init(); // Restart game
          }
        }
      }
    }
  }

  updateDropAnimation(delta) {
    // Gravity physics for drop
    this.dropAnim.velocity += 30 * delta; // Acceleration
    this.dropAnim.currentRow += this.dropAnim.velocity * delta;
    
    if (this.dropAnim.currentRow >= this.dropAnim.targetRow) {
      // Hit bottom
      this.dropAnim.currentRow = this.dropAnim.targetRow;
      this.dropAnim.active = false;
      
      // Lock into grid
      this.grid[this.dropAnim.targetRow][this.dropAnim.col] = this.dropAnim.player;
      
      if (window.Sound) window.Sound.playTone(300, 'sawtooth', 0.1); // clack sound
      
      // Check win
      if (this.checkWin(this.dropAnim.targetRow, this.dropAnim.col, this.dropAnim.player)) {
        this.gameState = 'WIN';
        this.winner = this.dropAnim.player;
        this.stateTimer = 3.0;
        if (window.Sound) window.Sound.playTone(this.winner === 1 ? 600 : 200, 'sine', 0.5);
      } else if (this.isBoardFull()) {
        this.gameState = 'DRAW';
        this.stateTimer = 3.0;
      } else {
        // Next turn
        this.currentTurn = this.currentTurn === 1 ? 2 : 1;
        this.gameState = 'PLAYING';
      }
    }
  }
  
  isBoardFull() {
    return this.topRow.every(r => r < 0);
  }

  checkWin(row, col, player) {
    const directions = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal /
      [1, -1]  // Diagonal \
    ];
    
    for (let dir of directions) {
      const count = 1 + this.countDirection(row, col, dir[0], dir[1], player) 
                      + this.countDirection(row, col, -dir[0], -dir[1], player);
      
      if (count >= 4) return true;
    }
    return false;
  }
  
  countDirection(r, c, dr, dc, player) {
    let count = 0;
    let currR = r + dr;
    let currC = c + dc;
    
    while (currR >= 0 && currR < this.rows && currC >= 0 && currC < this.cols) {
      if (this.grid[currR][currC] === player) {
        count++;
        currR += dr;
        currC += dc;
      } else {
        break;
      }
    }
    return count;
  }

  makeAIMove() {
    // Simple heuristic AI for now:
    // 1. Can I win?
    // 2. Can I block player from winning?
    // 3. Play center if available
    // 4. Random valid column
    
    // Wait briefly before moving
    if (this.stateTimer > 0) {
      // Actually we don't have a timer here, just a direct call.
      // We can add a slight delay for better feel if we want.
    }

    const availableCols = [];
    for (let c = 0; c < this.cols; c++) {
      if (this.topRow[c] >= 0) availableCols.push(c);
    }
    
    if (availableCols.length === 0) return;
    
    // Check for AI win
    for (let c of availableCols) {
      if (this.simulateDropAndCheckWin(c, 2)) {
        this.dropToken(c, 2);
        return;
      }
    }
    
    // Check for Player block
    for (let c of availableCols) {
      if (this.simulateDropAndCheckWin(c, 1)) {
        this.dropToken(c, 2);
        return;
      }
    }
    
    // Level scaling: if lower level, sometimes ignore block/win and just play randomly
    const mistakeChance = Math.max(0, 0.5 - (this.level * 0.05));
    if (Math.random() < mistakeChance) {
      const randCol = availableCols[Math.floor(Math.random() * availableCols.length)];
      this.dropToken(randCol, 2);
      return;
    }
    
    // Prefer center columns
    const centerPref = [3, 2, 4, 1, 5, 0, 6];
    for (let c of centerPref) {
      if (availableCols.includes(c)) {
        this.dropToken(c, 2);
        return;
      }
    }
    
    // Fallback
    const randCol = availableCols[Math.floor(Math.random() * availableCols.length)];
    this.dropToken(randCol, 2);
  }
  
  simulateDropAndCheckWin(col, player) {
    const r = this.topRow[col];
    this.grid[r][col] = player; // Temporarily place
    const wins = this.checkWin(r, col, player);
    this.grid[r][col] = 0; // Remove
    return wins;
  }

  drawToken(ctx, x, y, player, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    
    const color = player === 1 ? '#f43f5e' : '#facc15'; // Red vs Yellow
    
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Inner bevel
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  render(ctx) {
    this.clear();
    
    const radius = this.cellSize / 2 - 8;
    
    // Draw Background Grid Frame
    ctx.fillStyle = '#1e3a8a'; // Deep blue
    ctx.shadowColor = '#3b82f6';
    ctx.shadowBlur = 20;
    
    // Draw the blue board with holes
    ctx.beginPath();
    ctx.rect(this.offsetX - 20, this.offsetY - 20, this.gridW + 40, this.gridH + 40);
    
    // Cut out holes (using winding rules)
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cx = this.offsetX + c * this.cellSize + this.cellSize / 2;
        const cy = this.offsetY + r * this.cellSize + this.cellSize / 2;
        ctx.moveTo(cx + radius, cy);
        ctx.arc(cx, cy, radius, 0, Math.PI * 2, true); // Anti-clockwise
      }
    }
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw Tokens in Grid
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] !== 0) {
          const cx = this.offsetX + c * this.cellSize + this.cellSize / 2;
          const cy = this.offsetY + r * this.cellSize + this.cellSize / 2;
          this.drawToken(ctx, cx, cy, this.grid[r][c], radius);
        }
      }
    }
    
    // Draw Dropping Token
    if (this.dropAnim.active) {
      const cx = this.offsetX + this.dropAnim.col * this.cellSize + this.cellSize / 2;
      const cy = this.offsetY + this.dropAnim.currentRow * this.cellSize + this.cellSize / 2;
      this.drawToken(ctx, cx, cy, this.dropAnim.player, radius);
    }
    
    // Draw Hover Indicator
    if (this.gameState === 'PLAYING' && this.currentTurn === 1 && this.hoverCol >= 0 && this.topRow[this.hoverCol] >= 0) {
      const cx = this.offsetX + this.hoverCol * this.cellSize + this.cellSize / 2;
      const cy = this.offsetY - this.cellSize / 2;
      ctx.globalAlpha = 0.5;
      this.drawToken(ctx, cx, cy, 1, radius);
      ctx.globalAlpha = 1.0;
    }
    
    // Overlays
    if (this.gameState === 'WIN') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      const winColor = this.winner === 1 ? '#f43f5e' : '#facc15';
      ctx.fillStyle = winColor;
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.shadowColor = winColor;
      ctx.shadowBlur = 20;
      ctx.fillText(this.winner === 1 ? "YOU WIN" : "AI WINS", this.W / 2, this.H / 2);
      ctx.shadowBlur = 0;
    } else if (this.gameState === 'DRAW') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#fff';
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText("DRAW", this.W / 2, this.H / 2);
    }
  }
}
