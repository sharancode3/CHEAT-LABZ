const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const soundButtonHtml = `
    <div class="nav-controls">
      <button id="global-mute-btn" class="icon-btn" aria-label="Toggle Sound" onclick="window.Sound && window.Sound.toggleMute()">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
      </button>
      <button id="hamburger-btn" class="icon-btn mobile-only" aria-label="Menu">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
    </div>
`;

for (let file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace <div style="width: 120px;"></div> or similar placeholder on the right side of nav
  content = content.replace(/<div style="width: (120px|80px);"><\/div>/g, soundButtonHtml);

  fs.writeFileSync(filePath, content);
}
console.log('Done updating navs!');
