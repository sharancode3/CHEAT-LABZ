import { showToast } from '../core/notifications.js';
import { GAME_ICONS } from '../../assets/icons/game-icons.js';

function getGameIcon(gameId) {
  return GAME_ICONS[gameId] || GAME_ICONS['default'] || '🎮';
}

function getSeedFromString(str) {
  let h = 0;
  for(let i=0; i<str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return h;
}

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

class ArenaProtocol {
  constructor() {
    this.games = window.GAMES || [];
    this.currentCategory = 'all';
    
    this.gauntletSequence = [];
    this.currentRound = 1;
    this.roundScores = [0, 0, 0];
    
    this.init();
  }

  init() {
    this.initHeroParticles();
    this.initStats();
    this.initDailyChallenge();
    this.initCategorySelector();
    this.renderTiles('all');
    this.initLaunchPanel();

    // Hook for when a game ends in Arena mode
    window.onArenaGameComplete = (score) => this.handleRoundComplete(score);

    // Override close button to forfeit properly
    const closeBtn = document.getElementById('close-game');
    if (closeBtn) {
      const origClose = window.closeGameModal;
      closeBtn.addEventListener('click', () => {
        showToast("ARENA FORFEITED! Series terminated.", "error");
        if (origClose) origClose();
        // Reset state
        const overlay = document.getElementById('round-transition');
        if (overlay) overlay.classList.remove('active');
        const results = document.getElementById('arena-results');
        if (results) results.classList.remove('active');
      });
    }
  }

  initHeroParticles() {
    const canvas = document.getElementById('hero-particles');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    const particles = [];
    
    const resize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.5, // Float upwards
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        ctx.fillStyle = `rgba(239, 68, 68, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      
      requestAnimationFrame(animate);
    };
    animate();
  }

  initStats() {
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem('cheatlabz_arena_history') || '[]');
    } catch(e) {}

    const bestEl = document.getElementById('arena-best');
    const lastEl = document.getElementById('arena-last');
    const countEl = document.getElementById('arena-count');

    if (history.length > 0) {
      const max = Math.max(...history.map(h => h.score));
      const last = history[history.length - 1].score;
      if (bestEl) bestEl.innerText = max.toLocaleString();
      if (lastEl) lastEl.innerText = last.toLocaleString();
    }
    if (countEl) countEl.innerText = history.length;
  }

  initDailyChallenge() {
    const container = document.getElementById('daily-games-container');
    const playBtn = document.getElementById('btn-daily-play');
    if (!container || !playBtn) return;

    const seed = getSeedFromString(new Date().toDateString());
    const rng = mulberry32(seed);
    
    // Pick 3 random games
    const pool = [...this.games];
    pool.sort(() => rng() - 0.5);
    this.dailyGames = pool.slice(0, 3);

    container.innerHTML = this.dailyGames.map((g, i) => {
      const icon = getGameIcon(g.id);
      const isLast = i === 2;
      return `
        <div class="dac-game-icon">${icon}</div>
        ${!isLast ? '<div class="dac-arrow">→</div>' : ''}
      `;
    }).join('');

    playBtn.addEventListener('click', () => {
      this.startGauntlet(this.dailyGames.map(g => g.id));
    });
  }

  initCategorySelector() {
    const tabs = document.querySelectorAll('.arena-cat-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentCategory = e.currentTarget.dataset.cat;
        this.renderTiles(this.currentCategory);
        
        // Hide launch panel if changing category
        const panel = document.getElementById('arena-launch');
        if (panel) panel.classList.remove('visible');
      });
    });
  }

  renderTiles(category) {
    const container = document.getElementById('arena-tiles-container');
    if (!container) return;

    let filtered = this.games;
    if (category !== 'all') {
      filtered = this.games.filter(g => (g.category || 'arcade').toLowerCase() === category);
    }

    container.innerHTML = filtered.map(g => {
      return `
        <div class="arena-tile" data-id="${g.id}">
          <div class="tile-icon">${getGameIcon(g.id)}</div>
          <div class="tile-name">${g.name.toUpperCase()}</div>
          <div class="tile-diff">${g.difficulty || 'NORMAL'}</div>
        </div>
      `;
    }).join('');

    // Bind tile clicks
    const tiles = container.querySelectorAll('.arena-tile');
    tiles.forEach(tile => {
      tile.addEventListener('click', () => {
        tiles.forEach(t => t.classList.remove('selected'));
        tile.classList.add('selected');
        
        const gameId = tile.dataset.id;
        const game = this.games.find(g => g.id === gameId);
        if (game) this.showLaunchPanel(game);
      });
    });
  }

  initLaunchPanel() {
    const startBtn = document.getElementById('start-arena-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const panel = document.getElementById('arena-launch');
        if (panel) panel.classList.remove('visible');
        
        if (this.selectedLaunchGame) {
          // Normal Arena plays the SAME game 3 times with escalating speed
          this.startGauntlet([
            this.selectedLaunchGame.id, 
            this.selectedLaunchGame.id, 
            this.selectedLaunchGame.id
          ]);
        }
      });
    }
  }

  showLaunchPanel(game) {
    this.selectedLaunchGame = game;
    const panel = document.getElementById('arena-launch');
    const iconEl = document.getElementById('launch-icon');
    const nameEl = document.getElementById('launch-name');
    const descEl = document.getElementById('launch-desc');

    if (iconEl) iconEl.innerHTML = getGameIcon(game.id);
    if (nameEl) nameEl.innerText = game.name;
    if (descEl) descEl.innerText = game.description;

    if (panel) panel.classList.add('visible');
  }

  /* --- GAUNTLET EXECUTION ENGINE --- */

  startGauntlet(gameIdsSequence) {
    this.gauntletSequence = gameIdsSequence;
    this.currentRound = 1;
    this.roundScores = [0, 0, 0];
    this.startRound();
  }

  startRound() {
    const gameId = this.gauntletSequence[this.currentRound - 1];
    const game = this.games.find(g => g.id === gameId);
    
    let speed = 1.0;
    if (this.currentRound === 2) speed = 1.5;
    if (this.currentRound === 3) speed = 2.0;

    const title = `ROUND ${this.currentRound}/3 - ${game ? game.name.toUpperCase() : 'UNKNOWN'}`;

    const config = {
      isArena: true,
      speed: speed, // Passed to game engine
      title: title
    };

    if (window.launchGameModal) {
      window.launchGameModal(gameId, config);
    }
  }

  handleRoundComplete(score) {
    this.roundScores[this.currentRound - 1] = score;

    if (this.currentRound === 3) {
      this.showResultsScreen();
    } else {
      this.playCinematicTransition();
    }
  }

  playCinematicTransition() {
    const overlay = document.getElementById('round-transition');
    const titleEl = document.getElementById('rc-title');
    const nextEl = document.getElementById('rc-next-title');
    const scoreEl = document.getElementById('rc-score');
    const countEl = document.getElementById('rc-countdown');
    
    if (!overlay) return;

    if (titleEl) titleEl.innerText = `ROUND ${this.currentRound} COMPLETE`;
    if (nextEl) nextEl.innerText = `ROUND ${this.currentRound + 1} STARTING IN`;
    if (scoreEl) scoreEl.innerText = '0';
    if (countEl) countEl.innerText = '3';
    
    overlay.classList.add('active');
    
    // Score count up animation
    let obj = { val: 0 };
    if (window.gsap) {
      gsap.to(obj, {
        val: this.roundScores[this.currentRound - 1],
        duration: 1,
        ease: "power2.out",
        onUpdate: () => {
          if (scoreEl) scoreEl.innerText = Math.floor(obj.val).toLocaleString();
        }
      });
    } else {
      if (scoreEl) scoreEl.innerText = this.roundScores[this.currentRound - 1];
    }

    // Countdown sequence
    setTimeout(() => {
      let count = 3;
      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          if (countEl) countEl.innerText = count;
          if (window.gsap && countEl) {
            gsap.fromTo(countEl, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2)" });
          }
        } else {
          clearInterval(interval);
          this.currentRound++;
          overlay.classList.remove('active');
          
          // Next round logic
          if (window.closeGameModal) window.closeGameModal();
          setTimeout(() => {
            this.startRound();
            this.showSpeedFlash();
          }, 300);
        }
      }, 1000);
    }, 1500);
  }

  showSpeedFlash() {
    if (this.currentRound === 1) return;
    
    const flash = document.createElement('div');
    flash.innerText = this.currentRound === 2 ? '1.5× SPEED' : '2.0× SPEED';
    flash.style.position = 'fixed';
    flash.style.inset = 0;
    flash.style.display = 'flex';
    flash.style.alignItems = 'center';
    flash.style.justifyContent = 'center';
    flash.style.zIndex = 10001;
    flash.style.fontFamily = "'Press Start 2P', monospace";
    flash.style.fontSize = '48px';
    flash.style.color = 'var(--danger)';
    flash.style.textShadow = '0 0 30px var(--danger)';
    flash.style.pointerEvents = 'none';
    document.body.appendChild(flash);
    
    if (window.gsap) {
      gsap.fromTo(flash, { scale: 2, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.2, ease: "power2.out", onComplete: () => {
        gsap.to(flash, { opacity: 0, duration: 0.5, delay: 0.8, onComplete: () => flash.remove() });
      }});
    } else {
      setTimeout(() => flash.remove(), 1000);
    }
  }

  showResultsScreen() {
    if (window.closeGameModal) window.closeGameModal();
    
    const results = document.getElementById('arena-results');
    if (!results) return;

    const r1 = document.getElementById('res-r1-score');
    const r2 = document.getElementById('res-r2-score');
    const r3 = document.getElementById('res-r3-score');
    const tot = document.getElementById('res-total-score');

    if (r1) r1.innerText = this.roundScores[0].toLocaleString();
    if (r2) r2.innerText = this.roundScores[1].toLocaleString();
    if (r3) r3.innerText = this.roundScores[2].toLocaleString();
    
    const totalScore = this.roundScores.reduce((a,b) => a+b, 0);
    
    results.classList.add('active');
    
    // Save to history
    try {
      const history = JSON.parse(localStorage.getItem('cheatlabz_arena_history') || '[]');
      history.push({ score: totalScore, date: Date.now() });
      localStorage.setItem('cheatlabz_arena_history', JSON.stringify(history));
      this.initStats(); // Refresh stats in background
    } catch(e) {}
    
    if (window.gsap && tot) {
      let obj = { val: 0 };
      gsap.to(obj, {
        val: totalScore,
        duration: 1.5,
        delay: 0.5,
        ease: "power2.out",
        onUpdate: () => {
          tot.innerText = Math.floor(obj.val).toLocaleString();
        }
      });
    } else if (tot) {
      tot.innerText = totalScore.toLocaleString();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ArenaProtocol();
});
