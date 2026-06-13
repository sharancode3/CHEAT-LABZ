const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, 'js', 'games');
const files = fs.readdirSync(gamesDir).filter(f => f.endsWith('.js') && f !== 'game-shell.js' && f !== 'games-data.js');

for (const file of files) {
  const filePath = path.join(gamesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Change class declaration to export default
  content = content.replace(/^class\s+([A-Za-z0-9_]+)\s+extends\s+GameShell\s*\{/m, 'export default class $1 extends GameShell {');

  // Update constructor signature
  content = content.replace(/constructor\(\)\s*\{/, 'constructor(canvas, config = {}) {');

  // Update super call
  content = content.replace(/super\(\s*['"]game-canvas['"]\s*,\s*\{/, "super(canvas || 'game-canvas', { ...config, ");

  // Remove instantiation at the bottom
  const classNameMatch = content.match(/export default class\s+([A-Za-z0-9_]+)/);
  if (classNameMatch) {
    const className = classNameMatch[1];
    
    // Build strings without dynamic template literals to avoid escapes
    const c1 = "new " + className + "(";
    const c2 = "window." + className + " =";
    const c3 = "document.addEventListener('DOMContentLoaded', () => {\\n  new " + className + "();\\n});";
    
    // Instead of regex, let's just do a simple split/replace for the common patterns
    const lines = content.split('\n');
    const newLines = lines.filter(line => {
      if (line.includes(c1) && !line.includes('class ')) return false;
      if (line.includes(c2)) return false;
      return true;
    });
    content = newLines.join('\n');
    content = content.replace("document.addEventListener('DOMContentLoaded', () => {\n  new " + className + "();\n});", "");
  }

  fs.writeFileSync(filePath, content);
}

console.log('Game files refactored for Modal launch');
