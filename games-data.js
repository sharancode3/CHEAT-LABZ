/**
 * games-data.js
 *
 * Classic script version of the game manifest, loaded by HTML pages.
 * Must be in sync with js/core/game-manifest.js.
 */

var GAMES = [
  // ==================== SOLO GAMES ====================
  {
    id: 'neon-serpent',
    name: 'Neon Serpent',
    type: 'solo',
    category: 'ARCADE',
    difficulty: 'HARD',
    players: '1',
    description: "Snake (Overdrive Protocol). Variable speed grid with drift mechanics and Boost Gauge.",
    howToPlay: "Eat neon pellets to fill your Boost Gauge. Activating Boost allows you to dash through your own tail once per gauge without dying.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Move / Turn' },
      { key: 'SPACE', action: 'Activate Boost' },
      { key: 'P', action: 'Pause Game' }
    ],
    scoringExplanation: "Speed increases dynamically. Earn points by eating. Second Chance Shield earned every 5000 points.",
    estimatedDuration: 120,
    tags: ['HOT', 'ARCADE'],
    accentColor: '#00f0ff',
    file: '/js/games/solo/neon-serpent.js',
    version: '2.0.0',
    status: 'live'
  },
  {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    type: 'solo',
    category: 'CLASSIC',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Pro Engine. Unbeatable AI with mistake heuristics. 5-second Blitz Timer per turn.",
    howToPlay: "Click on an empty cell to place your X. Get 3 in a row to win the round. You have 3 Hearts. Failing to act within 5 seconds loses a heart.",
    controls: [
      { key: 'MOUSE', action: 'Place Token' }
    ],
    scoringExplanation: "Win rounds to earn points. Higher levels reduce AI mistake probability.",
    estimatedDuration: 60,
    tags: ['CLASSIC', 'LOGIC'],
    accentColor: '#ff0055',
    file: '/js/games/solo/tic-tac-toe.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'rock-paper-scissors',
    name: 'RPS (Predictive Arena)',
    type: 'solo',
    category: 'CLASSIC',
    difficulty: 'EASY',
    players: '1',
    description: "Predictive Arena. AI uses a 1st-order Markov Chain to predict and counter your moves.",
    howToPlay: "Press the corresponding key to select Rock, Paper, or Scissors. Best of 5 Rounds.",
    controls: [
      { key: 'A / 1', action: 'Rock' },
      { key: 'S / 2', action: 'Paper' },
      { key: 'D / 3', action: 'Scissors' }
    ],
    scoringExplanation: "Win rounds to earn points. AI learns from your patterns.",
    estimatedDuration: 45,
    tags: ['CLASSIC', 'MIND'],
    accentColor: '#facc15',
    file: '/js/games/solo/rock-paper-scissors.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'pong',
    title: 'Pong (Dynamic Velocity)',
    category: 'ARCADE',
    image: 'assets/images/games/pong.jpg',
    description: 'Dynamic angular deflection. Face off against an adaptive AI in a high-speed match to 7 points.',
    tags: ['ARCADE', 'CLASSIC'],
    accentColor: '#38bdf8'
  },
  {
    id: 'memory-match',
    title: 'Memory Match',
    category: 'PUZZLE',
    image: 'assets/images/games/memory.jpg',
    description: 'Temporal Decay. Your focus drains over time. Mismatches hurt, matches heal. Survive the board.',
    tags: ['PUZZLE', 'MEMORY'],
    accentColor: '#c084fc'
  },
  {
    id: 'connect-four',
    title: 'Connect Four',
    category: 'LOGIC',
    image: 'assets/images/games/connect4.jpg',
    description: 'Gravity Matrix. Outsmart the AI by aligning 4 tokens across any axis.',
    tags: ['LOGIC', 'CLASSIC'],
    accentColor: '#facc15'
  },
  {
    id: 'whack-a-mole',
    title: 'Data Breach (Whack)',
    category: 'ARCADE',
    image: 'assets/images/games/mole.jpg',
    description: 'Cyber Data Breach. Strike nodes before they expire, but avoid the Glitch Bombs!',
    tags: ['ARCADE', 'REACTION'],
    accentColor: '#10b981'
  },
  {
    id: 'clicker',
    title: 'Quantum Clicker',
    category: 'IDLE',
    image: 'assets/images/games/clicker.jpg',
    description: 'Quantum Core Accelerator. Upgrade generators to maximize CPS without melting down the core.',
    tags: ['IDLE', 'STRATEGY'],
    accentColor: '#f97316'
  },
  {
    id: 'balloon-pop',
    title: 'Balloon Pop (Vector)',
    category: 'ARCADE',
    image: 'assets/images/games/balloon.jpg',
    description: 'Chain Reaction Vector. Pop floating balloons and trigger massive chain reaction explosions.',
    tags: ['ARCADE', 'PHYSICS'],
    accentColor: '#ec4899'
  },
  {
    id: 'simon-says',
    title: 'Synesthesia Matrix',
    category: 'PUZZLE',
    image: 'assets/images/games/simon.jpg',
    description: 'Simon Says (Synesthesia Matrix). Memorize the expanding tonal sequence before the input timeout.',
    tags: ['PUZZLE', 'MEMORY'],
    accentColor: '#10b981'
  },
  {
    id: 'catch-objects',
    title: 'Vortex Basket',
    category: 'ARCADE',
    image: 'assets/images/games/catch.jpg',
    description: 'Catch the Falling Objects. Gather resources while dodging lethal hazards dropping at terminal velocity.',
    tags: ['ARCADE', 'REACTION'],
    accentColor: '#3b82f6'
  },
  {
    id: 'flappy-bird',
    title: 'Vector Flight',
    category: 'ARCADE',
    image: 'assets/images/games/flappy.jpg',
    description: 'Flappy Bird (Vector). Absolute precision platforming with strict 1-hit knockout rules.',
    tags: ['ARCADE', 'HARDCORE'],
    accentColor: '#facc15'
  },
  {
    id: 'brick-breaker',
    title: 'Shatter Space',
    category: 'ARCADE',
    image: 'assets/images/games/brick.jpg',
    description: 'Brick Breaker. Clear the 5x10 matrix using precise normal inversions.',
    tags: ['ARCADE', 'CLASSIC'],
    accentColor: '#3b82f6'
  },
  {
    id: 'asteroids',
    title: 'Inertia Drive',
    category: 'ARCADE',
    image: 'assets/images/games/asteroids.jpg',
    description: 'Asteroids. Survive in a toroidal space using Newtonian thrust and fragmentation weaponry.',
    tags: ['ARCADE', 'SHOOTER'],
    accentColor: '#ef4444'
  },
  {
    id: 'frogger',
    title: 'Traffic Rush',
    category: 'ARCADE',
    image: 'assets/images/games/frogger.jpg',
    description: 'Frogger. Navigate the hazard grid and attach to moving platforms to reach the safety bays.',
    tags: ['ARCADE', 'REACTION'],
    accentColor: '#10b981'
  },
  {
    id: 'number-guessing',
    title: 'Binary Search Radar',
    category: 'PUZZLE',
    image: 'assets/images/games/number.jpg',
    description: 'Binary Search Radar. Use heat proximity clues to triangulate the target number.',
    tags: ['PUZZLE', 'LOGIC'],
    accentColor: '#f97316'
  },
  {
    id: 'typing-test',
    title: 'Velocity Engine',
    category: 'WORD',
    image: 'assets/images/games/typing.jpg',
    description: 'Velocity Engine. Push your Gross and Net WPM to the limits in this raw typing speed test.',
    tags: ['WORD', 'REACTION'],
    accentColor: '#3b82f6'
  },
  {
    id: 'hangman',
    title: 'Cyber Deconstruction',
    category: 'WORD',
    image: 'assets/images/games/hangman.jpg',
    description: 'Hangman (Cyber Deconstruction). Decrypt the word before 6 strikes shatter your system.',
    tags: ['WORD', 'PUZZLE'],
    accentColor: '#ef4444'
  },
  {
    id: 'word-scramble',
    title: 'Anagram Time-Attack',
    category: 'WORD',
    image: 'assets/images/games/scramble.jpg',
    description: 'Word Scramble. Unscramble the anagrams quickly to add time back to the clock.',
    tags: ['WORD', 'PUZZLE'],
    accentColor: '#8b5cf6'
  },
  {
    id: 'wordle',
    title: 'Frequency Matrix',
    category: 'WORD',
    image: 'assets/images/games/wordle.jpg',
    description: 'Wordle Clone (Frequency Matrix). Deduce the secret 5-letter password in 6 attempts.',
    tags: ['WORD', 'PUZZLE'],
    accentColor: '#10b981'
  },
  {
    id: '2048',
    title: 'Kinetic Merge',
    category: 'PUZZLE',
    image: 'assets/images/games/2048.jpg',
    description: '2048 (Kinetic Merge). Slide and compress tiles to reach the ultimate value.',
    tags: ['PUZZLE', 'LOGIC'],
    accentColor: '#eab308'
  },
  {
    id: 'sudoku',
    title: 'Logic Engine',
    category: 'PUZZLE',
    image: 'assets/images/games/sudoku.jpg',
    description: 'Sudoku (Logic Engine). A mathematically generated grid with a single unique solution.',
    tags: ['PUZZLE', 'LOGIC'],
    accentColor: '#3b82f6'
  },
  {
    id: 'sliding-puzzle',
    title: 'Parallax Reconstruction',
    category: 'PUZZLE',
    image: 'assets/images/games/sliding.jpg',
    description: 'Sliding Puzzle. Shift the scrambled matrix back into numerical order.',
    tags: ['PUZZLE', 'LOGIC'],
    accentColor: '#f97316'
  },
  {
    id: 'minesweeper',
    title: 'Radar Clear',
    category: 'PUZZLE',
    image: 'assets/images/games/minesweeper.jpg',
    description: 'Minesweeper (Radar Clear). Safely navigate the minefield using numerical proximity logic.',
    tags: ['PUZZLE', 'LOGIC'],
    accentColor: '#ef4444'
  },
  {
    id: 'quiz',
    title: 'Streak Matrix',
    category: 'TRIVIA',
    image: 'assets/images/games/quiz.jpg',
    description: 'Trivia Game (Streak Matrix). Answer rapidly to compound your score multiplier.',
    tags: ['TRIVIA', 'REACTION'],
    accentColor: '#8b5cf6'
  },
  {
    id: 'mp-tic-tac-toe',
    title: 'Tic-Tac-Toe Duel',
    category: 'MULTIPLAYER',
    image: 'assets/images/games/mp-tictactoe.jpg',
    description: 'Tic-Tac-Toe (2-Player Duel). Alternating turns with a chess clock.',
    tags: ['MULTIPLAYER', 'CLASSIC'],
    accentColor: '#3b82f6'
  },
  {
    id: 'mp-pong',
    title: 'Pong Hyper-Rally',
    category: 'MULTIPLAYER',
    image: 'assets/images/games/mp-pong.jpg',
    description: 'Pong (2-Player Hyper-Rally). Paddle smash modifiers and intense volleys.',
    tags: ['MULTIPLAYER', 'ARCADE'],
    accentColor: '#10b981'
  },
  {
    id: 'mp-rps',
    title: 'RPS Blind Clash',
    category: 'MULTIPLAYER',
    image: 'assets/images/games/mp-rps.jpg',
    description: 'Rock, Paper, Scissors (Blind Clash). Masked inputs and tie-damage multipliers.',
    tags: ['MULTIPLAYER', 'CLASSIC'],
    accentColor: '#ef4444'
  },
  {
    id: 'mp-snake',
    title: 'Snake Tron Duel',
    category: 'MULTIPLAYER',
    image: 'assets/images/games/mp-snake.jpg',
    description: 'Snake vs Snake. Avoid bodies and head-on collisions in a Tron-style grid.',
    tags: ['MULTIPLAYER', 'ARCADE'],
    accentColor: '#14b8a6'
  },
  {
    id: 'mp-connect-four',
    title: 'Connect 4 Duel',
    category: 'MULTIPLAYER',
    image: 'assets/images/games/mp-connect.jpg',
    description: 'Connect Four (2-Player Duel). Split controls for real-time dropping.',
    tags: ['MULTIPLAYER', 'LOGIC'],
    accentColor: '#eab308'
  },
  {
    id: 'mp-memory',
    title: 'Memory Point Steal',
    category: 'MULTIPLAYER',
    image: 'assets/images/games/mp-memory.jpg',
    description: 'Memory Match Race. Avoid traps to steal points and keep your turn.',
    tags: ['MULTIPLAYER', 'PUZZLE'],
    accentColor: '#a855f7'
  },
  {
    id: 'mp-tug-of-war',
    title: 'Tug of War Masher',
    category: 'MULTIPLAYER',
    image: 'assets/images/games/mp-tug.jpg',
    description: 'Tug of War. Mash keys to pull the rope, but manage your stamina.',
    tags: ['MULTIPLAYER', 'REACTION'],
    accentColor: '#f97316'
  },
  {
    id: 'mp-tank',
    title: 'Tank Ballistics',
    category: 'MULTIPLAYER',
    image: 'assets/images/games/mp-tank.jpg',
    description: 'Tank Trouble. 4-bounce vector ricochets and intense arena combat.',
    tags: ['MULTIPLAYER', 'ACTION'],
    accentColor: '#6366f1'
  },
  {
    id: 'mp-racing',
    title: 'Racing Dots',
    category: 'MULTIPLAYER',
    image: 'assets/images/games/mp-racing.jpg',
    description: 'Racing Dots. Alternating key mashing for maximum velocity.',
    tags: ['MULTIPLAYER', 'RACING'],
    accentColor: '#0ea5e9'
  },
  {
    id: 'mp-air-hockey',
    title: 'Air Hockey Arena',
    category: 'MULTIPLAYER',
    image: 'assets/images/games/mp-hockey.jpg',
    description: 'Air Hockey. Elastic circle-circle impulse math in a fast-paced rink.',
    tags: ['MULTIPLAYER', 'SPORTS'],
    accentColor: '#ec4899'
  }
];
