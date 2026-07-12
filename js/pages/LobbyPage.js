import { SocketClient } from '../core/socket-client.js';
import router from '../core/router.js';

export default class LobbyPage {
  constructor() {
    this.router = router;
    this.container = null;
    this.animationFrameId = null;
    this.teamCode = null;
    this.roomState = null;
    this.mySessionToken = localStorage.getItem('cheatLabz_sessionToken');
    this.isHost = false;
    this.reactionCooldown = false;
  }

  mount(params, container) {
    this.container = container;
    this.teamCode = params.code || new URLSearchParams(window.location.search).get('code');
    
    if (!this.teamCode) {
      this.router.navigate('/challenge');
      return;
    }

    SocketClient.connect();

    this.render();
    this.initParticles();
    this.bindDOM();
    this.bindSocketEvents();

    // Fetch initial room state
    const sessionToken = localStorage.getItem('cheatLabz_sessionToken') || `temp_${Date.now()}`;
    const displayName = localStorage.getItem('cheatLabz_displayName') || 'Guest';
    SocketClient.emit('room:join', { code: this.teamCode, displayName, sessionToken });
  }

  unmount() {
    SocketClient.offAll('LobbyPage');
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.container.innerHTML = '';
  }

  render() {
    this.container.innerHTML = `
      <div id="lobby-page">
        <canvas id="lobby-particles"></canvas>
        
        <div class="lobby-header">
          <button class="btn-back" id="btn-back-challenge" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <h1 class="challenge-title">LOBBY</h1>
        </div>

        <div class="lobby-layout">
          <!-- LEFT COLUMN -->
          <div class="lobby-left">
            <div class="room-code-section">
              <div>
                <div class="room-code-label">ROOM CODE</div>
                <div class="code-display-visuals" id="lobby-code-display">
                  <!-- populated by JS -->
                </div>
              </div>
              <button class="btn-copy" id="btn-copy-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <span class="copy-text">COPY URL</span>
              </button>
            </div>

            <div class="player-slots" id="player-slots">
              <!-- slots rendered by JS -->
            </div>

            <div class="reaction-strip" id="reaction-strip">
              <button class="btn-reaction" data-reaction="thumbsup">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
              </button>
              <button class="btn-reaction" data-reaction="fire">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
              </button>
              <button class="btn-reaction" data-reaction="angry">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="7" y1="9" x2="9" y2="10"></line><line x1="17" y1="9" x2="15" y2="10"></line></svg>
              </button>
              <button class="btn-reaction" data-reaction="skull">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="15" cy="12" r="1"></circle><path d="M8 20v2h8v-2"></path><path d="M12.5 22v-2"></path><path d="M16 20a4 4 0 0 0 4-4v-3a8 8 0 1 0-16 0v3a4 4 0 0 0 4 4"></path></svg>
              </button>
            </div>
          </div>

          <!-- RIGHT COLUMN -->
          <div class="lobby-right">
            <div class="game-identity" id="game-identity">
              <!-- game info rendered here -->
            </div>

            <div class="lobby-settings" id="lobby-settings" style="display:none;">
              <h4 class="settings-title">LOBBY SETTINGS</h4>
              <!-- settings like difficulty rendered here -->
            </div>

            <div class="how-to-play-collapsible" id="how-to-play">
              <!-- how to play rendered here -->
            </div>

            <button class="btn-ready" id="btn-ready">MARK READY</button>
            <button class="btn-start" id="btn-start" disabled style="display:none;">WAITING FOR HOST...</button>
          </div>
        </div>
      </div>
      
      <div id="countdown-container" class="countdown-overlay"></div>
    `;

    this.renderCodeBoxes();
  }

  renderCodeBoxes() {
    const container = document.getElementById('lobby-code-display');
    container.innerHTML = '';
    const code = this.teamCode.toUpperCase().padEnd(6, ' ');
    for (let i = 0; i < 6; i++) {
      const box = document.createElement('div');
      box.className = 'code-display-box';
      box.textContent = code[i];
      container.appendChild(box);
    }
  }

  initParticles() {
    const canvas = document.getElementById('lobby-particles');
    if (!canvas) return;
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
  }

  bindDOM() {
    document.getElementById('btn-back-challenge').addEventListener('click', () => {
      SocketClient.emit('room:leave');
      this.router.navigate('/challenge');
    });

    document.getElementById('btn-copy-link').addEventListener('click', (e) => {
      const url = window.location.origin + '/challenge/lobby?code=' + this.teamCode;
      navigator.clipboard.writeText(url).then(() => {
        const btn = document.getElementById('btn-copy-link');
        const origHTML = btn.innerHTML;
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><span class="copy-text" style="color:var(--success)">COPIED!</span>`;
        setTimeout(() => {
          if (document.getElementById('btn-copy-link')) {
            btn.innerHTML = origHTML;
          }
        }, 1500);
      });
    });

    document.querySelectorAll('.btn-reaction').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (this.reactionCooldown) return;
        this.reactionCooldown = true;
        
        document.querySelectorAll('.btn-reaction').forEach(b => b.disabled = true);
        
        SocketClient.emit('room:reaction', { emoji: btn.dataset.reaction });
        this.playReaction(btn.dataset.reaction, true); // I send it

        setTimeout(() => {
          this.reactionCooldown = false;
          document.querySelectorAll('.btn-reaction').forEach(b => b.disabled = false);
        }, 3000);
      });
    });

    document.getElementById('btn-ready').addEventListener('click', () => {
      if (!this.roomState) return;
      const me = this.roomState.players.find(p => p.sessionToken === this.mySessionToken);
      if (!me) return;
      
      if (me.isReady) {
        SocketClient.emit('player:ready', { code: this.teamCode, isReady: false });
      } else {
        SocketClient.emit('player:ready', { code: this.teamCode, isReady: true });
      }
    });

    document.getElementById('btn-start').addEventListener('click', () => {
      if (this.isHost) {
        SocketClient.emit('game:start');
      }
    });
  }

  bindSocketEvents() {
    SocketClient.on('room:state', (state) => {
      this.updateRoomState(state);
    }, 'LobbyPage');

    SocketClient.on('room:updated', (state) => {
      this.updateRoomState(state);
    }, 'LobbyPage');

    SocketClient.on('room:player-joined', (data) => {
      this.showToast(`${data.name} joined the room.`);
    }, 'LobbyPage');

    SocketClient.on('room:player-left', (data) => {
      this.showToast(`${data.name} left the room.`);
    }, 'LobbyPage');

    SocketClient.on('room:reaction', (data) => {
      const isMe = data.sessionToken === this.mySessionToken;
      if (!isMe) {
        this.playReaction(data.emoji, false);
      }
    }, 'LobbyPage');

    SocketClient.on('game:starting', () => {
      this.playCountdown();
    }, 'LobbyPage');

    SocketClient.on('room:error', (err) => {
      console.warn("Lobby Error:", err.message);
      if (err.message.includes('not found')) {
        this.router.navigate('/challenge');
      }
    }, 'LobbyPage');
  }

  updateRoomState(state) {
    this.roomState = state;
    
    const gameDef = (window.GAMES || []).find(g => g.id === state.gameId);
    if (!gameDef) return;

    this.renderGameIdentity(gameDef);

    const me = state.players.find(p => p.sessionToken === this.mySessionToken);
    this.isHost = me ? me.isHost : false;

    // Ready button state
    const btnReady = document.getElementById('btn-ready');
    if (me && me.isReady) {
      btnReady.classList.add('is-ready');
      btnReady.textContent = 'READY ✓';
    } else {
      btnReady.classList.remove('is-ready');
      btnReady.textContent = 'MARK READY';
    }

    // Start button state
    const btnStart = document.getElementById('btn-start');
    if (this.isHost) {
      btnStart.style.display = 'block';
      const allReady = state.players.length > 1 && state.players.every(p => p.isReady);
      if (allReady) {
        btnStart.textContent = 'START GAME';
        btnStart.disabled = false;
      } else {
        btnStart.textContent = 'WAITING FOR PLAYERS...';
        btnStart.disabled = true;
      }
    } else {
      btnStart.style.display = 'block';
      btnStart.textContent = 'WAITING FOR HOST...';
      btnStart.disabled = true;
    }

    this.renderPlayerSlots(state.players, state.maxPlayers, state.isBotMatch, state.botDifficulty);
    this.renderSettings(state, gameDef);
    this.renderHowToPlay(gameDef);
  }

  renderGameIdentity(game) {
    const container = document.getElementById('game-identity');
    const iconSvg = window.GAME_ICONS ? (window.GAME_ICONS[game.id] || window.GAME_ICONS['default']) : '';
    container.innerHTML = `
      <div class="game-identity-header">
        <div class="game-icon-large" style="color: ${game.accentColor}">${iconSvg}</div>
        <div class="game-title-wrap">
          <h2 class="game-title">${game.name}</h2>
          <div class="game-category">${game.category}</div>
        </div>
      </div>
      <p class="game-desc">${game.description}</p>
    `;
  }

  renderSettings(state, game) {
    const container = document.getElementById('lobby-settings');
    if (state.isBotMatch) {
      container.style.display = 'block';
      container.innerHTML = `
        <h4 class="settings-title">LOBBY SETTINGS</h4>
        <div class="setting-row">
          <div class="setting-label">Bot Difficulty</div>
          <div class="difficulty-selector">
            <button class="btn-diff ${state.botDifficulty === 'easy' ? 'selected' : ''}" data-diff="easy" ${!this.isHost ? 'disabled' : ''}>EASY</button>
            <button class="btn-diff ${state.botDifficulty === 'medium' ? 'selected' : ''}" data-diff="medium" ${!this.isHost ? 'disabled' : ''}>MED</button>
            <button class="btn-diff ${state.botDifficulty === 'hard' ? 'selected' : ''}" data-diff="hard" ${!this.isHost ? 'disabled' : ''}>HARD</button>
          </div>
        </div>
      `;

      if (this.isHost) {
        container.querySelectorAll('.btn-diff').forEach(btn => {
          btn.addEventListener('click', (e) => {
            SocketClient.emit('room:settings', { botDifficulty: e.target.dataset.diff });
          });
        });
      }
    } else {
      container.style.display = 'none';
    }
  }

  renderHowToPlay(game) {
    const container = document.getElementById('how-to-play');
    
    let controlsHtml = '';
    if (game.controls && game.controls.length > 0) {
      controlsHtml = game.controls.map(c => `
        <div class="control-row">
          <div class="key-cap">${c.key}</div>
          <div class="key-action">${c.action}</div>
        </div>
      `).join('');
    }

    container.innerHTML = `
      <div class="htp-header" id="htp-header">
        <h4 class="htp-title">HOW TO PLAY</h4>
        <svg class="htp-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </div>
      <div class="htp-content" id="htp-content">
        <p class="htp-desc">${game.howToPlay || ''}</p>
        <div class="htp-controls">${controlsHtml}</div>
      </div>
    `;

    const header = document.getElementById('htp-header');
    const content = document.getElementById('htp-content');
    header.addEventListener('click', () => {
      content.classList.toggle('open');
      header.querySelector('.htp-chevron').classList.toggle('open');
    });
  }

  renderPlayerSlots(players, maxPlayers, isBotMatch, botDifficulty) {
    const container = document.getElementById('player-slots');
    container.innerHTML = ''; // Simplest approach, replace all for now. In real app, we diff to keep animations clean.
    // To support enter/leave animations gracefully, we just do a basic render here.

    for (let i = 0; i < maxPlayers; i++) {
      const player = players[i];
      if (player) {
        // Render connected player
        const isMe = player.sessionToken === this.mySessionToken;
        const color = player.color || '#6c63ff'; // Default if none
        const name = isMe ? player.name + " (You)" : player.name;
        
        container.innerHTML += `
          <div class="player-slot">
            <div class="slot-color" style="background-color: ${color}"></div>
            <div class="slot-name">${name}</div>
            <div class="slot-badges">
              ${player.isHost ? '<span class="badge-host">HOST</span>' : ''}
              <div class="slot-status ${player.isReady ? 'status-ready' : 'status-waiting'}">
                ${player.isReady 
                  ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                  : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'}
              </div>
            </div>
          </div>
        `;
      } else if (isBotMatch && i === 1) {
        // Render Bot
        const diffColors = { easy: '#2dd4bf', medium: '#fbbf24', hard: '#ef4444' };
        const dColor = diffColors[botDifficulty] || '#fbbf24';
        
        container.innerHTML += `
          <div class="player-slot entering">
            <div class="slot-color" style="background-color: #a29bfe; display:flex; align-items:center; justify-content:center;">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>
            </div>
            <div class="slot-name">BOT</div>
            <div class="slot-badges">
              <span class="badge-host" style="border-color:${dColor}; color:${dColor}">${botDifficulty.toUpperCase()}</span>
              <div class="slot-status status-ready">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>
          </div>
        `;
      } else {
        // Empty slot
        container.innerHTML += `
          <div class="player-slot empty">
            <div class="empty-text">Waiting for player...</div>
          </div>
        `;
      }
    }
  }

  playReaction(emoji, fromMe) {
    const strip = document.getElementById('reaction-strip');
    const el = document.createElement('div');
    el.className = 'floating-reaction';
    
    // Map emoji name back to SVG for the floating animation
    let svgHtml = '';
    if(emoji === 'thumbsup') svgHtml = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>';
    if(emoji === 'fire') svgHtml = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>';
    if(emoji === 'angry') svgHtml = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="7" y1="9" x2="9" y2="10"></line><line x1="17" y1="9" x2="15" y2="10"></line></svg>';
    if(emoji === 'skull') svgHtml = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"></circle><circle cx="15" cy="12" r="1"></circle><path d="M8 20v2h8v-2"></path><path d="M12.5 22v-2"></path><path d="M16 20a4 4 0 0 0 4-4v-3a8 8 0 1 0-16 0v3a4 4 0 0 0 4 4"></path></svg>';
    
    el.innerHTML = svgHtml;
    
    // Animate from left (me) to right, or right to left
    if (fromMe) {
      el.style.left = '20px';
      // CSS handles the animation to +300px
    } else {
      el.style.right = '20px';
      // Inline override animation to go left
      el.style.animation = 'none';
      setTimeout(() => {
        el.style.transition = 'all 800ms ease-out';
        el.style.transform = 'translate(-300px, -10px) scale(1)';
        el.style.opacity = '0';
      }, 50);
    }
    
    strip.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 900);
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'lobby-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('hide');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 2000);
  }

  playCountdown() {
    const container = document.getElementById('countdown-container');
    const layout = document.querySelector('.lobby-layout');
    layout.style.opacity = '0.5';
    layout.style.pointerEvents = 'none';
    
    const numbers = ['3', '2', '1', 'GO!'];
    let idx = 0;
    
    const showNext = () => {
      if (idx >= numbers.length) {
        // Go to game
        this.router.navigate(`/challenge/game?code=${this.teamCode}`);
        return;
      }
      const numStr = numbers[idx];
      const el = document.createElement('div');
      el.className = `countdown-number ${numStr === 'GO!' ? 'go' : ''}`;
      el.textContent = numStr;
      
      container.innerHTML = '';
      container.appendChild(el);
      
      setTimeout(showNext, 800);
      idx++;
    };
    
    showNext();
  }
}
