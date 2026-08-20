/**
 * games-data.js
 *
 * Classic script version of the game manifest, loaded by HTML pages.
 * AUTO-GENERATED from js/core/game-manifest.js. Do not edit manually.
 * Run: node sync-games-data.js to regenerate.
 */

var GAMES = [
  {
    "id": "neon-serpent",
    "name": "Neon Serpent",
    "type": "solo",
    "category": "ARCADE",
    "difficulty": "HARD",
    "players": "1",
    "description": "Snake (Overdrive Protocol). Variable speed grid with drift mechanics and Boost Gauge.",
    "howToPlay": "Eat neon pellets to fill your Boost Gauge. Activating Boost allows you to dash through your own tail once per gauge without dying.",
    "controls": [
      {
        "key": "WASD / ARROWS",
        "action": "Move / Turn"
      },
      {
        "key": "SPACE",
        "action": "Activate Boost"
      },
      {
        "key": "P",
        "action": "Pause Game"
      }
    ],
    "scoringExplanation": "Speed increases dynamically. Earn points by eating. Second Chance Shield earned every 5000 points.",
    "estimatedDuration": 120,
    "tags": [
      "HOT",
      "ARCADE"
    ],
    "accentColor": "#00f0ff",
    "file": "/js/games/solo/neon-serpent.js",
    "version": "2.0.0",
    "status": "live"
  },
  {
    "id": "tic-tac-toe",
    "name": "Tic-Tac-Toe",
    "type": "solo",
    "category": "CLASSIC",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Pro Engine. Unbeatable AI with mistake heuristics. 5-second Blitz Timer per turn.",
    "howToPlay": "Click on an empty cell to place your X. Get 3 in a row to win the round. You have 3 Hearts. Failing to act within 5 seconds loses a heart.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Place Token"
      }
    ],
    "scoringExplanation": "Win rounds to earn points. Higher levels reduce AI mistake probability.",
    "estimatedDuration": 60,
    "tags": [
      "CLASSIC",
      "LOGIC"
    ],
    "accentColor": "#ff0055",
    "file": "/js/games/solo/tic-tac-toe.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "rock-paper-scissors",
    "name": "RPS (Predictive Arena)",
    "type": "solo",
    "category": "CLASSIC",
    "difficulty": "EASY",
    "players": "1",
    "description": "Predictive Arena. AI uses a 1st-order Markov Chain to predict and counter your moves.",
    "howToPlay": "Press the corresponding key to select Rock, Paper, or Scissors. Best of 5 Rounds.",
    "controls": [
      {
        "key": "A / 1",
        "action": "Rock"
      },
      {
        "key": "S / 2",
        "action": "Paper"
      },
      {
        "key": "D / 3",
        "action": "Scissors"
      }
    ],
    "scoringExplanation": "Win rounds to earn points. AI learns from your patterns.",
    "estimatedDuration": 45,
    "tags": [
      "CLASSIC",
      "MIND"
    ],
    "accentColor": "#facc15",
    "file": "/js/games/solo/rock-paper-scissors.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "pong",
    "name": "Pong (Dynamic Velocity)",
    "type": "solo",
    "category": "ARCADE",
    "difficulty": "HARD",
    "players": "1",
    "description": "Dynamic angular deflection. Face off against an adaptive AI in a high-speed match to 7 points.",
    "howToPlay": "Use W/S or Up/Down arrows to move your paddle. Return the ball to the opponent.",
    "controls": [
      {
        "key": "W/S or UP/DOWN",
        "action": "Move Paddle"
      }
    ],
    "scoringExplanation": "First to 7 points wins.",
    "estimatedDuration": 180,
    "tags": [
      "ARCADE",
      "CLASSIC"
    ],
    "accentColor": "#38bdf8",
    "file": "/js/games/solo/pong.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "memory-match",
    "name": "Memory Match",
    "type": "solo",
    "category": "PUZZLE",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Temporal Decay. Your focus drains over time. Mismatches hurt, matches heal. Survive the board.",
    "howToPlay": "Click to flip a card. Flip another to find its pair.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Flip Card"
      }
    ],
    "scoringExplanation": "Clear the board before Focus runs out.",
    "estimatedDuration": 90,
    "tags": [
      "PUZZLE",
      "MEMORY"
    ],
    "accentColor": "#c084fc",
    "file": "/js/games/solo/memory-match.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "connect-four",
    "name": "Connect Four",
    "type": "solo",
    "category": "LOGIC",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Gravity Matrix. Outsmart the AI by aligning 4 tokens across any axis.",
    "howToPlay": "Click a column to drop your token. Connect 4 horizontally, vertically, or diagonally.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Drop Token"
      }
    ],
    "scoringExplanation": "First to connect 4 wins the match.",
    "estimatedDuration": 180,
    "tags": [
      "LOGIC",
      "CLASSIC"
    ],
    "accentColor": "#facc15",
    "file": "/js/games/solo/connect-four.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "whack-a-mole",
    "name": "Data Breach (Whack)",
    "type": "solo",
    "category": "ARCADE",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Cyber Data Breach. Strike nodes before they expire, but avoid the Glitch Bombs!",
    "howToPlay": "Click on nodes to earn points. Golden nodes give extra time. Hitting Glitch Bombs loses a life.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Strike Node"
      }
    ],
    "scoringExplanation": "Standard: +100pts. Golden: +300pts.",
    "estimatedDuration": 60,
    "tags": [
      "ARCADE",
      "REACTION"
    ],
    "accentColor": "#10b981",
    "file": "/js/games/solo/whack-a-mole.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "clicker",
    "name": "Quantum Clicker",
    "type": "solo",
    "category": "IDLE",
    "difficulty": "EASY",
    "players": "1",
    "description": "Quantum Core Accelerator. Upgrade generators to maximize CPS without melting down the core.",
    "howToPlay": "Click the core to generate energy. Buy upgrades. Don't let core heat reach 100 degrees.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Click Core / Buy Upgrades"
      }
    ],
    "scoringExplanation": "Survive and accumulate as much Energy as possible before quitting.",
    "estimatedDuration": 300,
    "tags": [
      "IDLE",
      "STRATEGY"
    ],
    "accentColor": "#f97316",
    "file": "/js/games/solo/clicker.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "balloon-pop",
    "name": "Balloon Pop (Vector)",
    "type": "solo",
    "category": "ARCADE",
    "difficulty": "HARD",
    "players": "1",
    "description": "Chain Reaction Vector. Pop floating balloons and trigger massive chain reaction explosions.",
    "howToPlay": "Click to pop balloons. Bomb balloons trigger area explosions.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Pop Balloon"
      }
    ],
    "scoringExplanation": "Chain reactions multiply score. Game Over if 5 balloons escape.",
    "estimatedDuration": 120,
    "tags": [
      "ARCADE",
      "PHYSICS"
    ],
    "accentColor": "#ec4899",
    "file": "/js/games/solo/balloon-pop.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "simon-says",
    "name": "Simon Says (Synesthesia)",
    "type": "solo",
    "category": "PUZZLE",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Simon Says (Synesthesia Matrix). Memorize the expanding tonal sequence before the input timeout.",
    "howToPlay": "Click the colored quadrants in the exact sequence they flashed.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Select Quadrant"
      }
    ],
    "scoringExplanation": "Longer sequences earn more points. 3 strikes and you're out.",
    "estimatedDuration": 120,
    "tags": [
      "PUZZLE",
      "MEMORY"
    ],
    "accentColor": "#10b981",
    "file": "/js/games/solo/simon-says.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "catch-objects",
    "name": "Catch the Falling Objects",
    "type": "solo",
    "category": "ARCADE",
    "difficulty": "EASY",
    "players": "1",
    "description": "Vortex Basket. Gather resources while dodging lethal hazards dropping at terminal velocity.",
    "howToPlay": "Move the basket to catch fruits. Avoid hazards. Letting fruits hit the floor loses a life.",
    "controls": [
      {
        "key": "A/D or ARROWS",
        "action": "Move Basket"
      }
    ],
    "scoringExplanation": "Earn points per fruit caught.",
    "estimatedDuration": 180,
    "tags": [
      "ARCADE",
      "REACTION"
    ],
    "accentColor": "#3b82f6",
    "file": "/js/games/solo/catch-objects.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "flappy-bird",
    "name": "Flappy Bird (Vector Flight)",
    "type": "solo",
    "category": "ARCADE",
    "difficulty": "HARD",
    "players": "1",
    "description": "Vector Flight. Absolute precision platforming with strict 1-hit knockout rules.",
    "howToPlay": "Flap to gain altitude. Do not touch the pipes or the ground.",
    "controls": [
      {
        "key": "SPACE or MOUSE",
        "action": "Flap"
      }
    ],
    "scoringExplanation": "1 point per pipe cleared. 1-Hit Game Over.",
    "estimatedDuration": 60,
    "tags": [
      "ARCADE",
      "HARDCORE"
    ],
    "accentColor": "#facc15",
    "file": "/js/games/solo/flappy-bird.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "brick-breaker",
    "name": "Brick Breaker (Shatter Space)",
    "type": "solo",
    "category": "ARCADE",
    "difficulty": "EASY",
    "players": "1",
    "description": "Shatter Space. Clear the 5x10 matrix using precise normal inversions.",
    "howToPlay": "Move the paddle to bounce the ball. Destroy all bricks to advance.",
    "controls": [
      {
        "key": "A/D or MOUSE",
        "action": "Move Paddle"
      }
    ],
    "scoringExplanation": "Standard: 10pts. Reinforced: 30pts. Don't let the ball drop.",
    "estimatedDuration": 180,
    "tags": [
      "ARCADE",
      "CLASSIC"
    ],
    "accentColor": "#3b82f6",
    "file": "/js/games/solo/brick-breaker.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "asteroids",
    "name": "Asteroids (Inertia Drive)",
    "type": "solo",
    "category": "ARCADE",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Inertia Drive. Survive in a toroidal space using Newtonian thrust and fragmentation weaponry.",
    "howToPlay": "Rotate and thrust to move. Shoot asteroids to break them into smaller pieces.",
    "controls": [
      {
        "key": "W/A/D or ARROWS",
        "action": "Move/Rotate"
      },
      {
        "key": "SPACE or MOUSE",
        "action": "Shoot"
      }
    ],
    "scoringExplanation": "Large: 20pts. Medium: 50pts. Small: 100pts.",
    "estimatedDuration": 120,
    "tags": [
      "ARCADE",
      "SHOOTER"
    ],
    "accentColor": "#ef4444",
    "file": "/js/games/solo/asteroids.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "frogger",
    "name": "Frogger (Traffic Rush)",
    "type": "solo",
    "category": "ARCADE",
    "difficulty": "HARD",
    "players": "1",
    "description": "Traffic Rush. Navigate the hazard grid and attach to moving platforms to reach the safety bays.",
    "howToPlay": "Hop across the road dodging cars. Hop on logs to cross the river.",
    "controls": [
      {
        "key": "WASD or ARROWS",
        "action": "Hop"
      }
    ],
    "scoringExplanation": "Reach a bay to score. Clear all 5 to advance.",
    "estimatedDuration": 180,
    "tags": [
      "ARCADE",
      "REACTION"
    ],
    "accentColor": "#10b981",
    "file": "/js/games/solo/frogger.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "number-guessing",
    "name": "Number Guessing (Binary Radar)",
    "type": "solo",
    "category": "PUZZLE",
    "difficulty": "EASY",
    "players": "1",
    "description": "Binary Search Radar. Use heat proximity clues to triangulate the target number.",
    "howToPlay": "Type a number between 1 and 100. Use Higher/Lower clues to narrow it down in 7 tries.",
    "controls": [
      {
        "key": "KEYBOARD",
        "action": "Type Guess"
      },
      {
        "key": "ENTER",
        "action": "Submit"
      }
    ],
    "scoringExplanation": "Fewer attempts = higher score. Score decays by 150 per attempt.",
    "estimatedDuration": 60,
    "tags": [
      "PUZZLE",
      "LOGIC"
    ],
    "accentColor": "#f97316",
    "file": "/js/games/solo/number-guessing.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "typing-test",
    "name": "Typing Speed Test (Velocity)",
    "type": "solo",
    "category": "WORD",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Velocity Engine. Push your Gross and Net WPM to the limits in this raw typing speed test.",
    "howToPlay": "Type the displayed text as fast and accurately as possible. Fix errors with Backspace.",
    "controls": [
      {
        "key": "KEYBOARD",
        "action": "Type Text"
      }
    ],
    "scoringExplanation": "Score is based on Net WPM and Accuracy.",
    "estimatedDuration": 60,
    "tags": [
      "WORD",
      "REACTION"
    ],
    "accentColor": "#3b82f6",
    "file": "/js/games/solo/typing-test.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "hangman",
    "name": "Hangman (Cyber Deconstruct)",
    "type": "solo",
    "category": "WORD",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Cyber Deconstruction. Decrypt the word before 6 strikes shatter your system.",
    "howToPlay": "Type letters to guess the word. 6 wrong guesses ends the game.",
    "controls": [
      {
        "key": "KEYBOARD",
        "action": "Guess Letter"
      }
    ],
    "scoringExplanation": "100 pts per correct letter. 500 pt completion bonus.",
    "estimatedDuration": 120,
    "tags": [
      "WORD",
      "PUZZLE"
    ],
    "accentColor": "#ef4444",
    "file": "/js/games/solo/hangman.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "word-scramble",
    "name": "Word Scramble (Anagram)",
    "type": "solo",
    "category": "WORD",
    "difficulty": "HARD",
    "players": "1",
    "description": "Anagram Time-Attack. Unscramble the anagrams quickly to add time back to the clock.",
    "howToPlay": "Type the unscrambled word and press Enter. Wrong guesses deduct time.",
    "controls": [
      {
        "key": "KEYBOARD",
        "action": "Type Word"
      },
      {
        "key": "ENTER",
        "action": "Submit"
      }
    ],
    "scoringExplanation": "Points scale with word length squared. Streaks increase multipliers.",
    "estimatedDuration": 60,
    "tags": [
      "WORD",
      "PUZZLE"
    ],
    "accentColor": "#8b5cf6",
    "file": "/js/games/solo/word-scramble.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "wordle",
    "name": "Wordle (Frequency Matrix)",
    "type": "solo",
    "category": "WORD",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Wordle Clone (Frequency Matrix). Deduce the secret 5-letter password in 6 attempts.",
    "howToPlay": "Type a 5-letter word and press Enter. Green means correct, Yellow means wrong spot.",
    "controls": [
      {
        "key": "KEYBOARD",
        "action": "Type Guess"
      },
      {
        "key": "ENTER",
        "action": "Submit"
      }
    ],
    "scoringExplanation": "Score scales based on remaining attempts and win streak.",
    "estimatedDuration": 180,
    "tags": [
      "WORD",
      "PUZZLE"
    ],
    "accentColor": "#10b981",
    "file": "/js/games/solo/wordle.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "2048",
    "name": "2048 (Kinetic Merge)",
    "type": "solo",
    "category": "PUZZLE",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "2048 (Kinetic Merge). Slide and compress tiles to reach the ultimate value.",
    "howToPlay": "Use arrow keys to slide all tiles. Matching values merge into higher numbers.",
    "controls": [
      {
        "key": "WASD / ARROWS",
        "action": "Slide Grid"
      }
    ],
    "scoringExplanation": "Each merge adds the new tile's value to your score.",
    "estimatedDuration": 300,
    "tags": [
      "PUZZLE",
      "LOGIC"
    ],
    "accentColor": "#eab308",
    "file": "/js/games/solo/2048.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "sudoku",
    "name": "Sudoku (Logic Engine)",
    "type": "solo",
    "category": "PUZZLE",
    "difficulty": "HARD",
    "players": "1",
    "description": "Sudoku (Logic Engine). A mathematically generated grid with a single unique solution.",
    "howToPlay": "Fill the grid so every row, column, and 3x3 box contains digits 1-9.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Select Cell"
      },
      {
        "key": "NUMBERS 1-9",
        "action": "Fill Digit"
      }
    ],
    "scoringExplanation": "3 strikes ends the game. Faster completion = higher score.",
    "estimatedDuration": 600,
    "tags": [
      "PUZZLE",
      "LOGIC"
    ],
    "accentColor": "#3b82f6",
    "file": "/js/games/solo/sudoku.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "sliding-puzzle",
    "name": "Sliding Puzzle (Parallax)",
    "type": "solo",
    "category": "PUZZLE",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Sliding Puzzle. Shift the scrambled matrix back into numerical order.",
    "howToPlay": "Click adjacent tiles to move them into the empty space.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Move Tile"
      }
    ],
    "scoringExplanation": "Fewer moves = higher score.",
    "estimatedDuration": 240,
    "tags": [
      "PUZZLE",
      "LOGIC"
    ],
    "accentColor": "#f97316",
    "file": "/js/games/solo/sliding-puzzle.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "minesweeper",
    "name": "Minesweeper (Radar)",
    "type": "solo",
    "category": "PUZZLE",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Minesweeper (Radar Clear). Safely navigate the minefield using numerical proximity logic.",
    "howToPlay": "Left click to reveal a tile. Right click to flag a mine.",
    "controls": [
      {
        "key": "L-CLICK",
        "action": "Reveal"
      },
      {
        "key": "R-CLICK",
        "action": "Flag"
      }
    ],
    "scoringExplanation": "Clear the board without detonating any mines.",
    "estimatedDuration": 300,
    "tags": [
      "PUZZLE",
      "LOGIC"
    ],
    "accentColor": "#ef4444",
    "file": "/js/games/solo/minesweeper.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "quiz",
    "name": "Trivia (Streak Matrix)",
    "type": "solo",
    "category": "TRIVIA",
    "difficulty": "MEDIUM",
    "players": "1",
    "description": "Trivia Game (Streak Matrix). Answer rapidly to compound your score multiplier.",
    "howToPlay": "Click the correct answer before time runs out. 3 lives.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Select Answer"
      }
    ],
    "scoringExplanation": "Score decays over time. Streaks increase your multiplier up to 4x.",
    "estimatedDuration": 180,
    "tags": [
      "TRIVIA",
      "REACTION"
    ],
    "accentColor": "#8b5cf6",
    "file": "/js/games/solo/quiz.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "mp-tic-tac-toe",
    "name": "Tic-Tac-Toe (Duel)",
    "type": "multiplayer",
    "category": "MULTIPLAYER",
    "difficulty": "EASY",
    "players": "2",
    "description": "Tic-Tac-Toe (2-Player Duel). Alternating turns with a chess clock.",
    "howToPlay": "Click to place your mark. Win 3 rounds to take the match.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Place Mark"
      }
    ],
    "scoringExplanation": "First to 3 round wins is the victor.",
    "estimatedDuration": 120,
    "tags": [
      "MULTIPLAYER",
      "CLASSIC"
    ],
    "accentColor": "#3b82f6",
    "file": "/js/games/multiplayer/tic-tac-toe.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "mp-pong",
    "name": "Pong (Hyper-Rally)",
    "type": "multiplayer",
    "category": "MULTIPLAYER",
    "difficulty": "MEDIUM",
    "players": "2",
    "description": "Pong (2-Player Hyper-Rally). Paddle smash modifiers and intense volleys.",
    "howToPlay": "P1: W/S. P2: Up/Down. Move while hitting the ball to add smash velocity.",
    "controls": [
      {
        "key": "W / S",
        "action": "P1 Move"
      },
      {
        "key": "UP / DOWN",
        "action": "P2 Move"
      }
    ],
    "scoringExplanation": "First to 10 points wins. 5-point lead triggers mercy rule.",
    "estimatedDuration": 180,
    "tags": [
      "MULTIPLAYER",
      "ARCADE"
    ],
    "accentColor": "#10b981",
    "file": "/js/games/multiplayer/pong.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "mp-rps",
    "name": "RPS (Blind Clash)",
    "type": "multiplayer",
    "category": "MULTIPLAYER",
    "difficulty": "EASY",
    "players": "2",
    "description": "Rock, Paper, Scissors (Blind Clash). Masked inputs and tie-damage multipliers.",
    "howToPlay": "P1: A/S/D. P2: J/K/L. Both select blindly, then clash.",
    "controls": [
      {
        "key": "A / S / D",
        "action": "P1 Select"
      },
      {
        "key": "J / K / L",
        "action": "P2 Select"
      }
    ],
    "scoringExplanation": "Ties increase the damage pot. First to 0 HP loses.",
    "estimatedDuration": 90,
    "tags": [
      "MULTIPLAYER",
      "CLASSIC"
    ],
    "accentColor": "#ef4444",
    "file": "/js/games/multiplayer/rock-paper-scissors.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "mp-snake",
    "name": "Snake vs Snake",
    "type": "multiplayer",
    "category": "MULTIPLAYER",
    "difficulty": "MEDIUM",
    "players": "2",
    "description": "Snake vs Snake. Avoid bodies and head-on collisions in a Tron-style grid.",
    "howToPlay": "P1: WASD. P2: Arrows. Trap your opponent.",
    "controls": [
      {
        "key": "WASD",
        "action": "P1 Steer"
      },
      {
        "key": "ARROWS",
        "action": "P2 Steer"
      }
    ],
    "scoringExplanation": "First to 3 round wins takes the match.",
    "estimatedDuration": 180,
    "tags": [
      "MULTIPLAYER",
      "ARCADE"
    ],
    "accentColor": "#14b8a6",
    "file": "/js/games/multiplayer/snake.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "mp-connect-four",
    "name": "Connect 4 (Duel)",
    "type": "multiplayer",
    "category": "MULTIPLAYER",
    "difficulty": "MEDIUM",
    "players": "2",
    "description": "Connect Four (2-Player Duel). Split controls for real-time dropping.",
    "howToPlay": "P1: A/D/Space. P2: Left/Right/Enter. First to connect 4 wins.",
    "controls": [
      {
        "key": "A / D / SPACE",
        "action": "P1 Play"
      },
      {
        "key": "L / R / ENTER",
        "action": "P2 Play"
      }
    ],
    "scoringExplanation": "Best 2 out of 3 match.",
    "estimatedDuration": 240,
    "tags": [
      "MULTIPLAYER",
      "LOGIC"
    ],
    "accentColor": "#eab308",
    "file": "/js/games/multiplayer/connect-four.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "mp-memory",
    "name": "Memory (Point Steal)",
    "type": "multiplayer",
    "category": "MULTIPLAYER",
    "difficulty": "MEDIUM",
    "players": "2",
    "description": "Memory Match Race. Avoid traps to steal points and keep your turn.",
    "howToPlay": "Alternating clicks. Matches give +100pts and an extra turn.",
    "controls": [
      {
        "key": "MOUSE",
        "action": "Flip Card"
      }
    ],
    "scoringExplanation": "Traps steal 150pts. Highest score at the end wins.",
    "estimatedDuration": 300,
    "tags": [
      "MULTIPLAYER",
      "PUZZLE"
    ],
    "accentColor": "#a855f7",
    "file": "/js/games/multiplayer/memory.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "mp-tug-of-war",
    "name": "Tug of War",
    "type": "multiplayer",
    "category": "MULTIPLAYER",
    "difficulty": "HARD",
    "players": "2",
    "description": "Tug of War. Mash keys to pull the rope, but manage your stamina.",
    "howToPlay": "P1: Mash 'D'. P2: Mash 'Left Arrow'. Too fast = stamina drop.",
    "controls": [
      {
        "key": "D",
        "action": "P1 Pull"
      },
      {
        "key": "LEFT ARROW",
        "action": "P2 Pull"
      }
    ],
    "scoringExplanation": "Pull the rope all the way to your side to win a round.",
    "estimatedDuration": 120,
    "tags": [
      "MULTIPLAYER",
      "REACTION"
    ],
    "accentColor": "#f97316",
    "file": "/js/games/multiplayer/tug-of-war.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "mp-tank",
    "name": "Tank (Ballistics)",
    "type": "multiplayer",
    "category": "MULTIPLAYER",
    "difficulty": "HARD",
    "players": "2",
    "description": "Tank Trouble. 4-bounce vector ricochets and intense arena combat.",
    "howToPlay": "P1: WASD+Space. P2: Arrows+Enter. Bullets bounce off walls.",
    "controls": [
      {
        "key": "WASD + SPACE",
        "action": "P1 Move/Fire"
      },
      {
        "key": "ARROWS + ENTER",
        "action": "P2 Move/Fire"
      }
    ],
    "scoringExplanation": "First to 5 kills wins.",
    "estimatedDuration": 300,
    "tags": [
      "MULTIPLAYER",
      "ACTION"
    ],
    "accentColor": "#6366f1",
    "file": "/js/games/multiplayer/tank-trouble.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "mp-racing",
    "name": "Racing Dots",
    "type": "multiplayer",
    "category": "MULTIPLAYER",
    "difficulty": "MEDIUM",
    "players": "2",
    "description": "Racing Dots. Alternating key mashing for maximum velocity.",
    "howToPlay": "P1: A->D. P2: Left->Right. Don't press the same key twice!",
    "controls": [
      {
        "key": "A / D",
        "action": "P1 Run"
      },
      {
        "key": "LEFT / RIGHT",
        "action": "P2 Run"
      }
    ],
    "scoringExplanation": "First to cross the finish line wins.",
    "estimatedDuration": 60,
    "tags": [
      "MULTIPLAYER",
      "RACING"
    ],
    "accentColor": "#0ea5e9",
    "file": "/js/games/multiplayer/racing-dots.js",
    "version": "1.0.0",
    "status": "live"
  },
  {
    "id": "mp-air-hockey",
    "name": "Air Hockey Arena",
    "type": "multiplayer",
    "category": "MULTIPLAYER",
    "difficulty": "MEDIUM",
    "players": "2",
    "description": "Air Hockey. Elastic circle-circle impulse math in a fast-paced rink.",
    "howToPlay": "P1: WASD. P2: Arrows. Hit the puck into the opponent's goal.",
    "controls": [
      {
        "key": "WASD",
        "action": "P1 Move"
      },
      {
        "key": "ARROWS",
        "action": "P2 Move"
      }
    ],
    "scoringExplanation": "First to 7 goals wins.",
    "estimatedDuration": 240,
    "tags": [
      "MULTIPLAYER",
      "SPORTS"
    ],
    "accentColor": "#ec4899",
    "file": "/js/games/multiplayer/air-hockey.js",
    "version": "1.0.0",
    "status": "live"
  }
];
