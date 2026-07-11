import { GameBase } from '../../core/game-base.js';

class BeatDrop extends GameBase {
  static logicalWidth = 500;
  static logicalHeight = 620;

  init() {
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    this.audioCtx = null;
    this.beatHistory = [];
    this.totalTime = 0;

    const lvl = this.level;
    this.bpm = 80 + lvl * 10;
    this.beatInterval = 60 / this.bpm; // seconds per beat

    // Lanes and Key configurations
    this.laneKeys = ['d', 'f', 'j', 'k'];
    this.laneColors = ['#81ecec', '#55efc4', '#ff7675', '#a29bfe']; // soft blue, green, orange, purple
    this.laneWidth = 500 / 4;
    this.hitLineY = 520;

    // Prefill note events list
    this.notes = []; // { id, lane, beatTime, type, duration, hitState: 'pending'|'perfect'|'good'|'miss', isHoldActive }
    this.noteIdCounter = 0;
    
    // Beat count limit to clear level
    this.targetClearNotes = 30;
    this.notesProcessed = 0;
    this.notesCorrect = 0;

    // Combos & indicators
    this.combo = 0;
    this.hitLineFlash = 0;
    this.feedbackText = "";
    this.feedbackColor = "#fff";
    this.feedbackTimer = 0;

    // Travel settings
    this.travelDuration = 1.6; // seconds for note to reach hit line from top

    this.lastScheduledBeatTime = 0;

    this.initializeAudio();
  }

  initializeAudio() {
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    this.lastScheduledBeatTime = this.audioCtx.currentTime + 1.0;
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    this.totalTime += delta;

    if (this.hitLineFlash > 0) {
      this.hitLineFlash = Math.max(0, this.hitLineFlash - delta);
    }
    if (this.feedbackTimer > 0) {
      this.feedbackTimer = Math.max(0, this.feedbackTimer - delta);
    }

    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Lookahead note scheduling (schedule beats 2.0s in advance)
      while (this.lastScheduledBeatTime < now + 2.0) {
        this.scheduleNotesAtBeat(this.lastScheduledBeatTime);
        this.lastScheduledBeatTime += this.beatInterval;
      }
    }

    // Process notes positioning and misses
    const nowSec = this.audioCtx ? this.audioCtx.currentTime : performance.now() / 1000;
    
    this.notes.forEach(note => {
      // Calculate visual y position
      const elapsed = nowSec - (note.beatTime - this.travelDuration);
      note.y = -20 + (elapsed / this.travelDuration) * (this.hitLineY + 20);

      // Miss check: if note elapsed past the good timing window (80ms) and pending
      if (note.hitState === 'pending' && nowSec > note.beatTime + 0.080) {
        note.hitState = 'miss';
        this.triggerMiss();
      }
    });

    // Remove expired off-screen notes
    this.notes = this.notes.filter(n => n.y < 640);

    // Read D, F, J, K inputs
    const inp = this.input;
    this.laneKeys.forEach((key, laneIdx) => {
      // Filter active lanes based on level progression
      // L1: 2 lanes (D & K only)
      if (this.level === 1 && (laneIdx !== 0 && laneIdx !== 3)) return;
      // L2: 3 lanes (D, F, K)
      if (this.level === 2 && laneIdx === 2) return;

      if (inp.wasPressed(key)) {
        this.checkHit(laneIdx, nowSec);
      }
    });
  }

  scheduleNotesAtBeat(beatTime) {
    const lvl = this.level;
    const beatIndex = Math.floor(beatTime / this.beatInterval);

    // Filter available lanes
    let activeLanes = [0, 1, 2, 3];
    if (lvl === 1) activeLanes = [0, 3];
    else if (lvl === 2) activeLanes = [0, 1, 3];

    // Pick active lanes for note spawning
    const roll = Math.random();
    
    // Level 3: no simultaneous
    // Level 4+: occasional chords
    const chordChance = lvl >= 8 ? 0.35 : lvl >= 4 ? 0.2 : 0.0;
    
    let lanesToSpawn = [];
    if (roll < 0.7) {
      lanesToSpawn.push(this.randomChoice(activeLanes));
      if (Math.random() < chordChance) {
        const remaining = activeLanes.filter(l => l !== lanesToSpawn[0]);
        if (remaining.length > 0) {
          lanesToSpawn.push(this.randomChoice(remaining));
        }
      }
    }

    lanesToSpawn.forEach(l => {
      // Hold note roll starting L5
      const isHold = (lvl >= 5 && Math.random() < 0.15);
      
      this.notes.push({
        id: this.noteIdCounter++,
        lane: l,
        beatTime,
        type: isHold ? 'hold' : 'tap',
        duration: isHold ? 500 : 0,
        hitState: 'pending',
        y: -20
      });
    });
  }

  checkHit(laneIdx, pressTime) {
    // Find closest pending note in this lane
    const candidates = this.notes.filter(n => n.lane === laneIdx && n.hitState === 'pending');
    candidates.sort((a, b) => Math.abs(pressTime - a.beatTime) - Math.abs(pressTime - b.beatTime));

    const target = candidates[0];
    if (target) {
      const diff = Math.abs(pressTime - target.beatTime);
      
      if (diff <= 0.030) {
        // PERFECT
        target.hitState = 'perfect';
        this.score += 30;
        this.notesCorrect++;
        this.combo++;
        this.hitLineFlash = 150;
        this.triggerFeedback("PERFECT", '#6c5ce7');
        this.verifyLevelClear();
      } else if (diff <= 0.080) {
        // GOOD
        target.hitState = 'good';
        this.score += 15;
        this.notesCorrect++;
        this.combo++;
        this.hitLineFlash = 100;
        this.triggerFeedback("GOOD", '#ffffff');
        this.verifyLevelClear();
      } else {
        // Too early / MISS
        target.hitState = 'miss';
        this.triggerMiss();
      }
    } else {
      // Miss click
      this.triggerMiss();
    }
  }

  triggerMiss() {
    this.combo = 0;
    this.lives--;
    this.triggerFeedback("MISS", '#ff7675');

    if (this.lives <= 0) {
      this.isOver = true;
      this.gameOver();
    }
  }

  triggerFeedback(text, color) {
    this.feedbackText = text;
    this.feedbackColor = color;
    this.feedbackTimer = 600;
  }

  verifyLevelClear() {
    if (this.notesCorrect >= this.targetClearNotes) {
      this.levelComplete();
    }
  }

  render(ctx) {
    this.clear();

    // Draw 4 lanes columns
    for (let i = 0; i < 4; i++) {
      const lx = i * this.laneWidth;
      
      // Lane background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.fillRect(lx, 0, this.laneWidth, this.H);

      // Separators
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, this.H);
      ctx.stroke();

      // Lane keycap indicator at very bottom
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.font = "bold 13px 'DM Sans', sans-serif";
      ctx.textAlign = 'center';
      
      const keyLabel = this.laneKeys[i].toUpperCase();
      ctx.fillText(keyLabel, lx + this.laneWidth / 2, this.H - 12);
    }

    // Draw Hit Line
    ctx.strokeStyle = '#6c5ce7';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, this.hitLineY);
    ctx.lineTo(this.W, this.hitLineY);
    ctx.stroke();

    // Hit glow pulse
    if (this.hitLineFlash > 0) {
      ctx.fillStyle = `rgba(108, 92, 231, ${0.15 * (this.hitLineFlash / 150)})`;
      ctx.fillRect(0, this.hitLineY - 15, this.W, 30);
    }

    // Draw notes
    this.notes.forEach(n => {
      if (n.y < -30 || n.y > 620) return;

      const lx = n.lane * this.colWidth;
      const nx = n.lane * this.laneWidth + this.laneWidth / 2;

      ctx.save();
      
      if (n.hitState === 'miss') {
        ctx.fillStyle = '#ff7675'; // turns red
      } else if (n.hitState !== 'pending') {
        // hit notes fade
        return;
      } else {
        ctx.fillStyle = this.laneColors[n.lane];
      }

      // Draw rounded rectangle note block
      const noteW = this.laneWidth - 28;
      const noteH = n.type === 'hold' ? 60 : 16;
      ctx.fillRect(nx - noteW / 2, n.y - noteH / 2, noteW, noteH);

      ctx.restore();
    });

    // Draw PERFECT/GOOD/MISS feedbacks
    if (this.feedbackTimer > 0) {
      ctx.save();
      ctx.globalAlpha = this.feedbackTimer / 600;
      ctx.fillStyle = this.feedbackColor;
      ctx.font = "bold 18px 'DM Sans', sans-serif";
      ctx.textAlign = 'center';
      
      // scale pop
      const scale = 1.0 + (1.0 - this.feedbackTimer / 600) * 0.2;
      ctx.save();
      ctx.translate(this.W / 2, this.hitLineY - 80);
      ctx.scale(scale, scale);
      ctx.fillText(this.feedbackText, 0, 0);
      ctx.restore();

      ctx.restore();
    }

    // Draw Combo text center top
    if (this.combo >= 5) {
      ctx.fillStyle = '#6c5ce7';
      ctx.font = "bold 24px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText(`COMBO: ${this.combo}`, this.W / 2, 80);
    }

    // Solved notes counter
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`NOTES: ${this.notesCorrect}/${this.targetClearNotes}`, 24, 30);
  }

  destroy() {
    if (this.audioCtx) {
      this.audioCtx.close();
    }
    super.destroy();
  }
}

window.GameClass = BeatDrop;
export default BeatDrop;
