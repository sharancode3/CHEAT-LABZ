/**
 * server/games/ludo.js — Ludo Game Server
 */

const ludoState = new Map();

const COLORS = ['red', 'green', 'yellow', 'blue'];
// Starting absolute indexes on the 52-cell main track
const START_ABS = [0, 13, 26, 39];
// Safe absolute cells on the main track
const SAFE_ABS = [0, 8, 13, 21, 26, 34, 39, 47];

function relativeToAbsolute(playerIndex, relPos) {
  if (relPos < 0 || relPos > 50) return null; // Base or home stretch
  return (START_ABS[playerIndex] + relPos) % 52;
}

function createState(players) {
  const pStates = {};
  players.forEach((p, i) => {
    pStates[p.socketId] = {
      color: COLORS[i],
      playerIndex: i,
      tokens: [
        { pos: -1 }, // -1 = base, 0-50 = main track, 51-56 = home stretch, 57 = home
        { pos: -1 },
        { pos: -1 },
        { pos: -1 }
      ],
      completed: 0
    };
  });

  const order = players.map(p => p.socketId);

  return {
    players: pStates,
    currentTurn: order[0],
    turnOrder: order,
    diceRoll: null,
    diceRolledThisTurn: false,
    extraTurn: false
  };
}

function nextTurn(state) {
  state.diceRolledThisTurn = false;
  state.diceRoll = null;
  const idx = state.turnOrder.indexOf(state.currentTurn);
  state.currentTurn = state.turnOrder[(idx + 1) % state.turnOrder.length];
}

export function registerLudoEvents(io, socket, rooms) {
  socket.on('ludo:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = ludoState.get(room.code);
    if (!state) {
      state = createState(room.players);
      ludoState.set(room.code, state);
      io.to(room.code).emit('ludo:state-updated', { state });
    }
  });

  socket.on('ludo:roll-dice', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = ludoState.get(room.code);
    if (!state || state.currentTurn !== socket.id || state.diceRolledThisTurn) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    state.diceRoll = roll;
    state.diceRolledThisTurn = true;
    state.extraTurn = (roll === 6);

    // Calculate if player has any valid moves
    const pState = state.players[socket.id];
    let validMovesCount = 0;

    pState.tokens.forEach((t, i) => {
      if (t.pos === -1 && roll === 6) validMovesCount++; // Can release
      else if (t.pos >= 0 && t.pos + roll <= 57) validMovesCount++; // Can move on board
    });

    io.to(room.code).emit('ludo:dice-rolled', { socketId: socket.id, roll, hasMoves: validMovesCount > 0 });

    if (validMovesCount === 0) {
      setTimeout(() => {
        nextTurn(state);
        io.to(room.code).emit('ludo:state-updated', { state });
      }, 1500);
    }
  });

  socket.on('ludo:move-token', ({ code, tokenIndex }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = ludoState.get(room.code);
    if (!state || state.currentTurn !== socket.id || !state.diceRolledThisTurn) return;

    const pState = state.players[socket.id];
    const t = pState.tokens[tokenIndex];
    const roll = state.diceRoll;

    let moved = false;

    if (t.pos === -1 && roll === 6) {
      t.pos = 0; // Release to start
      moved = true;
    } else if (t.pos >= 0 && t.pos + roll <= 57) {
      t.pos += roll;
      moved = true;
      if (t.pos === 57) {
        pState.completed++;
      }
    }

    if (moved) {
      // Check capture collision on the main track
      const myAbs = relativeToAbsolute(pState.playerIndex, t.pos);
      if (myAbs !== null && !SAFE_ABS.includes(myAbs)) {
        // Look for opponents on the same absolute track position
        for (const [oppId, opp] of Object.entries(state.players)) {
          if (oppId === socket.id) continue;
          opp.tokens.forEach((ot) => {
            const oppAbs = relativeToAbsolute(opp.playerIndex, ot.pos);
            if (oppAbs === myAbs) {
              // Send back to base!
              ot.pos = -1;
              io.to(room.code).emit('ludo:token-captured', { socketId: oppId, tokenIndex: opp.tokens.indexOf(ot) });
              state.extraTurn = true; // Capture gets extra turn
            }
          });
        }
      }

      // Check win condition
      if (pState.completed === 4) {
        io.to(room.code).emit('ludo:state-updated', { state });
        io.to(room.code).emit('game:over', { winner: socket.id, finalScores: null });
        ludoState.delete(room.code);
        room.state = 'waiting';
        return;
      }

      if (state.extraTurn) {
        state.diceRolledThisTurn = false;
        state.diceRoll = null;
        state.extraTurn = false;
      } else {
        nextTurn(state);
      }

      io.to(room.code).emit('ludo:state-updated', { state });
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of ludoState.entries()) {
      if (state.players[socket.id]) {
        ludoState.delete(code);
      }
    }
  });
}
