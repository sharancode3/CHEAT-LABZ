import { GameBase } from '../../core/game-base.js';

export class MultiplayerConnectFour extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.rows = 6;
    this.cols = 7;
    
    // 0 = empty, 1 = P1, 2 = P2
    this.board = [];
    for (let r = 0; r < this.rows; r++) {
      this.board.push(new Array(this.cols).fill(0));
    }
    
    this.p1Cursor = 2; // Start in column 2 (0-indexed)
    this.p2Cursor = 4; // Start in column 4
    
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    
    this.isP1Dropping = false;
    this.isP2Dropping = false;
    
    this.dropTime = 0.35; // 350ms drop animation
    
    this.activeDrops = []; // { player, col, startY, endY, timer }
    
    this.roundState = 'PLAYING';
    this.roundDelay = 0;
    
    this.winningChips = [];
    
    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver || this.roundState !== 'PLAYING') return;
      
      const key = e.key;
      
      // P1 Controls (A/D to move, Space to drop)
      if (!this.isP1Dropping) {
        if (key === 'a' || key === 'A') {
          this.p1Cursor = Math.max(0, this.p1Cursor - 1);
          if (window.Sound) window.Sound.playTone(400, 'square', 0.02);
        } else if (key === 'd' || key === 'D') {
          this.p1Cursor = Math.min(this.cols - 1, this.p1Cursor + 1);
          if (window.Sound) window.Sound.playTone(400, 'square', 0.02);
        } else if (key === ' ') {
          this.tryDrop(1, this.p1Cursor);
        }
      }
      
      // P2 Controls (Left/Right to move, Enter to drop)
      if (!this.isP2Dropping) {
        if (key === 'ArrowLeft') {
          this.p2Cursor = Math.max(0, this.p2Cursor - 1);
          if (window.Sound) window.Sound.playTone(600, 'square', 0.02);
        } else if (key === 'ArrowRight') {
          this.p2Cursor = Math.min(this.cols - 1, this.p2Cursor + 1);
          if (window.Sound) window.Sound.playTone(600, 'square', 0.02);
        } else if (key === 'Enter') {
          this.tryDrop(2, this.p2Cursor);
        }
      }
    };
  }

  tryDrop(player, col) {
    // Find empty row
    let targetRow = -1;
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.board[r][col] === 0) {
        targetRow = r;
        break;
      }
    }
    
    if (targetRow !== -1) {
      if (player === 1) this.isP1Dropping = true;
      if (player === 2) this.isP2Dropping = true;
      
      // Lock the cell immediately so the other player can't steal it while animating
      this.board[targetRow][col] = -1; // -1 means pending
      
      if (window.Sound) window.Sound.playTone(200, 'sawtooth', 0.1);
      
      this.activeDrops.push({
        player: player,
        col: col,
        targetRow: targetRow,
        timer: this.dropTime
      });
    } else {
      if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.1); // Error (Column full)
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.roundState === 'ROUND_OVER') {
      this.roundDelay -= delta;
      if (this.roundDelay <= 0) {
        this.resetRound();
      }
      return;
    }
    
    // Process drops
    for (let i = this.activeDrops.length - 1; i >= 0; i--) {
      let drop = this.activeDrops[i];
      drop.timer -= delta;
      
      if (drop.timer <= 0) {
        // Drop finished
        this.board[drop.targetRow][drop.col] = drop.player;
        
        if (drop.player === 1) this.isP1Dropping = false;
        if (drop.player === 2) this.isP2Dropping = false;
        
        if (window.Sound) window.Sound.playTone(150 + drop.targetRow * 50, 'square', 0.1);
        
        this.checkWin(drop.targetRow, drop.col, drop.player);
        this.activeDrops.splice(i, 1);
      }
    }
  }

  checkWin(r, c, player) {
    const directions = [
      [[0, 1], [0, -1]],   // Horizontal
      [[1, 0], [-1, 0]],   // Vertical
      [[1, 1], [-1, -1]],  // Diagonal \
      [[1, -1], [-1, 1]]   // Diagonal /
    ];
    
    for (let dirPair of directions) {
      let count = 1;
      let chips = [{r, c}];
      
      for (let dir of dirPair) {
        let nr = r + dir[0];
        let nc = c + dir[1];
        while (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols && this.board[nr][nc] === player) {
          count++;
          chips.push({r: nr, c: nc});
          nr += dir[0];
          nc += dir[1];
        }
      }
      
      if (count >= 4) {
        this.winningChips = chips;
        this.handleRoundEnd(player);
        return;
      }
    }
    
    // Check Draw
    let isFull = true;
    for (let col = 0; col < this.cols; col++) {
      if (this.board[0][col] === 0) isFull = false;
    }
    if (isFull) {
      this.handleRoundEnd(0);
    }
  }

  handleRoundEnd(winner) {
    this.roundState = 'ROUND_OVER';
    this.roundDelay = 3.0;
    
    if (winner === 1) {
      this.scoreP1++;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
    } else if (winner === 2) {
      this.scoreP2++;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
    } else {
      if (window.Sound) window.Sound.playTone(200, 'sawtooth', 0.5);
    }
    
    // Best 2 out of 3
    if (this.scoreP1 >= 2 || this.scoreP2 >= 2) {
      this.isOver = true;
      setTimeout(() => this.levelComplete(), 3000);
    }
  }

  resetRound() {
    for (let r = 0; r < this.rows; r++) {
      this.board[r].fill(0);
    }
    this.winningChips = [];
    this.roundState = 'PLAYING';
    this.isP1Dropping = false;
    this.isP2Dropping = false;
    this.activeDrops = [];
  }

  render(ctx) {
    this.clear();
    
    const cellSize = 100;
    const gridW = this.cols * cellSize;
    const gridH = this.rows * cellSize;
    const offsetX = (this.W - gridW) / 2;
    const offsetY = 150;
    
    // Header
    ctx.fillStyle = '#fff';
    ctx.font = '30px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("CONNECT 4", this.W / 2, 50);
    
    ctx.font = '24px "JetBrains Mono"';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`P1: ${this.scoreP1}`, this.W / 4, 90);
    
    ctx.fillStyle = '#fb7185';
    ctx.fillText(`P2: ${this.scoreP2}`, (this.W / 4) * 3, 90);
    
    // Draw Cursors (above the board)
    const drawCursor = (col, color, isDropping, label) => {
      const cx = offsetX + col * cellSize + cellSize / 2;
      const cy = offsetY - 30;
      
      ctx.fillStyle = color;
      
      if (!isDropping) {
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#000';
        ctx.font = '20px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
      }
    };
    
    drawCursor(this.p1Cursor, '#38bdf8', this.isP1Dropping, "P1");
    drawCursor(this.p2Cursor, '#fb7185', this.isP2Dropping, "P2");
    
    // Board Back
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(offsetX, offsetY, gridW, gridH);
    
    // Active Drops
    for (let drop of this.activeDrops) {
      const progress = 1.0 - (drop.timer / this.dropTime); // 0 to 1
      const startY = offsetY - 30;
      const targetY = offsetY + drop.targetRow * cellSize + cellSize / 2;
      const currentY = startY + (targetY - startY) * progress;
      const currentX = offsetX + drop.col * cellSize + cellSize / 2;
      
      ctx.fillStyle = drop.player === 1 ? '#38bdf8' : '#fb7185';
      ctx.beginPath();
      ctx.arc(currentX, currentY, cellSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Placed Chips & Board Mask
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const val = this.board[r][c];
        const cx = offsetX + c * cellSize + cellSize / 2;
        const cy = offsetY + r * cellSize + cellSize / 2;
        
        if (val === 1) {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (val === 2) {
          ctx.fillStyle = '#fb7185';
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // Highlight winning chips
        if (this.winningChips.some(chip => chip.r === r && chip.c === c)) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        // Board Mask (The blue structure with holes)
        ctx.fillStyle = '#1e3a8a';
        ctx.beginPath();
        ctx.rect(cx - cellSize/2, cy - cellSize/2, cellSize, cellSize);
        ctx.arc(cx, cy, cellSize * 0.4, 0, Math.PI * 2, true); // Hole
        ctx.fill();
      }
    }
    
    // Match Over
    if (this.isOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '50px "Press Start 2P"';
      ctx.textAlign = 'center';
      if (this.scoreP1 > this.scoreP2) {
        ctx.fillText("P1 WINS MATCH!", this.W / 2, this.H / 2);
      } else if (this.scoreP2 > this.scoreP1) {
        ctx.fillText("P2 WINS MATCH!", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("DRAW MATCH!", this.W / 2, this.H / 2);
      }
    }
  }
}
