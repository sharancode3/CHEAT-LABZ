/**
 * config.js — Frontend Configuration
 */

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

export const CONFIG = {
  // Use localhost in dev. For production on Vercel, replace the string below with your Render URL.
  // Example: 'https://cheat-labz-server.onrender.com'
  SOCKET_URL: isLocal ? 'http://localhost:4000' : 'https://YOUR-RENDER-APP-URL.onrender.com',
  ENV: isLocal ? 'development' : 'production',
};
