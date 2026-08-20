const fs = require('fs');
const files = ['index.html', 'games.html', 'leaderboard.html', 'challenge/index.html', 'challenge/lobby.html'];
files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/src="\//g, 'src="./');
    content = content.replace(/href="\//g, 'href="./');
    content = content.replace(/import { (.*?) } from '\/js/g, 'import { $1 } from \'./js');
    fs.writeFileSync(file, content);
    console.log(`Fixed ${file}`);
  }
});
