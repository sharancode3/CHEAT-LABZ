const fs = require('fs');
const vm = require('vm');

function checkFile(filepath) {
  try {
    const code = fs.readFileSync(filepath, 'utf8');
    new vm.Script(code);
    console.log(`[Syntax OK] ${filepath}`);
  } catch (e) {
    console.error(`[Syntax ERROR] in ${filepath}:`, e.message);
  }
}

checkFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/game-modal.js');
checkFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/game-detail.js');
checkFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/games.js');
checkFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/core/game-loader.js');
checkFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/core/game-runner.js');
checkFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/core/game-manifest.js');
