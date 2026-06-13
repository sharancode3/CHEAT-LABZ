const fs = require('fs');

function fix(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const p = dir + '/' + f;
    if (fs.statSync(p).isDirectory()) {
      fix(p);
    } else if (p.endsWith('.js')) {
      let code = fs.readFileSync(p, 'utf8');
      if (code.includes('\\`') || code.includes('\\$')) {
        console.log('Fixing:', p);
        code = code.split('\\`').join('`');
        code = code.split('\\$').join('$');
        fs.writeFileSync(p, code);
      }
    }
  }
}

fix('js');
