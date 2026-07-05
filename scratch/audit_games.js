const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const games = [
  { id: 'neon-serpent', name: 'Neon Serpent', type: 'solo' },
  { id: 'loop-rally', name: 'Loop Rally', type: 'solo' },
  { id: 'turbo-drift', name: 'Turbo Drift', type: 'solo' },
  { id: 'key-frenzy', name: 'Key Frenzy', type: 'solo' },
  { id: 'astro-strider', name: 'Astro Strider', type: 'solo' },
  { id: 'cipher-quest', name: 'Cipher Quest', type: 'solo' },
  { id: 'phantom-calc', name: 'Phantom Calc', type: 'solo' },
  { id: 'word-pulse', name: 'Word Pulse', type: 'solo' },
  { id: 'pixel-dodge', name: 'Pixel Dodge', type: 'solo' },
  { id: 'stack-blitz', name: 'Stack Blitz', type: 'solo' },
  { id: 'memory-grid', name: 'Memory Grid', type: 'solo' },
  { id: 'hyper-tap', name: 'Hyper Tap', type: 'solo' },
  { id: 'gravity-flip', name: 'Gravity Flip', type: 'solo' },
  { id: 'chain-burst', name: 'Chain Burst', type: 'solo' },
  { id: 'reflex-rush', name: 'Reflex Rush', type: 'solo' },
  { id: 'tile-runner', name: 'Tile Runner', type: 'solo' },
  { id: 'beat-drop', name: 'Beat Drop', type: 'solo' },
  { id: 'slide-forge', name: 'Slide Forge', type: 'solo' },
  { id: 'orb-pop-deluxe', name: 'Orb Pop Deluxe', type: 'solo' }
];

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const results = [];

  for (const game of games) {
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    const consoleLogs = [];
    const pageErrors = [];

    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleLogs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.stack || err.toString());
    });

    try {
      await page.goto('http://localhost:3000/games.html', { waitUntil: 'networkidle2' });
      
      // Auto-unlock locked games and set identity in localStorage
      await page.evaluate(() => {
        localStorage.setItem('cheatLabz_uid', 'test-uid-12345678');
        localStorage.setItem('cheatLabz_displayName', 'Tester');
        localStorage.setItem('cheatLabz_unlocked_beat-drop', 'true');
        localStorage.setItem('cheatLabz_unlocked_pixel-dodge', 'true');
        localStorage.setItem('cheatLabz_unlocked_astro-strider', 'true');
      });
      await page.reload({ waitUntil: 'networkidle2' });

      // Open the game modal
      const playBtnSelector = `.launch-game-btn[data-id="${game.id}"]`;
      await page.waitForSelector(playBtnSelector, { timeout: 3000 });
      await page.click(playBtnSelector);
      
      await page.waitForTimeout ? await page.waitForTimeout(1500) : await new Promise(r => setTimeout(r, 1500));

      // Click "START LEVEL 1" button inside the details content panel
      // First find the button
      const startBtnId = '#btn-start';
      const startBtnExists = await page.evaluate((selector) => !!document.querySelector(selector), startBtnId);
      
      let canvasRendered = false;
      if (startBtnExists) {
        await page.click(startBtnId);
        await new Promise(r => setTimeout(r, 1500));
        
        // Check if canvas exists and has dimensions
        canvasRendered = await page.evaluate(() => {
          const canvas = document.querySelector('#canvas-wrapper canvas');
          return !!canvas && canvas.width > 0 && canvas.height > 0;
        });
      }

      results.push({
        id: game.id,
        name: game.name,
        modalOpened: true,
        startBtnFound: startBtnExists,
        canvasRendered,
        consoleLogs,
        pageErrors,
        status: pageErrors.length > 0 ? 'BROKEN' : (canvasRendered ? 'WORKS - VERIFIED' : 'PARTIAL')
      });

    } catch (err) {
      results.push({
        id: game.id,
        name: game.name,
        modalOpened: false,
        error: err.toString(),
        consoleLogs,
        pageErrors,
        status: 'BROKEN'
      });
    } finally {
      await page.close();
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'audit_results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Audit completed and saved.');
  await browser.close();
})();
