const fs = require('fs');
const path = require('path');

const filesToUpdate = ['index.html', 'games.html', 'arena.html', 'leaderboard.html'];
const dir = __dirname;

for (let file of filesToUpdate) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // Remove existing nav
  content = content.replace(/<nav class="navbar">[\s\S]*?<\/nav>/, '<div id="navbar-mount"></div>');
  
  // Remove existing mobile menu
  content = content.replace(/<div id="mobile-menu"[\s\S]*?<\/div>\s*<\/div>/, '');

  // Ensure navbar.js is included
  if (!content.includes('navbar.js')) {
    content = content.replace('</body>', '  <script type="module" src="js/ui/navbar.js"></script>\n</body>');
  }

  fs.writeFileSync(filePath, content);
}
console.log('Navbar injected into all hub pages');
