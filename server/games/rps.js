/**
 * server/games/rps.js — Rock Paper Scissors Multiplayer
 * Best of 5 rounds. Choices hidden until both submit.
 */

const rpsState = new Map(); // roomCode → state

const BEATS = { rock: 'scissors', scissors: 'paper', paper: 'rock' };

function createState(players) {
  const [p1, p2] = players;
  return {
    round: 1,
    maxRounds: 5,
    scores: { [p1.socketId]: 0, [p2.socketId]: 0 },
    choices: {},
    roundHistory: [],
    players: players.map(p => ({ socketId: p.socketId, displayName: p.displayName })),
  };
}

function determineWinner(c1, c2) {
  if (c1 === c2) return 'draw';
  return BEATS[c1] === c2 ? 'p1' : 'p2';
}

export function registerRPSEvents(io, socket, rooms) {
  socket.on('rps:choose', ({ code, choice }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;
    if (!['rock', 'paper', 'scissors'].includes(choice)) return;

    let state = rpsState.get(room.code);
    if (!state) {
      state = createState(room.players);
      rpsState.set(room.code, state);
    }

    // Reject if already chose this round
    if (state.choices[socket.id]) return;
    state.choices[socket.id] = choice;

    // Confirm received (not what they chose — just acknowledgement)
    socket.emit('rps:choice-received');

    // Both chose?
    const playerIds = state.players.map(p => p.socketId);
    if (!playerIds.every(id => state.choices[id])) return;

    const [pid1, pid2] = playerIds;
    const c1 = state.choices[pid1];
    const c2 = state.choices[pid2];
    const result = determineWinner(c1, c2);

    let roundWinnerId = null;
    if (result === 'p1') {
      state.scores[pid1]++;
      roundWinnerId = pid1;
    } else if (result === 'p2') {
      state.scores[pid2]++;
      roundWinnerId = pid2;
    }

    const roundResult = { round: state.round, choices: { [pid1]: c1, [pid2]: c2 }, winner: roundWinnerId };
    state.roundHistory.push(roundResult);

    const resultPayload = {
      round: state.round,
      choices: { [pid1]: c1, [pid2]: c2 },
      roundWinner: roundWinnerId,
      scores: { ...state.scores },
      roundHistory: state.roundHistory,
    };

    // Check for match winner (first to 3)
    const neededToWin = Math.ceil(state.maxRounds / 2);
    const matchWinner = playerIds.find(id => state.scores[id] >= neededToWin);

    if (matchWinner) {
      io.to(room.code).emit('rps:result', resultPayload);
      io.to(room.code).emit('game:over', {
        winner: matchWinner,
        finalScores: { ...state.scores },
        roundHistory: state.roundHistory,
      });
      rpsState.delete(room.code);
      room.state = 'waiting';
      return;
    }

    // Max rounds reached — tally
    if (state.round >= state.maxRounds) {
      const [s1, s2] = [state.scores[pid1], state.scores[pid2]];
      const finalWinner = s1 > s2 ? pid1 : s2 > s1 ? pid2 : null;
      io.to(room.code).emit('rps:result', resultPayload);
      io.to(room.code).emit('game:over', {
        winner: finalWinner,
        finalScores: { ...state.scores },
        roundHistory: state.roundHistory,
      });
      rpsState.delete(room.code);
      room.state = 'waiting';
      return;
    }

    io.to(room.code).emit('rps:result', resultPayload);

    // Start next round after 2.5s
    state.round++;
    state.choices = {};
    setTimeout(() => {
      if (rpsState.has(room.code)) {
        io.to(room.code).emit('rps:next-round', { round: state.round });
      }
    }, 2500);
  });

  socket.on('disconnect', () => {
    // Handled by rooms.js disconnect — game:over emitted there
    for (const [code, state] of rpsState.entries()) {
      if (state.players.some(p => p.socketId === socket.id)) {
        rpsState.delete(code);
      }
    }
  });
}
