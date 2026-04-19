// Detect environment: GitHub Pages or local
const isGitHubPages = window.location.hostname.includes('github.io');
const API_URL = isGitHubPages 
  ? null  // No backend on GitHub Pages
  : 'http://localhost:3000/api';

const GAMES = [
  { id:'snake', title:'Neon Serpent', category:'arcade', embed:'./games/snake/index.html', blurb:'Synth snake combos with chaining boosts.' },
  { id:'pingpong', title:'Loop Rally', category:'arcade', embed:'./games/pingpong/index.html', blurb:'Laser-fast paddle rallies with looping shots.' },
  { id:'bubbleshooter', title:'Orb Pop Deluxe', category:'arcade', embed:'./games/bubbleshooter/index.html', blurb:'Color-matching bubble calm with score climbs.' },
  { id:'carracing', title:'Turbo Drift', category:'racing', embed:'./games/carracing/index.html', blurb:'Slide through neon corners and chase best laps.' },
  { id:'puzzle', title:'Slide Forge', category:'puzzle', embed:'./games/puzzle/index.html', blurb:'Craft the picture one satisfying move at a time.' },
  { id:'crazytype', title:'Key Frenzy', category:'skill', embed:'./games/monkeytyping/index.html', blurb:'Typing gauntlet for lightning-fast accuracy.' },
  { id:'dino', title:'Astro Strider', category:'arcade', embed:'./games/dino/index.html', blurb:'Dash over cosmic cliffs and dodge meteors.' },
  { id:'wordguesser', title:'Cipher Quest', category:'puzzle', embed:'./games/wordguesser/index.html', blurb:'Guess words under pressure with streak bonuses.' },
  { id:'reactiontime', title:'Blink Lab', category:'skill', embed:'./games/reactiontime/index.html', blurb:'Minimal reflex trials to shave off milliseconds.' },
  { id:'haunted-calculator', title:'Phantom Calc', category:'puzzle', embed:'./games/haunted/index.html', blurb:'Haunted math riddles that glitch the display.' },
  { id:'wordle', title:'Word Pulse', category:'puzzle', embed:'./games/wordle/index.html', blurb:'Word-wave challenge with hints and penalties.' }
];

const THUMBS = {
  snake: 'assets/thumbs/snake.svg',
  pingpong: 'assets/thumbs/pingpong.svg',
  bubbleshooter: 'assets/thumbs/bubbleshooter.svg',
  carracing: 'assets/thumbs/carracing.svg',
  puzzle: 'assets/thumbs/puzzle.svg',
  crazytype: 'assets/thumbs/crazytype.svg',
  dino: 'assets/thumbs/dino.svg',
  wordguesser: 'assets/thumbs/wordguesser.svg',
  reactiontime: 'assets/thumbs/reactiontime.svg',
  'haunted-calculator': 'assets/thumbs/haunted-calculator.svg',
  wordle: 'assets/thumbs/wordle.svg'
};

const state = {
  user: null,
  token: null,
  query: '',
  category: 'all',
  filtered: [...GAMES],
  currentGame: null,
  currentIframe: null,
  paused: false,
  themeIndex: 0
};

const gridEl = document.getElementById('grid');
const fsGameEl = document.getElementById('fsGame');
const emptyEl = document.getElementById('portalEmpty');
const searchEl = document.getElementById('search');
const usernameEl = document.getElementById('username');
const statTotalEl = document.getElementById('statTotal');
const statPlayedEl = document.getElementById('statPlayed');
const statBestEl = document.getElementById('statBest');

init();

function init() {
  if (!gridEl || !fsGameEl) {
    console.error('Portal UI not initialized: required elements missing.');
    return;
  }

  if (!checkAuth()) return;
  bindStaticControls();
  initBackgroundParticles();
  updateStats();
  applyFilters();
  autoLaunchFromQuery();
}

function checkAuth() {
  state.token = localStorage.getItem('authToken');
  const rawUser = localStorage.getItem('user');
  if (!state.token || !rawUser) {
    window.location.href = 'login.html';
    return false;
  }

  try {
    state.user = JSON.parse(rawUser);
  } catch (error) {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
    return false;
  }

  if (usernameEl) {
    usernameEl.textContent = state.user.username || 'Player';
  }
  return true;
}

function bindStaticControls() {
  const logoutBtn = document.getElementById('logoutBtn');
  const themeToggleBtn = document.getElementById('themeToggle');
  const pills = [...document.querySelectorAll('.cat-pill')];

  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  });

  searchEl?.addEventListener('input', (event) => {
    state.query = event.target.value.trim().toLowerCase();
    applyFilters();
  });

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((item) => item.classList.remove('active'));
      pill.classList.add('active');
      state.category = pill.dataset.category || 'all';
      applyFilters();
    });
  });

  const themes = ['theme-ocean', 'theme-sunset', 'theme-forest'];
  themeToggleBtn?.addEventListener('click', () => {
    document.body.classList.remove(...themes);
    const theme = themes[state.themeIndex];
    if (theme !== 'theme-ocean') {
      document.body.classList.add(theme);
    }
    state.themeIndex = (state.themeIndex + 1) % themes.length;
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && fsGameEl.classList.contains('active')) {
      closeFullscreenGame();
    }
  });
}

function applyFilters() {
  state.filtered = GAMES.filter((game) => {
    const categoryPass = state.category === 'all' || game.category === state.category;
    if (!categoryPass) return false;

    if (!state.query) return true;
    return (
      game.title.toLowerCase().includes(state.query) ||
      game.category.toLowerCase().includes(state.query) ||
      game.blurb.toLowerCase().includes(state.query)
    );
  });

  renderGrid();
}

function renderGrid() {
  gridEl.innerHTML = '';
  if (state.filtered.length === 0) {
    emptyEl?.classList.remove('hidden');
    return;
  }

  emptyEl?.classList.add('hidden');
  state.filtered.forEach((game) => gridEl.appendChild(createCard(game)));
}

function createCard(game) {
  const card = document.createElement('article');
  card.className = 'card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.dataset.id = game.id;

  const fallbackLogo = game.title.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
  const thumb = THUMBS[game.id]
    ? `<img class="thumb" src="${THUMBS[game.id]}" alt="${escapeHtml(game.title)} thumbnail" loading="lazy" />`
    : `<div class="logo" aria-hidden="true">${fallbackLogo}</div>`;

  card.innerHTML = `
    ${thumb}
    <div class="meta">
      <div class="title">${escapeHtml(game.title)}</div>
      <div class="cat">${escapeHtml(game.category)}</div>
      <p class="blurb">${escapeHtml(game.blurb)}</p>
      <div class="play-badge">Play Now</div>
    </div>
  `;

  card.addEventListener('click', () => openFullscreenGame(game));
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFullscreenGame(game);
    }
  });

  return card;
}

function autoLaunchFromQuery() {
  const launchId = new URLSearchParams(window.location.search).get('game');
  if (!launchId) return;
  const game = GAMES.find((item) => item.id === launchId);
  if (!game) return;
  setTimeout(() => openFullscreenGame(game), 80);
}

function openFullscreenGame(game) {
  state.currentGame = game;
  state.paused = false;

  fsGameEl.classList.add('active');
  fsGameEl.setAttribute('aria-hidden', 'false');
  fsGameEl.innerHTML = `
    <div class="stage">
      <aside class="hud-panel" aria-label="Player HUD">
        <div class="hud-row"><span>Player</span><span>${escapeHtml(state.user?.username || 'Player')}</span></div>
        <div class="hud-row"><span>Game</span><span>${escapeHtml(game.title)}</span></div>
        <div class="hud-row"><span>Score</span><span id="hudScore">—</span></div>
        <div class="hud-row"><span>High</span><span id="hudHigh">${getStoredHigh(game.id) ?? '—'}</span></div>
        <div class="hud-mini-help">Progress saves automatically after each run.</div>
      </aside>

      <div class="game-frame" id="gameFrame"></div>

      <div class="game-controls" aria-label="Game controls">
        <button class="gc-btn" id="btnPause">Pause</button>
        <button class="gc-btn hidden" id="btnResume">Resume</button>
        <button class="gc-btn" id="btnReplay">Replay</button>
        <button class="gc-btn exit" id="btnExit">Exit</button>
      </div>

      <div id="pauseLayer" class="pause-layer">PAUSED</div>
    </div>
  `;

  const gameFrame = document.getElementById('gameFrame');
  attachNewIframe(game.embed, gameFrame);
  bindFullscreenControls();
}

function bindFullscreenControls() {
  const pauseBtn = document.getElementById('btnPause');
  const resumeBtn = document.getElementById('btnResume');
  const replayBtn = document.getElementById('btnReplay');
  const exitBtn = document.getElementById('btnExit');
  const gameFrame = document.getElementById('gameFrame');
  const pauseLayer = document.getElementById('pauseLayer');

  pauseBtn?.addEventListener('click', () => {
    if (state.paused || !gameFrame || !pauseLayer) return;
    state.paused = true;
    pauseLayer.classList.add('show');
    gameFrame.style.filter = 'blur(3px) brightness(.6)';
    pauseBtn.classList.add('hidden');
    resumeBtn?.classList.remove('hidden');
  });

  resumeBtn?.addEventListener('click', () => {
    if (!state.paused || !gameFrame || !pauseLayer) return;
    state.paused = false;
    pauseLayer.classList.remove('show');
    gameFrame.style.filter = 'none';
    resumeBtn.classList.add('hidden');
    pauseBtn?.classList.remove('hidden');
    try {
      state.currentIframe?.contentWindow?.focus();
    } catch (error) {
      console.warn('Unable to refocus game frame:', error);
    }
  });

  replayBtn?.addEventListener('click', () => {
    if (!state.currentGame || !gameFrame) return;
    attachNewIframe(state.currentGame.embed, gameFrame);
    if (state.paused) {
      state.paused = false;
      pauseLayer?.classList.remove('show');
      gameFrame.style.filter = 'none';
      resumeBtn?.classList.add('hidden');
      pauseBtn?.classList.remove('hidden');
    }
  });

  exitBtn?.addEventListener('click', () => {
    closeFullscreenGame();
  });
}

function attachNewIframe(src, wrap) {
  if (!wrap) return;
  if (state.currentIframe?.parentNode) {
    state.currentIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.allowFullscreen = true;
  iframe.sandbox = 'allow-scripts allow-forms allow-same-origin';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = '0';
  iframe.loading = 'eager';

  iframe.addEventListener('load', () => {
    try {
      iframe.contentWindow?.focus();
    } catch (error) {
      console.warn('Unable to focus game iframe:', error);
    }
  });

  wrap.appendChild(iframe);
  state.currentIframe = iframe;
}

function closeFullscreenGame() {
  if (state.currentIframe?.parentNode) {
    state.currentIframe.remove();
  }
  state.currentIframe = null;
  state.currentGame = null;
  state.paused = false;
  fsGameEl.classList.remove('active');
  fsGameEl.setAttribute('aria-hidden', 'true');
  fsGameEl.innerHTML = '';
}

window.addEventListener('message', (event) => {
  let payload = event.data;
  try {
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }
  } catch (error) {
    return;
  }

  if (!payload || payload.type !== 'game_over') return;

  const gameId = payload.gameId || state.currentGame?.id;
  const score = Number(payload.score) || 0;

  saveGameProgress(gameId, score, payload.stats, payload.result || 'completed');
  const best = updateHighIfNeeded(gameId, score);
  updateHudScore(score, best);
  updateStats();
});

function updateHudScore(score, high) {
  const scoreEl = document.getElementById('hudScore');
  const highEl = document.getElementById('hudHigh');
  if (scoreEl) scoreEl.textContent = String(score);
  if (highEl) highEl.textContent = String(high);
}

function updateStats() {
  const progress = JSON.parse(localStorage.getItem('offlineProgress') || '[]');
  const byCategory = { arcade: 0, puzzle: 0, racing: 0, skill: 0 };

  progress.forEach((entry) => {
    const game = GAMES.find((item) => item.id === entry.gameId);
    if (game && byCategory[game.category] != null) {
      byCategory[game.category] += 1;
    }
  });

  const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'arcade';
  if (statTotalEl) statTotalEl.textContent = String(GAMES.length);
  if (statPlayedEl) statPlayedEl.textContent = String(progress.length);
  if (statBestEl) statBestEl.textContent = top;
}

async function saveGameProgress(gameId, score, stats, result) {
  if (!gameId || !state.token) return;

  try {
    await fetch(`${API_URL}/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        gameId,
        score,
        stats: stats || {},
        result: result || 'completed'
      })
    });
  } catch (error) {
    const offlineProgress = JSON.parse(localStorage.getItem('offlineProgress') || '[]');
    offlineProgress.push({
      gameId,
      score,
      stats: stats || {},
      result: result || 'completed',
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('offlineProgress', JSON.stringify(offlineProgress));
  }
}

function highScoreKey(gameId) {
  return `hp_highscore_${state.user?.username || 'guest'}_${gameId}`;
}

function getStoredHigh(gameId) {
  const value = localStorage.getItem(highScoreKey(gameId));
  return value ? Number(value) : null;
}

function updateHighIfNeeded(gameId, score) {
  if (!gameId) return score;
  const previous = getStoredHigh(gameId) ?? 0;
  if (score > previous) {
    localStorage.setItem(highScoreKey(gameId), String(score));
    return score;
  }
  return previous;
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function initBackgroundParticles() {
  const canvas = document.getElementById('bgCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const fit = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  fit();
  window.addEventListener('resize', fit);

  const particles = Array.from({ length: Math.max(14, Math.floor((canvas.width * canvas.height) / 120000)) }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: Math.random() * 1.8 + 0.5,
    alpha: Math.random() * 0.1 + 0.03,
    speedX: (Math.random() - 0.5) * 0.2,
    speedY: (Math.random() - 0.5) * 0.08
  }));

  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((particle) => {
      particle.x += particle.speedX;
      particle.y += particle.speedY;

      if (particle.x < -10) particle.x = canvas.width + 10;
      if (particle.x > canvas.width + 10) particle.x = -10;
      if (particle.y < -10) particle.y = canvas.height + 10;
      if (particle.y > canvas.height + 10) particle.y = -10;

      ctx.beginPath();
      ctx.fillStyle = `rgba(145, 214, 255, ${particle.alpha})`;
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(tick);
  };

  tick();
}
