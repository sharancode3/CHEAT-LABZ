const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const hideLoaderScript = `<script>window.addEventListener('load', () => { const l = document.getElementById('global-loader'); if(l) { l.style.opacity=0; setTimeout(()=>l.remove(), 300); } });</script>`;

for (let file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('hideLoaderScript') && !content.includes('l.style.opacity=0')) {
    content = content.replace('</body>', `  ${hideLoaderScript}\n</body>`);
    fs.writeFileSync(filePath, content);
  }
}
console.log('Loader hide script injected!');
