export default class HomePage {
  constructor() {
    this.html = `
      <!-- Hero Section -->
      <section class="hero-cyber">
        <div class="hero-bg-parallax" id="hero-bg"></div>
        <canvas id="pixel-dust-canvas"></canvas>
        
        <div class="hero-content">
          <h1 class="glitch-title">CHEAT LABZ</h1>
          <p class="hero-subtitle">The underground arcade. 19 games. No rules. Just pure skill.</p>
          
          <div class="cta-row">
            <a href="/games" class="btn-enter-grid">Enter the Grid</a>
            <a href="/arena" class="btn-survive-arena">Survive Arena</a>
          </div>

          <div class="scroll-hint-chevron">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
      </section>

      <!-- Collectible Missions Section -->
      <section class="home-section">
        <div class="section-header-row">
          <div class="section-header-bar"></div>
          <h2 class="section-header-title">Active Missions</h2>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px;" id="missions-grid">
          <!-- Injected via JS -->
        </div>
      </section>

      <!-- Hot Games Momentum Carousel -->
      <section class="home-section" style="overflow: hidden; max-width: none; padding-left: 0; padding-right: 0;">
        <div class="section-header-wrapper">
          <div class="section-header-row">
            <div class="section-header-bar"></div>
            <h2 class="section-header-title">Trending Uplinks</h2>
            <span class="section-header-badge">8 games</span>
          </div>
        </div>
        
        <div class="carousel-wrapper">
          <div class="carousel-container" id="hot-carousel">
            <!-- Injected via JS -->
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 56px; position: relative; z-index: 10;">
          <a href="/ideas.html" class="btn-survive-arena" style="text-decoration: none; display: inline-block;">Submit your game idea</a>
        </div>
      </section>
    `;
  }

  async mount(params, container) {
    container.innerHTML = this.html;
    
    // We dynamically load home.js logic to not duplicate it
    // Wait, since we are moving to modules, we should import home.js initialization here
    // or just execute it directly.
    try {
      const homeLogic = await import('../ui/home.js');
      if (homeLogic.initHome) {
        homeLogic.initHome();
      }
    } catch(err) {
      console.warn("Failed to init home.js logic", err);
    }
  }

  async unmount() {
    // Cleanup if needed
    try {
      const homeLogic = await import('../ui/home.js');
      if (homeLogic.cleanupHome) {
        homeLogic.cleanupHome();
      }
    } catch(err) {
    }
  }
}
