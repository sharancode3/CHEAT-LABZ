import { BotBase } from './bot-base.js';

export class TttBot extends BotBase {
  constructor(difficulty) {
    super('tic-tac-toe', difficulty);
  }

  getBotNamePrefix() {
    return 'TicTac';
  }

  onGameStateUpdate(room, state, gameManager) {
    // Bot plays O usually (value 2), check if it's bot's turn
    const botSymbol = state.players[this.socketId]?.symbol || 2;
    if (state.currentTurn !== botSymbol || state.phase !== 'playing') return;

    const choiceIndex = this.calculateChoice(state.board, botSymbol);
    if (choiceIndex === -1) return; // No moves

    const delay = this.getReactionDelay();
    setTimeout(() => {
      if (gameManager) {
        gameManager.handlePlayerAction(room, this.socketId, 'ttt:move', { index: choiceIndex });
      }
    }, delay);
  }

  calculateChoice(board, botSymbol) {
    const emptyCells = board.map((val, idx) => val === 0 ? idx : -1).filter(idx => idx !== -1);
    if (emptyCells.length === 0) return -1;

    if (this.difficulty === 'easy') {
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    if (this.difficulty === 'medium') {
      const playerSymbol = botSymbol === 1 ? 2 : 1;
      // 1. Can win?
      for (const idx of emptyCells) {
        const testBoard = [...board];
        testBoard[idx] = botSymbol;
        if (this.checkWin(testBoard, botSymbol)) return idx;
      }
      // 2. Can block?
      for (const idx of emptyCells) {
        const testBoard = [...board];
        testBoard[idx] = playerSymbol;
        if (this.checkWin(testBoard, playerSymbol)) return idx;
      }
      // 3. Random
      return emptyCells[Math.floor(Math.random() * emptyCells.length)];
    }

    if (this.difficulty === 'hard') {
      let bestScore = -Infinity;
      let move = -1;
      const playerSymbol = botSymbol === 1 ? 2 : 1;

      for (const idx of emptyCells) {
        board[idx] = botSymbol;
        const score = this.minimax(board, 0, false, botSymbol, playerSymbol, -Infinity, Infinity);
        board[idx] = 0;
        if (score > bestScore) {
          bestScore = score;
          move = idx;
        }
      }
      return move;
    }

    return -1;
  }

  minimax(board, depth, isMaximizing, botSymbol, playerSymbol, alpha, beta) {
    if (this.checkWin(board, botSymbol)) return 10 - depth;
    if (this.checkWin(board, playerSymbol)) return depth - 10;
    const emptyCells = board.map((val, idx) => val === 0 ? idx : -1).filter(idx => idx !== -1);
    if (emptyCells.length === 0) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (const idx of emptyCells) {
        board[idx] = botSymbol;
        const score = this.minimax(board, depth + 1, false, botSymbol, playerSymbol, alpha, beta);
        board[idx] = 0;
        bestScore = Math.max(score, bestScore);
        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) break;
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (const idx of emptyCells) {
        board[idx] = playerSymbol;
        const score = this.minimax(board, depth + 1, true, botSymbol, playerSymbol, alpha, beta);
        board[idx] = 0;
        bestScore = Math.min(score, bestScore);
        beta = Math.min(beta, bestScore);
        if (beta <= alpha) break;
      }
      return bestScore;
    }
  }

  checkWin(board, symbol) {
    const lines = [
      [0,1,2], [3,4,5], [6,7,8], // rows
      [0,3,6], [1,4,7], [2,5,8], // cols
      [0,4,8], [2,4,6]           // diags
    ];
    return lines.some(line => line.every(idx => board[idx] === symbol));
  }

  getReactionDelay() {
    if (this.difficulty === 'easy') return 200 + Math.random() * 400; // 200-600
    if (this.difficulty === 'medium') return 150 + Math.random() * 250; // 150-400
    if (this.difficulty === 'hard') return 100 + Math.random() * 100; // 100-200
    return 300;
  }
}
