import { SocketClient } from '../core/socket-client.js';
import router from '../core/router.js';

export default class ChallengePage {
  constructor() {
    this.router = router; console.log('ChallengePage constructor, router is:', router);
    this.container = null;
    this.animationFrameId = null;
    this.activeGames = [];
  }

  mount(params, container) {
    this.container = container;
    this.activeGames = (window.GAMES || []).filter(g => g.type === 'multi');
    
    // Connect socket if not already connected
    SocketClient.connect();

    this.render();
    console.log("Router in mount is:", this.router);
    this.initParticles();
    this.initQuickJoin();
    this.initModals();
    this.bindSocketEvents();
  }

  unmount() {
    SocketClient.offAll('ChallengePage');
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.container.innerHTML = '';
  }

  render() {
    this.container.innerHTML = `
      <div id="challenge-page">
        <canvas id="challenge-particles"></canvas>
        
        <div class="challenge-header">
          <button class="btn-back" id="btn-back-home" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 class="challenge-title">CHALLENGE MODE</h1>
        </div>

        <div class="presence-block">
          <div class="presence-number-wrap">
            <div class="presence-dot"></div>
            <div class="presence-number" id="online-total">0</div>
          </div>
          <div class="presence-label">players online right now</div>
          <div class="presence-stats">
            <div class="presence-stat"><span id="online-games">0</span> in games</div>
            <div class="presence-stat"><span id="online-lobbies">0</span> in lobbies</div>
          </div>
        </div>

        <div class="quick-join-section">
          <div class="quick-join-label">QUICK JOIN ROOM</div>
          <div class="quick-join-wrapper" id="quick-join-wrapper">
            <div class="code-input-visuals" id="code-visuals">
              <div class="code-box"></div>
              <div class="code-box"></div>
              <div class="code-box"></div>
              <div class="code-box"></div>
              <div class="code-box"></div>
              <div class="code-box"></div>
            </div>
            <input type="text" class="hidden-code-input" id="hidden-code-input" maxlength="6" autocomplete="off" autocorrect="off" spellcheck="false" />
            <button class="btn-join" id="btn-join" disabled>JOIN</button>
          </div>
          <div class="quick-join-error" id="quick-join-error"></div>
        </div>

        <div class="action-cards">
          <div class="action-card">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>
            </div>
            <h2 class="action-title">Bot Mode</h2>
            <p class="action-desc">Play any game against an AI opponent. Practice your skills offline. No internet needed.</p>
            <button class="btn-action" data-modal="bot">PLAY VS BOT</button>
          </div>

          <div class="action-card">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
            <h2 class="action-title">Private Room</h2>
            <p class="action-desc">Create a room, share the code with a friend, and play together privately.</p>
            <button class="btn-action" data-modal="private">CREATE ROOM</button>
          </div>

          <div class="action-card">
            <div class="action-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
            <h2 class="action-title">Quick Match</h2>
            <p class="action-desc">Jump into matchmaking and get paired with another player in seconds.</p>
            <button class="btn-action" data-modal="quick">FIND MATCH</button>
          </div>
        </div>

        <div class="active-rooms-section">
          <div class="rooms-header">
            <h3 class="rooms-title">Open Rooms</h3>
            <div class="rooms-count" id="open-rooms-count">0</div>
          </div>
          <div class="rooms-list" id="rooms-list">
            <div class="rooms-empty">No open rooms right now. <span id="create-room-link">Create one!</span></div>
          </div>
        </div>
      </div>

      <div class="game-modal-backdrop" id="game-modal-backdrop">
        <div class="game-modal-panel">
          <div class="modal-header">
            <h3 class="modal-title" id="modal-title">Select Game</h3>
            <button class="btn-close" id="btn-close-modal">×</button>
          </div>
          <div class="game-grid" id="game-grid">
            <!-- Populated via JS -->
          </div>
          <button class="btn-modal-proceed" id="btn-modal-proceed" disabled>START</button>
        </div>
      </div>
    `;

    document.getElementById('btn-back-home').addEventListener('click', () => {
      this.router.navigate('/');
    });

    document.getElementById('create-room-link').addEventListener('click', () => {
      this.openModal('private');
    });
  }

  initParticles() {
    const canvas = document.getElementById('challenge-particles');
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const particles = [];
    
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.5 + 0.5,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.1
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(108, 99, 255, ${p.alpha})`;
        ctx.fill();
      });
      this.animationFrameId = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener('resize', () => {
      if(canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    });
  }

  initQuickJoin() {
    const input = document.getElementById('hidden-code-input');
    const boxes = document.querySelectorAll('.code-box');
    const btnJoin = document.getElementById('btn-join');
    const errorEl = document.getElementById('quick-join-error');
    const wrapper = document.getElementById('quick-join-wrapper');

    const updateBoxes = () => {
      const val = input.value.toUpperCase();
      input.value = val.replace(/[^A-Z0-9]/g, ''); // Ensure only alphanumeric
      const cleanVal = input.value;
      
      boxes.forEach((box, i) => {
        box.textContent = cleanVal[i] || '';
        if (i === cleanVal.length || (i === 5 && cleanVal.length === 6)) {
          box.classList.add('active');
        } else {
          box.classList.remove('active');
        }
      });
      
      btnJoin.disabled = cleanVal.length !== 6;
      errorEl.textContent = ''; // clear error
      wrapper.classList.remove('shake');
    };

    input.addEventListener('input', updateBoxes);
    input.addEventListener('focus', () => {
      const val = input.value;
      if (val.length < 6) {
        boxes[val.length].classList.add('active');
      }
    });
    input.addEventListener('blur', () => {
      boxes.forEach(b => b.classList.remove('active'));
    });

    btnJoin.addEventListener('click', () => {
      const code = input.value;
      if (code.length === 6) {
        btnJoin.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>`;
        const sessionToken = localStorage.getItem('cheatLabz_sessionToken') || `temp_${Date.now()}`;
        const displayName = localStorage.getItem('cheatLabz_displayName') || 'Guest';
        SocketClient.emit('room:join', { code, displayName, sessionToken });
      }
    });

    // Handle styling for spinner
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes spin { 100% { transform: rotate(360deg); } }
      .spinner { animation: spin 1s linear infinite; }
    `;
    document.head.appendChild(style);
  }

  initModals() {
    this.currentModalType = null;
    this.selectedGameId = null;

    document.querySelectorAll('.btn-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.openModal(e.target.dataset.modal);
      });
    });

    const backdrop = document.getElementById('game-modal-backdrop');
    document.getElementById('btn-close-modal').addEventListener('click', () => this.closeModal());
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) this.closeModal();
    });
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    document.getElementById('btn-modal-proceed').addEventListener('click', () => {
      console.log('Click handler this:', this); if (!this.selectedGameId) return;
      
      const btn = document.getElementById('btn-modal-proceed');
      btn.disabled = true;
      btn.textContent = "PROCESSING...";

      if (this.currentModalType === 'bot' || this.currentModalType === 'private') {
        SocketClient.emit('room:create', { gameId: this.selectedGameId, mode: this.currentModalType });
      } else if (this.currentModalType === 'quick') {
        this.router.navigate(`/challenge/matchmaking?game=${this.selectedGameId}`);
      }
    });
  }

  openModal(type) {
    this.currentModalType = type;
    this.selectedGameId = null;
    
    const titleEl = document.getElementById('modal-title');
    const proceedBtn = document.getElementById('btn-modal-proceed');
    
    if (type === 'bot') {
      titleEl.textContent = 'Select a game to play vs Bot';
      proceedBtn.textContent = 'START BOT GAME';
    } else if (type === 'private') {
      titleEl.textContent = 'Select a game to create a room';
      proceedBtn.textContent = 'CREATE ROOM';
    } else if (type === 'quick') {
      titleEl.textContent = 'Select a game to find a match';
      proceedBtn.textContent = 'FIND MATCH';
    }

    proceedBtn.disabled = true;
    this.renderGameGrid();
    document.getElementById('game-modal-backdrop').classList.add('open');
  }

  closeModal() {
    document.getElementById('game-modal-backdrop').classList.remove('open');
    const proceedBtn = document.getElementById('btn-modal-proceed');
    proceedBtn.disabled = false;
  }

  renderGameGrid() {
    const grid = document.getElementById('game-grid');
    grid.innerHTML = '';

    this.activeGames.forEach(game => {
      const isLive = game.status === 'live';
      const div = document.createElement('div');
      div.className = `game-tile ${isLive ? '' : 'disabled'}`;
      div.dataset.id = game.id;

      const iconSvg = window.GAME_ICONS ? (window.GAME_ICONS[game.id] || window.GAME_ICONS['default']) : '';

      div.innerHTML = `
        <div class="tile-icon" style="color: ${game.accentColor}">${iconSvg}</div>
        <div class="tile-info">
          <div class="tile-name">${game.name}</div>
          <div class="tile-badge">
            ${isLive 
              ? `<div class="presence-dot" style="width: 6px; height: 6px; display: inline-block; margin-right: 6px;"></div>${game.players} Players` 
              : 'COMING SOON'}
          </div>
        </div>
      `;

      if (isLive) {
        div.addEventListener('click', () => {
          document.querySelectorAll('.game-tile').forEach(t => t.classList.remove('selected'));
          div.classList.add('selected');
          this.selectedGameId = game.id;
          document.getElementById('btn-modal-proceed').disabled = false;
        });
      }
      grid.appendChild(div);
    });
  }

  bindSocketEvents() {
    // 1. Presence
    SocketClient.on('presence:update', (data) => {
      this.animateValue(document.getElementById('online-total'), parseInt(document.getElementById('online-total').innerText) || 0, data.total || 0, 600);
      document.getElementById('online-games').innerText = data.inGame || 0;
      document.getElementById('online-lobbies').innerText = data.inLobby || 0;
    }, 'ChallengePage');

    // 2. Active Rooms
    SocketClient.on('social:active-rooms', (rooms) => {
      this.renderActiveRooms(rooms);
    }, 'ChallengePage');

    // Ask for active rooms immediately
    SocketClient.emit('social:get-rooms');

    // 3. Room Responses
    SocketClient.on('room:joined', (roomState) => {
      this.router.navigate(`/challenge/lobby?code=${roomState.code}`);
    }, 'ChallengePage');

    SocketClient.on('room:created', (roomState) => {
      this.router.navigate(`/challenge/lobby?code=${roomState.code}`);
    }, 'ChallengePage');

    SocketClient.on('room:error', (data) => {
      const btnJoin = document.getElementById('btn-join');
      btnJoin.innerHTML = 'JOIN';
      btnJoin.disabled = false;
      
      const wrapper = document.getElementById('quick-join-wrapper');
      wrapper.classList.remove('shake');
      void wrapper.offsetWidth; // trigger reflow
      wrapper.classList.add('shake');

      document.getElementById('quick-join-error').textContent = data.message || "Room not found. Check the code.";
    }, 'ChallengePage');
  }

  renderActiveRooms(rooms) {
    document.getElementById('open-rooms-count').innerText = rooms.length;
    const list = document.getElementById('rooms-list');
    
    if (rooms.length === 0) {
      list.innerHTML = `<div class="rooms-empty">No open rooms right now. <span id="create-room-link-empty">Create one!</span></div>`;
      document.getElementById('create-room-link-empty').addEventListener('click', () => this.openModal('private'));
      return;
    }

    list.innerHTML = '';
    
    // Show max 8 rooms
    rooms.slice(0, 8).forEach(room => {
      const gameDef = this.activeGames.find(g => g.id === room.gameId);
      const gameName = gameDef ? gameDef.name : 'Unknown Game';
      const iconSvg = (window.GAME_ICONS && gameDef) ? (window.GAME_ICONS[gameDef.id] || window.GAME_ICONS['default']) : '';
      const color = gameDef ? gameDef.accentColor : '#fff';
      
      const playersText = `${room.players.length}/${room.maxPlayers} players`;
      
      const diffMs = Date.now() - room.createdAt;
      const mins = Math.floor(diffMs / 60000);
      const timeStr = mins < 1 ? 'Just now' : `${mins} min ago`;

      const div = document.createElement('div');
      div.className = 'room-row';
      div.innerHTML = `
        <div class="room-game-icon" style="color: ${color}">${iconSvg}</div>
        <div class="room-game-name">${gameName}</div>
        <div class="room-pill">${playersText}</div>
        <div class="room-time">${timeStr}</div>
        <button class="btn-join-room" data-code="${room.teamCode}">JOIN</button>
      `;
      
      div.querySelector('.btn-join-room').addEventListener('click', (e) => {
        const code = e.target.dataset.code;
        const sessionToken = localStorage.getItem('cheatLabz_sessionToken') || `temp_${Date.now()}`;
        const displayName = localStorage.getItem('cheatLabz_displayName') || 'Guest';
        SocketClient.emit('room:join', { code, displayName, sessionToken });
      });

      list.appendChild(div);
    });
  }

  // Easing function
  animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      obj.innerHTML = Math.floor(start + (end - start) * easeOutCubic(progress));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        obj.innerHTML = end;
      }
    };
    window.requestAnimationFrame(step);
  }
}
