import { Storage } from '../core/storage.js';

export const GAMES_DB = [
  { id: 'neon-serpent', name: 'Neon Serpent', desc: 'Eat the orbs. Grow longer. Don\'t hit yourself or the walls.', category: 'ARCADE', difficulty: 'MEDIUM', tags: ['TRENDING'] },
  { id: 'loop-rally', name: 'Loop Rally', desc: 'Rally with the AI. Don\'t let the ball past you. 3 lives.', category: 'ARCADE', difficulty: 'HARD', tags: [] },
  { id: 'turbo-drift', name: 'Turbo Drift', desc: '3 laps. Drift for bonus points. Hit boost pads. Best time wins.', category: 'RACING', difficulty: 'HARD', tags: ['NEW'] },
  { id: 'key-frenzy', name: 'Key Frenzy', desc: 'Press the key shown. Blind rounds = remember the key. 3 lives.', category: 'SKILL', difficulty: 'HARD', tags: [] },
  { id: 'astro-strider', name: 'Astro Strider', desc: 'Destroy asteroids and enemy ships. Collect powerups. 3 lives.', category: 'ARCADE', difficulty: 'MEDIUM', tags: [] },
  { id: 'cipher-quest', name: 'Cipher Quest', desc: 'Decode the Caesar-cipher word. Type your answer. Hints cost points.', category: 'PUZZLE', difficulty: 'MEDIUM', tags: [] },
  { id: 'phantom-calc', name: 'Phantom Calc', desc: 'Memorize the equation before it disappears. Type your answer.', category: 'SKILL', difficulty: 'HARD', tags: [] },
  { id: 'word-pulse', name: 'Word Pulse', desc: 'Type each letter ON the beat. Watch the pulse. Rhythm matters.', category: 'SKILL', difficulty: 'MEDIUM', tags: [] },
  { id: 'pixel-dodge', name: 'Pixel Dodge', desc: 'Dodge everything. One hit and you\'re done. Survive as long as you can.', category: 'ARCADE', difficulty: 'HARD', tags: ['HOT'] },
  { id: 'stack-blitz', name: 'Stack Blitz', desc: 'Drop platforms to build your tower. Aim for the center.', category: 'SKILL', difficulty: 'MEDIUM', tags: [] },
  { id: 'memory-grid', name: 'Memory Grid', desc: 'Watch the sequence light up. Repeat it back. Gets longer every round.', category: 'PUZZLE', difficulty: 'MEDIUM', tags: [] },
  { id: 'hyper-tap', name: 'Hyper Tap', desc: 'Tap when the dot is inside the target. Closer to center = more points.', category: 'SKILL', difficulty: 'EASY', tags: ['CHILL'] },
  { id: 'gravity-flip', name: 'Gravity Flip', desc: 'Flip gravity to avoid spikes. Collect coins. Don\'t die.', category: 'ARCADE', difficulty: 'MEDIUM', tags: [] },
  { id: 'chain-burst', name: 'Chain Burst', desc: 'Drag to chain same-colored orbs. Longer chains = more points. 90 seconds.', category: 'PUZZLE', difficulty: 'MEDIUM', tags: [] },
  { id: 'reflex-rush', name: 'Reflex Rush', desc: 'Press the correct arrow key when the color flashes. React fast.', category: 'SKILL', difficulty: 'EASY', tags: [] },
  { id: 'tile-runner', name: 'Tile Runner', desc: 'Tap only the dark tiles. Miss 3 and you\'re out. Don\'t stop.', category: 'ARCADE', difficulty: 'MEDIUM', tags: [] },
  { id: 'beat-drop', name: 'Beat Drop', desc: 'Hit D F J K when notes reach the line. Timing matters.', category: 'SKILL', difficulty: 'MEDIUM', tags: [] },
  { id: 'slide-forge', name: 'Slide Forge', desc: 'Slide tiles with arrow keys. Same numbers merge. Reach 2048.', category: 'PUZZLE', difficulty: 'MEDIUM', tags: [] },
  { id: 'orb-pop-deluxe', name: 'ORB POP DELUXE', desc: 'Match 3 colored orbs to pop them before they reach the bottom.', category: 'PUZZLE', difficulty: 'EASY', tags: ['classic'] }
];

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
        GAMES_DB.sort(() => Math.random() - 0.5);
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
    let result = GAMES_DB.filter(g => {
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
    
    this.countEl.innerText = \`Showing \${games.length} games\`;

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
      
      const badgeClass = \`badge-difficulty-\${g.difficulty.toLowerCase()}\`;
      const tagsHtml = g.tags.map(t => \`<span class="badge badge-purple" style="font-size: 10px; padding: 2px 6px;">\${t}</span>\`).join('');

      return \`
        <div class="game-card \${animate ? 'fade-in' : ''}">
          <div class="game-icon">
             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          </div>
          <div class="game-title-row">
            <span class="game-title">\${g.name}</span>
            <div style="display:flex; gap:4px;">
              <span class="badge \${badgeClass}" style="font-size: 10px; padding: 2px 6px;">\${g.difficulty}</span>
              \${tagsHtml}
            </div>
          </div>
          <p class="game-desc">\${g.desc}</p>
          <div class="game-stats">
            <span>Best: \${best}</span>
            <span>Runs: \${runs}</span>
          </div>
          <a href="\${g.id}.html" class="btn btn-primary btn-full">PLAY NOW</a>
        </div>
      \`;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new GameLibrary();
});
