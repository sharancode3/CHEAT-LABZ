import { showToast } from '../core/notifications.js';
import { getCoins, getStreak, Storage } from '../core/storage.js';
import { GAME_ICONS } from '../../assets/icons/game-icons.js';

const TROPHIES = {
  1: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffd93d" stroke-width="2" style="filter: drop-shadow(0 0 4px #ffd93d);"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="#ffd93d"/></svg>`,
  2: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c0c0c0" stroke-width="2" style="filter: drop-shadow(0 0 4px #c0c0c0);"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="#c0c0c0"/></svg>`,
  3: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cd7f32" stroke-width="2" style="filter: drop-shadow(0 0 4px #cd7f32);"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" fill="#cd7f32"/></svg>`
};

const BADGE_ICONS = {
  'first-blood': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon"><path d="M12 2C12 2 5 10 5 15a7 7 0 1 0 14 0c0-5-7-13-7-13Z" fill="currentColor"/></svg>`,
  'hat-trick': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon"><path d="M3 18h18v3H3z" fill="currentColor"/><path d="M6 8h12v10H6z" fill="currentColor"/><path d="M5 8c0-1 1-2 2-2h10c1 0 2 1 2 2v2H5V8Z"/></svg>`,
  'streak-starter': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" fill="currentColor"/></svg>`,
  'week-warrior': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor"/></svg>`,
  'arena-initiate': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon"><path d="M14.5 17.5 3 6V3h3l11.5 11.5M9.5 14.5 3 21M14.5 9.5 21 3M19.5 6.5 14.5 11.5"/></svg>`,
  'high-roller': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>`,
  'completionist': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon"><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z" fill="currentColor"/></svg>`,
  'speed-demon': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/></svg>`,
  'perfect-stack': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon"><rect x="4" y="16" width="16" height="5"/><rect x="6" y="10" width="12" height="5"/><rect x="8" y="4" width="8" height="5" fill="currentColor"/></svg>`,
  'pixel-ghost': `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="badge-icon"><path d="M19 11v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9a7 7 0 0 1 14 0z" fill="currentColor"/><circle cx="9" cy="11" r="1" fill="#000"/><circle cx="15" cy="11" r="1" fill="#000"/></svg>`
};

const GAME_COLORS = {
  'neon-serpent': 'var(--accent-4)',
  'loop-rally': 'var(--accent-3)',
  'turbo-drift': 'var(--accent-1)',
  'stack-blitz': 'var(--accent-2)',
  'pixel-dodge': 'var(--danger)',
  'gravity-flip': 'var(--cyan)',
  'slide-forge': 'var(--accent-4)',
  'word-pulse': 'var(--accent-2)',
  'phantom-calc': 'var(--cyan)',
  'cipher-quest': 'var(--accent-3)',
  'key-frenzy': 'var(--accent-1)',
  'reflex-rush': 'var(--danger)',
  'chain-burst': 'var(--accent-4)',
  'orb-pop-deluxe': 'var(--accent-2)',
  'astro-strider': 'var(--cyan)',
  'beat-drop': 'var(--accent-1)'
};

function generateAvatar(scoreHash) {
  const seed = parseInt(scoreHash) || 42;
  const color1 = `hsl(${seed % 360}, 75%, 55%)`;
  const color2 = `hsl(${(seed + 120) % 360}, 80%, 65%)`;
  
  let gridSvg = '';
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 5; y++) {
      const bit = ((seed >> (x * 5 + y)) & 1) === 1;
      if (bit) {
        gridSvg += `<rect x="${12 + x * 8}" y="${12 + y * 8}" width="8" height="8" fill="${color1}" rx="1.5"/>`;
        if (x < 2) {
          gridSvg += `<rect x="${12 + (4 - x) * 8}" y="${12 + y * 8}" width="8" height="8" fill="${color1}" rx="1.5"/>`;
        }
      }
    }
  }

  return `
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
      <circle cx="32" cy="32" r="26" stroke="${color2}" stroke-width="1" stroke-dasharray="3 3" opacity="0.4"/>
      ${gridSvg || `<rect x="20" y="20" width="24" height="24" fill="${color1}" rx="4"/>`}
    </svg>
  `;
}

function getPlayerTitle(gamesCount, scores) {
  if (gamesCount === 19 && scores.every(s => s.best > 0)) {
    return "CHEAT MASTER";
  }
  if (gamesCount >= 16) return "Champion";
  if (gamesCount >= 9) return "Veteran";
  if (gamesCount >= 4) return "Contender";
  if (gamesCount >= 1) return "Recruit";
  return "Rookie";
}

class LeaderboardUI {
  constructor() {
    this.container = document.getElementById('rankings-container');
    this.tabs = document.querySelectorAll('.lb-tab');
    this.currentTab = 'my-scores';
    
    this.gamesData = window.GAMES || [];
    this.icons = window.GAME_ICONS || {};
    
    this.init();
  }

  init() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentTab = e.target.dataset.tab;
        this.render();
      });
    });

    this.render();

    // Asynchronously fetch stats from Supabase to sync and re-render Hall of Fame
    const uid = localStorage.getItem('cheatLabz_uid');
    if (uid) {
      const API_URL = 'http://localhost:4000'; // Fallback to localhost port 4000
      fetch(`${API_URL}/api/stats/user?uid=${encodeURIComponent(uid)}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success && resData.data) {
            const remoteStats = resData.data.stats;
            
            // Merge stats to local storage
            remoteStats.forEach(stat => {
              const currentLocal = Storage.get(stat.game_id, null);
              let localRecord = { score: 0, runs: 0, history: [], highestLevel: 1 };
              if (currentLocal && typeof currentLocal === 'object') {
                localRecord = currentLocal;
              } else if (typeof currentLocal === 'number') {
                localRecord = { score: currentLocal, runs: 1, history: [currentLocal], highestLevel: 1 };
              }

              localRecord.score = Math.max(localRecord.score, stat.best_score);
              localRecord.runs = Math.max(localRecord.runs, stat.total_runs);
              localRecord.highestLevel = Math.max(localRecord.highestLevel, stat.highest_level);
              Storage.set(stat.game_id, localRecord);
            });

            // Sync coins
            if (typeof resData.data.coins === 'number') {
              const coinsObj = Storage.get('coins', { total: 0, allTimeEarned: 0, history: [] });
              coinsObj.total = resData.data.coins;
              Storage.set('coins', coinsObj);
              const coinEl = document.getElementById('coin-count');
              if (coinEl) coinEl.textContent = coinsObj.total;
            }
            // Sync streaks
            if (typeof resData.data.streak === 'number') {
              const streakObj = Storage.get('streak', { current: 0, longest: 0, lastVisit: '', totalDays: 0 });
              streakObj.current = resData.data.streak;
              Storage.set('streak', streakObj);
            }

            // Re-render the leaderboard views with the newly updated stats
            this.render();
          }
        })
        .catch(err => console.warn('[Supabase] Failed to sync remote stats for Hall of Fame:', err));
    }
  }

  getScores() {
    let scores = [];
    for(let i=0; i<localStorage.length; i++) {
      const key = localStorage.key(i);
      if(key.startsWith('cheatLabz_')) {
        const rawGameId = key.replace('cheatLabz_', '');
        if (['soundEnabled', 'theme', 'animEnabled', 'coins', 'streak', 'submitted_ideas'].includes(rawGameId) || rawGameId.startsWith('daily_') || rawGameId.startsWith('bounty_') || rawGameId.startsWith('unlocked_') || rawGameId.startsWith('gauntlet_')) continue;
        
        try {
          const val = JSON.parse(localStorage.getItem(key));
          if (val && (typeof val.score === 'number' || typeof val === 'number')) {
            const scoreVal = typeof val === 'number' ? val : val.score;
            const runsVal = typeof val === 'number' ? 1 : (val.runs || 1);
            const lastPlayedVal = typeof val === 'number' ? Date.now() : (val.lastPlayed || Date.now());
            const trendVal = typeof val === 'number' ? 'flat' : (val.trend || 'flat');
            const historyVal = typeof val === 'number' ? [val] : (val.history || [val.score]);

            const gameObj = this.gamesData.find(g => g.id === rawGameId) || 
                            this.gamesData.find(g => g.name.toLowerCase() === rawGameId.toLowerCase()) ||
                            this.gamesData.find(g => g.id === rawGameId.toLowerCase().replace(/\s+/g, '-'));

            if (gameObj) {
              scores.push({
                id: gameObj.id,
                name: gameObj.name,
                category: gameObj.category || 'ARCADE',
                best: scoreVal,
                runs: runsVal,
                lastPlayed: lastPlayedVal,
                trend: trendVal,
                history: historyVal
              });
            }
          }
        } catch(e) {}
      }
    }
    return scores.sort((a,b) => b.best - a.best);
  }

  formatDate(timestamp) {
    if (!timestamp) return '—';
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  renderProfileCard(scores) {
    const profileMount = document.getElementById('profile-card-mount');
    if (!profileMount) return;

    const totalRuns = scores.reduce((acc, curr) => acc + curr.runs, 0);
    const streak = getStreak().current;
    const coins = getCoins().total;
    const gamesPlayed = scores.length;
    
    const totalScoreSum = scores.reduce((acc, curr) => acc + curr.best, 0);
    const scoreHash = String(totalScoreSum + totalRuns + coins + streak);
    const avatarSvg = generateAvatar(scoreHash);
    const playerTitle = getPlayerTitle(gamesPlayed, scores);

    profileMount.innerHTML = `
      <div class="profile-card">
        <div class="profile-avatar">${avatarSvg}</div>
        <div class="profile-info">
          <div class="profile-name">PLAYER ONE</div>
          <div class="profile-title">${playerTitle}</div>
        </div>
        <div class="profile-stats-row">
          <div class="pstat">
            <strong>${streak}d</strong>
            <span>Day Streak</span>
          </div>
          <div class="pstat">
            <strong>${coins.toLocaleString()}</strong>
            <span>Total AP</span>
          </div>
          <div class="pstat">
            <strong>${totalRuns}</strong>
            <span>Total Runs</span>
          </div>
          <div class="pstat">
            <strong>${gamesPlayed} / 19</strong>
            <span>Games Played</span>
          </div>
        </div>
      </div>
    `;
  }

  renderBadges(scores) {
    const badgesMount = document.getElementById('badges-row-mount');
    if (!badgesMount) return;
    
    const totalRuns = scores.reduce((acc, curr) => acc + curr.runs, 0);
    const streak = getStreak().current;
    
    let arenaHistoryCount = 0;
    try {
      arenaHistoryCount = JSON.parse(localStorage.getItem('cheatlabz_arena_history') || '[]').length;
    } catch(e) {}

    const list = [
      { id: 'first-blood', name: 'First Blood', desc: 'Played first game ever', earned: scores.length >= 1 },
      { id: 'hat-trick', name: 'Hat Trick', desc: 'Played 3 different games', earned: scores.length >= 3 },
      { id: 'streak-starter', name: 'Streak Starter', desc: '3 day streak', earned: streak >= 3 },
      { id: 'week-warrior', name: 'Week Warrior', desc: '7 day streak', earned: streak >= 7 },
      { id: 'arena-initiate', name: 'Arena Initiate', desc: 'Completed first arena', earned: arenaHistoryCount >= 1 },
      { id: 'high-roller', name: 'High Roller', desc: 'Scored 1000+ in any game', earned: scores.some(s => s.best >= 1000) },
      { id: 'completionist', name: 'Completionist', desc: 'Played all 19 games', earned: scores.length === 19 },
      { id: 'speed-demon', name: 'Speed Demon', desc: 'Under 15s in any timed game', earned: localStorage.getItem('cheatLabz_badge_speed_demon') === 'true' || localStorage.getItem('cheatLabz_reflex-rush_runs') > 0 },
      { id: 'perfect-stack', name: 'Perfect Stack', desc: 'Perfect drop in Stack Blitz', earned: localStorage.getItem('cheatLabz_badge_perfect_stack') === 'true' || localStorage.getItem('cheatLabz_stack-blitz_runs') > 0 },
      { id: 'pixel-ghost', name: 'Pixel Ghost', desc: 'Survived 30s in Pixel Dodge', earned: localStorage.getItem('cheatLabz_badge_pixel_ghost') === 'true' || localStorage.getItem('cheatLabz_pixel-dodge_runs') > 0 }
    ];

    badgesMount.innerHTML = `
      <div class="badges-container-row">
        <div class="badges-title">ACHIEVEMENT BADGES</div>
        <div class="badges-row">
          ${list.map(b => {
            const iconSvg = BADGE_ICONS[b.id] || '🏆';
            const stateClass = b.earned ? '' : 'locked';
            const tooltipText = b.earned ? `${b.name}: ${b.desc} (Unlocked!)` : `${b.name}: ${b.desc} (Locked - Keep playing to unlock)`;
            return `
              <div class="badge-item ${stateClass}">
                <div class="badge-circle">${iconSvg}</div>
                <div class="badge-label">${b.name}</div>
                <div class="badge-tooltip">${tooltipText}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    if (window.gsap) {
      gsap.fromTo('.badge-item', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'back.out(1.5)', delay: 0.1 });
    }
  }

  getImprovement(best, history) {
    if (!history || history.length <= 1) {
      return `<span style="color: var(--accent-1); font-weight: bold; font-size: 11px;">★ First run!</span>`;
    }
    const prevScores = history.slice(0, -1);
    const prevBest = Math.max(...prevScores);
    const diff = best - prevBest;
    if (diff > 0) {
      return `<span style="color: #00d4aa; font-weight: bold; font-size: 11px;">↑ +${diff} pts</span>`;
    }
    return `<span style="color: var(--text-muted); font-size: 11px;">= No change</span>`;
  }

  renderMyScores(scores) {
    if (scores.length === 0) {
      return `
        <div class="lb-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
          </svg>
          <h3>No records yet.</h3>
          <p>Play any game to see your scores here.</p>
          <button onclick="window.location.href='games.html'" style="border:none; border-radius:4px; font-weight:bold; cursor:pointer;">BROWSE GAMES</button>
        </div>
      `;
    }

    const played = [];
    const unplayed = [];

    this.gamesData.forEach(game => {
      const scoreObj = scores.find(s => s.id === game.id);
      if (scoreObj) {
        played.push(scoreObj);
      } else {
        unplayed.push(game);
      }
    });

    let html = `
      <table class="lb-table">
        <thead>
          <tr>
            <th>RANK</th>
            <th>GAME</th>
            <th>BEST SCORE</th>
            <th>RUNS</th>
            <th>LAST PLAYED</th>
            <th>IMPROVEMENT</th>
          </tr>
        </thead>
        <tbody id="lb-table-body">
    `;

    played.forEach((s, i) => {
      const rank = i + 1;
      let rankDisplay = rank;
      let rankRowClass = '';
      if (rank === 1) {
        rankDisplay = TROPHIES[1];
        rankRowClass = 'rank-1-row';
      } else if (rank === 2) {
        rankDisplay = TROPHIES[2];
        rankRowClass = 'rank-2-row';
      } else if (rank === 3) {
        rankDisplay = TROPHIES[3];
        rankRowClass = 'rank-3-row';
      }

      const scoreColor = GAME_COLORS[s.id] || 'var(--accent-1)';
      const impHtml = this.getImprovement(s.best, s.history);

      html += `
        <tr class="lb-row ${rankRowClass}" onclick="window.openGame('${s.id}')">
          <td class="lb-rank" style="text-align: center; width: 60px;">${rankDisplay}</td>
          <td class="lb-game">
            <div class="lb-game-icon">${this.icons[s.id] || ''}</div>
            <div>
              <div class="lb-game-name">${s.name}</div>
              <div class="lb-game-cat">${s.category}</div>
            </div>
          </td>
          <td class="lb-score" style="color: ${scoreColor}; font-size: 18px;">${s.best.toLocaleString()}</td>
          <td class="lb-runs">${s.runs}</td>
          <td class="lb-date">${this.formatDate(s.lastPlayed)}</td>
          <td class="lb-improvement">${impHtml}</td>
        </tr>
      `;
    });

    if (unplayed.length > 0) {
      unplayed.forEach(g => {
        html += `
          <tr class="lb-row unplayed-row" style="opacity: 0.45; cursor: default;">
            <td class="lb-rank" style="text-align: center;">—</td>
            <td class="lb-game">
              <div class="lb-game-icon">${this.icons[g.id] || ''}</div>
              <div>
                <div class="lb-game-name">${g.name}</div>
                <div class="lb-game-cat">${g.category || 'ARCADE'}</div>
              </div>
            </td>
            <td class="lb-score" style="color: var(--text-muted); font-size: 13px;">Not played yet</td>
            <td class="lb-runs">0</td>
            <td class="lb-date">—</td>
            <td>
              <button onclick="window.openGame('${g.id}')" style="background: var(--accent-1); color: #fff; border: none; padding: 6px 12px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: bold; cursor: pointer;">PLAY</button>
            </td>
          </tr>
        `;
      });
    }

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  renderGameStats(scores) {
    const statsList = this.gamesData.map(g => {
      const scoreObj = scores.find(s => s.id === g.id);
      const runs = scoreObj ? scoreObj.runs : 0;
      const best = scoreObj ? scoreObj.best : 0;
      
      let avg = 0;
      let history = [];
      try {
        const raw = localStorage.getItem(`cheatLabz_${g.id}`);
        if (raw) {
          const rec = JSON.parse(raw);
          history = rec.history || [];
          if (history.length > 0) {
            avg = Math.round(history.reduce((a,b) => a+b, 0) / history.length);
          }
        }
      } catch(e) {}
      
      return {
        id: g.id,
        name: g.name,
        category: g.category,
        best,
        avg,
        runs
      };
    });

    statsList.sort((a, b) => b.runs - a.runs);
    const mostPlayed = statsList[0] && statsList[0].runs > 0 ? statsList[0].name : 'None';

    let html = `
      <div class="lb-stats-header">Your most played: ${mostPlayed.toUpperCase()}</div>
      <div class="lb-all-games">
    `;

    statsList.forEach(g => {
      const timeSpentSec = g.runs * 60;
      const timeDisplay = timeSpentSec >= 60 ? `${Math.floor(timeSpentSec/60)}m` : `${timeSpentSec}s`;
      const isPlayed = g.runs > 0;

      html += `
        <div class="lb-game-card ${isPlayed ? '' : 'never-played'}">
          <div class="card-header-row" style="display: flex; gap: 12px; align-items: center; margin-bottom: 16px;">
            <div class="lgc-icon" style="width: 32px; height: 32px; color: var(--accent-1); margin: 0;">${this.icons[g.id] || ''}</div>
            <div style="font-family: 'Press Start 2P', monospace; font-size: 10px; color: #fff;">${g.name}</div>
          </div>
          <div class="lgc-stat-group">
            <div class="lgc-stat-item">
              <span>Best</span>
              <strong>${isPlayed ? g.best.toLocaleString() : '—'}</strong>
            </div>
            <div class="lgc-stat-item">
              <span>Avg</span>
              <strong>${isPlayed ? g.avg.toLocaleString() : '—'}</strong>
            </div>
            <div class="lgc-stat-item">
              <span>Runs</span>
              <strong>${g.runs}</strong>
            </div>
            <div class="lgc-stat-item">
              <span>Time Spent</span>
              <strong>${isPlayed ? timeDisplay : '—'}</strong>
            </div>
          </div>
          <button class="lgc-play" onclick="window.openGame('${g.id}')" style="margin-top: 16px;">PLAY</button>
        </div>
      `;
    });

    html += `</div>`;
    return html;
  }

  renderCoinHistory() {
    const coinsData = getCoins();
    const history = coinsData.history || [];
    
    const totalEarned = history.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);

    let html = `
      <div class="history-summary">
        <div>
          <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Historical Total Earnings</div>
          <div class="history-summary-val">${totalEarned.toLocaleString()} AP</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 4px;">Current Balance</div>
          <div class="history-summary-val" style="color: var(--cyan);">${coinsData.total.toLocaleString()} AP</div>
        </div>
      </div>
    `;

    if (history.length === 0) {
      html += `
        <div style="text-align: center; padding: 48px; color: var(--text-muted); font-size: 13px;">
          No transactions recorded yet. Keep playing games to earn AP!
        </div>
      `;
      return html;
    }

    html += `
      <table class="history-table">
        <thead>
          <tr>
            <th>DATE</th>
            <th>REASON</th>
            <th>AMOUNT</th>
          </tr>
        </thead>
        <tbody>
    `;

    history.slice(0, 50).forEach(t => {
      const typeClass = t.amount > 0 ? 'earn' : 'spend';
      const prefix = t.amount > 0 ? '+' : '';
      html += `
        <tr>
          <td style="color: var(--text-muted); font-size: 12px; font-family: 'JetBrains Mono', monospace;">${t.date || '—'}</td>
          <td style="color: #fff; font-weight: 600; font-size: 13px;">${t.reason || 'Activity reward'}</td>
          <td class="history-amount ${typeClass}" style="font-size: 14px;">${prefix}${t.amount} AP</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  renderDangerZone() {
    const dangerMount = document.getElementById('danger-zone-mount');
    if (!dangerMount) return;
    
    dangerMount.innerHTML = `
      <!-- Community Link -->
      <div style="background: rgba(255, 255, 255, 0.01); border: 1px solid rgba(255, 255, 255, 0.04); border-radius: var(--radius-md); padding: 24px; text-align: center; margin-top: 40px; margin-bottom: 24px;">
        <h3 style="font-family: 'Press Start 2P', monospace; font-size: 10px; margin-bottom: 12px; color: var(--accent-2); text-shadow: 0 0 10px rgba(108,99,255,0.3);">HAVE A GAME IDEA?</h3>
        <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 16px; font-family: 'JetBrains Mono', monospace;">We build modules suggested by the community. Tell us what you want to play next!</p>
        <a href="ideas.html" style="font-family: 'JetBrains Mono', monospace; font-size: 12px; background: var(--accent-1); color: #fff; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-weight: bold; display: inline-block; cursor: pointer; border: none; box-shadow: var(--shadow-glow-purple);">SUBMIT IDEA</a>
      </div>

      <div class="danger-zone-section">
        <div class="danger-zone-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          DANGER ZONE
        </div>
        <div class="danger-zone-desc">Perform game scoring or total profile resets. This action is irreversible.</div>
        <div class="danger-zone-actions">
          <button id="btn-reset-scores" class="btn-danger">RESET GAME SCORES</button>
          <button id="btn-reset-everything" class="btn-danger">RESET EVERYTHING</button>
        </div>
      </div>
    `;

    const resetScoresBtn = document.getElementById('btn-reset-scores');
    const resetAllBtn = document.getElementById('btn-reset-everything');
    
    if (resetScoresBtn) {
      let clickCount = 0;
      let timer;
      resetScoresBtn.onclick = () => {
        clickCount++;
        if (clickCount === 1) {
          resetScoresBtn.textContent = 'DOUBLE CLICK TO CONFIRM';
          resetScoresBtn.classList.add('confirming');
          timer = setTimeout(() => {
            clickCount = 0;
            resetScoresBtn.textContent = 'RESET GAME SCORES';
            resetScoresBtn.classList.remove('confirming');
          }, 3000);
        } else if (clickCount === 2) {
          clearTimeout(timer);
          this.gamesData.forEach(g => {
            localStorage.removeItem(`cheatLabz_${g.id}`);
            localStorage.removeItem(`cheatLabz_${g.id}_runs`);
          });
          localStorage.removeItem('cheatlabz_arena_history');
          showToast('Game scores and runs have been reset.', 'info');
          clickCount = 0;
          resetScoresBtn.textContent = 'RESET GAME SCORES';
          resetScoresBtn.classList.remove('confirming');
          this.render();
        }
      };
    }

    if (resetAllBtn) {
      let clickCount = 0;
      let timer;
      resetAllBtn.onclick = () => {
        clickCount++;
        if (clickCount === 1) {
          resetAllBtn.textContent = 'DOUBLE CLICK TO RESET ALL';
          resetAllBtn.classList.add('confirming');
          timer = setTimeout(() => {
            clickCount = 0;
            resetAllBtn.textContent = 'RESET EVERYTHING';
            resetAllBtn.classList.remove('confirming');
          }, 3000);
        } else if (clickCount === 2) {
          clearTimeout(timer);
          Object.keys(localStorage)
            .filter(k => k.toLowerCase().startsWith('cheatlabz'))
            .forEach(k => localStorage.removeItem(k));
          
          showToast('All storage data has been cleared.', 'info');
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }
      };
    }
  }

  render() {
    if (!this.container) return;

    const scores = this.getScores();
    this.renderProfileCard(scores);
    this.renderBadges(scores);
    this.renderDangerZone();

    if (this.currentTab === 'my-scores') {
      this.container.innerHTML = this.renderMyScores(scores);
      if (document.querySelectorAll('.lb-row').length > 0 && window.gsap) {
        gsap.from('.lb-row', {
          opacity: 0, x: -20,
          duration: 0.3,
          stagger: 0.04,
          ease: 'power2.out'
        });
      }
    } else if (this.currentTab === 'game-stats') {
      this.container.innerHTML = this.renderGameStats(scores);
      if (document.querySelectorAll('.lb-game-card').length > 0 && window.gsap) {
        gsap.from('.lb-game-card', {
          opacity: 0, y: 20,
          duration: 0.3,
          stagger: 0.03,
          ease: 'power2.out'
        });
      }
    } else if (this.currentTab === 'coin-history') {
      this.container.innerHTML = this.renderCoinHistory();
      if (document.querySelectorAll('.history-table tbody tr').length > 0 && window.gsap) {
        gsap.from('.history-table tbody tr', {
          opacity: 0, x: 20,
          duration: 0.3,
          stagger: 0.02,
          ease: 'power2.out'
        });
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LeaderboardUI();
});
