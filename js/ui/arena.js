import { showToast } from '../core/notifications.js';
import { GAME_ICONS } from '../../assets/icons/game-icons.js';
import { isGameLocked, awardCoins } from '../core/storage.js';

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
    
    // Size canvas to cover full screen fixed
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '0';
    canvas.style.pointerEvents = 'none';

    let width, height;
    const particles = [];
    
    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // 80 aggressive red/orange pulsing particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.0, // Velocity x2
        vy: ((Math.random() - 0.5) * 1.0) - 1.0, // Floating upwards twice as fast
        size: Math.random() > 0.8 ? Math.random() * 2 + 2 : Math.random() * 1.5 + 1, // 3-4px vs 1-2.5px
        theta: Math.random() * Math.PI * 2, // angle for opacity pulsing
        speedTheta: Math.random() * 0.05 + 0.02,
        color: Math.random() > 0.5 ? '#ff4757' : '#ffa502' // Red vs Orange tint
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.theta += p.speedTheta;
        
        if (p.y < 0) {
          p.y = height;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        // Oscillate opacity between 0.3 and 0.8 using sine wave
        const alpha = 0.55 + Math.sin(p.theta) * 0.25;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
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

    // Daily seed formula (deterministic per day)
    const today = new Date();
    const seed = today.getFullYear() * 10000 + 
                 (today.getMonth()+1) * 100 + 
                 today.getDate();
    
    // Pick 3 games from DIFFERENT categories
    const categories = ['arcade','skill','puzzle','racing'];
    const selectedGames = [];
    
    categories.forEach((cat, i) => {
      const catGames = this.games.filter(g => 
        g.category.toLowerCase() === cat
      );
      if (catGames.length > 0) {
        const idx = (seed * (i+1) * 31337) % catGames.length;
        selectedGames.push(catGames[Math.floor(idx)]);
      }
    });
    
    this.dailyGames = selectedGames.slice(0, 3);

    container.innerHTML = this.dailyGames.map((g, i) => {
      const icon = getGameIcon(g.id);
      const isLast = i === 2;
      return `
        <div class="dac-game-icon">${icon}</div>
        ${!isLast ? '<div class="dac-arrow">→</div>' : ''}
      `;
    }).join('');

    // Check if today's gauntlet was already shown / completed
    const todayKey = 'cheatLabz_gauntlet_' + 
      new Date().toISOString().slice(0,10);
    
    let gauntletState = null;
    try {
      const raw = localStorage.getItem(todayKey);
      if (raw) gauntletState = JSON.parse(raw);
    } catch(e) {}

    if (!gauntletState) {
      gauntletState = {
        games: this.dailyGames.map(g => g.id),
        completed: false,
        score: 0
      };
      localStorage.setItem(todayKey, JSON.stringify(gauntletState));
    }

    if (gauntletState.completed) {
      playBtn.innerText = 'COMPLETED';
      playBtn.disabled = true;
      playBtn.setAttribute('disabled', 'true');
      playBtn.style.opacity = '0.5';
    } else {
      playBtn.innerText = 'PLAY CHALLENGE';
      playBtn.disabled = false;
      playBtn.removeAttribute('disabled');
      playBtn.style.opacity = '1';
    }

    playBtn.addEventListener('click', () => {
      if (gauntletState.completed) return;
      this.isDailyGauntlet = true;
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
        this.hideLaunchPanel();
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

    const tiles = container.querySelectorAll('.arena-tile');
    if (tiles.length > 0 && window.gsap) {
      // Filter out animation
      gsap.to(tiles, {
        opacity: 0,
        scale: 0.9,
        duration: 0.15,
        stagger: 0.01,
        onComplete: () => {
          this._renderTilesHTML(container, filtered);
        }
      });
    } else {
      this._renderTilesHTML(container, filtered);
    }
  }

  _renderTilesHTML(container, filtered) {
    container.innerHTML = filtered.map(g => {
      const isLocked = isGameLocked(g.id);
      const isSelected = this.selectedGameId === g.id;
      const iconColor = isSelected ? '#6c63ff' : '#8888a8';
      
      return `
        <div class="arena-tile ${isLocked ? 'locked' : ''} ${isSelected ? 'selected' : ''}" data-id="${g.id}" style="${isLocked ? 'opacity: 0.5;' : ''}">
          <div class="tile-icon" style="color: ${iconColor};">${getGameIcon(g.id)}</div>
          <div class="tile-name">${g.name.toUpperCase()}</div>
          <div class="tile-diff">${g.difficulty || 'NORMAL'}</div>
          ${isLocked ? '<div style="font-size: 10px; color: var(--text-muted); font-family: \'JetBrains Mono\', monospace; margin-top: 4px;">[ LOCKED ]</div>' : ''}
        </div>
      `;
    }).join('');

    const newTiles = container.querySelectorAll('.arena-tile');
    
    // Bind clicks
    newTiles.forEach(tile => {
      tile.addEventListener('click', () => {
        const gameId = tile.dataset.id;
        
        if (isGameLocked(gameId)) {
          showToast('This module is locked! Unlock it in the library first.', 'warning');
          return;
        }

        if (this.selectedGameId === gameId) {
          this.hideLaunchPanel();
        } else {
          this.selectedGameId = gameId;
          const game = this.games.find(g => g.id === gameId);
          if (game) this.showLaunchPanel(game);
        }
        
        this.renderTiles(this.currentCategory);
      });
    });

    if (window.gsap) {
      gsap.fromTo(newTiles, {
        opacity: 0,
        scale: 0.9
      }, {
        opacity: 1,
        scale: 1,
        duration: 0.2,
        stagger: 0.05,
        ease: "power2.out"
      });
    }
  }

  initLaunchPanel() {
    const startBtn = document.getElementById('start-arena-btn');
    if (startBtn) {
      // Initially disabled
      startBtn.disabled = true;
      startBtn.setAttribute('disabled', 'true');
      
      startBtn.addEventListener('click', () => {
        if (!this.selectedLaunchGame) return;
        const panel = document.getElementById('arena-launch');
        if (panel) panel.classList.remove('visible');
        
        this.isDailyGauntlet = false;
        // Normal Arena plays the SAME game 3 times with escalating speed
        this.startGauntlet([
          this.selectedLaunchGame.id, 
          this.selectedLaunchGame.id, 
          this.selectedLaunchGame.id
        ]);
      });
    }
  }

  showLaunchPanel(game) {
    this.selectedLaunchGame = game;
    const panel = document.getElementById('arena-launch');
    const iconEl = document.getElementById('launch-icon');
    const nameEl = document.getElementById('launch-name');
    const descEl = document.getElementById('launch-desc');
    const startBtn = document.getElementById('start-arena-btn');

    if (iconEl) iconEl.innerHTML = getGameIcon(game.id);
    if (nameEl) nameEl.innerText = game.name;
    if (descEl) descEl.innerText = game.description;

    if (startBtn) {
      startBtn.disabled = false;
      startBtn.removeAttribute('disabled');
    }

    if (panel) panel.classList.add('visible');
  }

  hideLaunchPanel() {
    this.selectedLaunchGame = null;
    this.selectedGameId = null;
    const panel = document.getElementById('arena-launch');
    const startBtn = document.getElementById('start-arena-btn');
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.setAttribute('disabled', 'true');
    }
    if (panel) panel.classList.remove('visible');
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

    // Award 30 coins for round completion
    awardCoins(30, `Arena Round ${this.currentRound} complete`);

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

    // Award series completion coins
    if (this.isDailyGauntlet) {
      awardCoins(100, 'Daily Gauntlet completed');
      
      const todayKey = 'cheatLabz_gauntlet_' + new Date().toISOString().slice(0, 10);
      try {
        const raw = localStorage.getItem(todayKey);
        if (raw) {
          const state = JSON.parse(raw);
          state.completed = true;
          state.score = totalScore;
          localStorage.setItem(todayKey, JSON.stringify(state));
        }
      } catch(e) {}

      // Refresh play button in UI
      const playBtn = document.getElementById('btn-daily-play');
      if (playBtn) {
        playBtn.innerText = 'COMPLETED';
        playBtn.disabled = true;
        playBtn.setAttribute('disabled', 'true');
        playBtn.style.opacity = '0.5';
      }
    } else {
      awardCoins(200, 'Arena 3-round finish');
    }
    
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

export function initArena() {
  new ArenaProtocol();
}

