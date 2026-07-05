const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('HTTP ERROR:', response.url(), response.status());
    }
  });

  try {
    await page.goto('http://localhost:3000/games.html', { waitUntil: 'networkidle2' });
    
    // Unlock
    await page.evaluate(() => {
      localStorage.setItem('cheatLabz_unlocked_neon-serpent', 'true');
    });
    await page.reload({ waitUntil: 'networkidle2' });

    // Take screenshot of games list
    await page.screenshot({ path: 'scratch/screenshot_games_list.png' });

    const playBtnSelector = `.launch-game-btn[data-id="neon-serpent"]`;
    console.log('Waiting for selector...');
    await page.waitForSelector(playBtnSelector, { timeout: 3000 });
    
    console.log('Clicking play button...');
    await page.click(playBtnSelector);
    
    await new Promise(r => setTimeout(r, 2000));
    
    // Take screenshot after click
    await page.screenshot({ path: 'scratch/screenshot_modal_clicked.png' });

    // Log modal HTML structure
    const modalHTML = await page.evaluate(() => {
      const modal = document.getElementById('game-modal');
      return modal ? {
        outerHTML: modal.outerHTML.substring(0, 1000),
        classes: modal.className,
        style: modal.getAttribute('style'),
        innerHTML: modal.innerHTML.substring(0, 1000)
      } : 'No Modal';
    });
    console.log('Modal HTML:', modalHTML);

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await browser.close();
  }
})();
