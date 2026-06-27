/**
 * server/games/word-duel.js — Word Duel Multiplayer
 * 5 rounds, progressively longer words. Race to type correctly first.
 */

const wordState = new Map();
const ROUND_TIMEOUT_MS = 30000;

// Word bank per round (by round index 0-4)
const WORD_BANK = [
  // Round 1: 4-5 letters
  ['apex', 'grid', 'flux', 'dash', 'code', 'byte', 'hack', 'loop', 'jump', 'zone'],
  // Round 2: 6-7 letters
  ['reflex', 'combat', 'plasma', 'factor', 'signal', 'engine', 'sprint', 'impact'],
  // Round 3: 8-9 letters
  ['keyboard', 'velocity', 'optimize', 'protocol', 'champion', 'momentum', 'function'],
  // Round 4: 10-12 letters
  ['pixelated', 'multiplayer', 'algorithms', 'coordinates', 'achievement', 'elimination'],
  // Round 5: sentence
  [
    'the quick brown fox jumps over the lazy dog',
    'type fast or lose the duel to your opponent',
    'speed and accuracy determine the champion here',
    'every millisecond counts when fingers fly across keys',
  ],
];

function createState(players) {
  const [p1, p2] = players;
  return {
    round: 0,
    totalRounds: 5,
    word: null,
    startTime: null,
    completions: {},
    scores: { [p1.socketId]: 0, [p2.socketId]: 0 },
    roundHistory: [],
    players: players.map(p => ({ socketId: p.socketId, displayName: p.displayName })),
    roundTimer: null,
  };
}

function pickWord(roundIndex) {
  const bank = WORD_BANK[Math.min(roundIndex, WORD_BANK.length - 1)];
  return bank[Math.floor(Math.random() * bank.length)];
}

function startRound(io, room, state) {
  state.round++;
  state.completions = {};
  state.word = pickWord(state.round - 1);
  state.startTime = Date.now();

  io.to(room.code).emit('word:round-start', {
    round: state.round,
    total: state.totalRounds,
    word: state.word,
    startTime: state.startTime,
  });

  // 30-second timeout
  state.roundTimer = setTimeout(() => {
    if (!wordState.has(room.code)) return;
    endRound(io, room, state);
  }, ROUND_TIMEOUT_MS);
}

function endRound(io, room, state) {
  clearTimeout(state.roundTimer);

  const playerIds = state.players.map(p => p.socketId);
  const completionTimes = playerIds.map(id => state.completions[id] ?? null);

  let roundWinner = null;
  const bonuses = {};

  // Determine winner and scoring
  const finished = playerIds.filter(id => state.completions[id] !== null && state.completions[id] !== undefined);

  if (finished.length === 1) {
    roundWinner = finished[0];
    bonuses[roundWinner] = 100;
    const other = playerIds.find(id => id !== roundWinner);
    bonuses[other] = 0;
  } else if (finished.length === 2) {
    const [t1, t2] = [state.completions[playerIds[0]], state.completions[playerIds[1]]];
    if (t1 !== null && t2 !== null) {
      roundWinner = t1 <= t2 ? playerIds[0] : playerIds[1];
      const loser = playerIds.find(id => id !== roundWinner);
      bonuses[roundWinner] = 100;
      bonuses[loser] = 50;
      // Speed bonus: 20pts per second faster
      const diff = Math.abs(t2 - t1) / 1000;
      bonuses[roundWinner] += Math.round(diff * 20);
    }
  }

  // Update scores
  for (const id of playerIds) {
    if (bonuses[id]) state.scores[id] += bonuses[id];
  }

  const result = {
    round: state.round,
    word: state.word,
    winner: roundWinner,
    completionTimes: Object.fromEntries(playerIds.map(id => [id, state.completions[id] ?? null])),
    scores: { ...state.scores },
    bonuses,
  };

  state.roundHistory.push(result);
  io.to(room.code).emit('word:result', result);

  if (state.round >= state.totalRounds) {
    const [pid1, pid2] = playerIds;
    const finalWinner = state.scores[pid1] > state.scores[pid2] ? pid1
                      : state.scores[pid2] > state.scores[pid1] ? pid2
                      : null;
    setTimeout(() => {
      io.to(room.code).emit('game:over', {
        winner: finalWinner,
        finalScores: { ...state.scores },
        roundHistory: state.roundHistory,
      });
      wordState.delete(room.code);
      room.state = 'waiting';
    }, 2500);
    return;
  }

  // Next round after 3s
  setTimeout(() => {
    if (wordState.has(room.code)) startRound(io, room, state);
  }, 3000);
}

export function registerWordDuelEvents(io, socket, rooms) {
  socket.on('word:complete', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = wordState.get(room.code);
    if (!state || !state.startTime) return;
    if (state.completions[socket.id] !== undefined) return; // already completed

    const timeTaken = Date.now() - state.startTime;
    state.completions[socket.id] = timeTaken;

    socket.emit('word:you-finished', { timeTaken, round: state.round });

    // Notify opponent of their completion
    socket.to(room.code).emit('word:opponent-finished', { timeTaken, round: state.round });

    // If both finished, end round early
    const allDone = state.players.every(p => state.completions[p.socketId] !== undefined);
    if (allDone) endRound(io, room, state);
  });

  socket.on('word:progress', ({ code, lettersTyped }) => {
    if (typeof lettersTyped !== 'number') return;
    // Relay to others in room (live typing progress bar)
    socket.to((code || '').toUpperCase().trim()).emit('word:opponent-progress', {
      socketId: socket.id,
      lettersTyped,
    });
  });

  socket.on('word:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = wordState.get(room.code);
    if (!state) {
      state = createState(room.players);
      wordState.set(room.code, state);
      startRound(io, room, state);
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of wordState.entries()) {
      clearTimeout(state.roundTimer);
      if (state.players.some(p => p.socketId === socket.id)) {
        wordState.delete(code);
      }
    }
  });
}
