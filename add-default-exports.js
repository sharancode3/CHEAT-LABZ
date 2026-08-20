/**
 * add-default-exports.js
 * Adds `export default ClassName;` to each game file that only has a named export.
 * Run: node add-default-exports.js
 */

const fs = require('fs');
const path = require('path');

const dir = 'js/games/solo';
const files = fs.readdirSync(dir);

let fixed = 0;
files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Skip if already has default export
  if (/export default /.test(content)) {
    console.log(`[SKIP] ${f} - already has default export`);
    return;
  }
  
  // Find the named export class
  const match = content.match(/^export class (\w+)/m);
  if (!match) {
    console.log(`[WARN] ${f} - no named export class found`);
    return;
  }
  
  const className = match[1];
  content = content.trimEnd() + `\n\nexport default ${className};\n`;
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`[FIXED] ${f} -> export default ${className}`);
  fixed++;
});

console.log(`\nDone. Fixed ${fixed} files.`);
