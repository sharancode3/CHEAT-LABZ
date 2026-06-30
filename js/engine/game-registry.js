/**
 * js/engine/game-registry.js
 * The Single Source of Truth for All Games
 */

export const SOLO_GAMES = {
  'neon-serpent': {
    id: 'neon-serpent',
    name: 'Neon Serpent',
    file: '/js/games/solo/neon-serpent.js',
    className: 'NeonSerpent',
    category: 'ARCADE',
    difficulty: 'MEDIUM',
    players: '1',
    accentColor: '#00d4aa',
    logicalWidth: 600,
    logicalHeight: 600,
    description: 'Classic snake turbo-charged with combos.',
    tags: ['TRENDING'],
    status: 'live'
  },
  'test-game': {
    id: 'test-game',
    name: 'Test Game',
    file: '/js/games/solo/test-game.js',
    className: 'TestGame',
    category: 'TEST',
    difficulty: 'EASY',
    players: '1',
    accentColor: '#ff00ff',
    logicalWidth: 800,
    logicalHeight: 600,
    description: 'A bouncing ball test for the game engine.',
    tags: [],
    status: 'live'
  }
  // Other games will be migrated here
};

export const MULTI_GAMES = {
  'rps': {
    id: 'rps',
    name: 'Rock Paper Scissors',
    file: '/js/games/multi/rock-paper-scissors.js',
    className: 'RockPaperScissors',
    minPlayers: 2,
    maxPlayers: 2,
    accentColor: '#ff6b6b',
    logicalWidth: 800,
    logicalHeight: 500,
    status: 'live'
  },
  'tic-tac-toe': {
    id: 'tic-tac-toe',
    name: 'Tic Tac Toe',
    file: '/js/games/multi/tic-tac-toe.js',
    className: 'TicTacToe',
    minPlayers: 2,
    maxPlayers: 2,
    accentColor: '#6c63ff',
    logicalWidth: 600,
    logicalHeight: 600,
    status: 'live'
  }
  // Other games will be migrated here
};

/**
 * Dynamically loads a game class by id from a registry.
 * @param {string} id The game ID
 * @param {Object} registry Either SOLO_GAMES or MULTI_GAMES
 * @returns {Promise<{GameClass: any, meta: Object}>}
 */
export async function loadGame(id, registry) {
  const meta = registry[id];
  if (!meta) throw new Error(`UNKNOWN_GAME:${id}`);
  if (meta.status !== 'live') throw new Error(`NOT_LIVE:${id}`);
  
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('TIMEOUT: Connection too slow. Try again.')), 5000)
  );
  
  const load = import(meta.file);
  
  try {
    const module = await Promise.race([load, timeout]);
    // Allow either default export or named export matching className
    const GameClass = module.default || module[meta.className];
    
    if (!GameClass) throw new Error('NO_DEFAULT_EXPORT: Game file has an error.');
    
    return { GameClass, meta };
  } catch (err) {
    if (err.message.startsWith('TIMEOUT')) throw err;
    if (err.message.startsWith('NO_DEFAULT_EXPORT')) throw err;
    throw new Error(`IMPORT_FAILED: ${err.message}`);
  }
}
