import { GameBase } from '../../core/game-base.js';

export class MultiplayerTicTacToe extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.board = Array(9).fill(0); // 0 = empty, 1 = P1 (X), 2 = P2 (O)
    this.currentPlayer = 1; // 1 or 2
    
    this.scoreP1 = 0;
    this.scoreP2 = 0;
    
    this.turnTimer = 5.0; // 5 second turn timer
    this.turnState = 'PLAYING'; // PLAYING, ROUND_OVER, MATCH_OVER
    this.roundDelay = 0;
    
    this.winningLine = null;
    
    this.setupInput();
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver || this.turnState !== 'PLAYING') return;
      
      const boxSize = 200;
      const offsetX = (this.W - boxSize * 3) / 2;
      const offsetY = 150;
      
      if (e.x >= offsetX && e.x < offsetX + boxSize * 3 &&
          e.y >= offsetY && e.y < offsetY + boxSize * 3) {
        
        let c = Math.floor((e.x - offsetX) / boxSize);
        let r = Math.floor((e.y - offsetY) / boxSize);
        let idx = r * 3 + c;
        
        if (this.board[idx] === 0) {
          this.placeMark(idx);
        }
      }
    };
  }

  placeMark(idx) {
    this.board[idx] = this.currentPlayer;
    
    if (window.Sound) window.Sound.playTone(this.currentPlayer === 1 ? 400 : 600, 'square', 0.1);
    
    if (this.checkWin(this.currentPlayer)) {
      this.handleRoundEnd(this.currentPlayer);
    } else if (this.board.every(cell => cell !== 0)) {
      this.handleRoundEnd(0); // Draw
    } else {
      this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
      this.turnTimer = 5.0;
    }
  }

  checkWin(player) {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    
    for (let line of lines) {
      if (this.board[line[0]] === player && 
          this.board[line[1]] === player && 
          this.board[line[2]] === player) {
        this.winningLine = line;
        return true;
      }
    }
    return false;
  }

  handleRoundEnd(winner) {
    this.turnState = 'ROUND_OVER';
    this.roundDelay = 2.0;
    
    if (winner === 1) {
      this.scoreP1++;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
    } else if (winner === 2) {
      this.scoreP2++;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
    } else {
      if (window.Sound) window.Sound.playTone(200, 'sawtooth', 0.5);
    }
    
    if (this.scoreP1 >= 3 || this.scoreP2 >= 3) {
      this.turnState = 'MATCH_OVER';
      this.isOver = true;
      setTimeout(() => this.levelComplete(), 3000);
    }
  }

  resetRound() {
    this.board = Array(9).fill(0);
    this.turnState = 'PLAYING';
    this.turnTimer = 5.0;
    this.winningLine = null;
    // Loser goes first next round, or alternate if draw
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.turnState === 'PLAYING') {
      this.turnTimer -= delta;
      if (this.turnTimer <= 0) {
        this.turnTimer = 0;
        // Turn forfeit!
        if (window.Sound) window.Sound.playTone(100, 'square', 0.3);
        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
        this.turnTimer = 5.0;
      }
    } else if (this.turnState === 'ROUND_OVER') {
      this.roundDelay -= delta;
      if (this.roundDelay <= 0) {
        this.resetRound();
      }
    }
  }

  render(ctx) {
    this.clear();
    
    const boxSize = 200;
    const gridW = boxSize * 3;
    const offsetX = (this.W - gridW) / 2;
    const offsetY = 150;
    
    // Header
    ctx.fillStyle = '#fff';
    ctx.font = '40px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText("VS MODE", this.W / 2, 60);
    
    ctx.font = '24px "JetBrains Mono"';
    ctx.fillStyle = this.currentPlayer === 1 ? '#38bdf8' : '#fff';
    ctx.fillText(`P1 (X): ${this.scoreP1}`, this.W / 4, 100);
    
    ctx.fillStyle = this.currentPlayer === 2 ? '#fb7185' : '#fff';
    ctx.fillText(`P2 (O): ${this.scoreP2}`, (this.W / 4) * 3, 100);
    
    // Timer Bar
    if (this.turnState === 'PLAYING') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(offsetX, offsetY - 20, gridW, 10);
      
      ctx.fillStyle = this.currentPlayer === 1 ? '#38bdf8' : '#fb7185';
      ctx.fillRect(offsetX, offsetY - 20, gridW * (this.turnTimer / 5.0), 10);
    }
    
    // Grid Lines
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    
    // Vertical
    ctx.beginPath();
    ctx.moveTo(offsetX + boxSize, offsetY);
    ctx.lineTo(offsetX + boxSize, offsetY + gridW);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offsetX + boxSize * 2, offsetY);
    ctx.lineTo(offsetX + boxSize * 2, offsetY + gridW);
    ctx.stroke();
    
    // Horizontal
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + boxSize);
    ctx.lineTo(offsetX + gridW, offsetY + boxSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + boxSize * 2);
    ctx.lineTo(offsetX + gridW, offsetY + boxSize * 2);
    ctx.stroke();
    
    // Draw Marks
    for (let i = 0; i < 9; i++) {
      const val = this.board[i];
      if (val === 0) continue;
      
      const c = i % 3;
      const r = Math.floor(i / 3);
      
      const cx = offsetX + c * boxSize + boxSize / 2;
      const cy = offsetY + r * boxSize + boxSize / 2;
      
      const isWinningMark = this.winningLine && this.winningLine.includes(i);
      
      if (val === 1) {
        ctx.strokeStyle = isWinningMark ? '#10b981' : '#38bdf8';
        ctx.lineWidth = 15;
        const pad = 40;
        ctx.beginPath();
        ctx.moveTo(cx - boxSize/2 + pad, cy - boxSize/2 + pad);
        ctx.lineTo(cx + boxSize/2 - pad, cy + boxSize/2 - pad);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + boxSize/2 - pad, cy - boxSize/2 + pad);
        ctx.lineTo(cx - boxSize/2 + pad, cy + boxSize/2 - pad);
        ctx.stroke();
      } else if (val === 2) {
        ctx.strokeStyle = isWinningMark ? '#10b981' : '#fb7185';
        ctx.lineWidth = 15;
        ctx.beginPath();
        ctx.arc(cx, cy, boxSize/2 - 40, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    
    if (this.turnState === 'MATCH_OVER') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#10b981';
      ctx.font = '50px "Press Start 2P"';
      if (this.scoreP1 > this.scoreP2) {
        ctx.fillText("P1 WINS MATCH!", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("P2 WINS MATCH!", this.W / 2, this.H / 2);
      }
    }
  }
}
