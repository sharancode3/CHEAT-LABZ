// scratch/verify_infrastructure.js
const fs = require('fs');
const path = require('path');

const gameDirectories = [
  path.join(__dirname, '../js/games/solo'),
  path.join(__dirname, '../js/games/multi')
];

let failed = false;

gameDirectories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.warn(`⚠️ Warning: Directory ${dir} does not exist.`);
    return;
  }
  fs.readdirSync(dir).forEach(file => {
    if (!file.endsWith('.js')) return;
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for init and destroy methods
    const hasInit = content.includes('init(') || content.includes('init:') || content.includes('init =');
    const hasDestroy = content.includes('destroy(') || content.includes('destroy:') || content.includes('destroy =');
    const containsContainerText = content.includes('GameContainer') || content.includes('MultiplayerContainer');
    
    if (!hasInit || !hasDestroy) {
      console.error(`❌ STAGE FAILURE: ${file} missing unified lifecycle methods. (hasInit=${hasInit}, hasDestroy=${hasDestroy})`);
      failed = true;
    }
    if (containsContainerText) {
      console.error(`❌ ARCHITECTURE FAILURE: ${file} still maintains references to legacy container system.`);
      failed = true;
    }
  });
});

if (failed) {
  console.log('\n❌ Verification Failed! Some files are not compliant.');
  process.exit(1);
} else {
  console.log('\n✅ Verification Passed! All files are compliant.');
  process.exit(0);
}
