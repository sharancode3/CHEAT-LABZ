import { Storage } from '../core/storage.js';
import { initParticles } from './particleCanvas.js';
import { GAMES_DB } from './games.js';


// --- Daily Challenges ---
function initDailyChallenges() {
  const countdownEl = document.getElementById('daily-countdown');
  const gridEl = document.getElementById('challenges-grid');
  if (!countdownEl || !gridEl) return;

  function updateCountdown() {
    const now = new Date();
    const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
    const tomorrow = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + 1));
    const diff = tomorrow - utcNow;

    const h = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
    const m = String(Math.floor((diff / 1000 / 60) % 60)).padStart(2, '0');
    const s = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
    countdownEl.innerText = `${h}:${m}:${s}`;
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  function getDailyGames() {
    const today = new Date();
    const dateString = `${today.getUTCFullYear()}-${String(today.getUTCMonth()+1).padStart(2,'0')}-${String(today.getUTCDate()).padStart(2,'0')}`;
    
    const d = dateString.replace(/-/g,'');
    const seed = [...d].reduce((a,c)=>a+c.charCodeAt(0),0);
    
    let c1 = seed % 19;
    let c2 = (seed * 7 + 3) % 19;
    if (c2 === c1) c2 = (c2 + 1) % 19;
    let c3 = (seed * 13 + 11) % 19;
    if (c3 === c1 || c3 === c2) c3 = (c3 + 1) % 19;
    if (c3 === c1) c3 = (c3 + 1) % 19;

    const daily = [GAMES_DB[c1], GAMES_DB[c2], GAMES_DB[c3]];
    return { dateString, games: daily };
  }

  const { dateString, games: dailyGames } = getDailyGames();
  const completedIds = Storage.get(`cheatLabz_daily_${dateString}`, []);

  gridEl.innerHTML = dailyGames.map((g, idx) => {
    let status = 'LOCKED';
    let btnText = 'LOCKED';
    let btnClass = 'btn-outline';
    
    // Unlocked if it's the first game, or if the previous game's ID is in completedIds
    const isUnlocked = idx === 0 || completedIds.includes(dailyGames[idx-1].id);
    const isCompleted = completedIds.includes(g.id);

    if (isUnlocked) {
      status = isCompleted ? 'COMPLETED' : 'PLAY NOW';
      btnText = isCompleted ? 'PLAY AGAIN' : 'PLAY CHALLENGE';
      btnClass = isCompleted ? 'btn-outline' : 'btn-primary';
    }

    const badgeClass = `badge-difficulty-${g.difficulty.toLowerCase()}`;

    return `
      <div class="challenge-card">
        <div class="challenge-header">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>
          <span class="font-display" style="font-size: 12px;">${g.name}</span>
        </div>
        <p class="challenge-desc">${g.desc}</p>
        <div class="challenge-meta">
          <span class="badge ${badgeClass}">${g.difficulty}</span>
          ${status === 'LOCKED' ? '<svg width="16" height="16" stroke="currentColor" fill="none" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>' : '<svg width="16" height="16" stroke="var(--accent-2)" fill="none" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'}
        </div>
        <a href="daily.html?game=${idx}" class="btn ${btnClass}" style="width:100%;">${btnText}</a>
      </div>
    `;
  }).join('');
}

// --- Player Stats ---
function initPlayerStats() {
  const strip = document.getElementById('stats-strip');
  if (!strip) return;

  const stats = [
    { label: 'MOST PLAYED', value: Storage.get('most_played') || '—' },
    { label: 'BEST STREAK', value: Storage.get('best_streak') || '0' },
    { label: 'TOTAL RUNS', value: Storage.get('total_runs') || '0' },
    { label: 'FAVORITE CAT', value: Storage.get('fav_cat') || '—' },
    { label: 'LAST PLAYED', value: Storage.get('last_played') || '—' }
  ];

  strip.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value font-display" style="font-size: 14px; margin-top: 8px;">${s.value}</div>
    </div>
  `).join('');
}

// --- Hot Games List ---
function initHotGames() {
  const container = document.getElementById('hot-games-container');
  if (!container) return;

  const hotGames = [...GAMES_DB].sort(() => Math.random() - 0.5).slice(0, 5);

  container.innerHTML = hotGames.map(g => `
    <div class="game-card">
      <div class="game-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
      </div>
      <div class="game-title-row">
        <span class="game-title">${g.name}</span>
      </div>
      <p class="game-desc">${g.desc}</p>
      <div class="game-stats">
        <span>Best: ${Storage.get(g.id, 0)}</span>
        <span>Runs: ${Storage.get(g.id + '_runs', 0)}</span>
      </div>
      <a href="${g.id}.html" class="btn btn-primary btn-full">PLAY NOW</a>
    </div>
  `).join('');

  // Auto-scroll logic
  let scrollPos = 0;
  setInterval(() => {
    if (container.matches(':hover')) return; // pause on hover
    scrollPos += 300; // scroll by roughly one card width
    if (scrollPos >= container.scrollWidth - container.clientWidth) {
      scrollPos = 0; // jump to start
    }
    container.scrollTo({ left: scrollPos, behavior: 'smooth' });
  }, 5000);
}

// Initialize all
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initDailyChallenges();
  initPlayerStats();
  initHotGames();

  // Random game button
  const randomBtn = document.getElementById('random-game-btn');
  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      window.location.href = 'games.html'; // Or link directly to a random game later
    });
  }
});
