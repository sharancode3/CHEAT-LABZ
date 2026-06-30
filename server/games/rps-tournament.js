/**
 * server/games/rps-tournament.js — 4-Player RPS Tournament
 */

const tourneyState = new Map();

function createState(players) {
  const ids = players.map(p => p.socketId);
  const pStates = {};
  players.forEach((p, i) => {
    pStates[p.socketId] = {
      displayName: p.displayName,
      color: p.color
    };
  });

  return {
    players: pStates,
    playersList: ids,
    // Matches: semi1, semi2, final, third
    matches: {
      semi1: { p1: ids[0], p2: ids[1], p1Choice: null, p2Choice: null, p1Score: 0, p2Score: 0, winner: null, loser: null, round: 1 },
      semi2: { p2: ids[3] ? ids[3] : null, p1: ids[2], p1Choice: null, p2Choice: null, p1Score: 0, p2Score: 0, winner: null, loser: null, round: 1 },
      final: { p1: null, p2: null, p1Choice: null, p2Choice: null, p1Score: 0, p2Score: 0, winner: null, loser: null, round: 1 },
      third: { p1: null, p2: null, p1Choice: null, p2Choice: null, p1Score: 0, p2Score: 0, winner: null, loser: null, round: 1 }
    },
    phase: 'semi' // 'semi' | 'finals' | 'results'
  };
}

function BEATS(c1, c2) {
  if (c1 === c2) return 0; // Draw
  if (
    (c1 === 'rock' && c2 === 'scissors') ||
    (c1 === 'paper' && c2 === 'rock') ||
    (c1 === 'scissors' && c2 === 'paper')
  ) {
    return 1; // P1 wins
  }
  return -1; // P2 wins
}

function checkMatchCompleted(m) {
  // Best of 5 (first to 3 wins)
  if (m.p1Score >= 3) { m.winner = m.p1; m.loser = m.p2; return true; }
  if (m.p2Score >= 3) { m.winner = m.p2; m.loser = m.p1; return true; }
  return false;
}

function processTurn(io, room, state) {
  const m = state.matches;

  if (state.phase === 'semi') {
    // Semi 1 checking
    if (m.semi1.p1Choice && m.semi1.p2Choice) {
      const res = BEATS(m.semi1.p1Choice, m.semi1.p2Choice);
      if (res === 1) m.semi1.p1Score++;
      if (res === -1) m.semi1.p2Score++;
      m.semi1.p1Choice = null;
      m.semi1.p2Choice = null;
      m.semi1.round++;
      checkMatchCompleted(m.semi1);
    }
    // Semi 2 checking
    if (m.semi2.p1 && m.semi2.p2) {
      if (m.semi2.p1Choice && m.semi2.p2Choice) {
        const res = BEATS(m.semi2.p1Choice, m.semi2.p2Choice);
        if (res === 1) m.semi2.p1Score++;
        if (res === -1) m.semi2.p2Score++;
        m.semi2.p1Choice = null;
        m.semi2.p2Choice = null;
        m.semi2.round++;
        checkMatchCompleted(m.semi2);
      }
    } else {
      // Auto-win if only 3 players
      m.semi2.winner = m.semi2.p1;
      m.semi2.loser = null;
    }

    // If both Semis complete, advance to finals!
    if (m.semi1.winner && m.semi2.winner) {
      state.phase = 'finals';
      m.final.p1 = m.semi1.winner;
      m.final.p2 = m.semi2.winner;
      m.third.p1 = m.semi1.loser;
      m.third.p2 = m.semi2.loser;
    }
  } else if (state.phase === 'finals') {
    // Final
    if (m.final.p1Choice && m.final.p2Choice) {
      const res = BEATS(m.final.p1Choice, m.final.p2Choice);
      if (res === 1) m.final.p1Score++;
      if (res === -1) m.final.p2Score++;
      m.final.p1Choice = null;
      m.final.p2Choice = null;
      m.final.round++;
      checkMatchCompleted(m.final);
    }

    // Third place match
    if (m.third.p1 && m.third.p2) {
      if (m.third.p1Choice && m.third.p2Choice) {
        const res = BEATS(m.third.p1Choice, m.third.p2Choice);
        if (res === 1) m.third.p1Score++;
        if (res === -1) m.third.p2Score++;
        m.third.p1Choice = null;
        m.third.p2Choice = null;
        m.third.round++;
        checkMatchCompleted(m.third);
      }
    } else {
      m.third.winner = m.third.p1 || m.third.p2;
    }

    // Check tourney end
    if (m.final.winner && (m.third.winner || !m.third.p1)) {
      state.phase = 'results';
      io.to(room.code).emit('tourney:state', { state });
      io.to(room.code).emit('game:over', { winner: m.final.winner, finalScores: null });
      tourneyState.delete(room.code);
      room.state = 'waiting';
      return;
    }
  }

  io.to(room.code).emit('tourney:state', { state });
}

export function registerRpsTournamentEvents(io, socket, rooms) {
  socket.on('tourney:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = tourneyState.get(room.code);
    if (!state) {
      state = createState(room.players);
      tourneyState.set(room.code, state);
    }

    io.to(room.code).emit('tourney:state', { state });
  });

  socket.on('tourney:choose', ({ code, choice }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = tourneyState.get(room.code);
    if (!state || state.phase === 'results') return;

    const m = state.matches;

    // Record submission to active match
    if (state.phase === 'semi') {
      if (m.semi1.p1 === socket.id) m.semi1.p1Choice = choice;
      if (m.semi1.p2 === socket.id) m.semi1.p2Choice = choice;
      if (m.semi2.p1 === socket.id) m.semi2.p1Choice = choice;
      if (m.semi2.p2 === socket.id) m.semi2.p2Choice = choice;
    } else if (state.phase === 'finals') {
      if (m.final.p1 === socket.id) m.final.p1Choice = choice;
      if (m.final.p2 === socket.id) m.final.p2Choice = choice;
      if (m.third.p1 === socket.id) m.third.p1Choice = choice;
      if (m.third.p2 === socket.id) m.third.p2Choice = choice;
    }

    processTurn(io, room, state);
  });

  socket.on('disconnect', () => {
    for (const [code, state] of tourneyState.entries()) {
      if (state.playersList.includes(socket.id)) {
        tourneyState.delete(code);
      }
    }
  });
}
