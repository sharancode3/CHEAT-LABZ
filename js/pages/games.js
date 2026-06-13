import { GAMES, getGamesByCategory } from '../core/catalog.js';
import { Storage } from '../core/storage.js';

const gameLibrary = document.getElementById('gameLibrary') || document.querySelector('[id="gameGrid"]');
const searchInput = document.querySelector('input[type="search"]');
const categoryButtons = document.querySelectorAll('.pill:not(.is-active) , .pill.is-active');
const sortSelect = document.querySelector('select[aria-label="Sort games"]') || document.querySelector('.select-shell .select');

let state = {
  category: 'all',
  query: '',
  sort: 'trending',
  games: [...GAMES],
};

function sortGames(games, criterion) {
  const sorted = [...games];

  if (criterion === 'trending') {
    return sorted.sort((left, right) => {
      const leftTrending = Number(left.tags.includes('trending')) || 0;
      const rightTrending = Number(right.tags.includes('trending')) || 0;
      return rightTrending - leftTrending || left.order - right.order;
    });
  }

  if (criterion === 'new') {
    return sorted.sort((left, right) => {
      const leftNew = Number(left.tags.includes('new')) || 0;
      const rightNew = Number(right.tags.includes('new')) || 0;
      return rightNew - leftNew || left.order - right.order;
    });
  }

  if (criterion === 'a-z') {
    return sorted.sort((left, right) => left.title.localeCompare(right.title));
  }

  if (criterion === 'easiest') {
    const order = { easy: 0, medium: 1, hard: 2 };
    return sorted.sort((left, right) => order[left.difficulty] - order[right.difficulty]);
  }

  if (criterion === 'hardest') {
    const order = { easy: 2, medium: 1, hard: 0 };
    return sorted.sort((left, right) => order[left.difficulty] - order[right.difficulty]);
  }

  return sorted;
}

function filterGames() {
  let filtered = state.category === 'all' ? [...GAMES] : getGamesByCategory(state.category);

  if (state.query.length > 0) {
    const q = state.query.toLowerCase();
    filtered = filtered.filter((game) => game.title.toLowerCase().includes(q) || game.short.toLowerCase().includes(q));
  }

  filtered = sortGames(filtered, state.sort);
  state.games = filtered;
  return filtered;
}

function renderCard(game) {
  const bestScore = Storage.getBestScore(game.id);
  const stats = Storage.getGameStats(game.id);

  return `
    <article class="card game-card fade-in">
      <div class="game-meta">
        <span class="badge">${game.category}</span>
        ${game.tags.includes('trending') ? '<span class="badge badge--warning">Trending</span>' : ''}
        ${game.tags.includes('new') ? '<span class="badge badge--accent">New</span>' : ''}
      </div>
      <h3 class="game-title">${game.title}</h3>
      <p class="game-desc">${game.short}</p>
      ${stats.runs > 0 ? `<p class="muted">Best: ${bestScore || '—'} · Runs: ${stats.runs}</p>` : ''}
      <div class="game-footer">
        <span class="badge">${game.difficulty}</span>
        <a class="button button--primary" href="./games.html#${game.id}">Play Now</a>
      </div>
    </article>
  `;
}

function renderGames() {
  if (!gameLibrary) {
    return;
  }

  const filtered = filterGames();

  if (filtered.length === 0) {
    gameLibrary.innerHTML = `
      <div class="empty-state">
        <p class="page-title" style="font-size:1.2rem;">No games match that filter.</p>
        <p class="body-copy">Try a different search or category.</p>
      </div>
    `;
    return;
  }

  gameLibrary.innerHTML = filtered.map((game) => renderCard(game)).join('');

  const countEl = document.getElementById('gameCount');
  if (countEl) {
    countEl.textContent = `Showing ${filtered.length} game${filtered.length === 1 ? '' : 's'}`;
  }
}

function attachListeners() {
  categoryButtons.forEach((button) => {
    button.addEventListener('click', () => {
      categoryButtons.forEach((btn) => btn.classList.remove('is-active'));
      button.classList.add('is-active');
      state.category = button.textContent.toLowerCase() === 'all' ? 'all' : button.textContent.toLowerCase();
      renderGames();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      state.query = event.target.value.trim().toLowerCase();
      renderGames();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (event) => {
      const value = event.target.value || 'trending';
      state.sort = value.toLowerCase();
      renderGames();
    });
  }

  const shuffleBtn = document.querySelector('.button--secondary:nth-of-type(n+3)');
  if (shuffleBtn && shuffleBtn.textContent.includes('Shuffle')) {
    shuffleBtn.addEventListener('click', () => {
      const current = state.games;
      for (let index = current.length - 1; index > 0; index -= 1) {
        const random = Math.floor(Math.random() * (index + 1));
        [current[index], current[random]] = [current[random], current[index]];
      }

      state.games = current;
      if (gameLibrary) {
        gameLibrary.innerHTML = current.map((game) => renderCard(game)).join('');
      }
    });
  }
}

function init() {
  renderGames();
  attachListeners();
}

init();
