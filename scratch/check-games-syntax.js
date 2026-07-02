const fs = require('fs');
const lines = fs.readFileSync('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/games.js', 'utf8').split('\n');
for (let l = 0; l < 15; l++) {
  console.log(`Line ${l + 1}: "${lines[l]}"`);
  for (let i = 0; i < lines[l].length; i++) {
    console.log(`  Char ${i}: '${lines[l][i]}' (code: ${lines[l].charCodeAt(i)})`);
  }
}
