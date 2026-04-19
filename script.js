/* ============================================================
   CHEAT LABZ — Main Application Script
   ============================================================ */
(() => {
'use strict';

/* ---------- Game Registry ---------- */
const GAMES = [
  { id:'snake',       title:'Neon Serpent',    icon:'🐍', category:'arcade',  difficulty:'medium', tags:['trending','retro'],desc:'Classic snake turbo-charged with neon combos and boost.',         controls:'Arrow keys / WASD move · SPACE boost · P/ESC pause', embed:'games/play.html?game=snake' },
  { id:'pingpong',    title:'Loop Rally',      icon:'🏓', category:'arcade',  difficulty:'hard',   tags:['trending'],       desc:'Fast paddle rallies with curve shots and speed spikes.',          controls:'W/S or ↑/↓ move · SPACE curve shot · P/ESC pause',  embed:'games/play.html?game=pingpong' },
  { id:'bubbleshooter',title:'Orb Pop Deluxe', icon:'🫧', category:'puzzle',  difficulty:'easy',   tags:['chill'],          desc:'Match and pop chains of same-colored orbs. No pressure.',         controls:'Click adjacent orbs to chain · ENTER pop · Z undo · R reset', embed:'games/play.html?game=bubbleshooter' },
  { id:'carracing',   title:'Turbo Drift',     icon:'🏎️', category:'racing',  difficulty:'hard',   tags:['trending'],       desc:'Top-down racing with drift scoring and boost pads.',              controls:'WASD/Arrows steer · SPACE handbrake · P/ESC pause', embed:'games/play.html?game=carracing' },
  { id:'puzzle',      title:'Slide Forge',     icon:'🟥', category:'puzzle',  difficulty:'medium', tags:[],                  desc:'Sliding tile puzzle meets 2048. Merge tiles for combos.',         controls:'Arrow keys slide · Z undo · R restart', embed:'games/play.html?game=puzzle' },
  { id:'keyfrenzy',   title:'Key Frenzy',      icon:'⌨️', category:'skill',   difficulty:'hard',   tags:['trending','new'], desc:'Typing gauntlet — press keys fast with blind rounds.',           controls:'Press shown key only · SPACE skip (3) · P/ESC pause',          embed:'games/play.html?game=keyfrenzy' },
  { id:'dino',        title:'Astro Strider',   icon:'🚀', category:'arcade',  difficulty:'medium', tags:[],                  desc:'Infinite cosmic runner. Jump, duck, dash to survive.',           controls:'SPACE/↑ jump · ↓ duck · X dash · P/ESC pause',       embed:'games/play.html?game=dino' },
  { id:'wordguesser', title:'Cipher Quest',    icon:'🔠', category:'puzzle',  difficulty:'medium', tags:[],                  desc:'Guess the 5-letter word. Speed bonus + streak rewards.',         controls:'Type letters · ENTER submit · BACKSPACE delete', embed:'games/play.html?game=wordguesser' },
  { id:'reactiontime',title:'Blink Lab',       icon:'⚡', category:'skill',   difficulty:'medium', tags:['new'],            desc:'Reaction training. Hit targets fast, avoid traps.',              controls:'SPACE for white/green · click blue · avoid red', embed:'games/play.html?game=reactiontime' },
  { id:'haunted',     title:'Phantom Calc',    icon:'👻', category:'puzzle',  difficulty:'hard',   tags:[],                  desc:'Spooky math puzzle — shoot ghosts with correct answers.',        controls:'Click ghost/option with correct answer · number keys too',        embed:'games/play.html?game=haunted' },
  { id:'wordle',      title:'Word Pulse',      icon:'🔤', category:'puzzle',  difficulty:'medium', tags:['chill'],           desc:'Word grid challenge with hints and time bonus.',                 controls:'Type hidden words · ENTER submit · H hint', embed:'games/play.html?game=wordle' },
  { id:'pixeldodge',  title:'Pixel Dodge',     icon:'🎯', category:'arcade',  difficulty:'easy',   tags:['new'],            desc:'Dodge projectiles from all edges. Pure evasion chaos.',          controls:'WASD/Arrows move · survive incoming projectiles',                   embed:'games/play.html?game=pixeldodge' },
  { id:'dodgeblitz',  title:'Dodge Blitz',     icon:'🔺', category:'arcade',  difficulty:'easy',   tags:['new','retro'],    desc:'Pure evasion: survive incoming neon spikes from all sides.',      controls:'WASD/Arrows move · survive edge spawns · pure evasion',                  embed:'games/play.html?game=dodgeblitz' },
  { id:'stackblitz',  title:'Stack Blitz',     icon:'📦', category:'arcade',  difficulty:'easy',   tags:['new','chill'],    desc:'Stack blocks perfectly. Precision stacking challenge.',           controls:'SPACE drop block · perfect stacks bonus',                    embed:'games/play.html?game=stackblitz' },
  { id:'memorygrid',  title:'Memory Grid',     icon:'🧠', category:'skill',   difficulty:'medium', tags:['new'],            desc:'Memorize highlighted cells, then click all correct cells to clear rounds.', controls:'Memorize highlights, then click all highlighted cells',   embed:'games/play.html?game=memorygrid' },
  { id:'hypertap',    title:'Hyper Tap',       icon:'👆', category:'skill',   difficulty:'easy',   tags:['new','trending'], desc:'Tap hard for 10 seconds with ripple, shake, and bonus timing.', controls:'SPACE/Click tap · every 10th tap press X for bonus',       embed:'games/play.html?game=hypertap' },
  { id:'neonpong',    title:'Neon Pong 1v1',   icon:'🎾', category:'arcade',  difficulty:'medium', tags:['new'],            desc:'Neon Pong vs adaptive AI in a best-of-3 match.',                controls:'W/S or ↑/↓ move · SPACE spin boost · best of 3 rounds',    embed:'games/play.html?game=neonpong' },
  { id:'gravityflip', title:'Gravity Flip',    icon:'🛰️', category:'arcade',  difficulty:'medium', tags:['new','trending'], desc:'Auto-runner on dual lanes — flip gravity to dodge spikes and gaps.', controls:'SPACE / ↑ / Tap to flip gravity', embed:'games/play.html?game=gravityflip' },
  { id:'chainburst',  title:'Chain Burst',     icon:'💥', category:'puzzle',  difficulty:'medium', tags:['new'],            desc:'Pop one orb to trigger huge chain reactions in a 7×7 grid.', controls:'Click / Tap orb to burst chain', embed:'games/play.html?game=chainburst' },
  { id:'reflexrush',  title:'Reflex Rush',     icon:'🧪', category:'skill',   difficulty:'hard',   tags:['new'],            desc:'Color-signal key test with shrinking windows and strike pressure.', controls:'RED=J · BLUE=K · GREEN=L · YELLOW=SPACE · WHITE=ENTER', embed:'games/play.html?game=reflexrush' },
  { id:'tilerunner',  title:'Tile Runner',     icon:'🧱', category:'arcade',  difficulty:'medium', tags:['new'],            desc:'Cross trap boards from left to right while preserving your lives.', controls:'WASD / Arrow keys move one tile', embed:'games/play.html?game=tilerunner' },
  { id:'beatdrop',    title:'Beat Drop',       icon:'🎵', category:'skill',   difficulty:'medium', tags:['new'],            desc:'4-lane visual rhythm challenge with combo, fever, and HP.', controls:'D F J K hit lanes at the zone', embed:'games/play.html?game=beatdrop' },
];

const diffColors = { easy:'badge-easy', medium:'badge-medium', hard:'badge-hard' };

/* ---------- DOM refs ---------- */
const $ = id => document.getElementById(id);
const heroTitle     = $('heroTitle');
const browseBtn     = $('browseBtn');
const randomBtn     = $('randomBtn');
const liveRuns      = $('liveRuns');
const searchInput   = $('searchInput');
const shuffleBtn    = $('shuffleBtn');
const shuffleToast  = $('shuffleToast');
const gameCount     = $('gameCount');
const gameGrid      = $('gameGrid');
const emptyState    = $('emptyState');
const featuredRow   = $('featuredRow');
const sortSelect    = $('sortSelect');
const lbGameSelect  = $('lbGameSelect');
const lbTable       = $('lbTable');
const lbReset       = $('lbReset');
const themeToggle   = $('themeToggle');
const sfxToggle     = $('sfxToggle');
const settingsBtn   = $('settingsBtn');
const settingsPanel = $('settingsPanel');
const settingsClose = $('settingsClose');
const headerHandle  = $('headerHandle');
const handleModal   = $('handleModal');
const handleInput   = $('handleInput');
const handleSave    = $('handleSave');
const playerBadge   = $('playerBadge');
const gameContainer = $('gameContainer');
const gameFrame     = $('gameFrame');
const gameTitle     = $('gameTitle');
const gameBack      = $('gameBack');
const achievToast   = $('achievementToast');
const arenaBtn      = $('arenaBtn');
const arenaContainer = $('arenaContainer');
const arenaSelectView = $('arenaSelectView');
const arenaPlayView = $('arenaPlayView');
const arenaResultView = $('arenaResultView');
const arenaClose = $('arenaClose');
const arenaStart = $('arenaStart');
const arenaGameGrid = $('arenaGameGrid');
const arenaPickLabel = $('arenaPickLabel');
const arenaFrame = $('arenaFrame');
const arenaRoundTitle = $('arenaRoundTitle');
const arenaHazards = $('arenaHazards');
const arenaCountdown = $('arenaCountdown');
const arenaBackToSelect = $('arenaBackToSelect');
const arenaCloseResults = $('arenaCloseResults');
const arenaRunAgain = $('arenaRunAgain');
const arenaPickNew = $('arenaPickNew');
const arenaBreakdown = $('arenaBreakdown');
const arenaLeaderboard = $('arenaLeaderboard');
const dailyCards = $('dailyCards');
const dailyCountdown = $('dailyCountdown');
const navArena = $('navArena');

let currentFilter = 'all';
let currentSort   = 'trending';
let currentQuery  = '';
let currentIframe = null;
let arenaState = null;
let arenaSelectedGame = null;
let arenaTimer = 0;

/* ============================================================
   INIT
   ============================================================ */
function init() {
  // First visit check
  if (!CheatLabz.store.get('playerName')) {
    handleModal.classList.remove('hidden');
  }
  playerBadge.textContent = CheatLabz.player.getName();
  if (headerHandle) headerHandle.value = CheatLabz.player.getName().replace(/^Guest_/,'');

  // Apply saved settings
  const s = CheatLabz.settings.get();
  if (s.theme === 'light') document.body.classList.replace('dark','light');
  SoundManager.volume = s.sfxVolume / 100;

  initStarfield();
  glitchTitle();
  if ($('liveGames')) $('liveGames').textContent = String(GAMES.length);
  renderFeatured('trending');
  renderGrid();
  renderDailyChallenges();
  startDailyCountdown();
  initArenaMode();
  updateStats();
  updateLeaderboard();
  setVH();
  window.addEventListener('resize', setVH);
  bindEvents();
}

function setVH(){
  document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
}

function seededRand(seedStr){
  let hash = 2166136261;
  for (const c of seedStr) hash = (hash ^ c.charCodeAt(0)) * 16777619;
  return () => {
    hash += 0x6D2B79F5;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function todayKey(){
  return new Date().toISOString().slice(0,10);
}

function challengeTemplates(){
  return [
    { type:'score', build:(g,r)=>({ target: 300 + Math.floor(r()*600), text:`Score ${300 + Math.floor(r()*600)} in ${g.title}` }) },
    { type:'survive', build:(g,r)=>({ target: 30 + Math.floor(r()*40), text:`Survive ${30 + Math.floor(r()*40)}s in ${g.title}` }) },
    { type:'combo', build:(g,r)=>({ target: 3 + Math.floor(r()*4), text:`Reach combo x${3 + Math.floor(r()*4)} in ${g.title}` }) },
    { type:'level', build:(g,r)=>({ target: 2 + Math.floor(r()*3), text:`Reach level ${2 + Math.floor(r()*3)} in ${g.title}` }) },
  ];
}

function getDailyChallenges(){
  const key = todayKey();
  const existing = CheatLabz.store.get(`dailyMeta_${key}`);
  if (existing?.length === 3) return existing;
  const rand = seededRand(key);
  const templates = challengeTemplates();
  const chosenGames = [...GAMES].sort(() => rand() - 0.5).slice(0,3);
  const list = chosenGames.map((game, idx) => {
    const t = templates[Math.floor(rand()*templates.length)];
    const built = t.build(game, rand);
    return {
      id: `${key}_${idx+1}`,
      date:key,
      gameId: game.id,
      gameTitle: game.title,
      icon: game.icon,
      type: t.type,
      target: built.target,
      text: built.text,
      difficulty: game.difficulty,
    };
  });
  CheatLabz.store.set(`dailyMeta_${key}`, list);
  return list;
}

function getDailyProgress(){
  const key = todayKey();
  return CheatLabz.store.get(`daily_${key}`) || {};
}

function setDailyProgress(challengeId, done=true){
  const key = todayKey();
  const progress = getDailyProgress();
  progress[challengeId] = done;
  CheatLabz.store.set(`daily_${key}`, progress);
  const list = getDailyChallenges();
  if (list.every(c => progress[c.id])) {
    showAchievement('DAILY CHAMPION 👑');
    playerBadge.textContent = `${CheatLabz.player.getName()} 👑`;
    const streak = CheatLabz.store.get('challengeStreak') || {count:0,lastCompleted:null};
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0,10);
    streak.count = streak.lastCompleted === yesterday ? streak.count + 1 : 1;
    streak.lastCompleted = key;
    CheatLabz.store.set('challengeStreak', streak);
    const streakEl = $('statStreak');
    if (streakEl) streakEl.textContent = `🔥 ${streak.count} days`;
  }
}

function renderDailyCountdown(){
  if (!dailyCountdown) return;
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24,0,0,0);
  const ms = Math.max(0, tomorrow - now);
  const h = String(Math.floor(ms/3600000)).padStart(2,'0');
  const m = String(Math.floor((ms%3600000)/60000)).padStart(2,'0');
  const s = String(Math.floor((ms%60000)/1000)).padStart(2,'0');
  dailyCountdown.textContent = `Resets in ${h}:${m}:${s}`;
}

function renderDailyChallenges(){
  if (!dailyCards) return;
  const list = getDailyChallenges();
  const progress = getDailyProgress();
  dailyCards.innerHTML = list.map(c => {
    const status = progress[c.id] ? 'complete' : (CheatLabz.store.get(`dailyAttempt_${c.id}`) ? 'progress' : 'locked');
    return `
      <article class="daily-card status-${status}">
        <h4>${c.icon} ${c.gameTitle}</h4>
        <p class="daily-desc">${c.text}</p>
        <p class="daily-meta">${c.difficulty.toUpperCase()} · Reward: Daily Badge</p>
        <div class="daily-status">${status==='complete'?'COMPLETE ✓':status==='progress'?'IN PROGRESS':'LOCKED'}</div>
        <button class="btn-small" data-daily-id="${c.id}">PLAY CHALLENGE</button>
      </article>`;
  }).join('');
  dailyCards.querySelectorAll('[data-daily-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      const c = list.find(x => x.id === btn.dataset.dailyId);
      if (!c) return;
      CheatLabz.store.set(`dailyAttempt_${c.id}`, true);
      launchGame(c.gameId, { challenge: encodeURIComponent(JSON.stringify(c)) });
    });
  });
  renderDailyCountdown();
}

function startDailyCountdown(){
  renderDailyCountdown();
  window.setInterval(renderDailyCountdown, 1000);
}

function randomHazards(count){
  const pool = ['BLIND','SHRINK','REVERSE','DARK','SPEEDUP'];
  return [...pool].sort(() => Math.random() - 0.5).slice(0, count);
}

function initArenaMode(){
  if (!arenaGameGrid) return;
  const cards = GAMES.map(g => `
    <button class="arena-game-card" data-arena-game="${g.id}">
      <div class="arena-icon">${g.icon}</div>
      <div class="arena-title">${g.title}</div>
    </button>`).join('');
  arenaGameGrid.innerHTML = cards;
  arenaGameGrid.querySelectorAll('[data-arena-game]').forEach(btn => {
    btn.addEventListener('click', () => {
      arenaSelectedGame = btn.dataset.arenaGame;
      arenaGameGrid.querySelectorAll('[data-arena-game]').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      const selected = GAMES.find(g => g.id === arenaSelectedGame);
      if (arenaPickLabel) arenaPickLabel.textContent = `Selected: ${selected?.title || 'Unknown'}`;
      if (arenaStart) arenaStart.disabled = false;
    });
  });
}

function showArenaView(view){
  arenaSelectView?.classList.add('hidden');
  arenaPlayView?.classList.add('hidden');
  arenaResultView?.classList.add('hidden');
  view?.classList.remove('hidden');
}

function openArena(){
  if (!arenaContainer) return;
  arenaContainer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  showArenaView(arenaSelectView);
}

function closeArena(){
  if (!arenaContainer) return;
  arenaContainer.classList.add('hidden');
  document.body.style.overflow = '';
  if (arenaFrame) arenaFrame.innerHTML = '';
  if (arenaTimer) { clearTimeout(arenaTimer); arenaTimer = 0; }
}

function arenaConfig(round){
  const base = [
    { duration:90, speed:1.0, mult:1.0, hazards:[] },
    { duration:75, speed:1.25, mult:1.5, hazards:randomHazards(1) },
    { duration:60, speed:1.5, mult:2.0, hazards:randomHazards(2) },
  ];
  return base[round-1];
}

function startArenaSession(){
  if (!arenaSelectedGame) return;
  arenaState = { gameId: arenaSelectedGame, round:1, rounds:[], total:0, roundResolved:false };
  runArenaRound();
}

function runArenaRound(){
  if (!arenaState) return;
  arenaState.roundResolved = false;
  const cfg = arenaConfig(arenaState.round);
  showArenaView(arenaPlayView);
  if (arenaRoundTitle) arenaRoundTitle.textContent = `⚔️ ARENA — ROUND ${arenaState.round}/3`;
  if (arenaHazards) arenaHazards.textContent = cfg.hazards.length ? cfg.hazards.join(' + ') : 'No Hazard';
  if (arenaCountdown) {
    arenaCountdown.classList.remove('hidden');
    let n = 3;
    arenaCountdown.innerHTML = `ROUND STARTING IN <b>${n}</b>`;
    const int = setInterval(() => {
      n -= 1;
      if (n <= 0) { clearInterval(int); arenaCountdown.classList.add('hidden'); mountArenaFrame(cfg); }
      else arenaCountdown.innerHTML = `ROUND STARTING IN <b>${n}</b>`;
    }, 1000);
  } else {
    mountArenaFrame(cfg);
  }
}

function mountArenaFrame(cfg){
  if (!arenaFrame || !arenaState) return;
  const game = GAMES.find(g => g.id === arenaState.gameId);
  if (!game) return;
  const iframe = document.createElement('iframe');
  const params = `arena=1&arenaRound=${arenaState.round}&arenaDuration=${cfg.duration}&arenaSpeed=${cfg.speed}&arenaMult=${cfg.mult}&arenaHazards=${encodeURIComponent(cfg.hazards.join(','))}`;
  iframe.src = `${game.embed}&${params}`;
  iframe.allow = 'autoplay';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  arenaFrame.innerHTML = '';
  arenaFrame.appendChild(iframe);
}

function finishArenaRound(score){
  if (!arenaState) return;
  if (arenaState.roundResolved) return;
  arenaState.roundResolved = true;
  const cfg = arenaConfig(arenaState.round);
  const result = { round: arenaState.round, score, hazards: cfg.hazards };
  arenaState.rounds.push(result);
  arenaState.total += score;
  if (arenaState.round >= 3) {
    showArenaResults();
    return;
  }
  arenaState.round += 1;
  setTimeout(runArenaRound, 1200);
}

function showArenaResults(){
  if (!arenaState) return;
  showArenaView(arenaResultView);
  const game = GAMES.find(g => g.id === arenaState.gameId);
  const key = `arena_${arenaState.gameId}`;
  const arr = CheatLabz.store.get(key) || [];
  arr.push({ score: arenaState.total, date: Date.now(), playerName: CheatLabz.player.getName() });
  CheatLabz.store.set(key, arr);
  const pb = Math.max(...arr.map(x => x.score));
  const rating = arenaState.total > 4000 ? 'LEGEND' : arenaState.total > 3000 ? 'PLATINUM' : arenaState.total > 2200 ? 'GOLD' : arenaState.total > 1400 ? 'SILVER' : 'BRONZE';
  if (arenaBreakdown) {
    arenaBreakdown.innerHTML = arenaState.rounds.map(r => `
      <div class="round-box">
        <h4>Round ${r.round}</h4>
        <p>Score: <b>${r.score}</b></p>
        <p>Hazards: ${r.hazards.length ? r.hazards.join(', ') : 'None'}</p>
      </div>
    `).join('') + `<div class="round-box"><h4>Total</h4><p><b>${arenaState.total}</b></p><p>PB: ${pb} · Rating: ${rating}</p></div>`;
  }
  const seeded = [3400, 3000, 2600, 2200, 1800].map((s,i)=>({playerName:`ArenaBot_${i+1}`,score:s}));
  const top = [...arr, ...seeded].sort((a,b)=>b.score-a.score).slice(0,5);
  if (arenaLeaderboard) {
    arenaLeaderboard.innerHTML = `<h3 style="margin-bottom:8px;font-family:Orbitron">${game?.title || ''} Arena Top 5</h3>` + top.map((s,i)=>`<div class="lb-row"><span class="lb-rank">${i+1}</span><span class="lb-name">${s.playerName}</span><span class="lb-score">${s.score}</span></div>`).join('');
  }
}

/* ============================================================
   STARFIELD
   ============================================================ */
function initStarfield() {
  const canvas = $('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, stars = [];
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  function createStars() { stars = Array.from({length:200}, () => ({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.5+0.3,s:Math.random()*0.3+0.05})); }
  function draw() {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = 'rgba(184,255,0,0.6)';
    for (const s of stars) {
      s.y -= s.s; if (s.y < 0) { s.y = H; s.x = Math.random()*W; }
      ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  resize(); createStars(); draw();
  window.addEventListener('resize', () => { resize(); createStars(); });
}

/* ============================================================
   GLITCH TITLE
   ============================================================ */
function glitchTitle() {
  const text = heroTitle.textContent;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  let iterations = 0;
  const interval = setInterval(() => {
    heroTitle.textContent = text.split('').map((c,i) => {
      if (i < iterations) return text[i];
      return chars[Math.floor(Math.random() * chars.length)];
    }).join('');
    if (iterations >= text.length) clearInterval(interval);
    iterations += 1;
  }, 30);
}

/* ============================================================
   RENDER FEATURED ROW
   ============================================================ */
function renderFeatured(chip) {
  let list;
  if (chip === 'trending') list = GAMES.filter(g => g.tags.includes('trending'));
  else if (chip === 'new') list = GAMES.filter(g => g.tags.includes('new'));
  else list = GAMES.filter(g => g.tags.includes('chill'));
  if (list.length === 0) list = GAMES.slice(0,4);

  featuredRow.innerHTML = list.map(g => `
    <div class="featured-card" data-id="${g.id}">
      <div class="fc-icon">${g.icon}</div>
      <div class="fc-title">${g.title}</div>
      <div class="fc-desc">${g.desc}</div>
    </div>
  `).join('');

  featuredRow.querySelectorAll('.featured-card').forEach(c => {
    c.addEventListener('click', () => launchGame(c.dataset.id));
  });
}

/* ============================================================
   RENDER GAME GRID
   ============================================================ */
function renderGrid() {
  let list = [...GAMES];
  // Filter
  if (currentFilter !== 'all') {
    list = currentFilter === 'retro'
      ? list.filter(g => g.tags.includes('retro'))
      : list.filter(g => g.category === currentFilter);
  }
  // Search
  if (currentQuery) {
    const q = currentQuery.toLowerCase();
    list = list.filter(g => g.title.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q) || g.category.includes(q));
  }
  // Sort
  switch (currentSort) {
    case 'az': list.sort((a,b) => a.title.localeCompare(b.title)); break;
    case 'easy': list.sort((a,b) => diffVal(a.difficulty) - diffVal(b.difficulty)); break;
    case 'hard': list.sort((a,b) => diffVal(b.difficulty) - diffVal(a.difficulty)); break;
    case 'new': list.sort((a,b) => (b.tags.includes('new')?1:0) - (a.tags.includes('new')?1:0)); break;
    default: list.sort((a,b) => (b.tags.includes('trending')?1:0) - (a.tags.includes('trending')?1:0));
  }

  emptyState.classList.toggle('hidden', list.length > 0);
  if (gameCount) gameCount.textContent = `Showing ${list.length} games`;

  gameGrid.innerHTML = list.map((g,i) => `
    <div class="game-card" data-id="${g.id}">
      <div class="card-icon">${g.icon}</div>
      <div class="card-title">${g.title}</div>
      <div class="card-badges">
        <span class="badge badge--category">${g.category.toUpperCase()}</span>
        <span class="badge badge--difficulty ${g.difficulty}">${g.difficulty.toUpperCase()}</span>
        ${g.tags.map(t => `<span class="badge badge--tag ${t==='trending'?'badge-trending':''} ${t==='new'?'badge-new':''}">${t.toUpperCase()}</span>`).join('')}
      </div>
      <div class="card-desc">${g.desc}</div>
      <div class="card-stats">Your Best: <strong>${CheatLabz.scores.getBest(g.id)}</strong> · Runs: <strong>${CheatLabz.scores.getRuns(g.id)}</strong></div>
      <div class="card-controls-hint">${g.controls}</div>
      <button class="btn-play" onclick="window._launchGame('${g.id}')">&#127918; PLAY NOW</button>
    </div>
  `).join('');

  // Animate cards in
  gameGrid.querySelectorAll('.game-card').forEach((c,i) => {
    c.style.opacity = '0'; c.style.transform = 'translateY(20px)';
    setTimeout(() => { c.style.transition = 'opacity 0.4s, transform 0.4s'; c.style.opacity = '1'; c.style.transform = 'translateY(0)'; }, i * 40);
  });

  // Search glow
  if (currentQuery) {
    gameGrid.querySelectorAll('.game-card').forEach(c => {
      const title = c.querySelector('.card-title').textContent.toLowerCase();
      if (!title.includes(currentQuery.toLowerCase())) c.classList.add('faded');
    });
  }
}

function diffVal(d) { return d==='easy'?1:d==='medium'?2:3; }

/* ============================================================
   LAUNCH / CLOSE GAME
   ============================================================ */
window._launchGame = launchGame;

function launchGame(id, options = {}) {
  const game = GAMES.find(g => g.id === id);
  if (!game) return;
  SoundManager.gameStart();
  gameTitle.textContent = game.title;
  gameContainer.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  const iframe = document.createElement('iframe');
  const params = new URLSearchParams();
  Object.entries(options).forEach(([k,v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  iframe.src = params.size ? `${game.embed}&${params.toString()}` : game.embed;
  iframe.allow = 'autoplay';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';
  gameFrame.innerHTML = '';
  gameFrame.appendChild(iframe);
  currentIframe = iframe;

  // Track last played
  CheatLabz.store.set('lastPlayed', id);
}

function closeGame() {
  gameContainer.classList.add('hidden');
  document.body.style.overflow = '';
  if (currentIframe) { currentIframe.src = ''; currentIframe = null; }
  gameFrame.innerHTML = '';
  renderGrid();
  updateStats();
  updateLeaderboard();
}

/* ============================================================
   STATS
   ============================================================ */
function updateStats() {
  const totalRuns = CheatLabz.scores.getTotalRuns();
  const el = $('liveRuns');
  if (el) el.textContent = totalRuns.toLocaleString();
  const tr = $('statTotalRuns');
  if (tr) tr.textContent = totalRuns === 0 ? 'Start playing to track runs!' : totalRuns.toLocaleString();

  // Most played
  let maxRuns = 0, maxGame = '—';
  GAMES.forEach(g => { const r = CheatLabz.scores.getRuns(g.id); if (r > maxRuns) { maxRuns=r; maxGame=g.title; } });
  const mp = $('statMostPlayed');
  if (mp) mp.textContent = maxGame;

  // Last played
  const lp = CheatLabz.store.get('lastPlayed');
  const lpEl = $('statLastPlayed');
  if (lpEl) lpEl.textContent = lp ? (GAMES.find(g => g.id===lp)?.title || '—') : '—';

  const streak = CheatLabz.store.get('challengeStreak') || {count:0};
  const streakEl = $('statStreak');
  if (streakEl) streakEl.textContent = streak.count > 0 ? `🔥 ${streak.count} days` : '0';

  // Fav category
  const cats = {};
  GAMES.forEach(g => { const r = CheatLabz.scores.getRuns(g.id); cats[g.category] = (cats[g.category]||0)+r; });
  const fc = $('statFavCat');
  if (fc) { const top = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0]; fc.textContent = top && top[1]>0 ? top[0] : '—'; }
}

function shufflePick() {
  const pick = GAMES[Math.floor(Math.random() * GAMES.length)];
  if (!pick) return;
  currentFilter = 'all';
  currentSort = 'trending';
  currentQuery = '';
  if (searchInput) searchInput.value = '';
  document.querySelectorAll('.pill[data-filter]').forEach(p => p.classList.toggle('active', p.dataset.filter === 'all'));
  renderGrid();

  const target = gameGrid.querySelector(`[data-id="${pick.id}"]`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('shuffle-pulse');
    setTimeout(() => target.classList.remove('shuffle-pulse'), 1400);
  }
  if (shuffleToast) {
    shuffleToast.textContent = `🎲 Try ${pick.title}!`;
    shuffleToast.classList.remove('hidden');
    setTimeout(() => shuffleToast.classList.add('hidden'), 2000);
  }
}

/* ============================================================
   LEADERBOARD
   ============================================================ */
function updateLeaderboard() {
  // Populate select
  lbGameSelect.innerHTML = GAMES.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
  renderLB(GAMES[0].id);
}

function renderLB(gameId) {
  const scores = CheatLabz.scores.getAll(gameId)
    .sort((a,b) => b.score - a.score)
    .slice(0,10);
  const me = CheatLabz.player.getName();
  const ranks = ['🥇','🥈','🥉'];

  lbTable.innerHTML = scores.length === 0 ? '<p class="empty-state">No scores yet. Play some games!</p>' :
    scores.map((s,i) => `
      <div class="lb-row ${(s.playerName || s.player) === me ? 'me':''}" style="animation-delay:${i*60}ms">
        <span class="lb-rank">${i<3 ? ranks[i] : (i+1)}</span>
        <span class="lb-name">${(s.playerName || s.player)}${s.score === CheatLabz.scores.getBest(gameId) ? ' ★ PB':''}</span>
        <span class="lb-score">${s.score}</span>
      </div>
    `).join('');
}

/* ============================================================
   EVENTS
   ============================================================ */
function bindEvents() {
  // Handle modal
  handleSave.addEventListener('click', () => {
    const name = handleInput.value.trim();
    if (name) CheatLabz.player.setName(name);
    playerBadge.textContent = CheatLabz.player.getName();
    if (headerHandle) headerHandle.value = CheatLabz.player.getName().replace(/^Guest_/,'');
    handleModal.classList.add('hidden');
  });
  handleInput.addEventListener('keydown', e => { if (e.key==='Enter') handleSave.click(); });

  // Browse / Random
  browseBtn.addEventListener('click', () => $('games').scrollIntoView({behavior:'smooth'}));
  randomBtn.addEventListener('click', () => { const g = GAMES[Math.floor(Math.random()*GAMES.length)]; launchGame(g.id); });
  arenaBtn?.addEventListener('click', openArena);
  navArena?.addEventListener('click', (e) => { e.preventDefault(); openArena(); });
  if (shuffleBtn) shuffleBtn.addEventListener('click', shufflePick);

  arenaClose?.addEventListener('click', closeArena);
  arenaStart?.addEventListener('click', startArenaSession);
  arenaBackToSelect?.addEventListener('click', () => showArenaView(arenaSelectView));
  arenaCloseResults?.addEventListener('click', closeArena);
  arenaRunAgain?.addEventListener('click', () => { if (arenaState?.gameId) { arenaSelectedGame = arenaState.gameId; startArenaSession(); } });
  arenaPickNew?.addEventListener('click', () => showArenaView(arenaSelectView));

  if (headerHandle) {
    const saveHeaderHandle = () => {
      const value = headerHandle.value.trim();
      if (!value) return;
      CheatLabz.player.setName(value);
      playerBadge.textContent = CheatLabz.player.getName();
    };
    headerHandle.addEventListener('keydown', e => { if (e.key === 'Enter') saveHeaderHandle(); });
    headerHandle.addEventListener('blur', saveHeaderHandle);
  }

  // Filters
  document.querySelectorAll('.pill[data-filter]').forEach(p => {
    p.addEventListener('click', () => {
      document.querySelectorAll('.pill[data-filter]').forEach(x => x.classList.remove('active'));
      p.classList.add('active');
      currentFilter = p.dataset.filter;
      SoundManager.btnClick();
      renderGrid();
    });
  });

  // Chips (featured)
  document.querySelectorAll('.chip[data-chip]').forEach(c => {
    c.addEventListener('click', () => {
      document.querySelectorAll('.chip[data-chip]').forEach(x => x.classList.remove('active'));
      c.classList.add('active');
      SoundManager.btnClick();
      renderFeatured(c.dataset.chip);
    });
  });

  // Sort
  sortSelect.addEventListener('change', () => { currentSort = sortSelect.value; renderGrid(); });

  // Search
  searchInput.addEventListener('input', () => { currentQuery = searchInput.value; renderGrid(); });

  // Theme toggle
  themeToggle.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light');
    document.body.classList.toggle('dark', !isLight);
    themeToggle.textContent = isLight ? '☀️' : '🌙';
    const s = CheatLabz.settings.get(); s.theme = isLight ? 'light' : 'dark'; CheatLabz.settings.set(s);
    SoundManager.btnClick();
  });

  // SFX toggle
  sfxToggle.addEventListener('click', () => {
    const muted = SoundManager.toggle();
    sfxToggle.textContent = muted ? '🔇' : '🔊';
    if (!muted) SoundManager.btnClick();
  });

  // Settings
  settingsBtn.addEventListener('click', () => {
    const s = CheatLabz.settings.get();
    $('sHandle').value = CheatLabz.player.getName();
    $('sVolume').value = s.sfxVolume;
    $('sVolVal').textContent = s.sfxVolume + '%';
    $('sTheme').value = s.theme;
    $('sWallDeath').checked = s.wallDeath;
    $('sShowControls').checked = s.showControls;
    settingsPanel.classList.remove('hidden');
  });
  settingsClose.addEventListener('click', () => {
    // Save settings
    const s = {
      theme: $('sTheme').value,
      sfxVolume: parseInt($('sVolume').value),
      wallDeath: $('sWallDeath').checked,
      showControls: $('sShowControls').checked,
    };
    CheatLabz.settings.set(s);
    SoundManager.volume = s.sfxVolume / 100;
    const name = $('sHandle').value.trim();
    if (name) CheatLabz.player.setName(name);
    playerBadge.textContent = CheatLabz.player.getName();
    if (headerHandle) headerHandle.value = CheatLabz.player.getName().replace(/^Guest_/,'');
    if (s.theme === 'light') { document.body.classList.replace('dark','light'); themeToggle.textContent='☀️'; }
    else { document.body.classList.replace('light','dark'); themeToggle.textContent='🌙'; }
    settingsPanel.classList.add('hidden');
  });
  $('sVolume').addEventListener('input', () => { $('sVolVal').textContent = $('sVolume').value + '%'; });
  $('sReset').addEventListener('click', () => { if (confirm('Reset all scores?')) { CheatLabz.scores.resetAll(); renderGrid(); updateStats(); updateLeaderboard(); } });

  // Game container
  gameBack.addEventListener('click', closeGame);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && arenaContainer && !arenaContainer.classList.contains('hidden')) { closeArena(); return; }
    if (e.key === 'Escape' && !gameContainer.classList.contains('hidden')) closeGame();
  });

  // Leaderboard game select
  lbGameSelect.addEventListener('change', () => renderLB(lbGameSelect.value));
  lbReset.addEventListener('click', () => { if (confirm('Reset your scores?')) { CheatLabz.scores.resetAll(); renderGrid(); updateStats(); updateLeaderboard(); } });

  // Nav links highlight
  document.querySelectorAll('.nav-a').forEach(a => {
    a.addEventListener('click', () => {
      document.querySelectorAll('.nav-a').forEach(x => x.classList.remove('active'));
      a.classList.add('active');
    });
  });

  // Listen for score messages from game iframes
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'closeGame') {
      closeGame();
      return;
    }
    if (e.data && e.data.type === 'challengeComplete' && e.data.challengeId) {
      setDailyProgress(e.data.challengeId, true);
      renderDailyChallenges();
      showAchievement('Challenge Complete!');
      return;
    }
    if (e.data && e.data.type === 'arenaRoundOver' && typeof e.data.score === 'number') {
      finishArenaRound(e.data.score);
      return;
    }
    if (e.data && e.data.type === 'gameOver' && e.data.gameId && e.data.score !== undefined) {
      CheatLabz.scores.save(e.data.gameId, e.data.score);
      SoundManager.gameOver();
      const achievements = CheatLabz.achievements.check(e.data.gameId, e.data.score);
      if (achievements.length) showAchievement(achievements[0]);
      updateStats();
      renderDailyChallenges();
    }
  });
}

function showAchievement(text) {
  achievToast.textContent = '🏆 ' + text;
  achievToast.classList.remove('hidden');
  setTimeout(() => achievToast.classList.add('hidden'), 2500);
}

/* ---------- GO ---------- */
init();
})();
