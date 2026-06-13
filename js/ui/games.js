import { Storage } from '../core/storage.js';



const diffScores = { EASY: 1, MEDIUM: 2, HARD: 3 };

class GameLibrary {
  constructor() {
    this.grid = document.getElementById('games-grid');
    this.emptyState = document.getElementById('empty-state');
    this.countEl = document.getElementById('games-count');
    
    this.filterTabs = document.querySelectorAll('.filter-tabs .tab-pill');
    this.searchInput = document.getElementById('search-input');
    this.sortSelect = document.getElementById('sort-select');
    this.shuffleBtn = document.getElementById('shuffle-btn');
    
    this.currentFilter = 'ALL';
    this.currentSearch = '';
    this.currentSort = 'TRENDING';
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.render();
  }

  bindEvents() {
    // Filter
    this.filterTabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.filterTabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.currentFilter = e.target.dataset.filter;
        this.render();
      });
    });

    // Search (Debounced)
    let timeout;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.currentSearch = e.target.value.toLowerCase();
        this.render();
      }, 200);
    });

    // Sort
    this.sortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.render();
    });

    // Shuffle
    this.shuffleBtn.addEventListener('click', () => {
      // Add shuffle animation class
      const cards = this.grid.querySelectorAll('.game-card');
      cards.forEach(card => card.classList.add('card-flip'));
      
      setTimeout(() => {
        // Randomize
        GAMES.sort(() => Math.random() - 0.5);
        this.render(false); // don't re-add animation on render
      }, 200);
    });

    if (window.gsap) {
      gsap.from('#games-grid .game-card', {
        y: 20, 
        opacity: 0, 
        duration: 0.4, 
        stagger: 0.05,
        ease: "power2.out"
      });
    }
  }

  getFilteredSortedGames() {
    let result = GAMES.filter(g => {
      const matchFilter = this.currentFilter === 'ALL' || g.category === this.currentFilter;
      const matchSearch = g.name.toLowerCase().includes(this.currentSearch) || 
                          g.desc.toLowerCase().includes(this.currentSearch);
      return matchFilter && matchSearch;
    });

    result.sort((a, b) => {
      if (this.currentSort === 'AZ') return a.name.localeCompare(b.name);
      if (this.currentSort === 'EASY') return diffScores[a.difficulty] - diffScores[b.difficulty];
      if (this.currentSort === 'HARD') return diffScores[b.difficulty] - diffScores[a.difficulty];
      if (this.currentSort === 'NEW') return b.tags.includes('NEW') ? 1 : -1;
      if (this.currentSort === 'TRENDING') return b.tags.includes('TRENDING') || b.tags.includes('HOT') ? 1 : -1;
      return 0;
    });

    return result;
  }

  render(animate = true) {
    const games = this.getFilteredSortedGames();
    
    this.countEl.innerText = `Showing ${games.length} games`;

    if (games.length === 0) {
      this.grid.style.display = 'none';
      this.emptyState.style.display = 'block';
      return;
    }

    this.grid.style.display = 'grid';
    this.emptyState.style.display = 'none';

    this.grid.innerHTML = games.map(g => {
      const best = Storage.get(g.id, 0);
      const runs = Storage.get(g.id + '_runs', 0);
      
      const badgeClass = `badge-difficulty-${g.difficulty.toLowerCase()}`;
      const tagsHtml = g.tags.map(t => `<span class="badge badge-tag">${t}</span>`).join('');
      const gameColor = g.color || '#00f0ff';
      const svgIcon = (window.GAME_ICONS && window.GAME_ICONS[g.id]) || '';

      return `
        <div class="game-card ${animate ? 'fade-in' : ''}" data-id="${g.id}" style="--card-accent: ${gameColor};">
          <div class="game-card-glow"></div>
          <div class="game-card-shine"></div>
          <div class="game-icon-wrap" style="color: ${gameColor};">
            ${svgIcon}
          </div>
          <div class="game-title-row">
            <span class="game-title">${g.name}</span>
            <span class="${badgeClass} badge">${g.difficulty}</span>
          </div>
          <div class="game-category">
            <span class="badge badge-outline">${g.category}</span>
            ${tagsHtml}
          </div>
          <p class="game-desc">${g.desc || g.description || ''}</p>
          <div class="game-stats">
            <span class="stat">BEST: ${best}</span>
            <span class="stat-dot">·</span>
            <span class="stat">RUNS: ${runs}</span>
          </div>
          <button class="btn btn-primary launch-game-btn" data-id="${g.id}" style="width: 100%; margin-top: auto;">PLAY NOW</button>
        </div>
      `;
    }).join('');
    
    // Bind click events for game launching
    const cards = this.grid.querySelectorAll('.game-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        const gameId = card.getAttribute('data-id');
        if (window.launchGameModal) {
          window.launchGameModal(gameId);
        }
      });
    });
  }
}

// Modules are deferred, so DOM is already parsed
const grid = document.getElementById('games-grid');
if (grid) {
  new GameLibrary();
}
