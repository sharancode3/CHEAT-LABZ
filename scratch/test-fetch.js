const http = require('http');

function testFetch(url) {
  http.get(url, (res) => {
    console.log(`URL: ${url}`);
    console.log(`Status Code: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log(`First 200 chars:`);
      console.log(data.slice(0, 200));
      console.log(`Length: ${data.length} chars`);
    });
  }).on('error', (err) => {
    console.error(`Error fetching ${url}:`, err.message);
  });
}

testFetch('http://localhost:3000/assets/icons/game-icons.js');
testFetch('http://localhost:3000/js/ui/home.js');
