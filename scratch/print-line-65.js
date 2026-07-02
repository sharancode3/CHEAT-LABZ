const fs = require('fs');
const lines = fs.readFileSync('c:/SHARAN PROJECTS/CHEAT LABZ/js/ui/home.js', 'utf8').split('\n');
const line = lines[64]; // 0-indexed line 65
console.log(`Line 65: "${line}"`);
console.log(`Length: ${line.length}`);
for (let i = 0; i < line.length; i++) {
  console.log(`Char ${i}: '${line[i]}' (code: ${line.charCodeAt(i)})`);
}
