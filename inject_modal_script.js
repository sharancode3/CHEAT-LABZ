const fs = require('fs');
const path = require('path');

const filesToUpdate = ['index.html', 'games.html', 'arena.html'];
const dir = __dirname;

for (let file of filesToUpdate) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('modal.js')) {
    content = content.replace('</body>', '  <script type="module" src="js/ui/modal.js"></script>\n</body>');
    fs.writeFileSync(filePath, content);
  }
}
console.log('modal.js injected into hub pages');
