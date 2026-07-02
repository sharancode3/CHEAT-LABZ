const fs = require('fs');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (let i = 0; i < content.length; i++) {
    const charCode = content.charCodeAt(i);
    if (charCode === 160) {
      console.log(`[NBSP] Non-breaking space found in ${filePath} at char index ${i}`);
      // Print context
      const start = Math.max(0, i - 20);
      const end = Math.min(content.length, i + 20);
      console.log(`Context: "${content.slice(start, end).replace(/\n/g, '\\n')}"`);
    }
  }
}

checkFile('c:/SHARAN PROJECTS/CHEAT LABZ/assets/icons/game-icons.js');
checkFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/home.js');
checkFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/modal.js');
checkFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/game-modal.js');
