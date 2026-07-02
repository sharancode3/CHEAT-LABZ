const http = require('http');

function inspectRemoteFile(url) {
  http.get(url, (res) => {
    console.log(`URL: ${url}`);
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      const buffer = Buffer.concat(chunks);
      console.log(`Received Length: ${buffer.length} bytes`);
      console.log(`First 20 bytes (hex):`, buffer.slice(0, 20).toString('hex'));
      console.log(`First 20 bytes (utf8):`, JSON.stringify(buffer.slice(0, 20).toString('utf8')));
    });
  }).on('error', err => {
    console.error(`Error:`, err.message);
  });
}

inspectRemoteFile('http://localhost:3000/assets/icons/game-icons.js');
inspectRemoteFile('http://localhost:3000/js/ui/home.js');
