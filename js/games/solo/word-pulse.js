import { GameBase } from '../../core/game-base.js';

class WordPulse extends GameBase {
  static logicalWidth = 580;
  static logicalHeight = 420;

  init() {
    this.wordsSolved = 0;
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    // Web Audio setup
    this.audioCtx = null;
    this.nextBeatTime = 0;
    this.beatHistory = []; // Array of timestamps

    // BPM & Level variables
    this.bpm = 60;
    this.windowSize = 0.150; // seconds (150ms)
    
    // Streaks & visuals
    this.streak = 0;
    this.onBeatFlash = 0; // visual trigger timer
    this.greenRingRadius = 0;
    this.greenRingOpacity = 0;
    
    this.totalTime = 0;
    
    this.words = {
      4: ["beat", "synt", "drum", "tune", "note", "loop", "wave"],
      5: ["tempo", "pulse", "synth", "sound", "cycle", "chord", "audio"],
      6: ["rhythm", "octave", "melody", "tuning", "volume", "player"],
      7: ["harmony", "singing", "guitars", "concert", "decibel"],
      8: ["resonance", "frequency", "sequencer", "equalizer", "synthesizer"],
      9: ["metronome", "acoustics", "amplitude", "vibraphone", "recording"],
      10: ["soundtrack", "modulation", "instrument", "microphone"],
      12: ["orchestration", "improvisation", "retrograde-synth"]
    };

    this.currentWord = "";
    this.typedIndex = 0;

    this.nextWord();
  }

  nextWord() {
    const lvl = this.level;
    
    // Set level stats
    const bpms = [0, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150];
    this.bpm = bpms[lvl] || 150;
    
    const windows = [0, 0.150, 0.130, 0.120, 0.110, 0.100, 0.090, 0.080, 0.070, 0.060, 0.050];
    this.windowSize = windows[lvl] || 0.050;

    let len = 4;
    if (lvl === 2) len = 5;
    else if (lvl === 3) len = 6;
    else if (lvl === 4) len = 7;
    else if (lvl === 5) len = 8;
    else if (lvl === 6) len = 9;
    else if (lvl === 7 || lvl === 8) len = 10;
    else if (lvl === 9 || lvl === 10) len = 12;

    const list = this.words[len] || this.words[4];
    this.currentWord = this.randomChoice(list);
    this.typedIndex = 0;

    // Initialize AudioContext on first interact or automatically if permitted
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      this.nextBeatTime = this.audioCtx.currentTime + 0.5;
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.totalTime += delta;

    // Ring expansion timers
    if (this.greenRingOpacity > 0) {
      this.greenRingRadius += delta * 0.15;
      this.greenRingOpacity = Math.max(0, this.greenRingOpacity - delta / 300);
    }
    if (this.onBeatFlash > 0) {
      this.onBeatFlash = Math.max(0, this.onBeatFlash - delta);
    }

    // Schedule beat beeps
    if (this.audioCtx) {
      // Resume if suspended (browser rules)
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      // Lookahead 150ms
      while (this.nextBeatTime < now + 0.15) {
        let skipBeat = false;
        
        // Level 6: skip beats occasionally
        if (this.level === 6 && Math.random() < 0.15) {
          skipBeat = true;
        }

        if (!skipBeat) {
          this.playOscillatorBeep(this.nextBeatTime);
          this.beatHistory.push(this.nextBeatTime);
          // Keep history short
          if (this.beatHistory.length > 20) this.beatHistory.shift();
        }

        // Advance scheduling
        let interval = 60 / this.bpm;

        // Level 8: Tempo shifts mid-word
        if (this.level === 8 && this.typedIndex >= Math.floor(this.currentWord.length / 2)) {
          interval = 60 / (this.bpm + 20); // Faster mid-word
        }

        // Level 10: Syncopated beat pattern (swing / double beat)
        if (this.level === 10) {
          const beatIndex = Math.floor(this.nextBeatTime * (this.bpm / 60));
          if (beatIndex % 4 === 1 || beatIndex % 4 === 3) {
            interval = (60 / this.bpm) * 0.5; // double-time skip
          } else {
            interval = (60 / this.bpm) * 1.5;
          }
        }

        this.nextBeatTime += interval;
      }
    }

    // Input processing
    const inp = this.input;
    let typedChar = null;
    for (const key of inp.pressed) {
      if (key.length === 1 && key.toLowerCase() >= 'a' && key.toLowerCase() <= 'z') {
        typedChar = key.toLowerCase();
        break;
      }
    }

    if (typedChar) {
      const correctChar = this.currentWord[this.typedIndex];
      if (typedChar === correctChar) {
        // Find nearest beat
        const now = this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000;
        let nearestBeat = 0;
        let minDiff = Infinity;
        this.beatHistory.forEach(b => {
          const diff = Math.abs(now - b);
          if (diff < minDiff) {
            minDiff = diff;
            nearestBeat = b;
          }
        });

        // Determine if inside window
        if (minDiff <= this.windowSize) {
          // On Beat!
          this.score += 10;
          this.streak++;
          this.onBeatFlash = 200; // flash circle
          this.greenRingRadius = 40;
          this.greenRingOpacity = 1.0;
        } else {
          // Off Beat!
          this.streak = 0;
        }

        this.typedIndex++;
        
        // Word clear check
        if (this.typedIndex >= this.currentWord.length) {
          this.wordsSolved++;
          if (this.wordsSolved >= 15) {
            this.levelComplete();
          } else {
            this.nextWord();
          }
        }
      } else {
        // Missed (wrong key) breaks streak
        this.streak = 0;
      }
    }
  }

  playOscillatorBeep(time) {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      // Tone pitch
      osc.frequency.setValueAtTime(440, time);
      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.05);
      
      osc.start(time);
      osc.stop(time + 0.06);
    } catch(e) {}
  }

  render(ctx) {
    this.clear();

    const cx = this.W / 2;
    const cy = this.H / 2;

    // Draw Pulse Ring & scale animation
    // Find time elapsed since nearest beat to calculate circle scale
    const now = this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000;
    let nearestBeat = 0;
    let minDiff = Infinity;
    this.beatHistory.forEach(b => {
      const diff = Math.abs(now - b);
      if (diff < minDiff) {
        minDiff = diff;
        nearestBeat = b;
      }
    });

    // expansion: 80ms, return: 140ms. Let's calculate scale factor
    let scale = 1.0;
    let opacity = 0.3;
    const msDiff = minDiff * 1000;
    if (now >= nearestBeat) {
      // past beat: shrink back
      if (msDiff <= 140) {
        const t = msDiff / 140; // 0 to 1
        scale = 1.35 - t * 0.35;
        opacity = 0.7 - t * 0.4;
      }
    } else {
      // heading to beat: expand
      if (msDiff <= 80) {
        const t = msDiff / 80; // 1 to 0
        scale = 1.0 + (1.0 - t) * 0.35;
        opacity = 0.3 + (1.0 - t) * 0.4;
      }
    }

    // On-beat correct keypress bright override
    if (this.onBeatFlash > 0) {
      opacity = 1.0;
      scale = 1.35;
    }

    // 1. Draw expanding green ring on hit
    if (this.greenRingOpacity > 0) {
      ctx.strokeStyle = `rgba(0, 212, 170, ${this.greenRingOpacity})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, this.greenRingRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Draw beat circle
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 60 * scale, 0, Math.PI * 2);
    ctx.stroke();

    // 3. Draw Word in center
    ctx.font = "bold 32px 'JetBrains Mono', monospace";
    ctx.textAlign = 'center';
    
    // Draw letters with proper highlights
    const letterSpacing = 24;
    const totalW = (this.currentWord.length - 1) * letterSpacing;
    const startX = cx - totalW / 2;

    for (let i = 0; i < this.currentWord.length; i++) {
      const lx = startX + i * letterSpacing;
      const ly = cy + 120;

      if (i < this.typedIndex) {
        ctx.fillStyle = '#fd79a8'; // Typed letters: accent color
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; // Remaining: white
      }

      ctx.fillText(this.currentWord[i].toUpperCase(), lx, ly);

      // Underscore cursor on current letter
      if (i === this.typedIndex) {
        ctx.fillStyle = '#fd79a8';
        ctx.fillRect(lx - 10, ly + 8, 20, 3);
      }
    }

    // Streak and status
    if (this.streak >= 3) {
      ctx.fillStyle = '#00d4aa';
      ctx.font = "bold 13px 'DM Sans', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(`×${this.streak} ON BEAT`, cx, cy - 100);
    }

    // Top Right: BPM
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText(`${this.bpm} BPM`, this.W - 24, 30);

    // Bottom Left: solved words counter
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`WORDS CLEAR: ${this.wordsSolved}/15`, 24, this.H - 24);
  }

  destroy() {
    if (this.audioCtx) {
      this.audioCtx.close();
    }
    super.destroy();
  }
}

window.GameClass = WordPulse;
export default WordPulse;
