import { GAME_ICONS } from '../../assets/icons/game-icons.js';

function getGameIcon(gameId) {
  return GAME_ICONS[gameId] || GAME_ICONS['default'];
}

class HomeUI {
  constructor() {
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

    // Grab 3 random games for daily missions
    const missionGames = window.GAMES ? [...window.GAMES].sort(() => 0.5 - Math.random()).slice(0, 3) : [];
    
    grid.innerHTML = missionGames.map((g, i) => `
      <div class="mission-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <h3 style="font-size: 14px; margin: 0; color: var(--cyan); font-family: 'Press Start 2P', monospace; line-height: 1.4;">${g.name}</h3>
          <span style="background: rgba(239, 68, 68, 0.2); color: var(--danger); padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">+500 AP</span>
        </div>
        <p style="font-size: 12px; color: var(--muted); margin-bottom: 24px; line-height: 1.5;">Achieve a score of 500 or higher in ${g.name} to complete this bounty.</p>
        <button class="btn-play-hidden" onclick="window.launchGameModal('${g.id}')" style="width: 100%; font-size: 12px;">ACCEPT BOUNTY</button>
      </div>
`).join('');
  }

  renderCarousel() {
    const carousel = document.getElementById('hot-carousel');
    if (!carousel) return;

    const hotGames = window.GAMES ? window.GAMES.slice(0, 8) : [];
    
    carousel.innerHTML = hotGames.map(g => {
      const icon = getGameIcon(g.id);
      // Fake deep metrics
      const topScore = Math.floor(Math.random() * 90000) + 10000;
      const completion = Math.floor(Math.random() * 40) + 10;
      const online = Math.floor(Math.random() * 500) + 50;

      return `
        <div class="carousel-item">
          <div class="hot-card">
            <div class="game-icon" style="margin: 0 auto 24px auto;">${icon}</div>
            <div class="hot-card-title">${g.name}</div>
            
            <div class="hot-card-metrics">
              <div class="metric-row"><span>PERSONAL BEST</span><span style="color: #fff;">0</span></div>
              <div class="metric-row"><span>GLOBAL TOP</span><span style="color: var(--neon);">${topScore}</span></div>
              <div class="metric-row"><span>AVG. CLEAR</span><span style="color: #fff;">${completion}%</span></div>
              <div class="metric-row"><span>ACTIVE NOW</span><span style="color: var(--cyan);">${online}</span></div>
            </div>
            
            <div class="hot-card-footer">
              <button class="btn-play-hidden" onclick="window.launchGameModal('${g.id}')">PLAY NOW</button>
              <div class="btn-question">
                ?
                <div class="premium-tooltip">
                  <h4 style="margin: 0 0 8px 0; color: var(--neon); font-family: 'Press Start 2P', monospace; font-size: 10px; line-height: 1.4;">${g.name}</h4>
                  <p style="margin: 0 0 12px 0; font-size: 11px; color: var(--muted); line-height: 1.5;">${g.description || 'Survive the grid.'}</p>
                  <div style="font-family: 'JetBrains Mono', monospace; font-size: 10px;">
                    <div style="margin-bottom: 4px;"><span style="color: var(--cyan);">CTRL:</span> Mouse / KB</div>
                    <div style="margin-bottom: 4px;"><span style="color: var(--cyan);">TIME:</span> ~3 Mins</div>
                    <div><span style="color: var(--danger);">DIFF:</span> ${g.difficulty || 'MEDIUM'}</div>
                  </div>
                </div>
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
