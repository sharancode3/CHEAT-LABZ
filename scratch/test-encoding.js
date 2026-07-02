const fs = require('fs');

function inspectFile(filePath) {
  const buffer = fs.readFileSync(filePath);
  console.log(`File: ${filePath}`);
  console.log(`Size: ${buffer.length} bytes`);
  console.log(`First 20 bytes (hex):`, buffer.slice(0, 20).toString('hex'));
  console.log(`First 20 bytes (chars):`, JSON.stringify(buffer.slice(0, 20).toString('utf8')));
}

inspectFile('c:/SHARAN PROJECTS/CHEAT LABZ/assets/icons/game-icons.js');
inspectFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/home.js');
inspectFile('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/modal.js');
