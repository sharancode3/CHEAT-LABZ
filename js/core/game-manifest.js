/**
 * js/core/game-manifest.js
 *
 * Single authoritative source of truth for all games (solo & multiplayer).
 */

export const GAMES = [
  // ==================== SOLO GAMES ====================
  {
    id: 'neon-serpent',
    name: 'Neon Serpent',
    type: 'solo',
    category: 'ARCADE',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Classic snake turbo-charged with speed ramps and combos.",
    howToPlay: "Eat green energy orbs to grow longer. Avoid colliding with walls and your own tail. Fast eating creates combo multipliers.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Move / Turn' },
      { key: 'P', action: 'Pause Game' }
    ],
    scoringExplanation: "10 points per food orb. Quick consecutive eats trigger combo multipliers.",
    estimatedDuration: 120,
    tags: ['TRENDING', 'RETRO'],
    accentColor: '#00f0ff',
    file: '/js/games/solo/neon-serpent.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'loop-rally',
    name: 'Loop Rally',
    type: 'solo',
    category: 'ARCADE',
    difficulty: 'HARD',
    players: '1',
    description: "Classic paddle rally against an adaptive AI.",
    howToPlay: "Keep the ball in play by deflecting it back to the AI. Manage your lives and survive spike hazards.",
    controls: [
      { key: '← A / → D', action: 'Move Paddle Left/Right' },
      { key: 'MOUSE', action: 'Steer Paddle' }
    ],
    scoringExplanation: "+1 point per successful rally. The ball speeds up every 5 rallies.",
    estimatedDuration: 90,
    tags: ['TRENDING'],
    accentColor: '#ff6b6b',
    file: '/js/games/solo/loop-rally.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'turbo-drift',
    name: 'Turbo Drift',
    type: 'solo',
    category: 'RACING',
    difficulty: 'HARD',
    players: '1',
    description: "Top-down racing with drift scoring and boost pads.",
    howToPlay: "Complete 3 laps as fast as possible. Hold controlled drifts around corners and hit neon boost pads.",
    controls: [
      { key: '↑ W', action: 'Accelerate' },
      { key: '↓ S', action: 'Reverse' },
      { key: '← A / → D', action: 'Steer Car' }
    ],
    scoringExplanation: "Base score starts high and counts down, boosted by drift scoring.",
    estimatedDuration: 60,
    tags: ['TRENDING', 'HOT'],
    accentColor: '#ef4444',
    file: '/js/games/solo/turbo-drift.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'key-frenzy',
    name: 'Key Frenzy',
    type: 'solo',
    category: 'SKILL',
    difficulty: 'HARD',
    players: '1',
    description: "Typing gauntlet with shrinking windows and blind rounds.",
    howToPlay: "Press the matching keyboard key shown on screen before the outer circle collapses. Watch out for blind rounds where you must remember the key.",
    controls: [
      { key: 'A-Z', action: 'Press Matching Key' }
    ],
    scoringExplanation: "+10 points per key + time bonus. -10 points on misses.",
    estimatedDuration: 45,
    tags: ['NEW'],
    accentColor: '#fbbf24',
    file: '/js/games/solo/key-frenzy.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'astro-strider',
    name: 'Astro Strider',
    type: 'solo',
    category: 'ARCADE',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Side-scrolling space shooter with enemy waves.",
    howToPlay: "Navigate your spaceship through the asteroid field. Destroy incoming enemy ships, dodge bullets, and collect power-ups.",
    controls: [
      { key: '↑ W / ↓ S', action: 'Move Up/Down' },
      { key: 'SPACE', action: 'Fire Laser Canon' }
    ],
    scoringExplanation: "+5 points for asteroids, +15 points for enemy fighters. Power-up multipliers apply.",
    estimatedDuration: 120,
    tags: [],
    accentColor: '#818cf8',
    file: '/js/games/solo/astro-strider.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'cipher-quest',
    name: 'Cipher Quest',
    type: 'solo',
    category: 'PUZZLE',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Decode Caesar-cipher words under a time limit.",
    howToPlay: "Read the Caesar-shifted cipher word, decode it using the offset shift, and type the correct English word.",
    controls: [
      { key: 'A-Z', action: 'Type Word' },
      { key: 'ENTER', action: 'Submit Answer' }
    ],
    scoringExplanation: "+100 points per word + time bonus. Hints cost 20 points.",
    estimatedDuration: 100,
    tags: [],
    accentColor: '#a855f7',
    file: '/js/games/solo/cipher-quest.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'phantom-calc',
    name: 'Phantom Calc',
    type: 'solo',
    category: 'SKILL',
    difficulty: 'HARD',
    players: '1',
    description: "Mental math with disappearing equations.",
    howToPlay: "Memorize the mathematical equation before it fades away, calculate the result, and type it in.",
    controls: [
      { key: '0-9 / -', action: 'Type Digit / Minus' },
      { key: 'ENTER', action: 'Submit Answer' }
    ],
    scoringExplanation: "+50 points for correct calculations, -10 points for errors, +20 speed bonus.",
    estimatedDuration: 60,
    tags: [],
    accentColor: '#f472b6',
    file: '/js/games/solo/phantom-calc.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'word-pulse',
    name: 'Word Pulse',
    type: 'solo',
    category: 'SKILL',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Type each letter on the beat to keep the rhythm going.",
    howToPlay: "Watch the beat pulses and type the letters of the words exactly when the pulse aligns. Rhythm is critical.",
    controls: [
      { key: 'A-Z', action: 'Type Letter' }
    ],
    scoringExplanation: "+10 points for on-beat letters. Multipliers for continuous streaks.",
    estimatedDuration: 80,
    tags: [],
    accentColor: '#fb7185',
    file: '/js/games/solo/word-pulse.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'pixel-dodge',
    name: 'Pixel Dodge',
    type: 'solo',
    category: 'ARCADE',
    difficulty: 'HARD',
    players: '1',
    description: "Fast bullet hell. Survive as long as you can.",
    howToPlay: "Navigate the player pixel around the canvas. Dodge incoming projectiles coming from all four directions. One hit is fatal.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Move Pixel' }
    ],
    scoringExplanation: "Score increases based on survival duration (milliseconds survived).",
    estimatedDuration: 45,
    tags: ['HOT'],
    accentColor: '#f97316',
    file: '/js/games/solo/pixel-dodge.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'stack-blitz',
    name: 'Stack Blitz',
    type: 'solo',
    category: 'SKILL',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Drop platforms to build the tallest tower possible.",
    howToPlay: "Press SPACE or click to drop the moving platform. Try to align it perfectly with the tower. Misaligned parts are chopped off.",
    controls: [
      { key: 'SPACE / CLICK', action: 'Drop Block' }
    ],
    scoringExplanation: "+10 points per layer. +150 points for a perfect alignment.",
    estimatedDuration: 60,
    tags: [],
    accentColor: '#22d3ee',
    file: '/js/games/solo/stack-blitz.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'memory-grid',
    name: 'Memory Grid',
    type: 'solo',
    category: 'PUZZLE',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Repeat the lighting sequence on the grid.",
    howToPlay: "Watch the grid sequence light up. Repeat the pattern back in the exact order. The length increases every round.",
    controls: [
      { key: 'CLICK', action: 'Select Tile' }
    ],
    scoringExplanation: "+100 points per sequence round. Round multipliers apply.",
    estimatedDuration: 90,
    tags: [],
    accentColor: '#c084fc',
    file: '/js/games/solo/memory-grid.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'hyper-tap',
    name: 'Hyper Tap',
    type: 'solo',
    category: 'SKILL',
    difficulty: 'EASY',
    players: '1',
    description: "Precision tapping game when the indicator aligns.",
    howToPlay: "Click or press SPACE when the moving dot falls precisely into the center of the static target ring.",
    controls: [
      { key: 'SPACE / CLICK', action: 'Tap Indicator' }
    ],
    scoringExplanation: "Up to 100 points per tap depending on proximity to the absolute center.",
    estimatedDuration: 50,
    tags: ['CHILL'],
    accentColor: '#34d399',
    file: '/js/games/solo/hyper-tap.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'gravity-flip',
    name: 'Gravity Flip',
    type: 'solo',
    category: 'ARCADE',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Invert gravity to run around spikes and collect coins.",
    howToPlay: "Press SPACE to flip gravity. Run through the endless corridor, avoid spike blocks, and collect gold coins.",
    controls: [
      { key: 'SPACE / CLICK', action: 'Invert Gravity' }
    ],
    scoringExplanation: "Calculated based on distance run + 10 points per coin collected.",
    estimatedDuration: 75,
    tags: ['TRENDING'],
    accentColor: '#2dd4bf',
    file: '/js/games/solo/gravity-flip.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'chain-burst',
    name: 'Chain Burst',
    type: 'solo',
    category: 'PUZZLE',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Connect matching orbs to pop them.",
    howToPlay: "Click and drag your mouse/finger across same-colored adjacent orbs to link them into chains and pop them.",
    controls: [
      { key: 'DRAG MOUSE', action: 'Connect Orbs' }
    ],
    scoringExplanation: "Calculated as: Chain Length² × 10 points. 90-second limit.",
    estimatedDuration: 90,
    tags: [],
    accentColor: '#e879f9',
    file: '/js/games/solo/chain-burst.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'reflex-rush',
    name: 'Reflex Rush',
    type: 'solo',
    category: 'SKILL',
    difficulty: 'EASY',
    players: '1',
    description: "React to matching direction prompts immediately.",
    howToPlay: "Press the arrow key matching the flashing direction indicator as fast as possible. 10 rounds.",
    controls: [
      { key: 'ARROW KEYS', action: 'Match Arrow direction' }
    ],
    scoringExplanation: "100 minus reaction time in milliseconds per round.",
    estimatedDuration: 40,
    tags: [],
    accentColor: '#facc15',
    file: '/js/games/solo/reflex-rush.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'tile-runner',
    name: 'Tile Runner',
    type: 'solo',
    category: 'ARCADE',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Tap descending dark tiles without missing.",
    howToPlay: "Tap/Click on the dark tiles as they scroll down the screen. Do not click light tiles, and don't miss any dark tiles.",
    controls: [
      { key: 'CLICK', action: 'Click Tile' }
    ],
    scoringExplanation: "+1 point per dark tile successfully clicked. Speed increases with score.",
    estimatedDuration: 80,
    tags: [],
    accentColor: '#38bdf8',
    file: '/js/games/solo/tile-runner.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'beat-drop',
    name: 'Beat Drop',
    type: 'solo',
    category: 'SKILL',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Rhythm game. Match keys on the beat bar.",
    howToPlay: "Press D, F, J, or K keys when the descending rhythm notes overlap with the bottom target indicators.",
    controls: [
      { key: 'D F J K', action: 'Hit Beat Lane' }
    ],
    scoringExplanation: "PERFECT=100, GOOD=50, MISS=0 points depending on alignment accuracy.",
    estimatedDuration: 100,
    tags: [],
    accentColor: '#a78bfa',
    file: '/js/games/solo/beat-drop.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'slide-forge',
    name: 'Slide Forge',
    type: 'solo',
    category: 'PUZZLE',
    difficulty: 'MEDIUM',
    players: '1',
    description: "Merge identical numbers to reach the 2048 block.",
    howToPlay: "Slide the tiles inside the 4x4 grid. When two tiles with the same number touch, they merge into one with double value.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Slide Grid' }
    ],
    scoringExplanation: "Total score is the sum of all merged tile combinations.",
    estimatedDuration: 150,
    tags: [],
    accentColor: '#4ade80',
    file: '/js/games/solo/slide-forge.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'orb-pop-deluxe',
    name: 'Orb Pop Deluxe',
    type: 'solo',
    category: 'PUZZLE',
    difficulty: 'EASY',
    players: '1',
    description: "Match and pop colored bubbles.",
    howToPlay: "Aim the launcher using the mouse and click to fire. Match 3 or more bubbles of the same color to pop them before they reach the bottom.",
    controls: [
      { key: 'MOUSE', action: 'Aim' },
      { key: 'CLICK', action: 'Shoot' }
    ],
    scoringExplanation: "+10 points per bubble popped, with additional bonuses for drop chains.",
    estimatedDuration: 120,
    tags: ['CHILL'],
    accentColor: '#67e8f9',
    file: '/js/games/solo/orb-pop-deluxe.js',
    version: '1.0.0',
    status: 'live'
  },

  // ==================== MULTIPLAYER GAMES ====================
  {
    id: 'rock-paper-scissors',
    name: 'Rock Paper Scissors',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'EASY',
    players: '2',
    description: "Classic rock-paper-scissors duel.",
    howToPlay: "Choose Rock, Paper, or Scissors simultaneously with your opponent. Play matches and win rounds.",
    controls: [
      { key: 'CLICK', action: 'Select RPS button' }
    ],
    scoringExplanation: "First player to win 3 rounds wins the match.",
    estimatedDuration: 60,
    tags: ['TRENDING'],
    accentColor: '#EF4444',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/rock-paper-scissors.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'tic-tac-toe',
    name: 'Tic Toe',
    type: 'multi',
    category: 'PUZZLE',
    difficulty: 'EASY',
    players: '2',
    description: "Classic 3x3 tic tac toe game.",
    howToPlay: "Take turns placing X or O on the 3x3 grid. Form a horizontal, vertical, or diagonal line of three.",
    controls: [
      { key: 'CLICK', action: 'Place Symbol' }
    ],
    scoringExplanation: "Win 2 out of 3 games to win the match.",
    estimatedDuration: 90,
    tags: [],
    accentColor: '#6c63ff',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/tic-tac-toe.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'reflex-duel',
    name: 'Reflex Duel',
    type: 'multi',
    category: 'SKILL',
    difficulty: 'MEDIUM',
    players: '2',
    description: "Speed duel. Click first when signal fires.",
    howToPlay: "Wait for the center trigger. The moment the signal flashes, click your trigger before your opponent does.",
    controls: [
      { key: 'CLICK / SPACE', action: 'Trigger Reaction' }
    ],
    scoringExplanation: "Fastest reaction time wins the round. Best of 5.",
    estimatedDuration: 50,
    tags: [],
    accentColor: '#fd79a8',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/reflex-duel.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'word-duel',
    name: 'Word Duel',
    type: 'multi',
    category: 'SKILL',
    difficulty: 'MEDIUM',
    players: '2',
    description: "Type words faster than your opponent.",
    howToPlay: "Type the target words displayed as quickly and accurately as possible. The faster player scores more.",
    controls: [
      { key: 'A-Z', action: 'Type Word' }
    ],
    scoringExplanation: "Fast typing awards points. High score wins.",
    estimatedDuration: 75,
    tags: [],
    accentColor: '#e056fd',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/word-duel.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'multiplayer-snake',
    name: 'Multiplayer Snake',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'MEDIUM',
    players: '2',
    description: "Snake fight. Dominate the grid.",
    howToPlay: "Navigate your snake to eat food while cutting off your opponent. Crashing into the opponent's snake body is fatal.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Turn Snake' }
    ],
    scoringExplanation: "Score increases as you eat. Last surviving snake wins.",
    estimatedDuration: 120,
    tags: ['HOT'],
    accentColor: '#10b981',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/multiplayer-snake.js',
    version: '1.0.0',
    status: 'live'
  },
  {
    id: 'battleship',
    name: 'Battleship',
    type: 'multi',
    category: 'PUZZLE',
    difficulty: 'MEDIUM',
    players: '2',
    description: "Deploy your fleet and blast the enemy.",
    howToPlay: "Place your ships on your secret grid, then take turns calling shots on the enemy grid to sink their fleet.",
    controls: [
      { key: 'CLICK', action: 'Deploy / Fire' }
    ],
    scoringExplanation: "Sink all 5 enemy ships to win the battle.",
    estimatedDuration: 200,
    tags: [],
    accentColor: '#3b82f6',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/battleship.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'physics-soccer',
    name: 'Physics Soccer',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'HARD',
    players: '2',
    description: "Bouncy soccer. Kick the ball into the net.",
    howToPlay: "Bounce and kick the soccer ball using physical acceleration. Guide the ball into the opponent's goal.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Control Player Movement' }
    ],
    scoringExplanation: "Most goals scored when the match timer runs out wins.",
    estimatedDuration: 150,
    tags: [],
    accentColor: '#f59e0b',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/physics-soccer.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'ludo',
    name: 'Ludo',
    type: 'multi',
    category: 'PUZZLE',
    difficulty: 'EASY',
    players: '2-4',
    description: "Classic board game of strategy and luck.",
    howToPlay: "Roll the dice, move your tokens out of base, and travel around the board to reach the home triangle first.",
    controls: [
      { key: 'CLICK', action: 'Roll Dice / Move Token' }
    ],
    scoringExplanation: "First player to move all tokens to the center wins.",
    estimatedDuration: 240,
    tags: [],
    accentColor: '#00d4aa',
    minPlayers: 2,
    maxPlayers: 4,
    file: '/js/games/multi/ludo.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'bomberman-arena',
    name: 'Bomberman Arena',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'MEDIUM',
    players: '2',
    description: "Place bombs to blast blocks and opponents.",
    howToPlay: "Navigate the maze grid. Drop bombs to break destructible crates and catch the opponent in the fire blast.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Move' },
      { key: 'SPACE / ENTER', action: 'Drop Bomb' }
    ],
    scoringExplanation: "Last player standing after block clearances wins.",
    estimatedDuration: 180,
    tags: [],
    accentColor: '#f0932b',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/bomberman-arena.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'tank-battle',
    name: 'Tank Battle',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'MEDIUM',
    players: '2',
    description: "Drive tanks and fire artillery shells.",
    howToPlay: "Steer your combat tank around obstacles. Fire armor-piercing shells at the opponent's tank.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Steer / Move Tank' },
      { key: 'SPACE / CLICK', action: 'Fire Shell' }
    ],
    scoringExplanation: "Each direct shell hit awards points. High score wins.",
    estimatedDuration: 120,
    tags: [],
    accentColor: '#20bf6b',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/tank-battle.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'king-of-the-hill',
    name: 'King of the Hill',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'MEDIUM',
    players: '2',
    description: "Control and hold the central hill zone.",
    howToPlay: "Stay inside the highlighted central zone to capture it and accumulate time. Push the opponent out of the zone.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Move Character' }
    ],
    scoringExplanation: "1 point per second spent inside the hill. Highest score wins.",
    estimatedDuration: 120,
    tags: [],
    accentColor: '#eb3b5a',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/king-of-the-hill.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'color-flood-duel',
    name: 'Color Flood Duel',
    type: 'multi',
    category: 'PUZZLE',
    difficulty: 'MEDIUM',
    players: '2',
    description: "Capture the grid by flooding colors.",
    howToPlay: "Choose adjacent colors on your board to flood-fill and capture neighboring tiles. Grow your territory bigger than the opponent's.",
    controls: [
      { key: 'CLICK', action: 'Select Flood Color' }
    ],
    scoringExplanation: "Most tiles occupied when the grid is completely flooded wins.",
    estimatedDuration: 90,
    tags: [],
    accentColor: '#a55eea',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/color-flood-duel.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'top-down-racer',
    name: 'Top Down Racer',
    type: 'multi',
    category: 'RACING',
    difficulty: 'HARD',
    players: '2',
    description: "Race head-to-head on the micro track.",
    howToPlay: "Control your sports car and race 3 laps. Drift around bends and beat the opponent to the finish line.",
    controls: [
      { key: '↑ W', action: 'Accelerate' },
      { key: '↓ S', action: 'Reverse' },
      { key: '← A / → D', action: 'Steer Left/Right' }
    ],
    scoringExplanation: "First player to complete 3 full laps is the winner.",
    estimatedDuration: 100,
    tags: [],
    accentColor: '#45aaf2',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/top-down-racer.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'zombie-survival',
    name: 'Zombie Survival',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'HARD',
    players: '2',
    description: "Co-op survival. Shoot zombies and stay alive.",
    howToPlay: "Work with your teammate. Shoot incoming waves of undead zombies. Collect ammo power-ups.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Move' },
      { key: 'SPACE / CLICK', action: 'Aim and Shoot' }
    ],
    scoringExplanation: "Total kills accumulated by the team. Survive as long as possible.",
    estimatedDuration: 150,
    tags: [],
    accentColor: '#2bcbba',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/zombie-survival.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'mini-party-pack',
    name: 'Mini Party Pack',
    type: 'multi',
    category: 'SKILL',
    difficulty: 'EASY',
    players: '2',
    description: "A compilation of fast mini-challenges.",
    howToPlay: "Compete in random quick mini-games. Follow instructions shown on screen for each round.",
    controls: [
      { key: 'CLICK / SPACE', action: 'Perform Action' }
    ],
    scoringExplanation: "Points awarded per mini-game won. High score wins.",
    estimatedDuration: 120,
    tags: [],
    accentColor: '#fa8231',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/mini-party-pack.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'pixel-gunfight',
    name: 'Pixel Gunfight',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'HARD',
    players: '2',
    description: "Shoot the opponent. Dodge behind walls.",
    howToPlay: "Move around the arena, take cover behind barricades, and fire bullets at the opponent. Watch your ammo.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Move Player' },
      { key: 'SPACE / ENTER', action: 'Shoot' }
    ],
    scoringExplanation: "Match won by the player with the most kills in the time limit.",
    estimatedDuration: 100,
    tags: [],
    accentColor: '#ff5252',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/pixel-gunfight.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'capture-the-flag',
    name: 'Capture The Flag',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'HARD',
    players: '2',
    description: "Steal the enemy flag and return it to base.",
    howToPlay: "Navigate into the enemy side, grab their flag, and bring it back to your base. Tag opponents on your side to freeze them.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Move Character' }
    ],
    scoringExplanation: "First player to capture 3 flags wins the match.",
    estimatedDuration: 180,
    tags: [],
    accentColor: '#00d2d3',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/capture-the-flag.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'mini-clash',
    name: 'Mini Clash',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'MEDIUM',
    players: '2',
    description: "Sumo style grid battle. Push the opponent.",
    howToPlay: "Collide with the opponent to push them. Earn power-ups and run them off the edge of the circular grid.",
    controls: [
      { key: 'WASD / ARROWS', action: 'Steer Player' }
    ],
    scoringExplanation: "Score increases each time you push the opponent off. First to 5 wins.",
    estimatedDuration: 110,
    tags: [],
    accentColor: '#ff9ff3',
    minPlayers: 2,
    maxPlayers: 2,
    file: '/js/games/multi/mini-clash.js',
    version: '1.0.0',
    status: 'coming-soon'
  },
  {
    id: 'rock-paper-scissors-tournament',
    name: 'RPS Tournament',
    type: 'multi',
    category: 'ARCADE',
    difficulty: 'EASY',
    players: '2-4',
    description: "Multi-round knockout bracket for Rock Paper Scissors.",
    howToPlay: "Win consecutive rounds of Rock-Paper-Scissors in a knockout bracket to reach the finals and win.",
    controls: [
      { key: 'CLICK', action: 'Select Choice' }
    ],
    scoringExplanation: "Round-robin bracket points determine the champion.",
    estimatedDuration: 180,
    tags: [],
    accentColor: '#ee5253',
    minPlayers: 2,
    maxPlayers: 4,
    file: '/js/games/multi/rock-paper-scissors-tournament.js',
    version: '1.0.0',
    status: 'coming-soon'
  }
];
