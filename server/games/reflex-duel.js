/**
 * server/games/reflex-duel.js — Reflex Duel Multiplayer
 * Server controls stimulus timing. Server-verified reaction times.
 * False start detection (press before stimulus emitted).
 */

const reflexState = new Map(); // roomCode → state
const STIMULUS_TYPES = ['color', 'shape', 'text'];
const COLORS  = ['#EF4444', '#06B6D4', '#F59E0B', '#8B5CF6', '#00d4aa'];
const SHAPES  = ['circle', 'triangle', 'star', 'hexagon'];
const TOTAL_ROUNDS = 10;

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createState(players) {
  const [p1, p2] = players;
  return {
    round: 0,
    totalRounds: TOTAL_ROUNDS,
    scores: { [p1.socketId]: 0, [p2.socketId]: 0 },
    roundHistory: [],
    players: players.map(p => ({ socketId: p.socketId, displayName: p.displayName })),
    stimulusTime: null,   // server timestamp when stimulus was emitted
    pressLog: {},         // socketId → press time (for this round)
    roundActive: false,
    stimulusTimeout: null,
    roundTimeout: null,
  };
}

function clearTimers(state) {
  clearTimeout(state.stimulusTimeout);
  clearTimeout(state.roundTimeout);
}

function startRound(io, room, state) {
  state.round++;
  state.stimulusTime = null;
  state.pressLog = {};
  state.roundActive = false;

  io.to(room.code).emit('reflex:round-start', { round: state.round, total: state.totalRounds });

  // Random delay before stimulus: 1500–4000ms
  const delay = randomBetween(1500, 4000);

  state.stimulusTimeout = setTimeout(() => {
    if (!reflexState.has(room.code)) return;

    const type   = STIMULUS_TYPES[Math.floor(Math.random() * STIMULUS_TYPES.length)];
    const value  = type === 'color'  ? COLORS[Math.floor(Math.random() * COLORS.length)]
                 : type === 'shape'  ? SHAPES[Math.floor(Math.random() * SHAPES.length)]
                 : 'PRESS NOW';

    state.stimulusTime  = Date.now();
    state.roundActive   = true;

    io.to(room.code).emit('reflex:stimulus', { type, value, serverTime: state.stimulusTime });

    // If neither presses in 3s, both get 0 for this round
    state.roundTimeout = setTimeout(() => {
      if (!reflexState.has(room.code) || !state.roundActive) return;
      endRound(io, room, state, null, null);
    }, 3000);

  }, delay);
}

function endRound(io, room, state, winnerId, reactionTimes) {
  state.roundActive = false;
  clearTimeout(state.roundTimeout);

  if (winnerId) state.scores[winnerId]++;

  const roundResult = { round: state.round, winner: winnerId, reactionTimes };
  state.roundHistory.push(roundResult);

  io.to(room.code).emit('reflex:result', {
    round: state.round,
    winner: winnerId,
    reactionTimes,
    scores: { ...state.scores },
  });

  if (state.round >= state.totalRounds) {
    const [pid1, pid2] = state.players.map(p => p.socketId);
    const s1 = state.scores[pid1];
    const s2 = state.scores[pid2];
    const finalWinner = s1 > s2 ? pid1 : s2 > s1 ? pid2 : null;

    setTimeout(() => {
      io.to(room.code).emit('game:over', {
        winner: finalWinner,
        finalScores: { ...state.scores },
        roundHistory: state.roundHistory,
      });
      reflexState.delete(room.code);
      room.state = 'waiting';
    }, 2200);
    return;
  }

  // Next round after 2.5s gap
  setTimeout(() => {
    if (reflexState.has(room.code)) startRound(io, room, state);
  }, 2500);
}

export function registerReflexEvents(io, socket, rooms) {
  socket.on('reflex:press', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = reflexState.get(room.code);
    if (!state) return;

    // Already pressed this round?
    if (state.pressLog[socket.id] !== undefined) return;

    const pressTime = Date.now();

    // FALSE START: pressed before stimulus was set
    if (!state.stimulusTime || !state.roundActive) {
      io.to(room.code).emit('reflex:false-start', {
        socketId: socket.id,
        round: state.round,
      });
      // That player loses the round
      const otherPlayer = state.players.find(p => p.socketId !== socket.id);
      if (otherPlayer) {
        clearTimers(state);
        endRound(io, room, state, otherPlayer.socketId, { [socket.id]: -1, [otherPlayer.socketId]: 0 });
      }
      return;
    }

    const reactionMs = pressTime - state.stimulusTime;
    state.pressLog[socket.id] = reactionMs;

    // If first press → winner unless other also pressed
    const playerIds = state.players.map(p => p.socketId);
    const allPressed = playerIds.every(id => state.pressLog[id] !== undefined);

    if (allPressed) {
      const [pid1, pid2] = playerIds;
      const t1 = state.pressLog[pid1];
      const t2 = state.pressLog[pid2];
      const winner = t1 < t2 ? pid1 : t2 < t1 ? pid2 : null;
      clearTimers(state);
      endRound(io, room, state, winner, { [pid1]: t1, [pid2]: t2 });
    } else {
      // First to press — wait 50ms window for simultaneous presses
      setTimeout(() => {
        if (!reflexState.has(room.code) || !state.roundActive) return;
        if (!state.pressLog[socket.id]) return;
        // Other player didn't press in window — this player wins
        const otherPid = playerIds.find(id => id !== socket.id);
        const times = { [socket.id]: reactionMs, [otherPid]: null };
        clearTimers(state);
        endRound(io, room, state, socket.id, times);
      }, 50);
    }
  });

  socket.on('reflex:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = reflexState.get(room.code);
    if (!state) {
      state = createState(room.players);
      reflexState.set(room.code, state);
      startRound(io, room, state);
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of reflexState.entries()) {
      clearTimers(state);
      if (state.players.some(p => p.socketId === socket.id)) {
        reflexState.delete(code);
      }
    }
  });
}
