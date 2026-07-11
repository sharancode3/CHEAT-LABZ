import { GAME_ICONS } from '../../assets/icons/game-icons.js';
import { checkStreak, getStreak, getCoins, formatCoins, isGameLocked } from '../core/storage.js';

function getGameIcon(gameId) {
  return GAME_ICONS[gameId] || GAME_ICONS['default'];
}

class HomeUI {
  constructor() {
    window.homeInstance = this;
    this.initHeroCanvas();
    this.initParallax();
    this.renderMissions();
    this.renderCarousel();
  }

  initHeroCanvas() {
    const canvas = document.getElementById('pixel-dust-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = document.querySelector('.hero-cyber').offsetHeight;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = document.querySelector('.hero-cyber').offsetHeight;
    });

    const particles = [];
    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5 + 0.2, // Drifting down slowly
        alpha: Math.random() * 0.5 + 0.1
      });
    }

    let mouseX = width / 2;
    let mouseY = height / 2;
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    let animationId = null;
    let isVisible = true;

    function animate() {
      if (!isVisible) return;
      ctx.clearRect(0, 0, width, height);
      
      particles.forEach(p => {
        // Slight mouse repulsion
        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 100) {
          p.x -= (dx / dist) * 0.5;
          p.y -= (dy / dist) * 0.5;
        }

        p.x += p.speedX;
        p.y += p.speedY;

        if (p.y > height) p.y = 0;
        if (p.x > width) p.x = 0;
        if (p.x < 0) p.x = width;

        ctx.fillStyle = 'rgba(6, 182, 212,' + p.alpha + ')';
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });

      if (window.animEnabled !== false) {
        animationId = requestAnimationFrame(animate);
      }
    }
    
    // Performance optimization: pause animation when out of view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        isVisible = entry.isIntersecting;
        if (isVisible && window.animEnabled !== false) {
          if (animationId) cancelAnimationFrame(animationId);
          animate();
        }
      });
    }, { threshold: 0 });
    
    observer.observe(document.querySelector('.hero-cyber'));
    
    // Re-check animation preference periodically
    setInterval(() => {
      if (window.animEnabled === false && animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      } else if (window.animEnabled !== false && isVisible && !animationId) {
        animate();
      }
    }, 1000);
  }

  initParallax() {
    const bg = document.getElementById('hero-bg');
    if (!bg) return;
    document.addEventListener('mousemove', (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      if (window.gsap) {
        gsap.to(bg, { x: x, y: y, duration: 1, ease: 'power2.out' });
      } else {
        bg.style.transform = `translate(${x}px, ${y}px)`;
      }
    });
  }

  renderMissions() {
    const grid = document.getElementById('missions-grid');
    if (!grid) return;

    if (!window.GAMES) return;

    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Pick 3 games deterministically from DIFFERENT categories if possible
    const categories = ['arcade', 'skill', 'puzzle', 'racing'];
    const selectedGames = [];
    categories.forEach((cat, i) => {
      const catGames = window.GAMES.filter(g => g.category.toLowerCase() === cat);
      if (catGames.length > 0) {
        const idx = (seed * (i + 5) * 31337) % catGames.length;
        selectedGames.push(catGames[Math.floor(idx)]);
      }
    });
    
    // Fallback to unique games if categories are empty or similar
    while (selectedGames.length < 3 && window.GAMES.length > selectedGames.length) {
      const fallbackIdx = (seed * (selectedGames.length + 1) * 7) % window.GAMES.length;
      const g = window.GAMES[Math.floor(fallbackIdx)];
      if (!selectedGames.includes(g)) {
        selectedGames.push(g);
      }
    }
    
    const missionGames = selectedGames.slice(0, 3);
    
    const getTargetScore = (difficulty) => {
      const diff = (difficulty || 'medium').toLowerCase();
      if (diff === 'easy') return 200;
      if (diff === 'hard') return 1000;
      return 500;
    };

    grid.innerHTML = missionGames.map((g, i) => {
      const target = getTargetScore(g.difficulty);
      const bountyKey = `cheatLabz_bounty_${g.id}`;
      let bounty = null;
      try {
        const raw = localStorage.getItem(bountyKey);
        if (raw) {
          bounty = JSON.parse(raw);
          // Check expiration
          if (Date.now() > bounty.expiresAt) {
            localStorage.removeItem(bountyKey);
            bounty = null;
          }
        }
      } catch(e) {}

      let badgeHtml = '<span class="mission-card-ap">+500 AP</span>';
      let btnHtml = `<button class="btn-mission-accept" onclick="window.acceptBounty('${g.id}', ${target})">Accept Bounty</button>`;
      let statusText = `Achieve a score of ${target} or higher in ${g.name} to complete this bounty.`;
      let isAccepted = false;

      if (bounty) {
        if (bounty.completed) {
          isAccepted = true;
          statusText = `You successfully completed this bounty and earned 500 AP!`;
          btnHtml = `
            <div class="mission-card-accepted-row">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>Bounty Completed</span>
            </div>
          `;
        } else if (bounty.accepted) {
          isAccepted = true;
          statusText = `Active bounty! Target score: ${target} or higher.`;
          btnHtml = `
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div class="mission-card-accepted-row">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Bounty Accepted</span>
              </div>
              <button class="btn-mission-accept" onclick="window.launchGameModal('${g.id}')" style="background: var(--accent); border: none; color: white;">Play Now</button>
            </div>
          `;
        }
      }

      return `
        <div class="mission-card ${isAccepted ? 'accepted-state' : ''}">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 class="mission-card-title">${g.name}</h3>
            ${badgeHtml}
          </div>
          <p class="mission-card-desc">${statusText}</p>
          ${btnHtml}
        </div>
      `;
    }).join('');
  }

  renderCarousel() {
    const carousel = document.getElementById('hot-carousel');
    if (!carousel) return;

    const hotGames = window.GAMES ? window.GAMES.slice(0, 8) : [];
    
    carousel.innerHTML = hotGames.map(g => {
      const icon = getGameIcon(g.id);
      
      let highScore = 0;
      try {
        const saved = localStorage.getItem('cheatLabz_' + g.id);
        if (saved) {
          const obj = JSON.parse(saved);
          highScore = obj?.score || 0;
        }
      } catch (e) {}

      return `
        <div class="carousel-item" style="position: relative;">
          <div class="hot-card" style="--card-accent: ${g.accent || '#6c63ff'}; position: relative;" onclick="window.launchGameModal('${g.id}')">
            <div class="hot-card-icon">${icon}</div>
            <div class="hot-card-title">${g.name}</div>
            
            <div class="hot-card-popup" onclick="event.stopPropagation();">
              <div class="popup-title">${g.name}</div>
              <div class="popup-stats-list">
                <div class="popup-stat-row">
                  <span class="popup-stat-label">CATEGORY</span>
                  <span class="popup-stat-value">${(g.category || 'ARCADE').toUpperCase()}</span>
                </div>
                <div class="popup-stat-row">
                  <span class="popup-stat-label">DIFFICULTY</span>
                  <span class="popup-stat-value">${(g.difficulty || 'MEDIUM').toUpperCase()}</span>
                </div>
                <div class="popup-stat-row">
                  <span class="popup-stat-label">PLAYERS</span>
                  <span class="popup-stat-value">${g.maxPlayers || 1}P</span>
                </div>
                <div class="popup-stat-row">
                  <span class="popup-stat-label">HIGH SCORE</span>
                  <span class="popup-stat-value">${highScore}</span>
                </div>
              </div>
              <div class="popup-actions" style="display: flex; gap: 8px; width: 100%;">
                <button class="popup-play-btn" onclick="event.stopPropagation(); window.launchGameModal('${g.id}')">Play Now</button>
                <button class="popup-info-btn" onclick="event.stopPropagation(); window.location.href='games.html?id=${g.id}'" title="Game details">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Implement smooth drag scrolling for carousel
    let isDown = false;
    let startX;
    let scrollLeft;

    carousel.addEventListener('mousedown', (e) => {
      isDown = true;
      carousel.style.cursor = 'grabbing';
      startX = e.pageX - carousel.offsetLeft;
      scrollLeft = carousel.scrollLeft;
    });
    carousel.addEventListener('mouseleave', () => {
      isDown = false;
      carousel.style.cursor = 'grab';
    });
    carousel.addEventListener('mouseup', () => {
      isDown = false;
      carousel.style.cursor = 'grab';
    });
    carousel.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - carousel.offsetLeft;
      const walk = (x - startX) * 2; // Scroll speed
      carousel.scrollLeft = scrollLeft - walk;
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new HomeUI();
});

window.acceptBounty = (gameId, target) => {
  const now = new Date();
  const midnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0));
  const expiresAt = midnight.getTime();
  
  const bounty = {
    gameId,
    target,
    accepted: true,
    acceptedAt: Date.now(),
    completed: false,
    expiresAt
  };
  localStorage.setItem(`cheatLabz_bounty_${gameId}`, JSON.stringify(bounty));
  
  // Re-render
  if (window.homeInstance) {
    window.homeInstance.renderMissions();
  }
  
  // Launch the game modal
  if (window.launchGameModal) {
    window.launchGameModal(gameId);
  }
};
