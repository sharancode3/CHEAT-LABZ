import { GAMES, getGameById } from '../core/catalog.js';
import { Storage } from '../core/storage.js';

const dailyCards = document.getElementById('dailyCards');
const dailyCountdown = document.getElementById('dailyCountdown');
const featuredRow = document.getElementById('featuredRow');

function todayUtcKey() {
  return Storage.todayUtcKey();
}

function seededIndex(seed, salt) {
  const value = `${seed}:${salt}`;
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash) % GAMES.length;
}

function getDailyGames() {
  const seed = todayUtcKey();
  const indices = [
    seededIndex(seed, 'alpha'),
    seededIndex(seed, 'beta'),
    seededIndex(seed, 'gamma'),
  ];

  return [...new Set(indices)].map((index) => GAMES[index]).filter(Boolean);
}

function getDailyChallengeText(game, index) {
  const templates = [
    `Score 500 in ${game.title}.`,
    `Reach a clean streak in ${game.title}.`,
    `Finish one full run in ${game.title}.`,
  ];

  return templates[index % templates.length];
}

function renderDailyChallenges() {
  if (!dailyCards) {
    return;
  }

  const completed = Storage.getDailyStatus();
  const games = getDailyGames();

  dailyCards.innerHTML = games
    .map((game, index) => {
      const challengeId = `${todayUtcKey()}_${game.id}`;
      const status = completed[challengeId] ? 'Completed' : 'Locked';
      const statusClass = completed[challengeId] ? 'badge--accent' : 'badge--danger';

      return `
        <article class="card game-card">
          <div class="game-meta">
            <span class="badge">${game.category}</span>
            <span class="badge">${game.difficulty}</span>
          </div>
          <h3 class="game-title">${game.title}</h3>
          <p class="game-desc">${getDailyChallengeText(game, index)}</p>
          <div class="game-footer">
            <span class="badge ${statusClass}">${status}</span>
            <a class="button button--primary" href="./games.html#${game.id}">Play Challenge</a>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderFeatured() {
  if (!featuredRow) {
    return;
  }

  const featured = GAMES.filter((game) => game.tags.includes('trending') || game.tags.includes('chill')).slice(0, 3);

  featuredRow.innerHTML = featured
    .map((game) => `
      <article class="card game-card">
        <div class="game-meta">
          <span class="badge">${game.tags[0] || game.category}</span>
          <span class="badge">${game.category}</span>
        </div>
        <h3 class="game-title">${game.title}</h3>
        <p class="game-desc">${game.short}</p>
        <div class="game-footer">
          <span class="badge badge--accent">Best for quick runs</span>
          <a class="button button--primary" href="./games.html#${game.id}">Play Now</a>
        </div>
      </article>
    `)
    .join('');
}

function renderStats() {
  const statsCards = document.querySelectorAll('.home-stats-strip .stat-card');
  if (statsCards.length < 5) {
    return;
  }

  const mostPlayed = Storage.getMostPlayedGame();
  const favoriteCategory = Storage.getFavoriteCategory();
  const lastPlayed = Storage.getLastPlayedGame();
  const bestStreak = Storage.getBestStreak();
  const totalRuns = Storage.listGameStats().reduce((total, item) => total + Number(item.runs || 0), 0);

  statsCards[0].querySelector('.stat-value').textContent = mostPlayed ? (getGameById(mostPlayed.gameId)?.title || '—') : '—';
  statsCards[1].querySelector('.stat-value').textContent = bestStreak > 0 ? String(bestStreak) : '—';
  statsCards[2].querySelector('.stat-value').textContent = String(totalRuns);
  statsCards[3].querySelector('.stat-value').textContent = favoriteCategory?.category || '—';
  statsCards[4].querySelector('.stat-value').textContent = lastPlayed ? (getGameById(lastPlayed.gameId)?.title || '—') : '—';
}

function updateCountdown() {
  if (!dailyCountdown) {
    return;
  }

  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(24, 0, 0, 0);
  const total = Math.max(0, next.getTime() - now.getTime());
  const hours = String(Math.floor(total / 3_600_000)).padStart(2, '0');
  const minutes = String(Math.floor((total % 3_600_000) / 60_000)).padStart(2, '0');
  const seconds = String(Math.floor((total % 60_000) / 1000)).padStart(2, '0');
  dailyCountdown.textContent = `Resets in ${hours}:${minutes}:${seconds}`;
}

function autoScrollFeatured() {
  if (!featuredRow) {
    return;
  }

  let direction = 1;
  window.setInterval(() => {
    const maxScrollLeft = featuredRow.scrollWidth - featuredRow.clientWidth;
    if (maxScrollLeft <= 0) {
      return;
    }

    if (featuredRow.scrollLeft >= maxScrollLeft - 8) {
      direction = -1;
    } else if (featuredRow.scrollLeft <= 8) {
      direction = 1;
    }

    featuredRow.scrollBy({ left: direction * 24, behavior: 'smooth' });
  }, 5000);
}

function init() {
  renderDailyChallenges();
  renderFeatured();
  renderStats();
  updateCountdown();
  autoScrollFeatured();

  window.setInterval(() => {
    updateCountdown();
  }, 1000);
}

init();
