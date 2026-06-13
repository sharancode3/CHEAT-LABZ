import { GAMES_DB } from './games.js';

class ArenaMode {
  constructor() {
    this.gridEl = document.getElementById('arena-grid');
    this.totalEl = document.getElementById('total-score');
    this.statusEl = document.getElementById('completion-status');
    this.resetBtn = document.getElementById('reset-arena-btn');

    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => {
        sessionStorage.removeItem('cheatLabz_arena_run');
        window.location.href = 'arena.html';
      });
    }

    this.init();
  }

  generateRun() {
    let dbCopy = [...GAMES_DB];
    let runGames = [];
    for(let i=0; i<3; i++) {
        let idx = Math.floor(Math.random() * dbCopy.length);
        runGames.push(dbCopy.splice(idx, 1)[0].id);
    }
    return {
      games: runGames,
      scores: [null, null, null],
      currentRound: 0
    };
  }

  init() {
    let runData = sessionStorage.getItem('cheatLabz_arena_run');
    if (!runData) {
      runData = this.generateRun();
      sessionStorage.setItem('cheatLabz_arena_run', JSON.stringify(runData));
    } else {
      runData = JSON.parse(runData);
    }
    this.runData = runData;

    // Check routing
    const urlParams = new URLSearchParams(window.location.search);
    const roundIdx = urlParams.get('round');

    if (roundIdx !== null) {
      this.handleGameRedirect(parseInt(roundIdx, 10));
    } else {
      this.renderHub();
    }
  }

  handleGameRedirect(idx) {
    if (idx !== this.runData.currentRound || idx > 2) {
      window.location.href = 'arena.html';
      return;
    }

    const multipliers = [1.0, 1.5, 2.0];
    const targetGame = this.runData.games[idx];
    const mult = multipliers[idx];
    window.location.href = \`\${targetGame}.html?arena=\${idx}&mult=\${mult}\`;
  }

  renderHub() {
    if (!this.gridEl) return;

    let totalScore = 0;
    for (let i = 0; i < 3; i++) {
      if (this.runData.scores[i] !== null) {
        totalScore += this.runData.scores[i];
      }
    }

    if (this.totalEl) this.totalEl.innerText = totalScore;

    if (this.runData.currentRound >= 3) {
      if (this.statusEl) this.statusEl.style.display = 'block';
      if (this.resetBtn) this.resetBtn.style.display = 'inline-flex';
    }

    const multipliers = [1.0, 1.5, 2.0];

    this.gridEl.innerHTML = this.runData.games.map((gameId, idx) => {
      const g = GAMES_DB.find(x => x.id === gameId);
      if (!g) return '';

      let statusClass = '';
      let btnHtml = '';
      let scoreHtml = '';
      let mult = multipliers[idx];

      if (this.runData.scores[idx] !== null) {
        statusClass = 'completed';
        scoreHtml = \`<div class="game-score font-display">\${this.runData.scores[idx]}</div>\`;
        btnHtml = \`<button class="btn btn-outline" disabled>COMPLETED</button>\`;
      } else if (idx === this.runData.currentRound) {
        statusClass = 'active';
        scoreHtml = \`<div class="game-score font-display" style="color:var(--text-secondary);">---</div>\`;
        btnHtml = \`<a href="arena.html?round=\${idx}" class="btn btn-danger-outline">START ROUND \${idx + 1}</a>\`;
      } else {
        statusClass = 'locked';
        scoreHtml = \`<div class="game-score font-display" style="color:var(--text-muted);">---</div>\`;
        btnHtml = \`<button class="btn btn-outline" disabled>LOCKED</button>\`;
      }

      return \`
        <div class="gauntlet-card \${statusClass}">
          <div class="card-num">\${idx + 1}</div>
          <div class="game-name font-display">\${g.name}</div>
          <div class="multiplier font-display">\${mult}x MULTIPLIER</div>
          \${scoreHtml}
          \${btnHtml}
        </div>
      \`;
    }).join('');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ArenaMode();
});
