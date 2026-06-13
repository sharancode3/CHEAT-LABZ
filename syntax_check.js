const fs = require('fs');
const { execSync } = require('child_process');

function check(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = dir + '/' + f;
    if (fs.statSync(p).isDirectory()) {
      check(p);
    } else if (p.endsWith('.js')) {
      try {
        execSync('node -c "' + p + '"');
      } catch (e) {
        console.log('SYNTAX ERROR:', p);
        console.log(e.stderr ? e.stderr.toString() : e.message);
      }
    }
  }
}

check('js');
