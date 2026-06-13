import { Storage } from '../core/storage.js';
import { initParticles } from './particleCanvas.js';



// --- Daily Challenges ---
function initDailyChallenges() {
  const countdownEl = document.getElementById('daily-countdown');
  const gridEl = document.getElementById('challenges-grid');
  if (!countdownEl || !gridEl) return;

  function updateCountdown() {
    const now = new Date();
    const midnight = new Date(Date.UTC(
      now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1
    ));
    const secondsLeft = Math.floor((midnight - now) / 1000);

    const h = String(Math.floor(secondsLeft / 3600)).padStart(2, '0');
    const m = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0');
    const s = String(secondsLeft % 60).padStart(2, '0');
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

    const daily = [GAMES[c1], GAMES[c2], GAMES[c3]];
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
        <button class="btn ${btnClass}" style="width:100%;" ${status === 'LOCKED' ? 'disabled' : ''} onclick="if(window.launchGameModal) window.launchGameModal('${g.id}')">${btnText}</button>
      </div>
    `;
  }).join('');
}

// --- Player Stats ---
function initPlayerStats() {
  const strip = document.getElementById('stats-strip');
  if (!strip) return;

  let totalRuns = 0;
  let mostPlayed = null;
  let maxRuns = 0;
  let categoryCounts = {};
  let lastPlayedTime = 0;
  let lastPlayedGame = null;
  let bestStreak = Storage.get('best_streak', 0); // Assuming streak is tracked elsewhere or defaults to 0

  GAMES.forEach(g => {
    const runs = parseInt(Storage.get(g.id + '_runs', 0), 10);
    const lastPlayed = parseInt(Storage.get(g.id + '_lastplayed', 0), 10);
    
    if (runs > 0) {
      totalRuns += runs;
      if (runs > maxRuns) {
        maxRuns = runs;
        mostPlayed = g.name;
      }
      categoryCounts[g.category] = (categoryCounts[g.category] || 0) + runs;
    }
    
    if (lastPlayed > lastPlayedTime) {
      lastPlayedTime = lastPlayed;
      lastPlayedGame = g.name;
    }
  });

  let favCat = null;
  let maxCatRuns = 0;
  for (const [cat, count] of Object.entries(categoryCounts)) {
    if (count > maxCatRuns) {
      maxCatRuns = count;
      favCat = cat;
    }
  }

  const stats = [
    { label: 'MOST PLAYED', value: mostPlayed || '—' },
    { label: 'BEST STREAK', value: bestStreak || '0' },
    { label: 'TOTAL RUNS', value: totalRuns || '0' },
    { label: 'FAVORITE CAT', value: favCat || '—' },
    { label: 'LAST PLAYED', value: lastPlayedGame || '—' }
  ];

  strip.innerHTML = stats.map(s => `
    <div class="stat-card" style="border-left: none; background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value font-display" style="font-size: 14px; margin-top: 8px;">${s.value}</div>
    </div>
  `).join('');
}

// --- Hot Games List ---
function initHotGames() {
  const container = document.getElementById('hot-games-container');
  if (!container) return;

  const renderHot = (filterTag) => {
    let filtered = filterTag 
      ? GAMES.filter(g => g.tags && g.tags.includes(filterTag))
      : GAMES;
    
    if (filtered.length === 0) filtered = GAMES.slice(0, 6);
    else filtered = filtered.slice(0, 6);

    container.innerHTML = filtered.map(g => `
      <div class="game-card" data-id="${g.id}" style="cursor:pointer; min-width: 200px; padding: 16px;" onclick="if(window.launchGameModal) window.launchGameModal('${g.id}')">
        <div class="game-icon" style="margin-bottom: 12px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
        </div>
        <div class="game-title-row" style="margin-bottom: 12px; justify-content: center;">
          <span class="game-title" style="font-size: 12px; text-align: center;">${g.name}</span>
        </div>
        <button class="btn btn-primary" style="width: 100%; padding: 8px; font-size: 10px;">PLAY</button>
      </div>
    `).join('');
  };

  renderHot('trending');

  // Find tabs
  const tabBtns = document.querySelectorAll('.tab-switcher .tab-pill');
  if (tabBtns) {
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tag = btn.innerText.toLowerCase();
        renderHot(tag);
      });
    });
  }

  // Auto-scroll logic
  let scrollPos = 0;
  setInterval(() => {
    if (container.matches(':hover')) return; // pause on hover
    scrollPos += 220; // scroll by roughly one card width
    if (scrollPos >= container.scrollWidth - container.clientWidth) {
      scrollPos = 0; // jump to start
    }
    container.scrollTo({ left: scrollPos, behavior: 'smooth' });
  }, 5000);
}

// Initialize all
// Modules are deferred, DOM is ready
  initParticles('particles-bg');
  initDailyChallenges();
  initPlayerStats();
  initHotGames();

  // Random game button
  const randomBtn = document.getElementById('random-game-btn');
  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      const g = GAMES[Math.floor(Math.random() * GAMES.length)];
      if (window.launchGameModal) window.launchGameModal(g.id);
    });
  }

  // GSAP Animations
  if (window.gsap) {
    gsap.fromTo('.hero-content > *', 
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out', delay: 0.2 }
    );
    
    gsap.fromTo('.challenge-card',
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'back.out(1.2)', delay: 0.5 }
    );
  }
