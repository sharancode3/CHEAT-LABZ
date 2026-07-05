const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/verify-loader.html', {waitUntil: 'networkidle2'});
  
  await page.waitForFunction(() => {
    const rows = Array.from(document.querySelectorAll('#test-rows tr'));
    if (rows.length === 0) return false;
    const loading = rows.some(r => r.textContent.includes('Loading'));
    if (loading) return false;
    return true;
  }, {timeout: 30000});

  const results = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#test-rows tr'));
    return rows.map(row => {
      const cells = row.querySelectorAll('td');
      return {
        name: cells[0].textContent.trim(),
        type: cells[1].textContent.trim(),
        file: cells[2].textContent.trim(),
        verdict: cells[3].textContent.trim(),
        details: cells[4].textContent.trim()
      };
    });
  });

  const resultsPath = path.resolve(__dirname, 'verification_results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log('Results written to', resultsPath);

  await browser.close();
})();
