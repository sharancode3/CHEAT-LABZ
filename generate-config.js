const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config();

const socketUrl = process.env.VITE_SOCKET_URL || (process.env.NODE_ENV === 'production' ? 'https://your-render-app.onrender.com' : 'http://localhost:4000');

const configContent = `// Automatically generated config at startup. Do not modify.
window.CHALLENGE_SERVER_URL = "${socketUrl}";
`;

fs.writeFileSync('config.js', configContent);
console.log(`[Config] Generated config.js with CHALLENGE_SERVER_URL = ${socketUrl}`);
