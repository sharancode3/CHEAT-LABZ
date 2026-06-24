const puppeteer = require('puppeteer');

(async () => {
  console.log("Starting Full Puppeteer Verification Audit...");
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  
  let errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console Error] ${msg.text()} at ${msg.location().url}:${msg.location().lineNumber}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`[Page Error] ${err.stack || err.toString()}`);
  });
  
  const urls = [
    'http://localhost:3006/index.html',
    'http://localhost:3006/games.html',
    'http://localhost:3006/arena.html',
    'http://localhost:3006/leaderboard.html'
  ];

  for (const url of urls) {
    console.log(`Checking ${url}...`);
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle0' });
      if (!response || !response.ok()) {
        errors.push(`[Failed Load] ${url}`);
      }
      
      // Wait for 500ms to allow fade in animations to complete
      await new Promise(r => setTimeout(r, 500));
      
      const fileName = url.split('/').pop();
      await page.screenshot({ path: `screenshot-${fileName}.png`, fullPage: true });
      console.log(`Captured screenshot-${fileName}.png`);
      
    } catch (e) {
      errors.push(`[Exception] ${url}: ${e.message}`);
    }
  }

  console.log("Testing Leaderboard 'ALL GAMES' Play action...");
  try {
    await page.goto('http://localhost:3006/leaderboard.html', { waitUntil: 'networkidle0' });
    
    await page.waitForSelector('.lb-tab[data-tab="all-games"]');
    await page.click('.lb-tab[data-tab="all-games"]');
    
    // Wait for the DOM to update to the all-games grid
    await new Promise(r => setTimeout(r, 500)); 
    
    // Click the first game's play button
    await page.waitForSelector('.lb-game-card button.lgc-play');
    await page.click('.lb-game-card button.lgc-play');
    
    // Wait for the modal and loading indicator to pop up
    await new Promise(r => setTimeout(r, 800)); 
    
    await page.screenshot({ path: `screenshot-leaderboard-modal.png`, fullPage: true });
    console.log(`Captured screenshot-leaderboard-modal.png`);
  } catch (e) {
     errors.push(`[Play Action Exception]: ${e.message}`);
  }

  await browser.close();

  console.log("\n=== AUDIT RESULTS ===");
  if (errors.length > 0) {
    // Filter out standard 404s like favicon
    const filtered = errors.filter(e => !e.includes('favicon.ico'));
    if (filtered.length > 0) {
      console.log("ERRORS FOUND:");
      filtered.forEach(e => console.log(e));
    } else {
      console.log("SUCCESS: Zero meaningful console errors, zero 404s!");
    }
  } else {
    console.log("SUCCESS: Zero console errors, zero 404s!");
  }
})();
