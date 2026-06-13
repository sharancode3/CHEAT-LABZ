const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const oldFont = `<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Press+Start+2P&display=swap" rel="stylesheet">`;
const newFontAndCDNs = `
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=DM+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
`.trim();

const loaderHtml = `<div id="global-loader" class="loader"><div class="loader-bar"></div></div>`;

for (let file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace fonts
  if (content.includes(oldFont)) {
    content = content.replace(oldFont, newFontAndCDNs);
  } else if (!content.includes('JetBrains+Mono')) {
    // If exact match fails, try inserting before </head>
    content = content.replace('</head>', `  ${newFontAndCDNs}\n</head>`);
  }

  // Insert Loader after <body>
  if (!content.includes('id="global-loader"')) {
    content = content.replace('<body>', `<body>\n  ${loaderHtml}`);
  }

  fs.writeFileSync(filePath, content);
}
console.log('CDNs and Loader injected into all HTML files!');
