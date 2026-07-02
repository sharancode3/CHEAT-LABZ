const fs = require('fs');

function findNonAscii(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`Checking: ${filePath}`);
  let count = 0;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    if (code > 127) {
      count++;
      console.log(`  Non-ASCII char at index ${i}: charCode=${code}, char="${content[i]}"`);
      if (count > 20) {
        console.log(`  Too many non-ASCII characters, stopping output...`);
        break;
      }
    }
  }
}

findNonAscii('c:/SHARAN PROJECTS/CHEAT LABZ/assets/icons/game-icons.js');
findNonAscii('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/home.js');
