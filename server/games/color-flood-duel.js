/**
 * server/games/color-flood-duel.js — Color Flood Game Server
 */

const floodState = new Map();
const GRID_SIZE = 12;
const MAX_TURNS = 20;

function generateGrid() {
  const grid = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    const row = [];
    for (let c = 0; c < GRID_SIZE; c++) {
      row.push(Math.floor(Math.random() * 5));
    }
    grid.push(row);
  }
  return grid;
}

function createState(players) {
  const grid = generateGrid();
  const [p1, p2] = players;

  // Make sure corners start with different colors
  if (grid[0][0] === grid[GRID_SIZE - 1][GRID_SIZE - 1]) {
    grid[GRID_SIZE - 1][GRID_SIZE - 1] = (grid[0][0] + 1) % 5;
  }

  const territories = {
    [p1.socketId]: new Set(['0,0']),
    [p2.socketId]: new Set([`${GRID_SIZE - 1},${GRID_SIZE - 1}`])
  };

  return {
    grid,
    territories,
    players: players.map(p => p.socketId),
    playersList: players.map(p => ({ socketId: p.socketId, displayName: p.displayName })),
    currentTurn: p1.socketId,
    turnCount: 0
  };
}

function floodFill(state, socketId, chosenColor) {
  const territory = state.territories[socketId];
  const grid = state.grid;

  const queue = [];
  const visited = new Set();

  // Populate queue with all cells in current territory
  for (const cellStr of territory) {
    const [x, y] = cellStr.split(',').map(Number);
    queue.push([x, y]);
    visited.add(cellStr);
  }

  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];

  while (queue.length > 0) {
    const [cx, cy] = queue.shift();

    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      const key = `${nx},${ny}`;

      if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
        if (!visited.has(key)) {
          visited.add(key);
          if (grid[ny][nx] === chosenColor || territory.has(key)) {
            territory.add(key);
            queue.push([nx, ny]);
          }
        }
      }
    }
  }

  // Update flooded grid cells to chosen color
  for (const cellStr of territory) {
    const [x, y] = cellStr.split(',').map(Number);
    grid[y][x] = chosenColor;
  }
}

export function registerColorFloodDuelEvents(io, socket, rooms) {
  socket.on('flood:ready', ({ code }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    let state = floodState.get(room.code);
    if (!state) {
      state = createState(room.players);
      floodState.set(room.code, state);
    }

    // Send initial state
    const scores = {
      [state.players[0]]: state.territories[state.players[0]].size,
      [state.players[1]]: state.territories[state.players[1]].size,
    };

    io.to(room.code).emit('flood:state', {
      grid: state.grid,
      territories: {
        [state.players[0]]: Array.from(state.territories[state.players[0]]),
        [state.players[1]]: Array.from(state.territories[state.players[1]])
      },
      scores,
      currentTurn: state.currentTurn,
      turnCount: state.turnCount
    });
  });

  socket.on('flood:choose', ({ code, colorIndex }) => {
    const room = rooms.get((code || '').toUpperCase().trim());
    if (!room || room.state !== 'playing') return;

    const state = floodState.get(room.code);
    if (!state || state.currentTurn !== socket.id) return;

    const myId = socket.id;
    const oppId = state.players.find(id => id !== myId);

    const myColor = state.grid[0][0]; // Top-left color
    const oppColor = state.grid[GRID_SIZE - 1][GRID_SIZE - 1]; // Bottom-right color

    // Cannot choose own current color or opponent's current color
    if (colorIndex === myColor || colorIndex === oppColor) return;

    // Run flood fill BFS
    floodFill(state, myId, colorIndex);

    state.turnCount++;

    const scores = {
      [state.players[0]]: state.territories[state.players[0]].size,
      [state.players[1]]: state.territories[state.players[1]].size,
    };

    // Check game over
    const halfBoard = (GRID_SIZE * GRID_SIZE) / 2;
    const someoneControlledHalf = scores[myId] > halfBoard || scores[oppId] > halfBoard;
    const gameEnded = state.turnCount >= MAX_TURNS || someoneControlledHalf;

    if (gameEnded) {
      io.to(room.code).emit('flood:state', {
        grid: state.grid,
        territories: {
          [state.players[0]]: Array.from(state.territories[state.players[0]]),
          [state.players[1]]: Array.from(state.territories[state.players[1]])
        },
        scores,
        currentTurn: null,
        turnCount: state.turnCount
      });

      const winnerId = scores[state.players[0]] > scores[state.players[1]] ? state.players[0]
                     : scores[state.players[1]] > scores[state.players[0]] ? state.players[1]
                     : null;

      setTimeout(() => {
        io.to(room.code).emit('game:over', { winner: winnerId, finalScores: scores });
        floodState.delete(room.code);
        room.state = 'waiting';
      }, 1500);
    } else {
      state.currentTurn = oppId;

      io.to(room.code).emit('flood:state', {
        grid: state.grid,
        territories: {
          [state.players[0]]: Array.from(state.territories[state.players[0]]),
          [state.players[1]]: Array.from(state.territories[state.players[1]])
        },
        scores,
        currentTurn: state.currentTurn,
        turnCount: state.turnCount
      });
    }
  });

  socket.on('disconnect', () => {
    for (const [code, state] of floodState.entries()) {
      if (state.players.includes(socket.id)) {
        floodState.delete(code);
      }
    }
  });
}
