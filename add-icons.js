const fs = require('fs');
const files = ['index.html','games.html','arena.html','leaderboard.html','daily.html'];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let h = fs.readFileSync(f, 'utf8');
    if (!h.includes('game-icons.js')) {
      h = h.replace(
        '<script src="games-data.js"></script>',
        '<script src="games-data.js"></script>\n  <script src="game-icons.js"></script>'
      );
      fs.writeFileSync(f, h);
    }
  }
});
