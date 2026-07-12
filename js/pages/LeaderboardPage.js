import { initLeaderboard } from '../ui/leaderboard.js';

export default class LeaderboardPage {
  constructor() {
    this.html = `
  <!-- We load icons so they are available in GAME_ICONS globally -->
  

  <div class="lb-header container" style="padding-bottom: 24px;">
    <div class="lb-trophy-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ffd93d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
        <path d="M4 22h16"/>
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
      </svg>
    </div>
    <div class="lb-header-text">
      <h1 class="lb-title">HALL OF FAME</h1>
      <p>Analyze your stats, view achievements, and review coin transactions.</p>
    </div>
  </div>

  <!-- Profile Card Mount Point -->
  <div id="profile-card-mount" class="container"></div>

  <!-- Badges Row Mount Point -->
  <div id="badges-row-mount" class="container"></div>

  <div class="lb-tabs container">
    <button class="lb-tab active" data-tab="my-scores">MY RECORDS</button>
    <button class="lb-tab" data-tab="game-stats">GAME STATS</button>
    <button class="lb-tab" data-tab="coin-history">COIN HISTORY</button>
  </div>

  <main class="container" id="rankings-container" style="min-height: 200px;">
    <!-- Injected via JS -->
  </main>

  <!-- Danger Zone Mount Point -->
  <div id="danger-zone-mount" class="container"></div>

  <!-- Persistent Feedback Widget Mount Point -->
  <div id="feedback-widget-mount"></div>
    `;
  }
  async mount(params, container) {
    container.innerHTML = this.html;
    if (typeof initLeaderboard === 'function') {
      initLeaderboard();
    }
  }
  async unmount() {
    // Unbind events if necessary
  }
}
