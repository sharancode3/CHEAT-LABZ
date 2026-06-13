const puppeteer = require('puppeteer');

(async () => {
  console.log("Launching browser for visual demonstration...");
  // Launch in non-headless mode and maximized so the user can see it!
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  console.log("Navigating to Home Page...");
  await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Navigating to Games Library...");
  await page.goto('http://localhost:3000/games.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Checking Arena Mode...");
  await page.goto('http://localhost:3000/arena.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Checking Leaderboard...");
  await page.goto('http://localhost:3000/leaderboard.html', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 3000));

  console.log("Demonstration complete. Closing browser.");
  await browser.close();
  process.exit(0);
})();
