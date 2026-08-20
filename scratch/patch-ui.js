const fs = require('fs');

const patches = [
  { path: 'js/ui/games.js', check: "document.getElementById('games-grid')", func: 'initGames' },
  { path: 'js/ui/leaderboard.js', check: "document.getElementById('rankings-container')", func: 'initLeaderboard' },
  { path: 'js/ui/arena.js', check: "document.getElementById('survival-tree-mount')", func: 'initArena' } // or something in arena
];

patches.forEach(p => {
  if (fs.existsSync(p.path)) {
    let content = fs.readFileSync(p.path, 'utf8');
    
    // Remove old patch if exists
    content = content.replace(/\/\/ Auto-init for standalone HTML pages[\s\S]*?\n}\n/g, '');

    const newPatch = `
// Auto-init for standalone HTML pages
if (${p.check} || window.location.pathname.includes('${p.path.split('/').pop().replace('.js', '')}')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ${p.func});
  } else {
    ${p.func}();
  }
}
`;
    content += '\n' + newPatch;
    fs.writeFileSync(p.path, content);
    console.log('Patched ' + p.path);
  }
});
