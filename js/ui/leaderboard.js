import { Storage } from '../core/storage.js';


class Leaderboard {
  constructor() {
    this.tabs = document.querySelectorAll('#leaderboard-tabs .tab-pill');
    this.sections = document.querySelectorAll('.tab-content');
    
    this.tbody = document.getElementById('scores-tbody');
    this.tableWrapper = document.querySelector('.table-wrapper');
    this.emptyState = document.getElementById('my-scores-empty');
    this.resetBtn = document.getElementById('reset-scores-btn');
    
    this.gameSelect = document.getElementById('game-select');
    this.overviewGrid = document.getElementById('overview-grid');
    
    this.init();
  }

  init() {
    this.bindTabs();
    this.renderMyScores();
    this.initOverview();
    
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to delete all your scores? This cannot be undone.")) {
          // Clear only game scores, leave things like preferences if any
          GAMES.forEach(g => {
            Storage.remove(g.id);
            Storage.remove(g.id + '_runs');
          });
          Storage.remove('total_runs');
          Storage.remove('last_played');
          Storage.remove('most_played');
          this.renderMyScores();
          this.renderOverview();
        }
      });
    }
  }

  bindTabs() {
    this.tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.tabs.forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        
        const targetId = e.target.dataset.target;
        this.sections.forEach(sec => {
          sec.style.display = sec.id === targetId ? 'block' : 'none';
        });
      });
    });
  }

  renderMyScores() {
    const playedGames = [];
    
    GAMES.forEach(g => {
      const best = Storage.get(g.id, null);
      if (best !== null) {
        playedGames.push({
          ...g,
          best: best,
          runs: Storage.get(g.id + '_runs', 1),
          // dummy data for last played & trend since we aren't tracking full session history in base reqs
          lastPlayed: 'Today',
          trend: Math.random() > 0.5 ? 'up' : 'down'
        });
      }
    });

    if (playedGames.length === 0) {
      this.tableWrapper.style.display = 'none';
      this.emptyState.style.display = 'block';
      this.resetBtn.style.display = 'none';
      return;
    }

    this.tableWrapper.style.display = 'block';
    this.emptyState.style.display = 'none';
    this.resetBtn.style.display = 'inline-flex';

    playedGames.sort((a, b) => b.best - a.best);

    this.tbody.innerHTML = playedGames.map(g => {
      const trendIcon = g.trend === 'up' 
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-5)" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-3)" stroke-width="2"><polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline><polyline points="16 17 22 17 22 11"></polyline></svg>`;

      return `
        <tr>
          <td><a href="${g.id}.html" class="game-link">${g.name}</a></td>
          <td class="font-display" style="font-size: 14px;">${g.best}</td>
          <td>${g.runs}</td>
          <td>${g.lastPlayed}</td>
          <td>${trendIcon}</td>
        </tr>
      `;
    }).join('');

    if (window.gsap) {
      gsap.fromTo(this.tbody.querySelectorAll('tr'), 
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
      );
    }
  }

  initOverview() {
    // Populate select
    this.gameSelect.innerHTML = `<option value="ALL">All Games</option>` + 
      GAMES.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
      
    this.gameSelect.addEventListener('change', () => this.renderOverview());
    this.renderOverview();
  }

  renderOverview() {
    const filterId = this.gameSelect.value;
    const games = filterId === 'ALL' ? GAMES : GAMES.filter(g => g.id === filterId);
    
    this.overviewGrid.innerHTML = games.map(g => {
      const record = Storage.get(g.id, 0);
      return `
        <div class="overview-card fade-in">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          <div class="game-title font-display">${g.name}</div>
          <div class="record-label">Your Record</div>
          <div class="record-score">${record}</div>
        </div>
      `;
    }).join('');
  }
}

// Modules are deferred, so DOM is already parsed
if (document.getElementById('overview-grid')) {
  new Leaderboard();
}
