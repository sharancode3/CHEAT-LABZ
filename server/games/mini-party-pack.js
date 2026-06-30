/**
 * server/games/mini-party-pack.js — Sequenced Micro Party Games
 */

const partyState = new Map();

function createState(players) {
  const pStates = {};
  players.forEach(p => {
    pStates[p.socketId] = {
      score: 0,
      subScore: 0, // score for current mini game
      balance: 50, // for balance challenge
      clicks: 0,   // for click frenzy
      memoryAnswers: [], // memory flash selected indices
      lastClickTime: 0, // last button click
      displayName: p.displayName
    };
  });

  return {
    players: pStates,
    currentGameIndex: 0, // 0 to 3
    gamesOrder: [0, 1, 2, 3].sort(() => Math.random() - 0.5), // randomized order
    phase: 'transition', // 'transition' | 'playing' | 'results'
    timer: 3000, // transition timer (3s)
    subTimer: 0, // gameplay countdown
    memoryShapes: [], // 5 index values (0-9)
    playersList: players.map(p => p.socketId),
    tickInterval: null
  };
}

function startSubGame(state) {
  state.phase = 'playing';
  const gameType = state.gamesOrder[state.currentGameIndex];

  // Reset player sub scores
  for (const p of Object.values(state.players)) {
    p.subScore = 0;
    p.balance = 50;
    p.clicks = 0;
    p.memoryAnswers = [];
    p.lastClickTime = 0;
  }

  if (gameType === 0) { // Last Button
    state.subTimer = 10000; // 10s
  } else if (gameType === 1) { // Balance Challenge
    state.subTimer = 20000; // 20s
  } else if (gameType === 2) { // Memory Flash
    state.subTimer = 30000; // 30s
    // Generate 5 random shapes from 10 candidates
    state.memoryShapes = [];
    while (state.memoryShapes.length < 5) {
      const idx = Math.floor(Math.random() * 10);
      if (!state.memoryShapes.includes(idx)) state.memoryShapes.push(idx);
    }
  } else if (gameType === 3) { // Click Frenzy
    state.subTimer = 15000; // 15s
  }
}

function processSubGameEnd(io, room, state) {
  const gameType = state.gamesOrder[state.currentGameIndex];

  // Calculate scores for the completed sub game and add to total
  if (gameType === 0) { // Last Button
    // Winner is whoever clicked closest to the end (but before 0s)
    let bestTime = 999999;
    let winnerId = null;
    for (const [id, p] of Object.entries(state.players)) {
      if (p.lastClickTime > 0) {
        const diff = p.lastClickTime; // remaining time when clicked
        if (diff > 0 && diff < bestTime) {
          bestTime = diff;
          winnerId = id;
        }
      }
    }
    if (winnerId) {
      state.players[winnerId].score += 10;
      state.players[winnerId].subScore = 10;
    }
  } else if (gameType === 1) { // Balance needle
    // survival time (those who stayed on needle get points)
    for (const p of Object.values(state.players)) {
      if (p.balance > 10 && p.balance < 90) {
        p.score += 10;
        p.subScore = 10;
      }
    }
  } else if (gameType === 2) { // Memory Flash
    // Score based on correct answers
    for (const p of Object.values(state.players)) {
      let correct = 0;
      p.memoryAnswers.forEach(ans => {
        if (state.memoryShapes.includes(ans)) correct++;
      });
      p.score += correct * 2;
      p.subScore = correct * 2;
    }
  } else if (gameType === 3) { // Click Frenzy
    let maxClicks = -1;
    let winnerId = null;
    for (const [id, p] of Object.entries(state.players)) {
      if (p.clicks > maxClicks) {
        maxClicks = p.clicks;
        winnerId = id;
      }
    }
    if (winnerId) {
      state.players[winnerId].score += 10;
      state.players[winnerId].subScore = 10;
    }
  }

  // Advance to next game or finish pack
  if (state.currentGameIndex < 3) {
    state.currentGameIndex++;
    state.phase = 'transition';
    state.timer = 3000;
  } else {
    // End pack
    state.phase = 'results';
    clearInterval(state.tickInterval);
    // Find absolute winner
    let maxScore = -1;
    let winnerId = null;
    for (const [id, p] of Object.entries(state.players)) {
      if (p.score > maxScore) {
        maxScore = p.score;
        winnerId = id;
      }
    }
    io.to(room.code).emit('game:over', { winner: winnerId, finalScores: null });
    partyState.delete(room.code);
    room.state = 'waiting';
  }
}

function updatePhysics(io, room, state) {
  if (state.phase === 'transition') {
    state.timer -= 16;
    if (state.timer <= 0) {
      startSubGame(state);
    }
  } else if (state.phase === 'playing') {
    state.subTimer -= 16;

    // Decay balance challange needle center shifts randomly
    const gameType = state.gamesOrder[state.currentGameIndex];
    if (gameType === 1) { // Balance challenge
      for (const p of Object.values(state.players)) {
        if (p.balance > 10 && p.balance < 90) {
          p.balance += (Math.random() - 0.5) * 1.5;
        }
      }
    }

    if (state.subTimer <= 0) {
      processSubGameEnd(io, room, state);
    }
  }
}

export function registerPartyEvents(io, socket, rooms) {
  socket.on('party:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = partyState.get(room.code);
    if (!state) {
      state = createState(room.players);
      partyState.set(room.code, state);

      state.tickInterval = setInterval(() => {
        updatePhysics(io, room, state);
        io.to(room.code).emit('party:tick', {
          players: state.players,
          currentGameIndex: state.currentGameIndex,
          gameType: state.gamesOrder[state.currentGameIndex],
          phase: state.phase,
          timer: state.phase === 'transition' ? state.timer : state.subTimer,
          memoryShapes: state.memoryShapes
        });
      }, TICK_INTERVAL_MS);
    }
  });

  socket.on('party:action', ({ code, clickButton, tapSteer, memorySelect }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = partyState.get(room.code);
    if (!state || state.phase !== 'playing') return;

    const p = state.players[socket.id];
    if (!p) return;

    const gameType = state.gamesOrder[state.currentGameIndex];

    if (gameType === 0 && clickButton) { // Last Button
      p.lastClickTime = state.subTimer; // Record remaining time when clicked
    } else if (gameType === 1 && tapSteer) { // Balance Challenge
      if (tapSteer === 'left') p.balance = Math.max(0, p.balance - 3.5);
      if (tapSteer === 'right') p.balance = Math.min(100, p.balance + 3.5);
    } else if (gameType === 2 && typeof memorySelect === 'number') { // Memory Flash
      if (p.memoryAnswers.length < 5 && !p.memoryAnswers.includes(memorySelect)) {
        p.memoryAnswers.push(memorySelect);
      }
    } else if (gameType === 3 && clickButton) { // Click Frenzy
      p.clicks++;
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of partyState.entries()) {
      if (state.players[socket.id]) {
        clearInterval(state.tickInterval);
        partyState.delete(code);
      }
    }
  });
}
