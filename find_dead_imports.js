const fs = require('fs');
const path = require('path');

const dir = __dirname;
let deadLinks = [];

function walk(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (let file of files) {
    if (file === 'node_modules' || file.startsWith('.')) continue;
    const filePath = path.join(currentDir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      walk(filePath);
    } else if (file.endsWith('.js') || file.endsWith('.html')) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check HTML <script src="...">
      if (file.endsWith('.html')) {
        const scriptRegex = /<script[^>]+src=["']([^"']+)["']/g;
        let match;
        while ((match = scriptRegex.exec(content)) !== null) {
          const src = match[1];
          if (!src.startsWith('http') && !src.startsWith('//')) {
            const targetPath = path.resolve(currentDir, src);
            if (!fs.existsSync(targetPath)) {
              deadLinks.push({ file: filePath, dead: targetPath });
            }
          }
        }
      }
      
      // Check JS import ... from '...'
      if (file.endsWith('.js')) {
        const importRegex = /import\s+.*?from\s+["']([^"']+)["']/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
          const src = match[1];
          if (!src.startsWith('http') && !src.startsWith('//')) {
            const targetPath = path.resolve(currentDir, src);
            if (!fs.existsSync(targetPath)) {
              deadLinks.push({ file: filePath, dead: targetPath });
            }
          }
        }
      }
    }
  }
}

walk(dir);
console.log(JSON.stringify(deadLinks, null, 2));
