/**
 * server/games/tictactoe.js — Tic Tac Toe Multiplayer
 * 3×3 board, best of 3 games, 30-second turn timer.
 */

const tttState = new Map(); // roomCode → state
const WIN_LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const TURN_TIMEOUT_MS = 30000;

function createState(players) {
  const [p1, p2] = players;
  return {
    board: Array(9).fill(null),
    xPlayer: p1.socketId,
    oPlayer: p2.socketId,
    currentTurn: p1.socketId, // host (X) goes first
    moveHistory: [],
    scores: { x: 0, o: 0, draws: 0 },
    game: 1,
    maxGames: 3,
    players: players.map(p => ({ socketId: p.socketId, displayName: p.displayName })),
    turnTimer: null,
  };
}

function checkWin(board, symbol) {
  for (const line of WIN_LINES) {
    if (line.every(i => board[i] === symbol)) return line;
  }
  return null;
}

function checkDraw(board) {
  return board.every(cell => cell !== null);
}

function getSymbol(state, socketId) {
  return socketId === state.xPlayer ? 'X' : 'O';
}

function clearTurnTimer(state) {
  if (state.turnTimer) {
    clearTimeout(state.turnTimer);
    state.turnTimer = null;
  }
}

function scheduleAutoMove(io, room, state) {
  clearTurnTimer(state);
  state.turnTimer = setTimeout(() => {
    if (!tttState.has(room.code)) return;
    // Auto-place in a random empty cell
    const empty = state.board.map((v, i) => v === null ? i : -1).filter(i => i >= 0);
    if (empty.length === 0) return;
    const autoCell = empty[Math.floor(Math.random() * empty.length)];
    processMove(io, room, state, state.currentTurn, autoCell);
  }, TURN_TIMEOUT_MS);
}

function processMove(io, room, state, socketId, cellIndex) {
  clearTurnTimer(state);

  const symbol = getSymbol(state, socketId);
  state.board[cellIndex] = symbol;
  state.moveHistory.push({ cell: cellIndex, symbol, socketId });

  const winLine = checkWin(state.board, symbol);
  const draw    = !winLine && checkDraw(state.board);

  if (winLine) {
    if (symbol === 'X') state.scores.x++;
    else                state.scores.o++;

    io.to(room.code).emit('ttt:state', {
      board: state.board, currentTurn: null, lastMove: cellIndex,
    });
    io.to(room.code).emit('ttt:win', {
      winner: socketId, symbol, winLine, scores: { ...state.scores }, game: state.game,
    });

    if (state.game >= state.maxGames) {
      const finalWinner = state.scores.x > state.scores.o ? state.xPlayer
                        : state.scores.o > state.scores.x ? state.oPlayer
                        : null;
      setTimeout(() => {
        io.to(room.code).emit('game:over', { winner: finalWinner, finalScores: { ...state.scores } });
        tttState.delete(room.code);
        room.state = 'waiting';
      }, 2000);
    } else {
      state.game++;
      setTimeout(() => {
        if (!tttState.has(room.code)) return;
        state.board = Array(9).fill(null);
        state.moveHistory = [];
        // Alternate who goes first each game
        state.currentTurn = state.game % 2 === 0 ? state.oPlayer : state.xPlayer;
        io.to(room.code).emit('ttt:new-game', { game: state.game, board: state.board, currentTurn: state.currentTurn });
        scheduleAutoMove(io, room, state);
      }, 2200);
    }
    return;
  }

  if (draw) {
    state.scores.draws++;
    io.to(room.code).emit('ttt:state', { board: state.board, currentTurn: null, lastMove: cellIndex });
    io.to(room.code).emit('ttt:draw', { scores: { ...state.scores }, game: state.game });

    if (state.game >= state.maxGames) {
      const finalWinner = state.scores.x > state.scores.o ? state.xPlayer
                        : state.scores.o > state.scores.x ? state.oPlayer
                        : null;
      setTimeout(() => {
        io.to(room.code).emit('game:over', { winner: finalWinner, finalScores: { ...state.scores } });
        tttState.delete(room.code);
        room.state = 'waiting';
      }, 2000);
    } else {
      state.game++;
      setTimeout(() => {
        if (!tttState.has(room.code)) return;
        state.board = Array(9).fill(null);
        state.moveHistory = [];
        state.currentTurn = state.game % 2 === 0 ? state.oPlayer : state.xPlayer;
        io.to(room.code).emit('ttt:new-game', { game: state.game, board: state.board, currentTurn: state.currentTurn });
        scheduleAutoMove(io, room, state);
      }, 2200);
    }
    return;
  }

  // Switch turn
  state.currentTurn = socketId === state.xPlayer ? state.oPlayer : state.xPlayer;
  io.to(room.code).emit('ttt:state', { board: state.board, currentTurn: state.currentTurn, lastMove: cellIndex });
  scheduleAutoMove(io, room, state);
}

export function registerTTTEvents(io, socket, rooms) {
  socket.on('ttt:move', ({ code, cellIndex }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = tttState.get(room.code);
    if (!state) {
      state = createState(room.players);
      tttState.set(room.code, state);
      scheduleAutoMove(io, room, state);
      io.to(room.code).emit('ttt:state', { board: state.board, currentTurn: state.currentTurn, lastMove: null });
    }

    if (state.currentTurn !== socket.id) return;
    if (cellIndex < 0 || cellIndex > 8) return;
    if (state.board[cellIndex] !== null) return;

    processMove(io, room, state, socket.id, cellIndex);
  });

  // Client requests initial state sync (e.g. reconnect)
  socket.on('ttt:sync', ({ code }) => {
    const state = tttState.get((code || '').toUpperCase().trim());
    if (state) socket.emit('ttt:state', { board: state.board, currentTurn: state.currentTurn, lastMove: null });
  });

  socket.on('disconnect', () => {
    for (const [code, state] of tttState.entries()) {
      clearTurnTimer(state);
      if (state.players.some(p => p.socketId === socket.id)) {
        tttState.delete(code);
      }
    }
  });
}
