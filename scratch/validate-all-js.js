const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      if (f.endsWith('.js')) {
        callback(dirPath);
      }
    }
  });
}

walkDir('c:/SHARAN PROJECTS/CHEAT LABZ', (filePath) => {
  try {
    execSync(`node --check "${filePath}"`, { stdio: 'ignore' });
    // console.log(`OK: ${filePath}`);
  } catch (err) {
    console.error(`SYNTAX ERROR in file: ${filePath}`);
    try {
      execSync(`node --check "${filePath}"`, { stdio: 'inherit' });
    } catch (e) {
      // Printed by child process
    }
  }
});
