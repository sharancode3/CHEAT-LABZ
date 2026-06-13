import { Storage } from '../core/storage.js';
import { GAMES_DB } from './games.js';

class DailyGauntlet {
  constructor() {
    this.gridEl = document.getElementById('gauntlet-grid');
    this.totalEl = document.getElementById('total-score');
    this.dateEl = document.getElementById('date-display');
    this.statusEl = document.getElementById('completion-status');

    this.init();
  }

  getDailyGames() {
    const today = new Date();
    const dateString = \`\${today.getUTCFullYear()}-\${String(today.getUTCMonth()+1).padStart(2,'0')}-\${String(today.getUTCDate()).padStart(2,'0')}\`;
    
    const d = dateString.replace(/-/g,'');
    const seed = [...d].reduce((a,c)=>a+c.charCodeAt(0),0);
    
    let c1 = seed % 19;
    let c2 = (seed * 7 + 3) % 19;
    if (c2 === c1) c2 = (c2 + 1) % 19;
    let c3 = (seed * 13 + 11) % 19;
    if (c3 === c1 || c3 === c2) c3 = (c3 + 1) % 19;
    if (c3 === c1) c3 = (c3 + 1) % 19;

    const daily = [GAMES_DB[c1], GAMES_DB[c2], GAMES_DB[c3]];
    return { dateString, games: daily };
  }

  init() {
    const { dateString, games } = this.getDailyGames();
    this.dateString = dateString;
    this.dailyGames = games;
    this.dailyKey = \`cheatLabz_daily_\${dateString}\`;
    
    if (this.dateEl) this.dateEl.innerText = \`DATE SEED: \${dateString}\`;

    this.completedIds = Storage.get(this.dailyKey, []);

    // Check routing
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdx = urlParams.get('game');

    if (gameIdx !== null) {
      this.handleGameRedirect(parseInt(gameIdx, 10));
    } else {
      this.renderHub();
    }
  }

  handleGameRedirect(idx) {
    if (idx < 0 || idx > 2) {
      window.location.href = 'daily.html';
      return;
    }
    
    // Check if locked
    if (idx > 0 && !this.completedIds.includes(this.dailyGames[idx - 1].id)) {
      // Must complete previous games first
      window.location.href = 'daily.html';
      return;
    }

    // All good, redirect to actual game shell
    const targetGame = this.dailyGames[idx].id;
    window.location.href = \`\${targetGame}.html?daily=\${idx}\`;
  }

  renderHub() {
    if (!this.gridEl) return;

    let totalScore = 0; // We no longer strictly track total score natively in this format, but we can fetch highest scores from regular storage
    let nextIdxToPlay = 0;

    for (let i = 0; i < 3; i++) {
      if (this.completedIds.includes(this.dailyGames[i].id)) {
        totalScore += Storage.get(this.dailyGames[i].name, 0); // fallback to their best score
        nextIdxToPlay = i + 1;
      }
    }

    if (this.totalEl) this.totalEl.innerText = totalScore;

    if (nextIdxToPlay >= 3 && this.statusEl) {
      this.statusEl.style.display = 'block';
    }

    this.gridEl.innerHTML = this.dailyGames.map((g, idx) => {
      let statusClass = '';
      let btnHtml = '';
      let scoreHtml = '';
      
      const isCompleted = this.completedIds.includes(g.id);

      if (isCompleted) {
        statusClass = 'completed';
        const bestScore = Storage.get(g.name, 0);
        scoreHtml = \`<div class="game-score font-display">\${bestScore}</div>\`;
        btnHtml = \`<button class="btn btn-outline" disabled>COMPLETED</button>\`;
      } else if (idx === nextIdxToPlay) {
        statusClass = 'active';
        scoreHtml = \`<div class="game-score font-display" style="color:var(--text-secondary);">---</div>\`;
        btnHtml = \`<a href="daily.html?game=\${idx}" class="btn btn-primary">PLAY NEXT</a>\`;
      } else {
        statusClass = 'locked';
        scoreHtml = \`<div class="game-score font-display" style="color:var(--text-muted);">---</div>\`;
        btnHtml = \`<button class="btn btn-outline" disabled>LOCKED</button>\`;
      }

      return \`
        <div class="gauntlet-card \${statusClass}">
          <div class="card-num">\${idx + 1}</div>
          <div class="game-name font-display">\${g.name}</div>
          \${scoreHtml}
          \${btnHtml}
        </div>
      \`;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new DailyGauntlet();
});
