/**
 * sync-games-data.js
 *
 * Rebuilds games-data.js from game-manifest.js so they stay in perfect sync.
 * Run: node sync-games-data.js
 */

const fs = require('fs');

const manifestSrc = fs.readFileSync('js/core/game-manifest.js', 'utf8');

// Remove export keywords and export functions, then eval
const cleanSrc = manifestSrc
  .replace(/export const /g, 'const ')
  .replace(/export function \w+[\s\S]*?(?=\nexport|\nconst|\n\/\*\*|$)/g, '');

// Wrap in function to avoid global scope conflicts
let GAMES;
try {
  const fn = new Function(cleanSrc + '\nreturn GAMES;');
  GAMES = fn();
} catch(e) {
  // Try alternative: just extract JSON-like structure
  console.error('Eval failed:', e.message, '- trying regex extraction');
  const m = manifestSrc.match(/export const GAMES = (\[[\s\S]+?\]);\s*\nexport/);
  if (m) {
    GAMES = eval(m[1]);
  } else {
    console.error('Could not extract GAMES');
    process.exit(1);
  }
}

if (!GAMES || !GAMES.length) {
  console.error('GAMES array is empty or undefined');
  process.exit(1);
}

console.log(`Loaded ${GAMES.length} games from manifest`);

// Verify all games have the 'name' field (not just 'title')
GAMES.forEach(g => {
  if (!g.name) {
    console.warn(`Game ${g.id} is missing 'name' field - this is a problem in manifest`);
  }
});

const output = `/**
 * games-data.js
 *
 * Classic script version of the game manifest, loaded by HTML pages.
 * AUTO-GENERATED from js/core/game-manifest.js. Do not edit manually.
 * Run: node sync-games-data.js to regenerate.
 */

var GAMES = ${JSON.stringify(GAMES, null, 2)};
`;

fs.writeFileSync('games-data.js', output, 'utf8');
console.log('games-data.js synced successfully with', GAMES.length, 'games.');
