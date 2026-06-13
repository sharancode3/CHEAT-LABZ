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
      const tagsHtml = g.tags.map(t => `<span class="badge badge-purple" style="font-size: 10px; padding: 2px 6px;">${t}</span>`).join('');

      let iconSvg = '';
      let iconColor = 'var(--accent-1)';
      
      switch(g.category) {
        case 'ARCADE':
          iconColor = 'var(--accent-1)';
          iconSvg = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
          break;
        case 'SKILL':
          iconColor = 'var(--accent-2)';
          iconSvg = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
          break;
        case 'PUZZLE':
          iconColor = '#a855f7';
          iconSvg = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 11V9a2 2 0 0 0-2-2h-2"/><path d="M9 19H7a2 2 0 0 1-2-2v-2"/><path d="M11 5V3"/><path d="M5 11H3"/><path d="M13 19v2"/><path d="M19 13h2"/><circle cx="12" cy="12" r="3"/></svg>';
          break;
        case 'RACING':
          iconColor = '#ef4444';
          iconSvg = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>';
          break;
        default:
          iconColor = 'var(--text-main)';
          iconSvg = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>';
      }

      return `
        <div class="game-card ${animate ? 'fade-in' : ''}" data-id="${g.id}">
          <div class="game-icon" style="color: ${iconColor}; display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 16px; background: rgba(255,255,255,0.03); margin-bottom: 20px; transition: all 0.3s ease;">
             ${iconSvg}
          </div>
          <div class="game-title-row">
            <span class="game-title">${g.name}</span>
            <span class="${badgeClass} badge">${g.difficulty}</span>
          </div>
          <div class="game-category">
            <span class="badge badge-outline">${g.category}</span>
            ${tagsHtml}
          </div>
          <p class="game-desc">${g.desc}</p>
          <div class="game-stats">
            <span class="stat">Best: ${best}</span>
            <span class="stat-dot">·</span>
            <span class="stat">Runs: ${runs}</span>
          </div>
          <button class="btn btn-primary launch-game-btn" data-id="${g.id}" style="width: 100%; margin-top: 10px;">PLAY NOW</button>
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
console.log('JS EXECUTED: grid=', !!grid);
if (grid) {
  new GameLibrary();
}
