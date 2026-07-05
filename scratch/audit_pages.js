const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const pagesToTest = [
  { name: 'Home', url: 'http://localhost:3000/index.html' },
  { name: 'Games List', url: 'http://localhost:3000/games.html' },
  { name: 'Arena', url: 'http://localhost:3000/arena.html' },
  { name: 'Daily', url: 'http://localhost:3000/daily.html' },
  { name: 'Leaderboard', url: 'http://localhost:3000/leaderboard.html' },
  { name: 'Challenge Hub', url: 'http://localhost:3000/challenge/index.html' },
  { name: 'Challenge Lobby', url: 'http://localhost:3000/challenge/lobby.html?code=DEMO12&game=multiplayer-snake' }
];

(async () => {
  const results = [];

  for (const pageInfo of pagesToTest) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setCacheEnabled(false);
    
    const consoleLogs = [];
    const pageErrors = [];
    const failedResources = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(`[${msg.type().toUpperCase()}] ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      pageErrors.push(err.toString());
    });

    page.on('requestfailed', request => {
      failedResources.push(`${request.url()} - ${request.failure() ? request.failure().errorText : 'Unknown Error'}`);
    });

    page.on('response', response => {
      if (response.status() >= 400) {
        failedResources.push(`${response.url()} - HTTP ${response.status()}`);
      }
    });

    try {
      // Direct Navigation
      await page.goto(pageInfo.url, { waitUntil: 'networkidle2' });
      
      // Bypass identity modal
      await page.evaluate(() => {
        localStorage.setItem('cheatLabz_uid', 'test-uid-12345678');
        localStorage.setItem('cheatLabz_displayName', 'Tester');
      });
      await page.reload({ waitUntil: 'networkidle2' });

      await new Promise(r => setTimeout(r, 1000));

      results.push({
        name: pageInfo.name,
        url: pageInfo.url,
        loaded: true,
        consoleLogs,
        pageErrors,
        failedResources,
        status: pageErrors.length > 0 || failedResources.length > 0 ? 'HAS_ERRORS' : 'CLEAN'
      });

    } catch (err) {
      results.push({
        name: pageInfo.name,
        url: pageInfo.url,
        loaded: false,
        error: err.toString(),
        consoleLogs,
        pageErrors,
        failedResources,
        status: 'FAILED_TO_LOAD'
      });
    } finally {
      await browser.close();
    }
  }

  fs.writeFileSync(
    path.join(__dirname, 'audit_pages_results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log('Pages audit completed and saved.');
})();
