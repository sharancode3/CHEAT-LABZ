const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const virtualConsole = new jsdom.VirtualConsole();
virtualConsole.sendTo(console);

const html = fs.readFileSync('games.html', 'utf8');
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  url: "file:///" + process.cwd().replace(/\\/g, '/') + "/games.html",
  virtualConsole
});

dom.window.document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const grid = dom.window.document.getElementById('games-grid');
    console.log('Games Grid Rendered:', grid ? grid.children.length : 0);
    process.exit(0);
  }, 1000);
});
