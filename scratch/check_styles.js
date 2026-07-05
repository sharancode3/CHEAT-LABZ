const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  try {
    await page.goto('http://localhost:3000/games.html', { waitUntil: 'networkidle2' });
    
    // Unlock and set identity
    await page.evaluate(() => {
      localStorage.setItem('cheatLabz_uid', 'test-uid-12345678');
      localStorage.setItem('cheatLabz_displayName', 'Tester');
      localStorage.setItem('cheatLabz_unlocked_neon-serpent', 'true');
    });
    await page.reload({ waitUntil: 'networkidle2' });

    // Click play button
    const playBtnSelector = `.launch-game-btn[data-id="neon-serpent"]`;
    await page.waitForSelector(playBtnSelector);
    await page.click(playBtnSelector);
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Check computed styles
    const styles = await page.evaluate(() => {
      const modal = document.getElementById('game-modal');
      const left = document.getElementById('panel-left');
      const right = document.getElementById('panel-right');
      
      const getComp = el => {
        if (!el) return 'NOT_FOUND';
        const s = window.getComputedStyle(el);
        return {
          display: s.display,
          flexDirection: s.flexDirection,
          width: s.width,
          height: s.height,
          position: s.position,
          flex: s.flex,
          className: el.className
        };
      };
      
      return {
        modal: getComp(modal),
        left: getComp(left),
        right: getComp(right)
      };
    });
    
    console.log('Computed Styles:', JSON.stringify(styles, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await browser.close();
  }
})();
