import { MultiplayerGameBase } from '../../core/multiplayer-game-base.js';

export default class WordDuelGame extends MultiplayerGameBase {
  static logicalWidth = 600;
  static logicalHeight = 600;

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
      if (e.key.length !== 1) return; // ignore helper keys
      if (this.gameState.myTimeTaken !== null) return; // already complete

      const targetChar = this.gameState.word[this.gameState.typed.length];
      if (e.key.toLowerCase() === targetChar.toLowerCase()) {
        this.gameState.typed += targetChar;
        this.gameState.myProgress = this.gameState.typed.length;

        if (this.container) {
          this.container.audio.play('score');
        }

        this.socket.emit('word:progress', { code: this.room.code, lettersTyped: this.gameState.myProgress });

        if (this.gameState.typed === this.gameState.word) {
          this.socket.emit('word:complete', { code: this.room.code });
        }
      } else {
        if (this.container) {
          this.container.audio.play('damage');
        }
      }
    };
    document.addEventListener('keydown', this._onKey);
  }

  update(dt) {
    // Word Duel logic runs reactively to keyboard inputs
  }

  render(ctx) {
    const cw = WordDuelGame.logicalWidth;
    const ch = WordDuelGame.logicalHeight;

    // Background gradient
    const grad = ctx.createRadialGradient(cw / 2, ch / 2, 50, cw / 2, ch / 2, cw / 1.5);
    grad.addColorStop(0, '#0d0d18');
    grad.addColorStop(1, '#05050a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    // Progress Bars
    this._renderProgress(ctx, cw, ch);

    if (this.gameState.phase === 'typing') {
      this._renderTypingArea(ctx, cw, ch);
    } else if (this.gameState.phase === 'result') {
      this._renderResult(ctx, cw, ch);
    } else if (this.gameState.phase === 'ready') {
      ctx.font = '700 15px "DM Sans", sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.textAlign = 'center';
      ctx.fillText('GET READY...', cw / 2, ch / 2);
    }
  }

  _renderProgress(ctx, cw, ch) {
    if (!this.gameState.word) return;

    const wordLen = this.gameState.word.length;
    const myPct   = wordLen ? this.gameState.myProgress / wordLen : 0;
    const oppPct  = wordLen ? this.gameState.oppProgress / wordLen : 0;

    const barW = cw - 120;
    const barH = 10;
    const startX = 60;

    // My progress bar (top)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(startX, 100, barW, barH, 5);
    ctx.fill();

    ctx.fillStyle = '#6c63ff';
    ctx.beginPath();
    ctx.roundRect(startX, 100, barW * myPct, barH, 5);
    ctx.fill();

    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6c63ff';
    ctx.fillText('YOU', startX, 90);

    // Opp progress bar (bottom)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.beginPath();
    ctx.roundRect(startX, ch - 120, barW, barH, 5);
    ctx.fill();

    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.roundRect(startX, ch - 120, barW * oppPct, barH, 5);
    ctx.fill();

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(this.getOpponentName().toUpperCase(), startX + barW, ch - 130);
  }

  _renderTypingArea(ctx, cw, ch) {
    const word = this.gameState.word;
    const typed = this.gameState.typed;

    ctx.font = 'bold 36px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const letterWidth = ctx.measureText('W').width; // Mono padding base width
    const totalWidth = letterWidth * word.length;
    const startX = cw / 2 - totalWidth / 2;

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const isTyped = i < typed.length;

      const x = startX + i * letterWidth + letterWidth / 2;
      const y = ch / 2;

      // Active cursor underline
      if (i === typed.length) {
        ctx.fillStyle = 'rgba(108, 99, 255, 0.15)';
        ctx.fillRect(x - letterWidth / 2, y - 24, letterWidth, 48);
        ctx.fillStyle = '#6c63ff';
        ctx.fillRect(x - letterWidth / 2, y + 20, letterWidth, 4);
      }

      ctx.fillStyle = isTyped ? '#6c63ff' : 'rgba(255, 255, 255, 0.25)';
      ctx.fillText(char, x, y);
    }
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
    const color = isDraw ? '#F59E0B' : iWon ? '#10b981' : '#EF4444';

    ctx.font = 'bold 20px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, cw / 2, ch / 2 - 15);

    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(`YOU: ${myTime ? (myTime / 1000).toFixed(2) + 's' : 'DNF'}  •  THEM: ${oppTime ? (oppTime / 1000).toFixed(2) + 's' : 'DNF'}`, cw / 2, ch / 2 + 25);

    const bonus = res.bonuses[this.mySocketId] || 0;
    if (bonus > 0) {
      ctx.fillStyle = '#ffd700';
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
