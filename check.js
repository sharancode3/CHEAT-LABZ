const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => console.log('REQ FAILED:', request.url(), request.failure().errorText));
  
  await page.goto('http://localhost:3000/games.html', { waitUntil: 'networkidle0' });
  
  const html = await page.$eval('#games-grid', el => el.innerHTML);
  console.log('INNER HTML LENGTH:', html.length);
  
  const hasGameCard = await page.$$eval('.game-card', els => els.length);
  console.log('HAS GAME CARD:', hasGameCard);

  await browser.close();
})();
