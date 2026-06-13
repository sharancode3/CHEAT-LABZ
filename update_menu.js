const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const mobileMenuHtml = `
  <div id="mobile-menu" class="mobile-menu-overlay" style="display:none;">
    <button class="close-menu-btn" onclick="document.getElementById('mobile-menu').style.display='none'">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
    <div class="mobile-nav-links font-display">
      <a href="index.html">HOME</a>
      <a href="games.html">GAMES</a>
      <a href="arena.html">ARENA</a>
      <a href="daily.html">DAILY</a>
    </div>
  </div>
`;

for (let file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('id="mobile-menu"')) {
    content = content.replace('</body>', mobileMenuHtml + '\n</body>');
    fs.writeFileSync(filePath, content);
  }
}
console.log('Mobile menu added to all HTML files!');
