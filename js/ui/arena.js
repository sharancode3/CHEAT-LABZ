import { GAMES_DB } from './games.js';
import { Storage } from '../core/storage.js';

class ArenaMode {
  constructor() {
    this.gridEl = document.getElementById('arena-games-grid');
    this.bestScoreEl = document.getElementById('arena-best-score');
    this.startBtn = document.getElementById('start-arena-btn');
    this.interstitial = document.getElementById('arena-interstitial');
    
    this.selectedGameId = null;
    this.currentRound = 0;
    this.scores = [];
    this.totalScore = 0;
    
    // Multipliers per round
    this.multipliers = [1.0, 1.5, 2.0];
    
    this.init();
  }

  init() {
    // Load best score
    const best = Storage.get('cheatLabz_arena_best', 0);
    if (this.bestScoreEl) {
      this.bestScoreEl.innerText = best > 0 ? best : 'No record yet';
    }

    if (!this.gridEl || !this.startBtn) return;

    // Filter out games that shouldn't be in arena
    const excluded = ['dodge-blitz', 'blink-lab', 'neon-pong'];
    const arenaGames = GAMES_DB.filter(g => !excluded.includes(g.id));

    this.gridEl.innerHTML = arenaGames.map(g => \`
      <div class="arena-game-tile" data-id="\${g.id}" style="background: var(--bg-card); border: 2px solid var(--border); border-radius: 8px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.2s;">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 12px;"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
        <div class="font-display" style="font-size: 10px;">\${g.name}</div>
      </div>
    \`).join('');

    const tiles = this.gridEl.querySelectorAll('.arena-game-tile');
    tiles.forEach(tile => {
      tile.addEventListener('click', () => {
        tiles.forEach(t => {
          t.style.borderColor = 'var(--border)';
          t.style.background = 'var(--bg-card)';
        });
        tile.style.borderColor = 'var(--accent-1)';
        tile.style.background = '#1a1423'; // slight purple tint
        
        this.selectedGameId = tile.getAttribute('data-id');
        
        this.startBtn.disabled = false;
        this.startBtn.style.opacity = '1';
        this.startBtn.style.cursor = 'pointer';
      });
    });

    this.startBtn.addEventListener('click', () => {
      if (this.selectedGameId) {
        this.startArena();
      }
    });
  }

  startArena() {
    this.currentRound = 0;
    this.scores = [];
    this.totalScore = 0;
    
    // Inject custom CSS for toast if it doesn't exist
    if (!document.getElementById('arena-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'arena-toast-styles';
      style.innerHTML = \`
        .arena-toast {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
          background: var(--accent-4); color: #fff; padding: 12px 24px;
          border-radius: 4px; z-index: 100000; font-family: var(--font-display); font-size: 12px;
          opacity: 0; transition: opacity 0.2s; pointer-events: none;
        }
      \`;
      document.head.appendChild(style);
    }
    
    // Setup a global pause interceptor before launching modal
    window._arenaPauseInterceptor = (e) => {
      if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
        e.stopImmediatePropagation();
        e.preventDefault();
        this.showToast('ARENA: Pausing disabled');
      }
    };
    
    document.addEventListener('keydown', window._arenaPauseInterceptor, true); // Use capture phase

    this.playNextRound();
  }

  showToast(msg) {
    let toast = document.getElementById('arena-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'arena-toast';
      toast.className = 'arena-toast';
      document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.style.opacity = '1';
    
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
    }, 1500);
  }

  async playNextRound() {
    if (this.currentRound >= 3) {
      this.showFinalResults();
      return;
    }

    const mult = this.multipliers[this.currentRound];
    
    // Hide interstitial if showing
    this.interstitial.classList.add('hidden');
    
    // We hook into the game modal
    // Instead of using launchGameModal directly (which handles standard Game Over), 
    // we need to instantiate it ourselves to override the game over behavior
    const modal = document.getElementById('game-modal');
    const canvas = document.getElementById('game-canvas');
    const titleEl = document.getElementById('game-modal-title');
    const scoreEl = document.getElementById('game-modal-score');
    
    const gameInfo = GAMES_DB.find(g => g.id === this.selectedGameId);
    titleEl.innerText = \`ARENA ROUND \${this.currentRound + 1} - \${gameInfo.name.toUpperCase()}\`;
    scoreEl.innerText = 'SCORE: 0';
    
    modal.classList.remove('hidden');

    try {
      const module = await import(\`../games/\${this.selectedGameId}.js\`);
      const GameClass = module.default;
      
      this.currentGame = new GameClass(canvas, { difficultyMultiplier: mult });
      
      this.currentGame.onScoreChange = (score) => {
        scoreEl.innerText = \`SCORE: \${score}\`;
      };
      
      // Override game over
      const originalGameOver = this.currentGame.gameOver.bind(this.currentGame);
      this.currentGame.gameOver = () => {
        // Run standard game over logic to stop loop, but we will hijack the UI
        originalGameOver();
        
        // Hide standard game over screen if it drew one
        const score = this.currentGame.score;
        this.scores.push(score);
        this.totalScore += score;
        
        this.currentGame.destroy();
        this.currentGame = null;
        
        modal.classList.add('hidden');
        this.handleRoundComplete(score);
      };
      
      if (this.currentGame.showInstructions) {
        this.currentGame.showInstructions();
      } else {
        this.currentGame.start();
      }
      
    } catch(err) {
      console.error(err);
      alert('Failed to load arena game');
    }
  }

  handleRoundComplete(score) {
    this.currentRound++;
    
    document.getElementById('arena-round-title').innerText = \`ROUND \${this.currentRound} COMPLETE\`;
    document.getElementById('arena-round-score').innerText = \`Round Score: \${score}\`;
    
    // Clear any previous buttons from final results
    const existingBtns = this.interstitial.querySelectorAll('button');
    existingBtns.forEach(b => b.remove());

    this.interstitial.classList.remove('hidden');
    
    if (this.currentRound < 3) {
      setTimeout(() => {
        this.playNextRound();
      }, 2000);
    } else {
      setTimeout(() => {
        this.playNextRound(); // will trigger showFinalResults
      }, 1000);
    }
  }

  showFinalResults() {
    document.removeEventListener('keydown', window._arenaPauseInterceptor, true);
    
    const best = Storage.get('cheatLabz_arena_best', 0);
    let isNewBest = false;
    if (this.totalScore > best) {
      isNewBest = true;
      Storage.set('cheatLabz_arena_best', this.totalScore);
      if (this.bestScoreEl) this.bestScoreEl.innerText = this.totalScore;
    }

    document.getElementById('arena-round-title').innerHTML = \`ARENA RESULTS\`;
    document.getElementById('arena-round-score').innerHTML = \`
      <div style="font-size: 24px; margin-bottom: 8px;">Round 1: \${this.scores[0]} pts</div>
      <div style="font-size: 24px; margin-bottom: 8px;">Round 2: \${this.scores[1]} pts</div>
      <div style="font-size: 24px; margin-bottom: 24px;">Round 3: \${this.scores[2]} pts</div>
      <div style="font-size: 48px; color: var(--accent-1); margin-bottom: 16px;">TOTAL: \${this.totalScore}</div>
      \${isNewBest ? '<div class="badge badge-purple" style="margin-bottom: 32px; font-size: 16px;">NEW ARENA RECORD</div>' : ''}
    \`;
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.className = 'btn btn-primary';
    playAgainBtn.innerText = 'PLAY AGAIN';
    playAgainBtn.style.marginRight = '16px';
    playAgainBtn.onclick = () => {
      this.interstitial.classList.add('hidden');
      this.startArena();
    };
    
    const backBtn = document.createElement('a');
    backBtn.className = 'btn btn-outline';
    backBtn.innerText = 'BACK TO GAMES';
    backBtn.href = 'games.html';
    
    this.interstitial.appendChild(playAgainBtn);
    this.interstitial.appendChild(backBtn);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ArenaMode();
});
