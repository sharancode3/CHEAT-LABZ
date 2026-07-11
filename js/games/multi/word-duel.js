import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

export default class WordDuelGame extends MultiplayerGameBase {
  static logicalWidth = 680;
  static logicalHeight = 440;

  constructor(canvas, room, mySocketId, socket) {
    super(canvas, room, mySocketId, socket);

    this.gameState = {
      phase: 'ready', // 'waiting' | 'ready' | 'typing' | 'result'
      round: 0,
      total: 5,
      myScore: 0,
      oppScore: 0,
      word: '',
      typed: '',
      myProgress: 0,
      oppProgress: 0,
      startTime: 0,
      lastResult: null,
      myTimeTaken: null,
    };

    this.shakeTimer = 0;
    this.flashRedTimer = 0;
    this._boundHandlers = {};
  }

  async init() {
    this.bindSocket();
    this.bindInput();

    this.socket.emit('word:ready', { code: this.room.code });
    this.gameState.phase = 'ready';
  }

  bindSocket() {
    const bind = (ev, fn) => {
      this._boundHandlers[ev] = fn;
      this.socket.on(ev, fn);
    };

    bind('word:round-start', ({ round, total, word, startTime }) => {
      this.gameState.round = round;
      this.gameState.total = total;
      this.gameState.word  = word;
      this.gameState.typed = '';
      this.gameState.myProgress  = 0;
      this.gameState.oppProgress = 0;
      this.gameState.startTime   = startTime;
      this.gameState.phase       = 'typing';
      this.gameState.lastResult  = null;
      this.gameState.myTimeTaken = null;
      this.shakeTimer = 0;
      this.flashRedTimer = 0;
    });

    bind('word:opponent-progress', ({ lettersTyped }) => {
      this.gameState.oppProgress = lettersTyped;
    });

    bind('word:you-finished', ({ timeTaken }) => {
      this.gameState.myTimeTaken = timeTaken;
    });

    bind('word:result', ({ round, word, winner, completionTimes, scores, bonuses }) => {
      const oppId = this.opponent?.socketId;
      this.gameState.myScore  = scores[this.mySocketId] || 0;
      this.gameState.oppScore = scores[oppId] || 0;
      this.gameState.lastResult = { winner, completionTimes, bonuses };
      this.gameState.phase = 'result';

      if (this.container) {
        this.container.updateScore(this.gameState.myScore);
        this.container.updateOpponentScore(this.gameState.oppScore);
      }
    });
  }

  bindInput() {
    this._onKey = (e) => {
      if (this.gameState.phase !== 'typing') return;
      if (e.key.length !== 1) return; // ignore control keys
      if (this.gameState.myTimeTaken !== null) return; // already done

      const targetChar = this.gameState.word[this.gameState.typed.length];
      if (e.key.toLowerCase() === targetChar.toLowerCase()) {
        this.gameState.typed += targetChar;
        this.gameState.myProgress = this.gameState.typed.length;

        if (this.container) {
          this.container.audio.play('hit');
        }

        this.socket.emit('word:progress', { code: this.room.code, lettersTyped: this.gameState.myProgress });

        if (this.gameState.typed === this.gameState.word) {
          this.socket.emit('word:complete', { code: this.room.code });
        }
      } else {
        // wrong letter: shake and flash red
        this.shakeTimer = 150;
        this.flashRedTimer = 150;
        if (this.container) {
          this.container.audio.play('damage');
        }
      }
    };
    document.addEventListener('keydown', this._onKey);
  }

  update(dt) {
    if (this.shakeTimer > 0) this.shakeTimer = Math.max(0, this.shakeTimer - dt * 1000);
    if (this.flashRedTimer > 0) this.flashRedTimer = Math.max(0, this.flashRedTimer - dt * 1000);
  }

  render(ctx) {
    const cw = WordDuelGame.logicalWidth;
    const ch = WordDuelGame.logicalHeight;

    // Dark layout backdrop
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, cw, ch);

    if (this.gameState.phase === 'ready') {
      ctx.font = "bold 16px 'Press Start 2P', monospace";
      ctx.fillStyle = '#fd79a8'; // Accent
      ctx.textAlign = 'center';
      ctx.fillText('GET READY...', cw / 2, ch / 2);
    } else if (this.gameState.phase === 'typing') {
      this._renderTypingArea(ctx, cw, ch);
      this._renderOpponentProgress(ctx, cw, ch);
    } else if (this.gameState.phase === 'result') {
      this._renderResult(ctx, cw, ch);
    }
  }

  _renderTypingArea(ctx, cw, ch) {
    const word = this.gameState.word;
    const typed = this.gameState.typed;
    const isDone = this.gameState.myTimeTaken !== null;

    if (isDone) {
      // Completed -> fill green overlay top area
      ctx.fillStyle = 'rgba(0, 212, 170, 0.08)';
      ctx.fillRect(20, 40, cw - 40, 200);
      ctx.strokeStyle = '#00d4aa';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, 40, cw - 40, 200);

      ctx.font = "bold 14px 'Press Start 2P', monospace";
      ctx.fillStyle = '#00d4aa';
      ctx.textAlign = 'center';
      ctx.fillText(`FINISHED: ${(this.gameState.myTimeTaken / 1000).toFixed(2)}s`, cw / 2, 140);
      return;
    }

    ctx.save();
    
    // Apply Shake transformations
    let dx = 0;
    if (this.shakeTimer > 0) {
      dx = (Math.random() - 0.5) * 8;
    }
    ctx.translate(dx, 0);

    // Render word center
    ctx.font = "bold 44px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const letterWidth = ctx.measureText('W').width;
    const totalW = letterWidth * word.length;
    const startX = cw / 2 - totalW / 2;

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const isCorrect = i < typed.length;
      const isCurrent = i === typed.length;

      const lx = startX + i * letterWidth + letterWidth / 2;
      const ly = 130;

      // Draw character
      if (isCorrect) {
        ctx.fillStyle = '#fd79a8'; // Accent color
      } else if (isCurrent && this.flashRedTimer > 0) {
        ctx.fillStyle = '#ff7675'; // Flashing red
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
      }
      ctx.fillText(char, lx, ly);

      // Blinking Underscore cursor on current position
      if (isCurrent) {
        const blink = Math.floor(Date.now() / 400) % 2 === 0;
        if (blink) {
          ctx.fillStyle = '#fd79a8';
          ctx.fillRect(lx - letterWidth / 2.5, ly + 25, letterWidth * 0.8, 4);
        }
      }
    }
    ctx.restore();
  }

  _renderOpponentProgress(ctx, cw, ch) {
    if (!this.gameState.word) return;

    const wordLen = this.gameState.word.length;
    const oppPct = wordLen ? this.gameState.oppProgress / wordLen : 0;

    const barW = cw - 120;
    const barH = 12;
    const startX = 60;
    const startY = ch - 120;

    ctx.save();
    // Opponent text header
    ctx.font = "bold 13px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ff7675';
    ctx.fillText(`Opponent: ${Math.round(oppPct * 100)}%`, startX, startY - 14);

    // Progress bar bg
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(startX, startY, barW, barH, 6);
    ctx.fill();

    // Progress bar fill
    ctx.fillStyle = '#ff7675'; // Opponent color
    ctx.beginPath();
    ctx.roundRect(startX, startY, barW * oppPct, barH, 6);
    ctx.fill();
    ctx.restore();
  }

  _renderResult(ctx, cw, ch) {
    const res = this.gameState.lastResult;
    if (!res) return;

    const oppId = this.opponent?.socketId;
    const myTime = res.completionTimes[this.mySocketId];
    const oppTime = res.completionTimes[oppId];

    const iWon = res.winner === this.mySocketId;
    const isDraw = res.winner === null;

    const text = isDraw ? 'DRAW' : iWon ? 'YOU WON!' : 'THEY WIN';
    const color = isDraw ? '#ffffff' : iWon ? '#fd79a8' : '#ff7675';

    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, cw / 2, ch / 2 - 20);

    ctx.font = "bold 13px 'JetBrains Mono', monospace";
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(`YOU: ${myTime ? (myTime / 1000).toFixed(2) + 's' : 'DNF'}  •  THEM: ${oppTime ? (oppTime / 1000).toFixed(2) + 's' : 'DNF'}`, cw / 2, ch / 2 + 25);

    const bonus = res.bonuses[this.mySocketId] || 0;
    if (bonus > 0) {
      ctx.fillStyle = '#ffd93d';
      ctx.fillText(`+${bonus} PTS SPEED BONUS`, cw / 2, ch / 2 + 55);
    }
  }

  destroy() {
    document.removeEventListener('keydown', this._onKey);
    for (const [ev, fn] of Object.entries(this._boundHandlers)) {
      this.socket.off(ev, fn);
    }
    super.destroy();
  }
}
