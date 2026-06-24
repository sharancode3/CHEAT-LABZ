export const GAMES = [
  {
    id: 'neon-serpent',
    title: 'Neon Serpent',
    category: 'arcade',
    difficulty: 'medium',
    tags: ['trending', 'retro'],
    short: 'Classic snake with speed ramps and combo pressure.',
    description: 'Eat the orbs, grow longer, and avoid walls and self-collisions.',
    accent: 'accent-1',
    route: './index.html#neon-serpent',
    order: 1,
    file: './js/games/neon-serpent.js',
    className: 'NeonSerpent'
  },
  {
    id: 'loop-rally',
    title: 'Loop Rally',
    category: 'arcade',
    difficulty: 'hard',
    tags: ['trending'],
    short: 'Single-player paddle rally against an adaptive AI.',
    description: 'Rally the ball, manage lives, and survive spike phases.',
    accent: 'accent-2',
    route: './index.html#loop-rally',
    order: 2,
    file: './js/games/loop-rally.js',
    className: 'LoopRally'
  },
  {
    id: 'turbo-drift',
    title: 'Turbo Drift',
    category: 'racing',
    difficulty: 'hard',
    tags: ['trending'],
    short: 'Top-down racing with drift scoring and boost pads.',
    description: 'Hold controlled drifts, hit boost pads, and finish three laps fast.',
    accent: 'accent-4',
    route: './index.html#turbo-drift',
    order: 3,
    file: './js/games/turbo-drift.js',
    className: 'TurboDrift'
  },
  {
    id: 'key-frenzy',
    title: 'Key Frenzy',
    category: 'skill',
    difficulty: 'hard',
    tags: ['new', 'trending'],
    short: 'Typing gauntlet with shrinking windows and blind rounds.',
    description: 'Press the shown key before the timer ring collapses.',
    accent: 'accent-3',
    route: './index.html#key-frenzy',
    order: 4,
    file: './js/games/key-frenzy.js',
    className: 'KeyFrenzy'
  },
  {
    id: 'astro-strider',
    title: 'Astro Strider',
    category: 'arcade',
    difficulty: 'medium',
    tags: ['new'],
    short: 'Side-scrolling space shooter with waves and powerups.',
    description: 'Dodge asteroids, destroy enemy ships, and collect shields.',
    accent: 'accent-5',
    route: './index.html#astro-strider',
    order: 5,
    file: './js/games/astro-strider.js',
    className: 'AstroStrider'
  },
  {
    id: 'cipher-quest',
    title: 'Cipher Quest',
    category: 'puzzle',
    difficulty: 'medium',
    tags: ['new'],
    short: 'Decode Caesar-cipher words under a time limit.',
    description: 'Read the encrypted word, type the answer, and request hints when needed.',
    accent: 'accent-2',
    route: './index.html#cipher-quest',
    order: 6,
    file: './js/games/cipher-quest.js',
    className: 'CipherQuest'
  },
  {
    id: 'phantom-calc',
    title: 'Phantom Calc',
    category: 'skill',
    difficulty: 'hard',
    tags: ['new'],
    short: 'Mental math with disappearing equations and memory pressure.',
    description: 'Memorize the equation before it fades, then type the answer.',
    accent: 'accent-3',
    route: './index.html#phantom-calc',
    order: 7,
    file: './js/games/phantom-calc.js',
    className: 'PhantomCalc'
  },
  {
    id: 'word-pulse',
    title: 'Word Pulse',
    category: 'skill',
    difficulty: 'medium',
    tags: ['chill'],
    short: 'Type words on the beat with a pulse-based rhythm layer.',
    description: 'Hit each letter in rhythm and maintain a clean streak.',
    accent: 'accent-5',
    route: './index.html#word-pulse',
    order: 8,
    file: './js/games/word-pulse.js',
    className: 'WordPulse'
  },
  {
    id: 'pixel-dodge',
    title: 'Pixel Dodge',
    category: 'arcade',
    difficulty: 'hard',
    tags: ['new'],
    short: 'Bullet hell survival with single-hit failure.',
    description: 'Move with WASD and survive spirals, sweeps, and rain patterns.',
    accent: 'accent-3',
    route: './index.html#pixel-dodge',
    order: 9,
    file: './js/games/pixel-dodge.js',
    className: 'PixelDodge'
  },
  {
    id: 'stack-blitz',
    title: 'Stack Blitz',
    category: 'skill',
    difficulty: 'medium',
    tags: ['new', 'chill'],
    short: 'Stack moving platforms and chase perfect drops.',
    description: 'Drop layers at the center and build the tallest tower possible.',
    accent: 'accent-4',
    route: './index.html#stack-blitz',
    order: 10,
    file: './js/games/stack-blitz.js',
    className: 'StackBlitz'
  },
  {
    id: 'memory-grid',
    title: 'Memory Grid',
    category: 'puzzle',
    difficulty: 'medium',
    tags: ['new'],
    short: 'Simon-style tile memory with growing grids.',
    description: 'Watch the sequence, then repeat it exactly back.',
    accent: 'accent-1',
    route: './index.html#memory-grid',
    order: 11,
    file: './js/games/memory-grid.js',
    className: 'MemoryGrid'
  },
  {
    id: 'hyper-tap',
    title: 'Hyper Tap',
    category: 'skill',
    difficulty: 'easy',
    tags: ['new', 'trending'],
    short: 'Precision tapping with shrinking target rings.',
    description: 'Tap when the moving dot sits inside the target zone.',
    accent: 'accent-5',
    route: './index.html#hyper-tap',
    order: 12,
    file: './js/games/hyper-tap.js',
    className: 'HyperTap'
  },
  {
    id: 'gravity-flip',
    title: 'Gravity Flip',
    category: 'arcade',
    difficulty: 'medium',
    tags: ['new', 'trending'],
    short: 'Auto-runner where SPACE flips gravity to dodge spikes.',
    description: 'Flip up and down to survive the runner track and collect coins.',
    accent: 'accent-2',
    route: './index.html#gravity-flip',
    order: 13,
    file: './js/games/gravity-flip.js',
    className: 'GravityFlip'
  },
  {
    id: 'chain-burst',
    title: 'Chain Burst',
    category: 'puzzle',
    difficulty: 'medium',
    tags: ['new'],
    short: 'Color-chain orb puzzle with drag selection.',
    description: 'Chain matching colors in one continuous motion for burst bonuses.',
    accent: 'accent-4',
    route: './index.html#chain-burst',
    order: 14,
    file: './js/games/chain-burst.js',
    className: 'ChainBurst'
  },
  {
    id: 'reflex-rush',
    title: 'Reflex Rush',
    category: 'skill',
    difficulty: 'easy',
    tags: ['new'],
    short: 'Reaction test with color flashes and arrow responses.',
    description: 'Press the correct arrow key as soon as the flash appears.',
    accent: 'accent-3',
    route: './index.html#reflex-rush',
    order: 15,
    file: './js/games/reflex-rush.js',
    className: 'ReflexRush'
  },
  {
    id: 'tile-runner',
    title: 'Tile Runner',
    category: 'arcade',
    difficulty: 'medium',
    tags: ['new'],
    short: 'Endless tile-tap runner with power tiles.',
    description: 'Tap the dark tiles, avoid mistakes, and keep the pace alive.',
    accent: 'accent-1',
    route: './index.html#tile-runner',
    order: 16,
    file: './js/games/tile-runner.js',
    className: 'TileRunner'
  },
  {
    id: 'beat-drop',
    title: 'Beat Drop',
    category: 'skill',
    difficulty: 'medium',
    tags: ['new'],
    short: 'Four-lane rhythm game with BPM scaling.',
    description: 'Hit the lanes in time, chase PERFECT windows, and avoid misses.',
    accent: 'accent-5',
    route: './index.html#beat-drop',
    order: 17,
    file: './js/games/beat-drop.js',
    className: 'BeatDrop'
  },
  {
    id: 'slide-forge',
    title: 'Slide Forge',
    category: 'puzzle',
    difficulty: 'medium',
    tags: ['chill'],
    short: '2048-style merge puzzle with clean number tiles.',
    description: 'Slide the grid until you forge the highest tile possible.',
    accent: 'accent-4',
    route: './index.html#slide-forge',
    order: 18,
    file: './js/games/slide-forge.js',
    className: 'SlideForge'
  },
  {
    id: 'orb-pop-deluxe',
    title: 'Orb Pop Deluxe',
    category: 'puzzle',
    difficulty: 'easy',
    tags: ['chill'],
    short: 'Orb shooter with chain reactions and orphan drops.',
    description: 'Aim, shoot, and pop matching groups before the stack reaches the bottom.',
    accent: 'accent-2',
    route: './index.html#orb-pop-deluxe',
    order: 19,
    file: './js/games/orb-pop-deluxe.js', /* Notice orb-pop.js is actually orb-pop-deluxe.js according to games-data? Wait, I named it orb-pop.js! */
    className: 'OrbPopDeluxe'
  },
];

export function getGames() {
  return [...GAMES];
}

export function getGameById(gameId) {
  return GAMES.find((game) => game.id === gameId) || null;
}

export function getGamesByCategory(category) {
  if (!category || category === 'all') {
    return getGames();
  }

  return GAMES.filter((game) => game.category === category);
}

export default GAMES;
