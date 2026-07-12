import router from '../core/router.js';
import { SocketClient as socketClient } from '../core/socket-client.js';
import GAMES_DATA from '../core/catalog.js';

export default class MatchmakingPage {
  constructor() {
    this.container = null;
    this.gameInfo = null;
    this.socket = socketClient;
    this.timerInterval = null;
    this.secondsElapsed = 0;
    this.isFound = false;
    this.timeoutLimit = 90; // 90 seconds
  }

  async mount(params, container) {
    this.container = container;
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('game');
    
    this.gameInfo = GAMES_DATA.find(g => g.id === gameId);
    
    if (!this.gameInfo) {
      router.replace('/challenge');
      return;
    }

    this.render();
    this.bindEvents();
    this.startTimer();
    
    // Request matchmaking from server
    if (this.socket.connected) {
      this.socket.emit('matchmaking:join', { gameId: this.gameInfo.id });
    }
  }

  async unmount() {
    this.stopTimer();
    
    // Only send cancel if we haven't found a match
    if (!this.isFound && this.socket.connected) {
      this.socket.emit('matchmaking:cancel', { gameId: this.gameInfo.id });
    }
    
    // Remove listeners
    this.socket.off('matchmaking:found', this.handleMatchFound);
  }

  render() {
    // Generate SVG string safely, fall back to basic shape if not in gameInfo
    // Assuming gameInfo.icon provides SVG path data or similar, else we use a placeholder
    const iconSvg = this.gameInfo.icon || `<rect width="24" height="24" rx="4"></rect>`;
    
    this.container.innerHTML = `
      <div id="matchmaking-page">
        <div class="mm-container" id="mm-main-content">
          <div class="radar-wrapper" id="radar">
            <div class="radar-ring"></div>
            <div class="radar-ring"></div>
            <div class="radar-ring"></div>
            <svg class="radar-icon" viewBox="0 0 24 24" fill="currentColor">
              ${iconSvg}
            </svg>
          </div>
          
          <h1 class="mm-game-name">${this.gameInfo.title}</h1>
          <p class="mm-status" id="mm-status">SEARCHING FOR OPPONENT<span class="animated-dots"></span></p>
          <p class="mm-timer" id="mm-timer">00:00</p>
          <p class="mm-players-count">1 players searching for ${this.gameInfo.title}</p>
          
          <button class="btn-mm-cancel" id="btn-cancel">CANCEL</button>
          <p class="mm-bot-link" id="btn-bot-link">While you wait, try Bot Mode &rarr;</p>
        </div>
        
        <div class="timeout-card" id="timeout-card">
          <h2 class="timeout-title">No opponents found</h2>
          <p class="timeout-desc">Looks like the queue is empty right now.</p>
          <button class="btn-timeout-bot" id="btn-timeout-bot">PLAY VS BOT INSTEAD</button>
          <button class="btn-timeout-keep" id="btn-timeout-keep">KEEP SEARCHING</button>
        </div>
      </div>
    `;

    // Apply specific game color if available
    if (this.gameInfo.themeColor) {
      this.container.style.setProperty('--accent', this.gameInfo.themeColor);
    }
  }

  bindEvents() {
    const btnCancel = this.container.querySelector('#btn-cancel');
    const btnBotLink = this.container.querySelector('#btn-bot-link');
    const btnTimeoutBot = this.container.querySelector('#btn-timeout-bot');
    const btnTimeoutKeep = this.container.querySelector('#btn-timeout-keep');

    btnCancel.addEventListener('click', () => {
      router.navigate('/challenge');
    });

    const startBotMode = () => {
      // In a real flow, this would go to a difficulty select or directly to lobby/game
      // For now, navigate to challenge lobby for bot
      router.navigate(`/challenge/lobby?mode=bot&game=${this.gameInfo.id}&difficulty=medium`);
    };

    btnBotLink.addEventListener('click', startBotMode);
    btnTimeoutBot.addEventListener('click', startBotMode);

    btnTimeoutKeep.addEventListener('click', () => {
      this.container.querySelector('#timeout-card').classList.remove('visible');
      this.container.querySelector('#mm-main-content').style.display = 'flex';
      this.secondsElapsed = 0;
      this.updateTimerDisplay();
      this.startTimer();
    });

    // Bound socket listener so we can remove it later
    this.handleMatchFound = this.onMatchFound.bind(this);
    this.socket.on('matchmaking:found', this.handleMatchFound);
  }

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    
    this.timerInterval = setInterval(() => {
      if (this.isFound) return;
      
      this.secondsElapsed++;
      this.updateTimerDisplay();
      
      if (this.secondsElapsed >= this.timeoutLimit) {
        this.showTimeout();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerDisplay() {
    const min = Math.floor(this.secondsElapsed / 60).toString().padStart(2, '0');
    const sec = (this.secondsElapsed % 60).toString().padStart(2, '0');
    const timerEl = this.container.querySelector('#mm-timer');
    if (timerEl) {
      timerEl.textContent = `${min}:${sec}`;
    }
  }

  showTimeout() {
    this.stopTimer();
    this.container.querySelector('#mm-main-content').style.display = 'none';
    this.container.querySelector('#timeout-card').classList.add('visible');
  }

  onMatchFound(data) {
    this.isFound = true;
    this.stopTimer();
    
    const radar = this.container.querySelector('#radar');
    const status = this.container.querySelector('#mm-status');
    const btnCancel = this.container.querySelector('#btn-cancel');
    const botLink = this.container.querySelector('#btn-bot-link');
    
    if (radar) radar.classList.add('found');
    if (status) {
      status.innerHTML = 'OPPONENT FOUND!';
      status.classList.add('found');
    }
    
    if (btnCancel) btnCancel.style.opacity = '0.5';
    if (btnCancel) btnCancel.style.pointerEvents = 'none';
    if (botLink) botLink.style.display = 'none';
    
    setTimeout(() => {
      router.navigate(`/challenge/lobby?code=${data.code}`);
    }, 1500);
  }
}
