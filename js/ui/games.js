import { GAME_ICONS } from '../../assets/icons/game-icons.js';
import { isGameLocked, getCoins, formatCoins, Storage } from '../core/storage.js';
import { showToast } from '../core/notifications.js';

function getGameIcon(gameId) {
  return GAME_ICONS[gameId] || GAME_ICONS['default'] || '🎮';
}

function getScores(gameId) {
  try {
    const raw = localStorage.getItem(`cheatLabz_${gameId}`);
    if (!raw) return [];
    const record = JSON.parse(raw);
    if (record && typeof record === 'object') {
      if (Array.isArray(record.history)) {
        return [...record.history].sort((a, b) => b - a);
      }
      if (typeof record.score === 'number') {
        return [record.score];
      }
    }
    if (typeof record === 'number') {
      return [record];
    }
    return [];
  } catch(e) {
    return [];
  }
}

function getRuns(gameId) {
  try {
    const raw = localStorage.getItem(`cheatLabz_${gameId}`);
    if (!raw) return 0;
    const record = JSON.parse(raw);
    if (record && typeof record === 'object') {
      return record.runs || (record.history ? record.history.length : 0);
    }
    if (typeof record === 'number') {
      return 1;
    }
    return 0;
  } catch(e) {
    return 0;
  }
}

class GamesGrid {
  constructor() {
    this.grid = document.getElementById('games-grid');
    this.searchInput = document.getElementById('search-input');
    this.sortSelect = document.getElementById('sort-select');
    this.shuffleBtn = document.getElementById('shuffle-btn');
    this.filterTabsContainer = document.getElementById('filter-tabs-container');
    this.showingText = document.getElementById('showing-text');

    this.currentFilter = 'all';
    this.currentSearch = '';
    this.currentSort = 'pop';
    this.games = window.GAMES || [];

    this.init();
  }

  init() {
    if (!this.grid) return;
    this.updateGlobalStats();
    this.renderFilterTabs();

    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        this.currentSearch = e.target.value.toLowerCase();
        this.renderWithFilterAnim();
      });
    }

    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.renderWithFilterAnim();
      });
    }

    if (this.shuffleBtn) {
      this.shuffleBtn.addEventListener('click', () => {
        this.renderWithShuffleAnim();
      });
    }

    // Initial DOM build
    this.buildDOM();
    this.render();
    
    gsap.from('.game-card', {
      y: 32,
      opacity: 0,
      duration: 0.4,
      stagger: 0.06,
      ease: 'power2.out',
      clearProps: 'all'
    });
  }

  updateGlobalStats() {
    let totalRuns = 0;
    let bestScore = 0;
    this.games.forEach(g => {
      const scores = getScores(g.id);
      totalRuns += getRuns(g.id);
      if (scores.length > 0) {
        if (scores[0] > bestScore) bestScore = scores[0];
      }
    });

    const elGames = document.getElementById('total-games-stat');
    const elRuns = document.getElementById('total-runs-stat');
    const elBest = document.getElementById('best-score-stat');

    if (elGames) elGames.innerText = this.games.length;
    if (elRuns) elRuns.innerText = totalRuns.toLocaleString();
    if (elBest) elBest.innerText = bestScore.toLocaleString();
  }

  renderFilterTabs() {
    if (!this.filterTabsContainer) return;
    const cats = ['all', ...new Set(this.games.map(g => (g.category || 'arcade').toLowerCase()))];
    
    this.filterTabsContainer.innerHTML = cats.map(cat => {
      const count = cat === 'all' ? this.games.length : this.games.filter(g => (g.category || 'arcade').toLowerCase() === cat).length;
      const label = cat.toUpperCase();
      const active = this.currentFilter === cat ? 'active' : '';
      return `<button class="filter-tab ${active}" data-filter="${cat}">${label} <span class="count">${count}</span></button>`;
    }).join('');

    const tabs = this.filterTabsContainer.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        const btn = e.currentTarget;
        btn.classList.add('active');
        this.currentFilter = btn.dataset.filter;
        this.renderWithFilterAnim();
      });
    });
  }

  getFilteredGames() {
    let list = [...this.games];

    if (this.currentFilter !== 'all') {
      list = list.filter(g => (g.category || 'arcade').toLowerCase() === this.currentFilter);
    }

    if (this.currentSearch) {
      list = list.filter(g => 
        g.name.toLowerCase().includes(this.currentSearch) || 
        g.id.toLowerCase().includes(this.currentSearch)
      );
    }

    if (this.currentSort === 'pop') {
      list.sort((a, b) => b.id.length - a.id.length);
    } else if (this.currentSort === 'new') {
      list.sort((a, b) => {
        const aNew = a.tags?.includes('new') || a.tags?.includes('NEW') ? 1 : 0;
        const bNew = b.tags?.includes('new') || b.tags?.includes('NEW') ? 1 : 0;
        return bNew - aNew; // Pushes matching new additions to top of card list
      });
    } else if (this.currentSort === 'az') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (this.currentSort === 'easy') {
      const dmap = { 'EASY': 1, 'MEDIUM': 2, 'HARD': 3 };
      list.sort((a, b) => (dmap[a.difficulty] || 1) - (dmap[b.difficulty] || 1));
    } else if (this.currentSort === 'hard') {
      const dmap = { 'EASY': 1, 'MEDIUM': 2, 'HARD': 3 };
      list.sort((a, b) => (dmap[b.difficulty] || 1) - (dmap[a.difficulty] || 1));
    }

    return list;
  }

  renderWithFilterAnim() {
    gsap.to('.game-card', {
      opacity: 0,
      y: -8,
      duration: 0.15,
      onComplete: () => {
        this.render();
        gsap.fromTo('.game-card', { opacity: 0, y: 16 }, {
          opacity: 1, y: 0, duration: 0.3, stagger: 0.04, clearProps: 'all'
        });
      }
    });
  }

  renderWithShuffleAnim() {
    gsap.to('.game-card', {
      scale: 0.95,
      rotation: () => (Math.random() - 0.5) * 6,
      opacity: 0,
      duration: 0.2,
      onComplete: () => {
        const list = this.getFilteredGames();
        for (let i = list.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [list[i], list[j]] = [list[j], list[i]];
        }
        this.renderList(list);
        gsap.fromTo('.game-card', { scale: 0.95, opacity: 0, rotation: 0 }, {
          scale: 1, opacity: 1, duration: 0.3, stagger: 0.04, clearProps: 'all', ease: 'back.out(1.5)'
        });
      }
    });
  }

  render() {
    this.applyFilters(this.getFilteredGames());
  }

  buildDOM() {
    this.grid.innerHTML = this.games.map(g => {
      const icon = getGameIcon(g.id);
      const scores = getScores(g.id);
      const best = scores.length > 0 ? scores[0].toLocaleString() : '--';
      const runs = getRuns(g.id);
      
      let tooltipRows = '';
      if (scores.length === 0) {
        tooltipRows = '<div class="tooltip-empty">No scores yet</div>';
      } else {
        const top3 = scores.slice(0, 3);
        const ranks = ['🥇', '🥈', '🥉'];
        const classes = ['rank-1', 'rank-2', 'rank-3'];
        top3.forEach((s, i) => {
          tooltipRows += `
            <div class="tooltip-row">
              <span class="rank ${classes[i]}">${ranks[i]}</span>
              <span class="name">You</span>
              <span class="score ${classes[i]}">${s.toLocaleString()}</span>
            </div>
          `;
        });
      }

      const isLocked = isGameLocked(g.id);
      const LOCKED_GAMES = {
        'beat-drop': 200,
        'pixel-dodge': 150,
        'astro-strider': 300
      };

      if (isLocked) {
        return `
          <div class="game-card locked" data-id="${g.id}" style="position: relative; min-height: 280px;">
            <div style="opacity: 0.15; pointer-events: none; height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
              <div class="card-header-row">
                <div class="card-icon">${icon}</div>
                <div class="card-badges-col">
                  <span class="badge-tag badge-cat">${g.category || 'ARCADE'}</span>
                  <span class="badge-tag badge-diff">${g.difficulty || 'MEDIUM'}</span>
                </div>
              </div>
              <h3 class="card-title-text">${g.name}</h3>
              <p class="card-desc-text">${g.description || 'Survive the grid and set a new high score in this challenging module.'}</p>
            </div>
            
            <!-- Lock Overlay -->
            <div class="lock-overlay" style="position: absolute; inset: 0; background: rgba(10,10,15,0.95); border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; padding: 20px; box-sizing: border-box; text-align: center; border: 1px solid rgba(255,255,255,0.05);">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 12px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              <div style="font-family: 'Press Start 2P', monospace; font-size: 10px; color: #fff; margin-bottom: 8px; text-transform: uppercase;">LOCKED MODULE</div>
              <div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Cost: ${LOCKED_GAMES[g.id]} AP</div>
              <button class="btn btn-primary unlock-btn-trigger" onclick="window.tryUnlockGame('${g.id}', ${LOCKED_GAMES[g.id]})" style="font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 8px 16px; border-radius: 4px; border: none; font-weight: bold; cursor: pointer; background: var(--accent-1); color: #fff; width: 100%;">UNLOCK</button>
            </div>
          </div>
        `;
      }

      return `
        <div class="game-card" data-id="${g.id}">
          <div class="card-header-row">
            <div class="card-icon">${icon}</div>
            <div class="card-badges-col">
              <span class="badge-tag badge-cat">${g.category || 'ARCADE'}</span>
              <span class="badge-tag badge-diff">${g.difficulty || 'MEDIUM'}</span>
            </div>
          </div>
          
          <h3 class="card-title-text">${g.name}</h3>
          <p class="card-desc-text">${g.description || 'Survive the grid and set a new high score in this challenging module.'}</p>
          
          <div class="card-divider"></div>
          
          <div class="card-stats-row">
            Best: <span>${best}</span> · Runs: <span>${runs}</span> · ↑ Trend
          </div>

          <button class="play-btn launch-game-btn" data-id="${g.id}">PLAY NOW</button>
          
          <button class="info-btn" data-id="${g.id}">?</button>
          
          <div class="score-tooltip">
            <div class="tooltip-title">TOP SCORES</div>
            ${tooltipRows}
          </div>

          <div class="card-overlay" id="overlay-${g.id}">
            <button class="overlay-close" data-id="${g.id}">×</button>
            <div class="overlay-header">
              <div class="icon-24" style="color: var(--accent-1);">${icon}</div>
              <div class="overlay-title">${g.name}</div>
            </div>
            <div class="overlay-desc">${g.description || 'No detailed intelligence report available.'}</div>
            
            <div class="overlay-section-title">HOW TO PLAY</div>
            <div class="overlay-controls">
              <div class="ctrl-row"><span>MOVEMENT</span><span>WASD / ARROWS</span></div>
              <div class="ctrl-row"><span>ACTION</span><span>SPACEBAR</span></div>
              <div class="ctrl-row"><span>PAUSE</span><span>ESC</span></div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Empty state element
    const emptyState = document.createElement('div');
    emptyState.id = 'games-empty-state';
    emptyState.className = 'hidden';
    emptyState.style.cssText = 'grid-column: 1 / -1; text-align: center; padding: 100px 0;';
    emptyState.innerHTML = `
      <h2 style="font-family: 'Press Start 2P', monospace; font-size: 14px; color: var(--accent-3); margin-bottom: 8px;">NO SIGNAL DETECTED</h2>
      <p style="color: var(--text-muted); font-size: 12px;">Adjust your filter parameters.</p>
    `;
    this.grid.appendChild(emptyState);

    this.bindEvents();
  }

  applyFilters(gamesList) {
    if (this.showingText) {
      this.showingText.innerText = `Showing ${gamesList.length} of ${this.games.length} games`;
    }

    const emptyState = document.getElementById('games-empty-state');
    if (emptyState) {
      if (gamesList.length === 0) {
        emptyState.classList.remove('hidden');
      } else {
        emptyState.classList.add('hidden');
      }
    }

    const cards = this.grid.querySelectorAll('.game-card');
    cards.forEach(card => {
      const id = card.getAttribute('data-id');
      const index = gamesList.findIndex(g => g.id === id);
      
      if (index === -1) {
        card.classList.add('hidden');
      } else {
        card.classList.remove('hidden');
        card.style.order = index;
      }
    });
  }

  bindEvents() {
    const cards = this.grid.querySelectorAll('.game-card');
    
    cards.forEach(card => {
      // Mouse tracking
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', x + 'px');
        card.style.setProperty('--mouse-y', y + 'px');
      });

      // Play Now
      const playBtn = card.querySelector('.launch-game-btn');
      if (playBtn) {
        playBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const gameId = playBtn.getAttribute('data-id');
          if (window.launchGameModal) {
            window.launchGameModal(gameId);
          } else {
            // Fallback: Use the application hash routing infrastructure
            window.location.hash = `/${gameId}`;
          }
        });
      }

      // Info toggle
      const infoBtn = card.querySelector('.info-btn');
      const overlay = card.querySelector('.card-overlay');
      const closeBtn = card.querySelector('.overlay-close');
      
      if (infoBtn && overlay) {
        infoBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          overlay.classList.add('open');
        });
      }
      
      if (closeBtn && overlay) {
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          overlay.classList.remove('open');
        });
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.gamesInstance = new GamesGrid();
});

window.tryUnlockGame = (gameId, cost) => {
  const coinsData = getCoins();
  if (coinsData.total < cost) {
    showToast(`Insufficient AP! Need ${cost} AP.`, 'error');
    return;
  }
  
  // Deduct coins
  coinsData.total -= cost;
  coinsData.history.unshift({
    reason: `Unlocked ${gameId}`,
    amount: -cost,
    date: new Date().toISOString().slice(0,10)
  });
  Storage.set('coins', coinsData);
  
  // Save unlocked state
  Storage.set(`unlocked_${gameId}`, true);
  
  showToast("Module Unlocked!", "success");
  
  // Update navbar coin display
  const coinEl = document.getElementById('coin-count');
  if (coinEl) {
    coinEl.textContent = formatCoins(coinsData.total);
  }

  // Play shake animation
  const card = document.querySelector(`.game-card[data-id="${gameId}"]`);
  if (card) {
    card.style.animation = 'shake 0.5s ease-in-out';
    
    // Add simple inline shake animation
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
      }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
      style.remove();
      if (window.gamesInstance) {
        window.gamesInstance.buildDOM();
        window.gamesInstance.bindEvents();
      }
    }, 600);
  } else {
    if (window.gamesInstance) {
      window.gamesInstance.buildDOM();
      window.gamesInstance.bindEvents();
    }
  }
};
