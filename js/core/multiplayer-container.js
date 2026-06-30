import { GameContainer } from './game-container.js';
import { Sound } from './sound.js';
import { Storage } from './storage.js';

export class MultiplayerContainer extends GameContainer {
  constructor(mountPoint, gameClass, manifest, config = {}) {
    super(mountPoint, gameClass, manifest, config);

    this.room = config.room;
    this.mySocketId = config.mySocketId;
    this.socket = config.socket;
    this.onExit = config.onExit;

    const myInfo = this.room ? this.room.players.find(p => p.socketId === this.mySocketId) : null;
    const oppInfo = this.room ? this.room.players.find(p => p.socketId !== this.mySocketId) : null;

    this.myColor = myInfo?.color || '#6c63ff';
    this.oppColor = oppInfo?.color || '#ff6b6b';
    this.opponent = oppInfo;

    // Additional state attributes
    this.roundWins = { me: 0, opponent: 0 };
    this.disconnectTimer = null;
    this.disconnectSeconds = 30;
    this.reactionCooldown = false;

    // Build multiplayer specific DOM layers
    this.initMultiplayerDOM();

    // Bind leave buttons
    const leaveBtn = this.hudLayer.querySelector('#hud-leave-btn');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', () => {
        if (confirm('Leave the game? This counts as a forfeit.')) {
          if (this.onExit) this.onExit();
        }
      });
    }

    const closeBtn = this.gameoverLayer.querySelector('#go-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (this.onExit) this.onExit();
      });
    }

    const homeBtn = this.gameoverLayer.querySelector('#go-home-btn');
    if (homeBtn) {
      homeBtn.addEventListener('click', () => {
        if (this.onExit) this.onExit();
      });
    }

    // Bind socket events
    this.setupSocketBindings();
  }

  setupSocketBindings() {
    if (!this.socket) return;

    this.socket.on('room:update', ({ room }) => {
      this.room = room;
      if (this.gameInstance) {
        this.gameInstance.room = room;
      }
      this.opponent = room.players.find(p => p.socketId !== this.mySocketId);
      this.updateOpponentHUD();
    });

    this.socket.on('game:action', ({ action, data }) => {
      if (this.gameInstance && typeof this.gameInstance.onSocketMessage === 'function') {
        this.gameInstance.onSocketMessage(action, data);
      }
    });

    this.socket.on('player:disconnected', ({ socketId, displayName }) => {
      if (this.opponent && socketId === this.opponent.socketId) {
        this.handleOpponentDisconnect();
      }
    });

    this.socket.on('player:reconnected', ({ socketId }) => {
      if (this.opponent && socketId === this.opponent.socketId) {
        this.handleOpponentReconnect();
      }
    });

    this.socket.on('game:over', ({ winner, finalScores }) => {
      this.handleMatchOver(winner, finalScores);
    });

    this.socket.on('game:round-end', ({ roundWinner, scores, nextRound, seriesScore }) => {
      this.handleRoundEnd(roundWinner, scores, nextRound, seriesScore);
    });

    this.socket.on('game:reaction', ({ senderId, index }) => {
      this.animateOpponentReaction(index);
    });
  }

  initMultiplayerDOM() {
    // 1. Redesign top bar HUD for 2 players
    const accent = this.manifest.accentColor || '#6c63ff';
    const accentRgb = this._hexToRgb(accent);
    const myNameStr = this.room ? this.room.players.find(p => p.socketId === this.mySocketId)?.displayName || 'You' : 'You';
    const oppNameStr = this.opponent?.displayName || 'Opponent';

    this.hudLayer.innerHTML = `
      <div class="hud-timer-bar" id="hud-timer-bar"></div>
      <div class="hud-side left-player-hud" style="width:35%; display:flex; align-items:center; gap:8px;">
        <button class="hud-pause-btn" id="hud-leave-btn" style="margin-right:8px; font-family:'DM Sans',sans-serif; font-size:10px; font-weight:bold; color:rgba(255,255,255,0.6); background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:4px; padding:3px 8px; cursor:pointer;">LEAVE</button>
        <div class="hud-dot" style="width:10px; height:10px; border-radius:50%; background:${this.myColor}; box-shadow: 0 0 8px ${this.myColor};"></div>
        <span class="hud-player-name" id="hud-my-name" style="font-family:'DM Sans',sans-serif; font-size:13px; font-weight:bold; color:#fff;">${this.truncateName(myNameStr)}</span>
        <div class="hud-round-dots" id="hud-my-dots" style="display:flex; gap:3px;"></div>
      </div>
      <div class="hud-center-vs" style="width:30%; text-align:center; display:flex; align-items:center; justify-content:center; gap:16px;">
        <span class="hud-score-value" id="hud-my-score" style="font-family:'JetBrains Mono',monospace; font-size:22px; font-weight:bold; color:${this.myColor};">0</span>
        <span class="hud-vs-divider" style="font-family:'Press Start 2P',monospace; font-size:10px; color:rgba(255,255,255,0.35);">VS</span>
        <span class="hud-score-value" id="hud-opp-score" style="font-family:'JetBrains Mono',monospace; font-size:22px; font-weight:bold; color:${this.oppColor};">0</span>
      </div>
      <div class="hud-side right-player-hud" style="width:35%; display:flex; align-items:center; justify-content: flex-end; gap:8px;">
        <div class="hud-round-dots" id="hud-opp-dots" style="display:flex; gap:3px;"></div>
        <span class="hud-player-name" id="hud-opp-name" style="font-family:'DM Sans',sans-serif; font-size:13px; font-weight:bold; color:rgba(255,255,255,0.7);">${this.truncateName(oppNameStr)}</span>
        <div class="hud-dot" style="width:10px; height:10px; border-radius:50%; background:${this.oppColor}; box-shadow: 0 0 8px ${this.oppColor};"></div>
      </div>
    `;

    // 2. Inject extra styles for layers 6–10
    const extraStyles = document.createElement('style');
    extraStyles.innerHTML = `
      /* Reaction Strip */
      .reaction-strip {
        position: absolute;
        top: 42px;
        left: 0;
        right: 0;
        height: 28px;
        background: rgba(8,8,12,0.92);
        border-bottom: 1px solid rgba(255,255,255,0.03);
        z-index: 9;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        box-sizing: border-box;
      }
      .reaction-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 2px 8px;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.15s ease;
      }
      .reaction-btn:hover {
        background: rgba(255,255,255,0.05);
      }
      .reaction-flying-icon {
        position: absolute;
        font-size: 20px;
        pointer-events: none;
        z-index: 100;
        will-change: transform, opacity;
      }
      
      /* Disconnection Overlay */
      .disconnect-layer {
        z-index: 1000;
        background: rgba(6, 6, 8, 0.85);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
      }
      .disconnect-card {
        background: rgba(20, 20, 28, 0.96);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: 12px;
        padding: 24px;
        width: 90%;
        max-width: 360px;
        text-align: center;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5);
      }
      .dc-warning-icon {
        color: #f59e0b;
        margin-bottom: 16px;
        animation: pulseScale 1.5s infinite;
      }
      .dc-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 13px;
        color: #fff;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      /* Round End Overlay */
      .round-end-layer {
        z-index: 80;
        background: rgba(6,6,8,0.96);
      }
      .re-title {
        font-family: 'Press Start 2P', monospace;
        font-size: 18px;
        color: #fff;
        margin-bottom: 24px;
        text-align: center;
      }
      .re-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        width: 100%;
        max-width: 360px;
        margin-bottom: 24px;
      }
      .re-column {
        text-align: center;
        background: rgba(255,255,255,0.02);
        padding: 16px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.04);
      }
      
      /* Match End Overlay */
      .match-end-layer {
        z-index: 90;
        background: rgba(6,6,8,0.98);
      }
    `;
    this.mountPoint.appendChild(extraStyles);

    // 3. Create Reaction Strip DOM
    this.reactionStrip = document.createElement('div');
    this.reactionStrip.className = 'reaction-strip';
    this.reactionStrip.innerHTML = `
      <button class="reaction-btn" data-index="0" title="😤 [1]">😤</button>
      <button class="reaction-btn" data-index="1" title="👏 [2]">👏</button>
      <button class="reaction-btn" data-index="2" title="😂 [3]">😂</button>
      <button class="reaction-btn" data-index="3" title="🤔 [4]">🤔</button>
    `;
    this.mountPoint.appendChild(this.reactionStrip);

    this.reactionStrip.querySelectorAll('.reaction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index, 10);
        this.triggerReaction(index);
      });
    });

    // 4. Create Disconnection Overlay
    this.disconnectLayer = document.createElement('div');
    this.disconnectLayer.className = 'container-layer disconnect-layer';
    this.disconnectLayer.innerHTML = `
      <div class="disconnect-card">
        <svg class="dc-warning-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <div class="dc-title">OPPONENT DISCONNECTED</div>
        <div style="font-family:'JetBrains Mono',monospace; font-size:13px; color:rgba(255,255,255,0.6); margin-bottom: 24px;" id="dc-timer-text">Waiting for reconnection... [30]</div>
        <div style="display:flex; gap:10px;">
          <button class="container-btn container-btn-secondary" id="dc-wait-btn" style="flex:1;">WAIT</button>
          <button class="container-btn container-btn-primary" id="dc-claim-btn" disabled style="flex:1; opacity: 0.5; cursor: not-allowed;">CLAIM VICTORY</button>
        </div>
      </div>
    `;
    this.mountPoint.appendChild(this.disconnectLayer);

    this.disconnectLayer.querySelector('#dc-wait-btn').addEventListener('click', () => {
      this.disconnectLayer.classList.remove('active');
    });

    this.disconnectLayer.querySelector('#dc-claim-btn').addEventListener('click', () => {
      if (this.socket) {
        this.socket.emit('game:claim-victory');
      }
    });

    // 5. Create Round End Overlay
    this.roundEndLayer = document.createElement('div');
    this.roundEndLayer.className = 'container-layer round-end-layer';
    this.roundEndLayer.innerHTML = `
      <h2 class="re-title" id="re-title">ROUND 1 COMPLETE</h2>
      <div class="re-grid">
        <div class="re-column" style="border-top:3px solid ${this.myColor};">
          <div style="font-size:10px; color:rgba(255,255,255,0.4); margin-bottom:6px;">YOUR SCORE</div>
          <div style="font-family:'JetBrains Mono',monospace; font-size:36px; font-weight:bold;" id="re-my-score">0</div>
        </div>
        <div class="re-column" style="border-top:3px solid ${this.oppColor};">
          <div style="font-size:10px; color:rgba(255,255,255,0.4); margin-bottom:6px;">THEIR SCORE</div>
          <div style="font-family:'JetBrains Mono',monospace; font-size:36px; font-weight:bold;" id="re-opp-score">0</div>
        </div>
      </div>
      <div style="font-family:'Press Start 2P',monospace; font-size:11px; text-transform:uppercase; margin-bottom:24px; text-align:center;" id="re-winner-text"></div>
      <div style="font-family:'JetBrains Mono',monospace; font-size:14px; color:rgba(255,255,255,0.5); margin-bottom:32px;" id="re-series-score">Series: 0 - 0</div>
      <div style="font-family:'Press Start 2P',monospace; font-size:10px; color:var(--accent); animation: pulseFloat 1s infinite alternate;" id="re-countdown">ROUND 2 IN 3...</div>
    `;
    this.mountPoint.appendChild(this.roundEndLayer);
  }

  truncateName(name) {
    if (!name) return '';
    return name.length > 12 ? name.substring(0, 11) + '…' : name;
  }

  updateOpponentHUD() {
    if (!this.room) return;

    const myNameStr = this.room.players.find(p => p.socketId === this.mySocketId)?.displayName || 'You';
    const oppNameStr = this.opponent?.displayName || 'Opponent';

    const myNameEl = this.hudLayer.querySelector('#hud-my-name');
    const oppNameEl = this.hudLayer.querySelector('#hud-opp-name');
    if (myNameEl) myNameEl.textContent = this.truncateName(myNameStr);
    if (oppNameEl) oppNameEl.textContent = this.truncateName(oppNameStr);

    // Update Round Wins dots
    const myDotsEl = this.hudLayer.querySelector('#hud-my-dots');
    const oppDotsEl = this.hudLayer.querySelector('#hud-opp-dots');

    if (myDotsEl && oppDotsEl) {
      const maxRounds = this.room.maxRounds || 3;
      const targetWins = Math.ceil(maxRounds / 2);

      let myDots = '';
      let oppDots = '';

      for (let i = 0; i < targetWins; i++) {
        myDots += i < this.roundWins.me ? '●' : '○';
        oppDots += i < this.roundWins.opponent ? '●' : '○';
      }

      myDotsEl.textContent = myDots;
      myDotsEl.style.color = this.myColor;
      oppDotsEl.textContent = oppDots;
      oppDotsEl.style.color = this.oppColor;
    }
  }

  // --- Score updates override for 2-player score layout ---
  updateScore(scoreVal) {
    const el = this.hudLayer.querySelector('#hud-my-score');
    if (el) el.textContent = scoreVal.toLocaleString();
  }

  updateOpponentScore(scoreVal) {
    const el = this.hudLayer.querySelector('#hud-opp-score');
    if (el) el.textContent = scoreVal.toLocaleString();
  }

  // --- Disconnection Overlay State ---
  handleOpponentDisconnect() {
    this.transitionTo('PAUSED');
    this.disconnectSeconds = 30;
    this.disconnectLayer.classList.add('active');

    const timerText = this.disconnectLayer.querySelector('#dc-timer-text');
    const claimBtn = this.disconnectLayer.querySelector('#dc-claim-btn');

    if (timerText) timerText.textContent = `Waiting for reconnection... [${this.disconnectSeconds}]`;
    if (claimBtn) {
      claimBtn.disabled = true;
      claimBtn.style.opacity = '0.5';
      claimBtn.style.cursor = 'not-allowed';
    }

    if (this.gameInstance && typeof this.gameInstance.onOpponentDisconnect === 'function') {
      this.gameInstance.onOpponentDisconnect();
    }

    this.disconnectTimer = setInterval(() => {
      this.disconnectSeconds--;
      if (timerText) timerText.textContent = `Waiting for reconnection... [${this.disconnectSeconds}]`;

      // Enable claim victory after 10 seconds
      if (this.disconnectSeconds <= 20 && claimBtn) {
        claimBtn.disabled = false;
        claimBtn.style.opacity = '1';
        claimBtn.style.cursor = 'pointer';
      }

      if (this.disconnectSeconds <= 0) {
        clearInterval(this.disconnectTimer);
        // Automatically claim victory
        if (this.socket) {
          this.socket.emit('game:claim-victory');
        }
      }
    }, 1000);
  }

  handleOpponentReconnect() {
    if (this.disconnectTimer) {
      clearInterval(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    this.disconnectLayer.classList.remove('active');
    this.transitionTo('PLAYING');
    this.lastTime = performance.now();
    this.gameLoop();
  }

  // --- Round End Overlay handler ---
  handleRoundEnd(roundWinner, scores, nextRound, seriesScore) {
    // Stop game loop temporarily
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.roundWins = seriesScore;
    this.updateOpponentHUD();

    const roundIndex = nextRound - 1;
    this.roundEndLayer.querySelector('#re-title').textContent = `ROUND ${roundIndex} COMPLETE`;
    this.roundEndLayer.querySelector('#re-my-score').textContent = scores[this.mySocketId] || 0;
    this.roundEndLayer.querySelector('#re-opp-score').textContent = Object.entries(scores).find(([sid]) => sid !== this.mySocketId)?.[1] || 0;

    const winnerName = roundWinner === this.mySocketId ? 'YOU' : (this.opponent?.displayName || 'OPPONENT');
    const winnerColor = roundWinner === this.mySocketId ? this.myColor : this.oppColor;

    const winTextEl = this.roundEndLayer.querySelector('#re-winner-text');
    winTextEl.textContent = `${winnerName} WINS ROUND ${roundIndex}!`;
    winTextEl.style.color = winnerColor;

    this.roundEndLayer.querySelector('#re-series-score').textContent = `Series: ${seriesScore.me} - ${seriesScore.opponent}`;

    this.roundEndLayer.classList.add('active');

    // Countdown before next round
    let reCount = 3;
    const countEl = this.roundEndLayer.querySelector('#re-countdown');
    countEl.textContent = `ROUND ${nextRound} IN ${reCount}...`;

    const countInterval = setInterval(() => {
      reCount--;
      countEl.textContent = `ROUND ${nextRound} IN ${reCount}...`;
      if (reCount <= 0) {
        clearInterval(countInterval);
        this.roundEndLayer.classList.remove('active');
        
        // Re-init game for next round
        if (this.gameInstance && typeof this.gameInstance.init === 'function') {
          this.gameInstance.init();
        }
        
        this.transitionTo('PLAYING');
        this.lastTime = performance.now();
        this.gameLoop();
      }
    }, 1000);
  }

  // --- Match Over Overlay handler ---
  handleMatchOver(winner, finalScores) {
    this.transitionTo('GAMEOVER');
    this._stopSessionTimer();
    this._stopTipRotation();

    // Play sound
    this.audio.play('gameover');

    const winnerName = winner === this.mySocketId ? 'YOU' : (this.opponent?.displayName || 'OPPONENT');
    const didIWin = winner === this.mySocketId;

    this.gameoverLayer.querySelector('.go-title').textContent = didIWin ? 'MATCH VICTORY!' : 'MATCH DEFEAT';
    const scoreValEl = this.gameoverLayer.querySelector('#go-score-val');
    scoreValEl.textContent = didIWin ? 'WINNER' : 'DEFEATED';
    scoreValEl.style.color = didIWin ? '#ffd700' : '#ef4444';

    // Show breakdown
    const breakdownContainer = this.gameoverLayer.querySelector('#go-breakdown-container');
    if (breakdownContainer) {
      breakdownContainer.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:center; margin-bottom:16px;">
          <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
            <div style="font-size:10px; color:rgba(255,255,255,0.4);">YOU</div>
            <div style="font-size:24px; font-weight:bold; color:${this.myColor}">${this.roundWins.me}</div>
          </div>
          <div style="background:rgba(255,255,255,0.02); padding:10px; border-radius:6px; border:1px solid rgba(255,255,255,0.04);">
            <div style="font-size:10px; color:rgba(255,255,255,0.4);">${(this.opponent?.displayName || 'OPPONENT').toUpperCase()}</div>
            <div style="font-size:24px; font-weight:bold; color:${this.oppColor}">${this.roundWins.opponent}</div>
          </div>
        </div>
      `;
    }

    const pbValEl = this.gameoverLayer.querySelector('#go-best-val');
    if (pbValEl) pbValEl.textContent = ''; // Clear personal best for multi

    // Rematch button config
    const retryBtn = this.gameoverLayer.querySelector('#go-retry-btn');
    if (retryBtn) {
      retryBtn.textContent = 'REMATCH';
      // Bind socket event trigger for rematch request
      retryBtn.replaceWith(retryBtn.cloneNode(true));
      const newRetryBtn = this.gameoverLayer.querySelector('#go-retry-btn');
      newRetryBtn.addEventListener('click', () => {
        if (this.socket) {
          this.socket.emit('room:rematch', { code: this.room.code });
          newRetryBtn.disabled = true;
          newRetryBtn.textContent = 'WAITING FOR OPPONENT...';
        }
      });
    }

    if (didIWin) {
      this.triggerParticleBurst();
    }
  }

  // --- Reaction Strip Controls & Animations ---
  triggerReaction(index) {
    if (this.reactionCooldown) return;
    this.reactionCooldown = true;
    setTimeout(() => { this.reactionCooldown = false; }, 3000);

    if (this.socket) {
      this.socket.emit('game:reaction', { index });
    }
    this.animateMyReaction(index);
  }

  animateMyReaction(index) {
    const emojis = ['😤', '👏', '😂', '🤔'];
    const el = document.createElement('span');
    el.className = 'reaction-flying-icon';
    el.textContent = emojis[index];
    el.style.left = '32px';
    el.style.top = '48px';
    this.mountPoint.appendChild(el);

    // Slide left to right animation
    let pos = 32;
    let opacity = 1.0;
    const anim = () => {
      pos += 8;
      opacity -= 0.02;
      el.style.transform = `translateX(${pos}px)`;
      el.style.opacity = opacity;
      if (opacity > 0) {
        requestAnimationFrame(anim);
      } else {
        el.remove();
      }
    };
    requestAnimationFrame(anim);
  }

  animateOpponentReaction(index) {
    const emojis = ['😤', '👏', '😂', '🤔'];
    const el = document.createElement('span');
    el.className = 'reaction-flying-icon';
    el.textContent = emojis[index];
    el.style.right = '32px';
    el.style.top = '48px';
    this.mountPoint.appendChild(el);

    // Slide right to left animation
    let pos = 32;
    let opacity = 1.0;
    const anim = () => {
      pos += 8;
      opacity -= 0.02;
      el.style.transform = `translateX(-${pos}px)`;
      el.style.opacity = opacity;
      if (opacity > 0) {
        requestAnimationFrame(anim);
      } else {
        el.remove();
      }
    };
    requestAnimationFrame(anim);
  }

  // Intercept keys 1, 2, 3, 4 for reactions
  handleKeyDown(e) {
    const key = e.key;
    if (['1', '2', '3', '4'].includes(key) && this.state === 'PLAYING') {
      e.preventDefault();
      const idx = parseInt(key, 10) - 1;
      this.triggerReaction(idx);
      return;
    }
    super.handleKeyDown(e);
  }

  // --- Cleaners override to teardown socket listeners ---
  destroyGameInstance() {
    if (this.socket) {
      this.socket.off('room:update');
      this.socket.off('game:action');
      this.socket.off('player:disconnected');
      this.socket.off('player:reconnected');
      this.socket.off('game:over');
      this.socket.off('game:round-end');
      this.socket.off('game:reaction');
    }
    if (this.disconnectTimer) {
      clearInterval(this.disconnectTimer);
    }
    super.destroyGameInstance();
  }
}
