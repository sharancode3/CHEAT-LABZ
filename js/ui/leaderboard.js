import { showToast } from '../core/notifications.js';

class LeaderboardUI {
  constructor() {
    this.container = document.getElementById('rankings-container');
    this.tabs = document.querySelectorAll('.lb-tab');
    this.currentTab = 'my-scores';
    
    // Summary nodes
    this.totalGamesNode = document.getElementById('lb-total-games');
    this.totalRunsNode = document.getElementById('lb-total-runs');
    this.bestGameNode = document.getElementById('lb-best-game');

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

    this.updateSummary();
    this.render();
  }

  getScores() {
    let scores = [];
    for(let i=0; i<localStorage.length; i++) {
      const key = localStorage.key(i);
      if(key.startsWith('cheatLabz_')) {
        const gameId = key.replace('cheatLabz_', '');
        // Exclude soundEnabled
        if (gameId === 'soundEnabled' || gameId === 'arena_history') continue;
        
        try {
          const val = JSON.parse(localStorage.getItem(key));
          if (val && typeof val.score === 'number') {
            const gameObj = this.gamesData.find(g => g.id === gameId);
            scores.push({
              id: gameId,
              name: gameObj ? gameObj.name : gameId,
              category: gameObj ? gameObj.category : 'Unknown',
              best: val.score,
              runs: val.runs || 1,
              lastPlayed: val.lastPlayed || Date.now(),
              trend: val.trend || 'flat'
            });
          }
        } catch(e) {}
      }
    }
    // Sort by best score descending
    return scores.sort((a,b) => b.best - a.best);
  }

  updateSummary() {
    const scores = this.getScores();
    this.totalGamesNode.innerText = scores.length;
    
    const totalRuns = scores.reduce((acc, curr) => acc + curr.runs, 0);
    this.totalRunsNode.innerText = totalRuns;

    if (scores.length > 0) {
      this.bestGameNode.innerText = scores[0].name;
    } else {
      this.bestGameNode.innerText = '—';
    }
  }

  formatDate(timestamp) {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  }

  getTrendIcon(trend) {
    if (trend === 'up') return '<svg class="trend-up" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';
    if (trend === 'down') return '<svg class="trend-down" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>';
    return '<svg class="trend-flat" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  }

  renderMyScores() {
    const scores = this.getScores();
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
          <button onclick="window.location.href='games.html'">BROWSE GAMES</button>
        </div>
      `;
    }

    let html = `
      <table class="lb-table">
        <thead>
          <tr>
            <th>RANK</th>
            <th>GAME</th>
            <th>BEST SCORE</th>
            <th>RUNS</th>
            <th>LAST PLAYED</th>
            <th>TREND</th>
          </tr>
        </thead>
        <tbody id="lb-table-body">
    `;

    scores.forEach((s, i) => {
      let rankDisplay = i + 1;
      if (i === 0) rankDisplay = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
      else if (i === 1) rankDisplay = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';
      else if (i === 2) rankDisplay = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>';

      html += `
        <tr class="lb-row" onclick="openGame('${s.id}')">
          <td class="lb-rank">${rankDisplay}</td>
          <td class="lb-game">
            <div class="lb-game-icon">${this.icons[s.id] || ''}</div>
            <div>
              <div class="lb-game-name">${s.name}</div>
              <div class="lb-game-cat">${s.category}</div>
            </div>
          </td>
          <td class="lb-score">${s.best.toLocaleString()}</td>
          <td class="lb-runs">${s.runs}</td>
          <td class="lb-date">${this.formatDate(s.lastPlayed)}</td>
          <td class="lb-trend">${this.getTrendIcon(s.trend)}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div class="reset-container">
        <button id="reset-btn" class="reset-btn">RESET ALL MY SCORES</button>
      </div>
    `;

    return html;
  }

  renderAllGames() {
    const scores = this.getScores();
    let html = `<div class="lb-all-games">`;

    this.gamesData.forEach(game => {
      const scoreData = scores.find(s => s.id === game.id);
      const isPlayed = !!scoreData;
      
      html += `
        <div class="lb-game-card ${isPlayed ? '' : 'never-played'}">
          <div class="lgc-icon">${this.icons[game.id] || ''}</div>
          <div class="lgc-name">${game.name}</div>
          <div class="lgc-stats">
            <div class="lgc-best">
              <span>BEST</span>
              <strong>${isPlayed ? scoreData.best.toLocaleString() : '—'}</strong>
            </div>
            <div class="lgc-runs">
              <span>RUNS</span>
              <strong>${isPlayed ? scoreData.runs : '0'}</strong>
            </div>
          </div>
          <button class="lgc-play" onclick="openGame('${game.id}')">PLAY</button>
        </div>
      `;
    });

    html += `</div>`;
    return html;
  }

  render() {
    if (!this.container) return;

    if (this.currentTab === 'my-scores') {
      this.container.innerHTML = this.renderMyScores();
      
      // GSAP Stagger
      if (document.querySelectorAll('.lb-row').length > 0 && window.gsap) {
        gsap.from('.lb-row', {
          opacity: 0, x: -20,
          duration: 0.3,
          stagger: 0.04,
          ease: 'power2.out'
        });
      }

      // Bind Reset
      const btn = document.getElementById('reset-btn');
      if (btn) {
        let resetClickCount = 0;
        let resetTimer;
        btn.onclick = () => {
          resetClickCount++;
          if (resetClickCount === 1) {
            btn.textContent = 'CLICK AGAIN TO CONFIRM';
            btn.classList.add('reset-confirm');
            resetTimer = setTimeout(() => {
              resetClickCount = 0;
              btn.textContent = 'RESET ALL MY SCORES';
              btn.classList.remove('reset-confirm');
            }, 3000);
          } else {
            clearTimeout(resetTimer);
            Object.keys(localStorage)
              .filter(k => k.startsWith('cheatLabz_'))
              .forEach(k => localStorage.removeItem(k));
            showToast('All scores cleared.', 'info');
            
            resetClickCount = 0;
            this.updateSummary();
            this.render();
          }
        };
      }

    } else {
      this.container.innerHTML = this.renderAllGames();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LeaderboardUI();
});
