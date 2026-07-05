const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  
  const viewports = [
    { name: 'desktop_1920', width: 1920, height: 1080 },
    { name: 'tablet_1024', width: 1024, height: 768 },
    { name: 'mobile_768', width: 768, height: 1024 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height });
    
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
      
      await page.screenshot({ path: `scratch/screenshot_vp_${vp.name}.png` });
      console.log(`Saved screenshot for ${vp.name}`);

    } catch (err) {
      console.error(err);
    } finally {
      await page.close();
    }
  }

  await browser.close();
})();
