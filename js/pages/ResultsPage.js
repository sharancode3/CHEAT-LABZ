import router from '../core/router.js';
import { SocketClient as socketClient } from '../core/socket-client.js';
import GAMES_DATA from '../core/catalog.js';

export default class ResultsPage {
  constructor() {
    this.container = null;
    this.roomCode = null;
    this.gameInfo = null;
    this.isWinner = true; // For demo purposes, true by default
    this.mode = 'pvp';
  }

  async mount(params, container) {
    this.container = container;
    const urlParams = new URLSearchParams(window.location.search);
    this.roomCode = urlParams.get('code');
    const gameId = urlParams.get('game');
    this.mode = urlParams.get('mode') || 'pvp';
    
    // Check if URL overrides winner
    if (urlParams.has('winner')) {
      this.isWinner = urlParams.get('winner') === 'true';
    }
    
    this.gameInfo = GAMES_DATA.find(g => g.id === gameId) || GAMES_DATA[0];

    // Hide global navbar for immersion
    const navMount = document.getElementById('navbar-mount');
    if (navMount) navMount.style.display = 'none';

    this.render();
    this.bindEvents();

    if (this.isWinner) {
      this.triggerConfetti();
    }

    // Delay rewards animation
    setTimeout(() => {
      const rewards = this.container.querySelector('#rewards-section');
      if (rewards) rewards.classList.add('show');
    }, 500);
  }

  async unmount() {
    const navMount = document.getElementById('navbar-mount');
    if (navMount) navMount.style.display = 'block';
  }

  render() {
    let announcementHtml = '';
    
    if (this.mode === 'bot') {
      announcementHtml = `<h1 class="announcement-winner">GAME COMPLETE</h1>`;
    } else if (this.isWinner) {
      announcementHtml = `<h1 class="announcement-winner">YOU WIN</h1>`;
    } else {
      announcementHtml = `<h2 class="announcement-loser">BETTER LUCK NEXT TIME</h2>`;
    }

    // Placeholder stats based on game
    const statsHtml = this.generateStatsHtml();

    this.container.innerHTML = `
      <div id="results-page">
        <!-- Background Canvas for Particles/Confetti -->
        <canvas id="results-particles"></canvas>
        
        <div class="results-container">
          <div class="announcement-wrap">
            ${announcementHtml}
          </div>

          <div class="stats-card">
            <div class="stats-headers">
              <span class="stat-header left">YOUR STATS</span>
              <span class="stat-header right">${this.mode === 'bot' ? 'BOT STATS' : 'OPPONENT STATS'}</span>
            </div>
            
            <div class="popup-stats-list">
              ${statsHtml}
            </div>
          </div>

          <div class="rewards-section" id="rewards-section">
            <div class="coin-pill">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.64-2.25 1.64-1.74 0-2.26-.95-2.32-1.81H7.9c.07 1.65 1.25 2.82 3 3.19V19h2.33v-1.72c1.68-.33 2.92-1.46 2.92-3.1 0-2.02-1.72-2.75-3.84-3.04z"/>
              </svg>
              <span class="coin-amount">+75 AP</span>
            </div>
            <span class="reward-desc">${this.isWinner ? 'Match win bonus' : 'Participation reward'}</span>
          </div>

          <div class="actions-row">
            <button class="btn-action btn-primary" id="btn-rematch">REMATCH</button>
            <button class="btn-action btn-secondary" id="btn-new">NEW OPPONENT</button>
            <button class="btn-action btn-secondary" id="btn-back">BACK TO CHALLENGE</button>
          </div>
        </div>
      </div>
    `;
  }

  generateStatsHtml() {
    let rows = [];
    if (this.gameInfo.id === 'rock-paper-scissors') {
      rows.push({ label: 'ROUNDS WON', you: 3, them: 2 });
      rows.push({ label: 'TOTAL ROUNDS', you: 5, them: 5 });
    } else if (this.gameInfo.id === 'tic-tac-toe') {
      rows.push({ label: 'GAMES WON', you: 1, them: 0 });
      rows.push({ label: 'DRAWS', you: 2, them: 2 });
    } else if (this.gameInfo.id === 'reflex-duel') {
      rows.push({ label: 'AVG REACTION', you: '210ms', them: '340ms' });
      rows.push({ label: 'BEST REACTION', you: '175ms', them: '280ms' });
      rows.push({ label: 'ROUNDS WON', you: 5, them: 1 });
    } else if (this.gameInfo.id === 'word-duel') {
      rows.push({ label: 'AVG WPM', you: '85', them: '42' });
      rows.push({ label: 'BEST WPM', you: '112', them: '55' });
    } else {
      rows.push({ label: 'SCORE', you: 1500, them: 950 });
    }

    return rows.map(r => `
      <div class="stat-row">
        <span class="stat-val left ${this.isWinner ? 'winner' : 'neutral'}">${r.you}</span>
        <span class="stat-label">${r.label}</span>
        <span class="stat-val right ${!this.isWinner ? 'winner' : 'neutral'}">${r.them}</span>
      </div>
    `).join('');
  }

  bindEvents() {
    const btnRematch = this.container.querySelector('#btn-rematch');
    const btnNew = this.container.querySelector('#btn-new');
    const btnBack = this.container.querySelector('#btn-back');

    btnRematch.addEventListener('click', () => {
      if (this.mode === 'bot') {
        // Immediate restart for bot
        router.navigate(`/challenge/game?mode=bot&game=${this.gameInfo.id}`);
      } else {
        // Send rematch request
        btnRematch.textContent = 'WAITING FOR OPPONENT...';
        btnRematch.disabled = true;
        // socket emit rematch request here
        
        // Timeout for rematch request
        setTimeout(() => {
          if (btnRematch.textContent === 'WAITING FOR OPPONENT...') {
            btnRematch.textContent = 'NO RESPONSE';
            setTimeout(() => {
              btnRematch.textContent = 'REMATCH';
              btnRematch.disabled = false;
            }, 2000);
          }
        }, 30000);
      }
    });

    btnNew.addEventListener('click', () => {
      // Go to challenge with matchmaking preselected (if query params supported)
      router.navigate('/challenge');
    });

    btnBack.addEventListener('click', () => {
      router.navigate('/challenge');
    });
  }

  triggerConfetti() {
    const canvas = document.getElementById('results-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#6C63FF', '#00D4AA', '#FFD73D', '#FF3366', '#FFFFFF'];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() > 0.5 ? 0 : canvas.width,
        y: canvas.height,
        vx: (Math.random() - 0.5) * 20,
        vy: -(Math.random() * 15 + 10),
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: Math.random() > 0.5 ? 'circle' : 'square',
        life: 1,
        decay: Math.random() * 0.02 + 0.015
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (let p of particles) {
        if (p.life > 0) {
          alive = true;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.5; // gravity
          p.life -= p.decay;

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.color;
          if (p.type === 'circle') {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(p.x, p.y, p.size, p.size);
          }
          ctx.restore();
        }
      }

      if (alive) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }
}
