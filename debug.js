const puppeteer = require('puppeteer');

async function audit() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const errors = [];
  const warnings = [];
  const network404s = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
    if (msg.type() === 'warning') warnings.push(msg.text());
  });

  page.on('response', res => {
    if (res.status() === 404) network404s.push(res.url());
  });

  const pages = [
    'http://localhost:3000/index.html',
    'http://localhost:3000/games.html',
    'http://localhost:3000/arena.html',
    'http://localhost:3000/leaderboard.html',
  ];

  for (const url of pages) {
    errors.length = 0;
    warnings.length = 0;
    network404s.length = 0;
    
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));

    console.log('\n=============================');
    console.log('PAGE:', url);
    console.log('=============================');
    console.log('JS ERRORS:', errors);
    console.log('404s:', network404s);
    console.log('WARNINGS:', warnings);

    await page.screenshot({ 
      path: 'screenshot-' + url.split('/').pop() + '.png',
      fullPage: true 
    });
  }

  await browser.close();
}

async function interactionTest() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Test games page cards render
  await page.goto('http://localhost:3000/games.html',
    { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, ));
  const cardCount = await page.$$eval(
    '.game-card', cards => cards.length
  );
  console.log('Game cards rendered:', cardCount, 
    '(should be 19)');

  // Test clicking first game card
  try {
    await page.evaluate(() => { const l = document.getElementById('global-loader'); if(l) l.remove(); });
    await page.click('.game-card:first-child .launch-game-btn');
    await new Promise(r => setTimeout(r, 500));
    const modalVisible = await page.$eval(
      '#game-modal', el => !el.classList.contains('hidden')
    );
    console.log('Game modal opened:', modalVisible,
      '(should be true)');
  } catch(e) {
    console.log('Game modal opened: ERROR', e.message);
  }

  // Test home page challenges
  await page.goto('http://localhost:3000/index.html',
    { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, ));
  const challengeCards = await page.$$eval(
    '.challenge-card', cards => cards.length
  );
  console.log('Daily challenge cards:', challengeCards,
    '(should be 3)');

  // Test arena page background color
  await page.goto('http://localhost:3000/arena.html',
    { waitUntil: 'networkidle0' });
  const bgColor = await page.$eval('body', 
    el => getComputedStyle(el).backgroundColor
  );
  console.log('Arena bg color:', bgColor,
    '(should be dark, not white)');

  // Test leaderboard empty state
  await page.goto(
    'http://localhost:3000/leaderboard.html',
    { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, ));
  const emptyState = await page.$('.empty-state');
  console.log('Leaderboard empty state shows:', 
    !!emptyState, '(should be true if no scores)');

  await browser.close();
}

async function run() {
  await audit();
  await interactionTest();
}
run();
