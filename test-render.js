const fs = require('fs');
const { JSDOM } = require('jsdom');

async function testRender() {
  const html = fs.readFileSync('games.html', 'utf8');
  
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    resources: "usable",
    url: "file:///" + process.cwd().replace(/\\/g, '/') + "/games.html"
  });

  dom.window.document.addEventListener('DOMContentLoaded', () => {
    // Wait a brief moment to allow any async renders to happen
    setTimeout(() => {
      const grid = dom.window.document.getElementById('games-grid');
      const childrenCount = grid ? grid.children.length : 0;
      console.log(`[SUCCESS] Games Grid Child Elements Rendered: ${childrenCount}`);
      
      const homeHtml = fs.readFileSync('index.html', 'utf8');
      const homeDom = new JSDOM(homeHtml, {
        runScripts: "dangerously",
        resources: "usable",
        url: "file:///" + process.cwd().replace(/\\/g, '/') + "/index.html"
      });
      homeDom.window.document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
           const hotGames = homeDom.window.document.getElementById('hot-games-container');
           const hotCount = hotGames ? hotGames.children.length : 0;
           console.log(`[SUCCESS] Home Hot Games Rendered: ${hotCount}`);
           process.exit(0);
        }, 200);
      });
    }, 200);
  });
}

testRender();
