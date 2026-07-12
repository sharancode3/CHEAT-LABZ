export default class GamesPage {
  constructor() {
    this.html = `
      <div class="library-header">
        <div>
          <h1 class="library-title">GAME LIBRARY</h1>
          <p class="library-sub">Pick your poison. 19 ways to test your limits.</p>
        </div>
        <div class="library-stats">
          <div class="lib-stat">
            <span class="lib-stat-num" id="total-games-stat">19</span>
            <span class="lib-stat-label">Games</span>
          </div>
          <div class="lib-stat">
            <span class="lib-stat-num" id="total-runs-stat">0</span>
            <span class="lib-stat-label">Total Runs</span>
          </div>
          <div class="lib-stat">
            <span class="lib-stat-num" id="best-score-stat">0</span>
            <span class="lib-stat-label">Best Score</span>
          </div>
        </div>
      </div>

      <div class="filter-bar">
        <div class="filter-tabs" id="filter-tabs-container">
          <!-- Injected via JS -->
        </div>
        
        <div class="filter-controls">
          <div class="search-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="search-input" placeholder="Search games...">
          </div>
          <select class="sort-select" id="sort-select">
            <option value="pop">Trending</option>
            <option value="new">Newest</option>
            <option value="az">A-Z</option>
            <option value="easy">Easiest</option>
            <option value="hard">Hardest</option>
          </select>
          <button class="shuffle-btn" id="shuffle-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line><line x1="4" y1="4" x2="9" y2="9"></line></svg>
            SHUFFLE
          </button>
        </div>
      </div>

      <div class="showing-text" id="showing-text">Showing 19 of 19 games</div>

      <div class="games-grid" id="games-grid">
        <!-- Injected via JS -->
      </div>
    `;
  }

  async mount(params, container) {
    container.innerHTML = this.html;
    
    // Add page-specific styles if they aren't globally available
    if (!document.getElementById('games-page-styles')) {
      const style = document.createElement('style');
      style.id = 'games-page-styles';
      style.textContent = `
        /* Styles from games.html */
        .library-header { max-width: 1100px; margin: 80px auto 40px; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; }
        .library-title { font-family: 'Press Start 2P', monospace; font-size: 28px; color: #fff; margin-bottom: 12px; text-shadow: 0 0 20px var(--cyan); }
        .library-sub { color: var(--muted); font-size: 15px; }
        .library-stats { display: flex; gap: 32px; }
        .lib-stat { display: flex; flex-direction: column; align-items: flex-end; }
        .lib-stat-num { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: bold; color: var(--neon); }
        .lib-stat-label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px; }
        .filter-bar { max-width: 1100px; margin: 0 auto 16px; padding: 0 24px; display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .filter-tab { padding: 8px 16px; border-radius: 999px; border: 1px solid #2a2a3a; background: transparent; color: #8888a8; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 150ms; display: flex; align-items: center; gap: 6px; }
        .filter-tab.active { background: #6c63ff; border-color: #6c63ff; color: white; }
        .filter-tab .count { background: rgba(255,255,255,0.15); border-radius: 999px; padding: 1px 7px; font-size: 11px; }
        .filter-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
        .search-wrap { position: relative; display: flex; align-items: center; }
        .search-wrap svg { position: absolute; left: 12px; color: #8888a8; width: 16px; height: 16px; }
        .search-wrap input { background: #16161f; border: 1px solid #2a2a3a; padding: 10px 16px 10px 36px; border-radius: 8px; color: white; font-family: 'Inter', sans-serif; font-size: 13px; width: 200px; outline: none; transition: border-color 0.2s; }
        .search-wrap input:focus { border-color: #6c63ff; }
        .sort-select { background: #16161f; border: 1px solid #2a2a3a; padding: 10px 16px; border-radius: 8px; color: white; font-family: 'Inter', sans-serif; font-size: 13px; outline: none; cursor: pointer; }
        .shuffle-btn { background: #16161f; border: 1px solid #2a2a3a; padding: 10px 16px; border-radius: 8px; color: white; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; }
        .shuffle-btn:hover { background: #2a2a3a; }
        .showing-text { max-width: 1100px; margin: 0 auto 40px; padding: 0 24px; color: #8888a8; font-family: 'Inter', sans-serif; font-size: 13px; }
        .games-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; max-width: 1100px; margin: 0 auto 100px; padding: 0 24px; }
        .game-card { background: #16161f; border: 1px solid #2a2a3a; border-radius: 16px; padding: 24px; cursor: pointer; position: relative; transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease; overflow: hidden; display: flex; flex-direction: column; }
        .game-card::before { content: ''; position: absolute; inset: 0; border-radius: 16px; opacity: 0; background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(108,99,255,0.08), transparent 60%); transition: opacity 200ms; pointer-events: none; z-index: 0; }
        .game-card:hover { transform: translateY(-4px); border-color: #3d3d55; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
        .game-card:hover::before { opacity: 1; }
        .card-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; position: relative; z-index: 2; }
        .card-badges-col { display: flex; flex-direction: column; gap: 6px; align-items: flex-end; }
        .badge-tag { padding: 4px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; }
        .badge-cat { background: rgba(6,182,212,0.1); color: var(--cyan); border: 1px solid rgba(6,182,212,0.3); }
        .badge-diff { background: rgba(239,68,68,0.1); color: var(--danger); border: 1px solid rgba(239,68,68,0.3); }
        .card-title-text { font-family: 'Press Start 2P', monospace; font-size: 14px; color: #fff; margin-bottom: 8px; position: relative; z-index: 2; }
        .card-desc-text { font-size: 13px; color: var(--muted); line-height: 1.5; margin-bottom: 20px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; flex-grow: 1; position: relative; z-index: 2; }
        .card-divider { height: 1px; background: #2a2a3a; margin-bottom: 16px; position: relative; z-index: 2; }
        .card-stats-row { display: flex; align-items: center; gap: 12px; font-family: 'Inter', sans-serif; font-size: 12px; color: #8888a8; position: relative; z-index: 2; margin-bottom: 24px; }
        .card-stats-row span { color: #fff; font-weight: 600; }
        .info-btn { position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 50%; background: rgba(255,255,255,0.05); border: 1px solid #3d3d55; color: #8888a8; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 150ms; cursor: pointer; font-size: 14px; font-family: 'Inter', sans-serif; z-index: 10; }
        .game-card:hover .info-btn { opacity: 1; }
        .info-btn:hover { background: #3d3d55; color: #fff; }
        .game-card .play-btn { width: 100%; padding: 12px; border-radius: 8px; background: #6c63ff; color: #fff; font-weight: 800; font-family: 'Inter', sans-serif; font-size: 13px; border: none; cursor: pointer; opacity: 0; transform: translateY(8px); transition: opacity 200ms ease, transform 200ms ease, background 200ms; position: absolute; bottom: 24px; left: 24px; width: calc(100% - 48px); z-index: 5; }
        .game-card:hover .play-btn { opacity: 1; transform: translateY(0); }
        .game-card .play-btn:hover { background: #8b5cf6; }
        .score-tooltip { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px); background: #1e1e2a; border: 1px solid #3d3d55; border-radius: 12px; padding: 12px 16px; width: 200px; opacity: 0; pointer-events: none; transition: opacity 150ms ease, transform 150ms ease; z-index: 100; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .game-card:hover .score-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }
        .tooltip-title { font-size: 10px; color: #8888a8; font-weight: bold; letter-spacing: 1px; margin-bottom: 8px; text-transform: uppercase; }
        .tooltip-row { display: flex; align-items: center; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
        .tooltip-row:last-child { margin-bottom: 0; }
        .tooltip-empty { font-size: 12px; color: var(--muted); font-style: italic; }
        .rank-1 { color: #ffd700; }
        .rank-2 { color: #c0c0c0; }
        .rank-3 { color: #cd7f32; }
        .card-overlay { position: absolute; inset: 0; background: rgba(22, 22, 31, 0.98); backdrop-filter: blur(10px); border-radius: 16px; z-index: 20; padding: 24px; display: flex; flex-direction: column; transform: translateY(100%); transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1); }
        .card-overlay.open { transform: translateY(0); }
        .overlay-close { position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #8888a8; font-size: 20px; cursor: pointer; padding: 4px; }
        .overlay-close:hover { color: #fff; }
        .overlay-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .overlay-title { font-family: 'Press Start 2P', monospace; font-size: 12px; color: #fff; }
        .overlay-desc { font-size: 12px; color: var(--muted); line-height: 1.5; margin-bottom: 24px; }
        .overlay-section-title { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--neon); margin-bottom: 8px; text-transform: uppercase; }
        .overlay-controls { background: rgba(0,0,0,0.4); border: 1px solid #2a2a3a; border-radius: 8px; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #fff; }
        .ctrl-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .ctrl-row:last-child { margin-bottom: 0; }
        .ctrl-row span:last-child { color: var(--cyan); }
      `;
      document.head.appendChild(style);
    }
    
    try {
      const gamesLogic = await import('../ui/games.js');
      if (gamesLogic.initGames) {
        gamesLogic.initGames();
      }
    } catch(err) {
      console.warn("Failed to init games.js logic", err);
    }
  }

  async unmount() {
    try {
      const gamesLogic = await import('../ui/games.js');
      if (gamesLogic.cleanupGames) {
        gamesLogic.cleanupGames();
      }
    } catch(err) {
    }
  }
}
