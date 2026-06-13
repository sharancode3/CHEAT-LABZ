const fs = require('fs');
const path = require('path');

const filesToUpdate = ['index.html', 'games.html', 'arena.html'];
const dir = __dirname;

const modalHtml = `
  <!-- Global Game Modal -->
  <div id="game-modal" class="game-modal hidden">
    <div class="game-modal-header">
      <button id="close-game" class="btn-icon">← BACK</button>
      <span id="game-modal-title" class="font-display" style="font-size: 14px;"></span>
      <span id="game-modal-score" class="font-display text-accent-1" style="font-size: 14px;">SCORE: 0</span>
    </div>
    <div class="game-canvas-container" id="game-canvas-container">
      <canvas id="game-canvas"></canvas>
    </div>
  </div>
`;

for (let file of filesToUpdate) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('id="game-modal"')) {
    content = content.replace('</body>', `${modalHtml}\n</body>`);
    fs.writeFileSync(filePath, content);
  }
}
console.log('Game modal injected into hub pages');
