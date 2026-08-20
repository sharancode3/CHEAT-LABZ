import { GameBase } from '../../core/game-base.js';

export class TicTacToe extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.board = [0,0,0,0,0,0,0,0,0]; // 0: Empty, 1: Player (X), 2: AI (O)
    this.currentTurn = 1; // 1: Player, 2: AI
    
    this.blitzTimerMax = 5.0;
    this.blitzTimer = this.blitzTimerMax;
    
    this.roundState = 'PLAYING'; // PLAYING, ROUND_OVER
    this.roundEndTimer = 0;
    this.winCells = [];
    
    this.gridSize = 600;
    this.cellSize = this.gridSize / 3;
    this.offsetX = (this.W - this.gridSize) / 2;
    this.offsetY = (this.H - this.gridSize) / 2;

    this.aiThinkingTimer = 0;
    
    // Win combinations
    this.winMasks = [
      [0,1,2], [3,4,5], [6,7,8], // Rows
      [0,3,6], [1,4,7], [2,5,8], // Cols
      [0,4,8], [2,4,6]           // Diagonals
    ];

    this.setupInput();
  }

  setupInput() {
    this.input.onPointerDown = (x, y) => {
      if (this.isPaused || this.isOver || this.roundState !== 'PLAYING' || this.currentTurn !== 1) return;

      // Map screen coordinates to game coordinates
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.W / rect.width;
      const scaleY = this.H / rect.height;
      const gameX = x * scaleX;
      const gameY = y * scaleY;

      if (
        gameX > this.offsetX && gameX < this.offsetX + this.gridSize &&
        gameY > this.offsetY && gameY < this.offsetY + this.gridSize
      ) {
        const col = Math.floor((gameX - this.offsetX) / this.cellSize);
        const row = Math.floor((gameY - this.offsetY) / this.cellSize);
        const index = row * 3 + col;

        if (this.board[index] === 0) {
          this.makeMove(index, 1);
        }
      }
    };
  }

  makeMove(index, player) {
    this.board[index] = player;
    
    const winCombo = this.checkWin(this.board, player);
    if (winCombo) {
      this.winCells = winCombo;
      this.handleRoundEnd(player);
    } else if (this.board.every(cell => cell !== 0)) {
      this.handleRoundEnd(0); // Draw
    } else {
      this.currentTurn = player === 1 ? 2 : 1;
      this.blitzTimer = this.blitzTimerMax;
      
      if (this.currentTurn === 2) {
        this.aiThinkingTimer = this.rand(500, 1500) / 1000; // Fake think time
      }
    }
  }

  handleRoundEnd(winner) {
    this.roundState = 'ROUND_OVER';
    this.roundEndTimer = 2.0; 
    this.winner = winner;
    
    if (winner === 1) {
      this.score += 500;
      if (window.Sound) window.Sound.playTone(523.25, 'sine', 0.1);
    } else if (winner === 2) {
      this.lives -= 1;
      if (window.Sound) window.Sound.playTone(200, 'sawtooth', 0.2);
    }
  }

  checkWin(board, player) {
    for (let combo of this.winMasks) {
      if (board[combo[0]] === player && board[combo[1]] === player && board[combo[2]] === player) {
        return combo;
      }
    }
    return null;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.roundState === 'ROUND_OVER') {
      this.roundEndTimer -= delta;
      if (this.roundEndTimer <= 0) {
        if (this.lives > 0) {
          if (this.winner === 1) {
            this.levelComplete(); // Advance level if player wins round
          } else {
            this.resetRound(); // Just retry if draw or loss
          }
        }
      }
      return;
    }

    if (this.currentTurn === 1) {
      this.blitzTimer -= delta;
      if (this.blitzTimer <= 0) {
        // Penalty for timeout
        this.lives -= 1;
        this.makeRandomMove(1);
      }
    } else if (this.currentTurn === 2) {
      this.blitzTimer -= delta;
      this.aiThinkingTimer -= delta;
      if (this.aiThinkingTimer <= 0) {
        this.makeAIMove();
      }
    }
  }

  resetRound() {
    this.board = [0,0,0,0,0,0,0,0,0];
    this.currentTurn = 1;
    this.blitzTimer = this.blitzTimerMax;
    this.roundState = 'PLAYING';
    this.winCells = [];
    this.winner = null;
  }

  makeRandomMove(player) {
    const emptyCells = this.board.map((v, i) => v === 0 ? i : null).filter(v => v !== null);
    if (emptyCells.length > 0) {
      const idx = emptyCells[this.rand(0, emptyCells.length - 1)];
      this.makeMove(idx, player);
    } else {
      this.handleRoundEnd(0);
    }
  }

  makeAIMove() {
    // Epsilon determines mistake probability. Higher level = lower epsilon.
    // Level 1: 50% mistake, Level 10: 5% mistake
    const epsilon = Math.max(0.05, 0.5 - ((this.level - 1) * 0.05));
    
    if (Math.random() < epsilon) {
      this.makeRandomMove(2);
    } else {
      const bestMove = this.minimax(this.board, 2, 0).index;
      if (bestMove !== undefined && bestMove !== null) {
        this.makeMove(bestMove, 2);
      } else {
        this.makeRandomMove(2);
      }
    }
  }

  minimax(newBoard, player, depth) {
    const emptyCells = newBoard.map((v, i) => v === 0 ? i : null).filter(v => v !== null);

    if (this.checkWin(newBoard, 1)) return { score: -10 + depth };
    if (this.checkWin(newBoard, 2)) return { score: 10 - depth };
    if (emptyCells.length === 0) return { score: 0 };

    let moves = [];
    for (let i = 0; i < emptyCells.length; i++) {
      let move = {};
      move.index = emptyCells[i];
      newBoard[emptyCells[i]] = player;

      if (player === 2) {
        let result = this.minimax(newBoard, 1, depth + 1);
        move.score = result.score;
      } else {
        let result = this.minimax(newBoard, 2, depth + 1);
        move.score = result.score;
      }

      newBoard[emptyCells[i]] = 0;
      moves.push(move);
    }

    let bestMove;
    if (player === 2) {
      let bestScore = -10000;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score > bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    } else {
      let bestScore = 10000;
      for (let i = 0; i < moves.length; i++) {
        if (moves[i].score < bestScore) {
          bestScore = moves[i].score;
          bestMove = i;
        }
      }
    }

    return moves[bestMove];
  }

  render(ctx) {
    this.clear();
    
    // Draw Grid
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.5)'; // Accent color #ff0055
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    // Vertical lines
    ctx.moveTo(this.offsetX + this.cellSize, this.offsetY);
    ctx.lineTo(this.offsetX + this.cellSize, this.offsetY + this.gridSize);
    ctx.moveTo(this.offsetX + this.cellSize * 2, this.offsetY);
    ctx.lineTo(this.offsetX + this.cellSize * 2, this.offsetY + this.gridSize);
    // Horizontal lines
    ctx.moveTo(this.offsetX, this.offsetY + this.cellSize);
    ctx.lineTo(this.offsetX + this.gridSize, this.offsetY + this.cellSize);
    ctx.moveTo(this.offsetX, this.offsetY + this.cellSize * 2);
    ctx.lineTo(this.offsetX + this.gridSize, this.offsetY + this.cellSize * 2);
    ctx.stroke();
    
    ctx.shadowBlur = 0;

    // Draw X and O
    for (let i = 0; i < 9; i++) {
      if (this.board[i] !== 0) {
        const row = Math.floor(i / 3);
        const col = i % 3;
        const cx = this.offsetX + col * this.cellSize + this.cellSize / 2;
        const cy = this.offsetY + row * this.cellSize + this.cellSize / 2;
        const isWin = this.winCells.includes(i);
        
        ctx.lineWidth = isWin ? 8 : 6;
        ctx.shadowBlur = isWin ? 20 : 10;
        
        const padding = 40;
        
        if (this.board[i] === 1) { // X
          ctx.strokeStyle = '#00ffff';
          ctx.shadowColor = '#00ffff';
          ctx.beginPath();
          ctx.moveTo(cx - this.cellSize / 2 + padding, cy - this.cellSize / 2 + padding);
          ctx.lineTo(cx + this.cellSize / 2 - padding, cy + this.cellSize / 2 - padding);
          ctx.moveTo(cx + this.cellSize / 2 - padding, cy - this.cellSize / 2 + padding);
          ctx.lineTo(cx - this.cellSize / 2 + padding, cy + this.cellSize / 2 - padding);
          ctx.stroke();
        } else if (this.board[i] === 2) { // O
          ctx.strokeStyle = '#ff00ff';
          ctx.shadowColor = '#ff00ff';
          ctx.beginPath();
          ctx.arc(cx, cy, this.cellSize / 2 - padding, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
      }
    }

    // Draw Timer (Blitz Timer)
    if (this.roundState === 'PLAYING') {
      const timerWidth = 400;
      const pct = Math.max(0, this.blitzTimer / this.blitzTimerMax);
      
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(this.W / 2 - timerWidth / 2, 50, timerWidth, 10);
      
      ctx.fillStyle = this.currentTurn === 1 ? '#00ffff' : '#ff00ff';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.fillRect(this.W / 2 - timerWidth / 2, 50, timerWidth * pct, 10);
      ctx.shadowBlur = 0;
      
      ctx.fillStyle = '#fff';
      ctx.font = '20px "JetBrains Mono"';
      ctx.textAlign = 'center';
      ctx.fillText(`TIME: ${this.blitzTimer.toFixed(1)}s`, this.W / 2, 90);
      
      ctx.fillText(this.currentTurn === 1 ? "YOUR TURN (X)" : "AI TURN (O)", this.W / 2, 120);
    }
    
    // Draw Game Over text
    if (this.roundState === 'ROUND_OVER') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#fff';
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
      if (this.winner === 1) {
        ctx.fillText("YOU WIN!", this.W / 2, this.H / 2);
      } else if (this.winner === 2) {
        ctx.fillText("AI WINS", this.W / 2, this.H / 2);
      } else {
        ctx.fillText("DRAW", this.W / 2, this.H / 2);
      }
      ctx.shadowBlur = 0;
    }
  }
}
