/**
 * challenge/games/word-duel.js — Word Duel Client
 */

import { updateHudScores, updateHudRound } from '../js/game-runner.js';

export default class WordDuelGame {
  constructor(canvas, room, mySocketId, SocketClient) {
    this.canvas = canvas;
    this.room   = room;
    this.myId   = mySocketId;
    this.SC     = SocketClient;
    this.ctx    = canvas.getContext('2d');
    this.oppId  = room.players.find(p => p.socketId !== mySocketId)?.socketId;

    this.state = {
      phase: 'waiting', // 'waiting' | 'ready' | 'typing' | 'result'
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

    this._handlers = {};
    this._rafId    = null;
  }

  async init() {
    this.canvas.width  = 700;
    this.canvas.height = 400;
    this.canvas.style.cssText = 'border-radius:12px;outline:none;max-width:100%;max-height:100%;';

    this.bindSocket();
    this.bindInput();
    this.startRender();

    this.SC.emit('word:ready', { code: this.room.code });
    this.state.phase = 'ready';
  }

  bindSocket() {
    const on = (ev, fn) => { this._handlers[ev] = fn; this.SC.on(ev, fn); };

    on('word:round-start', ({ round, total, word, startTime }) => {
      this.state.round = round;
      this.state.total = total;
      this.state.word  = word;
      this.state.typed = '';
      this.state.myProgress  = 0;
      this.state.oppProgress = 0;
      this.state.startTime   = startTime;
      this.state.phase       = 'typing';
      this.state.lastResult  = null;
      this.state.myTimeTaken = null;
      updateHudRound(`ROUND ${round} / ${total}`);
    });

    on('word:opponent-progress', ({ lettersTyped }) => {
      this.state.oppProgress = lettersTyped;
    });

    on('word:you-finished', ({ timeTaken }) => {
      this.state.myTimeTaken = timeTaken;
    });

    on('word:result', ({ round, word, winner, completionTimes, scores, bonuses }) => {
      this.state.myScore  = scores[this.myId] || 0;
      this.state.oppScore = scores[this.oppId] || 0;
      this.state.lastResult = { winner, completionTimes, bonuses };
      this.state.phase = 'result';
      updateHudScores(this.state.myScore, this.state.oppScore);
    });
  }

  bindInput() {
    this._onKey = (e) => {
      if (this.state.phase !== 'typing') return;
      if (e.key.length !== 1) return; // ignore shift, ctrl, etc
      if (this.state.myTimeTaken !== null) return; // already done

      const targetChar = this.state.word[this.state.typed.length];
      
      // Case insensitive match
      if (e.key.toLowerCase() === targetChar.toLowerCase()) {
        this.state.typed += targetChar;
        this.state.myProgress = this.state.typed.length;
        
        this.SC.emit('word:progress', { code: this.room.code, lettersTyped: this.state.myProgress });

        if (this.state.typed === this.state.word) {
          this.SC.emit('word:complete', { code: this.room.code });
        }
      }
    };
    document.addEventListener('keydown', this._onKey);
  }

  startRender() {
    const tick = () => {
      this.render();
      this._rafId = requestAnimationFrame(tick);
    };
    tick();
  }

  render() {
    const c = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    c.fillStyle = '#060810';
    c.fillRect(0, 0, cw, ch);

    // Progress bars
    this._renderProgress(c, cw, ch);

    if (this.state.phase === 'typing') {
      this._renderTypingArea(c, cw, ch);
    } else if (this.state.phase === 'result') {
      this._renderResult(c, cw, ch);
    } else if (this.state.phase === 'ready') {
      c.font = '14px "JetBrains Mono", monospace';
      c.fillStyle = '#475569';
      c.textAlign = 'center';
      c.fillText('GET READY...', cw / 2, ch / 2);
    }
  }

  _renderProgress(c, cw, ch) {
    if (!this.state.word) return;
    
    const wordLen = this.state.word.length;
    const myPct   = wordLen ? this.state.myProgress / wordLen : 0;
    const oppPct  = wordLen ? this.state.oppProgress / wordLen : 0;

    const barW = cw - 80;
    const barH = 8;
    const startX = 40;

    // My Progress (Top)
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.beginPath(); c.roundRect(startX, 40, barW, barH, 4); c.fill();
    c.fillStyle = '#fd79a8';
    c.beginPath(); c.roundRect(startX, 40, barW * myPct, barH, 4); c.fill();
    c.font = '10px "JetBrains Mono", monospace';
    c.textAlign = 'left';
    c.fillStyle = '#fd79a8';
    c.fillText('YOU', startX, 32);

    // Opp Progress (Bottom)
    c.fillStyle = 'rgba(255,255,255,0.05)';
    c.beginPath(); c.roundRect(startX, ch - 48, barW, barH, 4); c.fill();
    c.fillStyle = '#4ecdc4';
    c.beginPath(); c.roundRect(startX, ch - 48, barW * oppPct, barH, 4); c.fill();
    c.textAlign = 'right';
    c.fillStyle = '#4ecdc4';
    c.fillText('THEM', startX + barW, ch - 54);
  }

  _renderTypingArea(c, cw, ch) {
    const word = this.state.word;
    const typed = this.state.typed;
    
    c.font = 'bold 36px "JetBrains Mono", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    
    const letterWidth = c.measureText('W').width; // approx mono width
    const totalWidth = letterWidth * word.length;
    const startX = cw / 2 - totalWidth / 2;

    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const isTyped = i < typed.length;
      
      const x = startX + i * letterWidth + letterWidth / 2;
      const y = ch / 2;

      // Cursor highlight
      if (i === typed.length) {
        c.fillStyle = 'rgba(253, 121, 168, 0.2)';
        c.fillRect(x - letterWidth/2, y - 24, letterWidth, 48);
        c.fillStyle = '#fd79a8';
        c.fillRect(x - letterWidth/2, y + 20, letterWidth, 4);
      }

      if (isTyped) {
        c.fillStyle = '#fd79a8';
        c.fillText(char, x, y);
      } else {
        c.fillStyle = '#475569';
        c.fillText(char, x, y);
      }
    }
  }

  _renderResult(c, cw, ch) {
    const res = this.state.lastResult;
    if (!res) return;

    const myTime = res.completionTimes[this.myId];
    const opTime = res.completionTimes[this.oppId];
    
    const text = res.winner === this.myId ? 'YOU WON!' : 
                 res.winner === null ? 'DRAW' : 'OPPONENT WON';
    const color = res.winner === this.myId ? '#fd79a8' : 
                  res.winner === null ? '#F59E0B' : '#EF4444';

    c.font = 'bold 24px "Press Start 2P", monospace';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = color;
    c.fillText(text, cw / 2, ch / 2 - 20);

    c.font = '12px "JetBrains Mono", monospace';
    c.fillStyle = '#94A3B8';
    c.fillText(`You: ${myTime ? (myTime/1000).toFixed(2)+'s' : 'DNF'}  |  Them: ${opTime ? (opTime/1000).toFixed(2)+'s' : 'DNF'}`, cw / 2, ch / 2 + 20);

    const bonus = res.bonuses[this.myId] || 0;
    if (bonus > 0) {
      c.fillStyle = '#00d4aa';
      c.fillText(`+${bonus} PTS`, cw / 2, ch / 2 + 45);
    }
  }

  destroy() {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    document.removeEventListener('keydown', this._onKey);
    for (const [ev, fn] of Object.entries(this._handlers)) this.SC.off(ev, fn);
  }
}
