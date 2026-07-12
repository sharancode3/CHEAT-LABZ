import router from '../core/router.js';
import { SocketClient as socketClient } from '../core/socket-client.js';
import GAMES_DATA from '../core/catalog.js';

export default class GamePage {
  constructor() {
    this.container = null;
    this.removeGuard = null;
    this.gameInfo = null;
    this.roomCode = null;
    this.mode = null; // 'pvp' or 'bot'
    this.socket = socketClient;
    this.disconnectTimer = null;
    this.countdownSeconds = 60;
  }

  async mount(params, container) {
    this.container = container;
    const urlParams = new URLSearchParams(window.location.search);
    this.roomCode = urlParams.get('code');
    this.mode = urlParams.get('mode') || 'pvp';
    const gameId = urlParams.get('game');
    
    // In actual implementation, we might get gameId from room state if it's PvP,
    // or from URL if it's bot mode starting fresh.
    this.gameInfo = GAMES_DATA.find(g => g.id === gameId) || GAMES_DATA[0];

    // Hide global navbar for full immersion
    const navMount = document.getElementById('navbar-mount');
    if (navMount) navMount.style.display = 'none';

    this.render();
    this.bindEvents();

    // Navigation guard
    this.removeGuard = router.addGuard(this.navigationGuard.bind(this));
    
    // Make sure we're in the room or tell socket we are ready to play
    // In a real flow, the lobby transitioned us here, so the server already knows.
  }

  async unmount() {
    if (this.removeGuard) this.removeGuard();
    
    // Restore navbar
    const navMount = document.getElementById('navbar-mount');
    if (navMount) navMount.style.display = 'block';
    
    if (this.disconnectTimer) clearInterval(this.disconnectTimer);
    
    // Disconnect event handlers if any
  }

  async navigationGuard() {
    return new Promise((resolve) => {
      this.showGuardDialog(resolve);
    });
  }

  showGuardDialog(resolveFn) {
    const overlay = this.container.querySelector('.nav-guard-overlay');
    if (!overlay) {
      resolveFn(true);
      return;
    }
    
    overlay.style.display = 'flex';
    // Trigger reflow
    void overlay.offsetWidth;
    overlay.classList.add('visible');

    const btnStay = overlay.querySelector('.btn-nav-stay');
    const btnLeave = overlay.querySelector('.btn-nav-leave');

    const handleStay = () => {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.style.display = 'none', 200);
      btnStay.removeEventListener('click', handleStay);
      btnLeave.removeEventListener('click', handleLeave);
      resolveFn(false); // Reject navigation
    };

    const handleLeave = () => {
      // User confirms leaving
      // Tell server we left/forfeit
      if (this.socket.connected) {
        this.socket.emit('room:leave', { code: this.roomCode });
      }
      overlay.classList.remove('visible');
      setTimeout(() => overlay.style.display = 'none', 200);
      btnStay.removeEventListener('click', handleStay);
      btnLeave.removeEventListener('click', handleLeave);
      
      // Temporarily remove guard so router can proceed
      if (this.removeGuard) this.removeGuard();
      resolveFn(true); // Allow navigation
    };

    btnStay.addEventListener('click', handleStay);
    btnLeave.addEventListener('click', handleLeave);
  }

  render() {
    const oppName = this.mode === 'bot' ? 'BOT (Medium)' : 'Opponent';
    
    this.container.innerHTML = `
      <div id="game-page">
        <!-- Top Bar -->
        <div class="game-top-bar">
          <div class="top-bar-left">
            <button class="btn-game-back" aria-label="Quit Game">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          </div>
          
          <div class="top-bar-center">
            <h1 class="game-name-label">${this.gameInfo.title}</h1>
            <p class="game-round-label" id="round-label">ROUND 1</p>
          </div>
          
          <div class="top-bar-right">
            <div class="score-display">
              <span class="score-you" id="score-you">0</span>
              <span class="score-divider">—</span>
              <div class="score-opponent-wrap">
                <span class="score-opponent" id="score-opponent">0</span>
                <span class="opponent-name">${oppName}</span>
                <div class="conn-status" id="opp-conn-status"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Canvas Area -->
        <div class="game-canvas-container">
          <div class="game-canvas-wrapper" id="canvas-wrapper">
            <!-- Canvas mounts here in Task 7 part 2 -->
          </div>
          
          <!-- Disconnect Overlay -->
          <div class="disconnect-overlay" id="disconnect-overlay">
            <div class="disconnect-card">
              <h2 class="disconnect-title">Opponent Disconnected</h2>
              <p class="disconnect-text">Waiting for reconnection...</p>
              <div class="countdown-ring" id="disconnect-countdown">60</div>
              <button class="btn-claim-victory" id="btn-claim-victory">CLAIM VICTORY</button>
            </div>
          </div>

          <!-- Round Transition Overlay -->
          <div class="round-overlay" id="round-overlay">
            <div class="round-card">
              <p class="round-label" id="ro-label">ROUND 1 COMPLETE</p>
              <h2 class="round-winner" id="ro-winner">YOU WIN</h2>
              <div class="round-scores" id="ro-scores">YOU 1 — THEM 0</div>
              <p class="round-next" id="ro-next">ROUND 2 STARTING IN 3...</p>
            </div>
          </div>
        </div>

        <!-- Navigation Guard Overlay -->
        <div class="nav-guard-overlay" style="display: none;">
          <div class="nav-guard-card">
            <h2 class="nav-guard-title">Leave the game?</h2>
            <p class="nav-guard-text">Your opponent will win by forfeit.</p>
            <div class="nav-guard-actions">
              <button class="btn-nav-stay">STAY</button>
              <button class="btn-nav-leave">LEAVE</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const backBtn = this.container.querySelector('.btn-game-back');
    backBtn.addEventListener('click', () => {
      // Use router.navigate which will trigger our guard
      router.navigate('/challenge');
    });

    const claimBtn = this.container.querySelector('#btn-claim-victory');
    claimBtn.addEventListener('click', () => {
      this.claimVictory();
    });

    // Socket listeners for game state
    this.socket.on('game:round_complete', (data) => {
      this.showRoundTransition(data);
    });

    this.socket.on('game:over', (data) => {
      // In a real app, transition to results page with full data
      // For now, simulate navigate
      setTimeout(() => {
        if (this.removeGuard) this.removeGuard();
        router.navigate(`/challenge/results?code=${this.roomCode}&game=${this.gameInfo.id}`);
      }, 2000);
    });

    this.socket.on('room:player_left', (data) => {
      if (this.mode === 'pvp') {
        this.handleOpponentDisconnect();
      }
    });

    this.socket.on('room:player_joined', (data) => {
      if (this.mode === 'pvp') {
        this.handleOpponentReconnect();
      }
    });
  }

  handleOpponentDisconnect() {
    const status = this.container.querySelector('#opp-conn-status');
    if (status) status.classList.add('reconnecting');
    
    const overlay = this.container.querySelector('#disconnect-overlay');
    if (overlay) overlay.classList.add('visible');

    const countdownEl = this.container.querySelector('#disconnect-countdown');
    const claimBtn = this.container.querySelector('#btn-claim-victory');
    
    this.countdownSeconds = 60;
    if (countdownEl) countdownEl.textContent = this.countdownSeconds;
    if (claimBtn) claimBtn.classList.remove('active');

    this.disconnectTimer = setInterval(() => {
      this.countdownSeconds--;
      if (countdownEl) countdownEl.textContent = this.countdownSeconds;
      
      if (this.countdownSeconds <= 10 && claimBtn) {
        claimBtn.classList.add('active');
      }

      if (this.countdownSeconds <= 0) {
        clearInterval(this.disconnectTimer);
        this.claimVictory();
      }
    }, 1000);
  }

  handleOpponentReconnect() {
    const status = this.container.querySelector('#opp-conn-status');
    if (status) status.classList.remove('reconnecting');
    
    const overlay = this.container.querySelector('#disconnect-overlay');
    if (overlay) overlay.classList.remove('visible');

    if (this.disconnectTimer) {
      clearInterval(this.disconnectTimer);
      this.disconnectTimer = null;
    }
  }

  claimVictory() {
    if (this.removeGuard) this.removeGuard();
    // Simulate navigation to results page
    router.navigate(`/challenge/results?code=${this.roomCode}&game=${this.gameInfo.id}&winner=true&reason=forfeit`);
  }

  showRoundTransition(data) {
    const wrapper = this.container.querySelector('#canvas-wrapper');
    if (wrapper) wrapper.classList.add('dimmed');
    
    const overlay = this.container.querySelector('#round-overlay');
    const label = this.container.querySelector('#ro-label');
    const winnerEl = this.container.querySelector('#ro-winner');
    const scoresEl = this.container.querySelector('#ro-scores');
    const nextEl = this.container.querySelector('#ro-next');
    
    if (!overlay) return;

    label.textContent = `ROUND ${data.round} COMPLETE`;
    
    if (data.winner === 'you') {
      winnerEl.textContent = 'YOU WIN';
      winnerEl.className = 'round-winner you';
    } else if (data.winner === 'them') {
      winnerEl.textContent = 'OPPONENT WINS';
      winnerEl.className = 'round-winner them';
    } else {
      winnerEl.textContent = 'DRAW';
      winnerEl.className = 'round-winner draw';
    }

    scoresEl.textContent = `YOU ${data.scores.you} - THEM ${data.scores.them}`;

    overlay.classList.add('visible');

    if (data.isMatchComplete) {
      nextEl.textContent = 'MATCH COMPLETE';
      setTimeout(() => {
        if (this.removeGuard) this.removeGuard();
        router.navigate(`/challenge/results?code=${this.roomCode}&game=${this.gameInfo.id}`);
      }, 2000);
    } else {
      let count = 3;
      nextEl.textContent = `ROUND ${data.round + 1} STARTING IN ${count}...`;
      
      const interval = setInterval(() => {
        count--;
        if (count > 0) {
          nextEl.textContent = `ROUND ${data.round + 1} STARTING IN ${count}...`;
        } else {
          clearInterval(interval);
          overlay.classList.remove('visible');
          if (wrapper) wrapper.classList.remove('dimmed');
          // Update top bar round label
          const topLabel = this.container.querySelector('#round-label');
          if (topLabel) topLabel.textContent = `ROUND ${data.round + 1}`;
        }
      }, 1000);
    }
  }
}
