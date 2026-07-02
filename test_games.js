const fs = require('fs');
const GAMES = require('./temp-games-data.js');

async function run() {
  const results = await Promise.all(GAMES.map(async g => {
    try {
      if(g.status === 'coming-soon') return `${g.id}: PARTIAL (Coming soon)`;
      const p = './' + g.file.replace(/^\//, '');
      const fullPath = 'file:///' + process.cwd().replace(/\\/g, '/') + '/' + p;
      await import(fullPath);
      return `${g.id}: WORKS`;
    } catch(e) {
      return `${g.id}: BROKEN (${e.message.split('\n')[0]})`;
    }
  }));
  results.forEach(r => console.log(r));
}
run();
