import { GameBase } from '../../core/game-base.js';

class BeatDrop extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    // Lanes scale with level (2 lanes to 4 lanes)
    this.laneCount = this.level >= 5 ? 4 : 2;
    this.laneWidth = 600 / this.laneCount;
    this.keys = this.laneCount === 2 ? ['f', 'j'] : ['d', 'f', 'j', 'k'];

    this.notes = []; // { lane, y, type: 'tap'/'hold', duration, hit }
    this.bpm = 80 + this.level * 8; // BPM scales from 88 to 160
    
    this.speed = 250 + this.level * 20; // Scroll speed
    this.spawnTimer = 0;
    this.spawnInterval = 60 / this.bpm; // Secs per beat

    this.notesHit = 0;
    this.score = 0;
    this.lives = 3;
  }

  spawnNote() {
    const lane = this.randomInt(0, this.laneCount - 1);
    // Hold notes appear at Level 6+
    const type = (this.level >= 6 && Math.random() < 0.25) ? 'hold' : 'tap';
    this.notes.push({
      lane,
      y: -50,
      type,
      duration: type === 'hold' ? 100 : 0, // length of hold
      hit: false
    });
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;

    // Scroll notes
    this.notes.forEach(n => {
      n.y += this.speed * dt;
    });

    // Check missed notes
    this.notes.forEach(n => {
      if (n.y > 520 && !n.hit) {
        n.hit = true;
        this.lives--;
      }
    });

    // Spawn new notes on BPM beats
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnNote();
    }

    // Read Input
    const inp = this.input;
    this.keys.forEach((key, laneIdx) => {
      if (inp.wasPressed(key)) {
        this.tapLane(laneIdx);
      }
    });
  }

  tapLane(laneIdx) {
    // Find closest note in this lane
    const target = this.notes
      .filter(n => n.lane === laneIdx && !n.hit)
      .sort((a, b) => b.y - a.y)[0];

    if (target) {
      // Hit zone: y around 480 (±40px leeway)
      const hitDiff = Math.abs(target.y - 480);
      if (hitDiff < 40) {
        target.hit = true;
        this.notesHit++;
        this.score += 20;

        // Check Goal
        const goal = this.getLevelGoal();
        if (this.notesHit >= goal.target) {
          this.levelComplete();
        }
      } else {
        this.lives--;
      }
    } else {
      this.lives--;
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Lanes
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let i = 1; i < this.laneCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * this.laneWidth, 0);
      ctx.lineTo(i * this.laneWidth, 600);
      ctx.stroke();
    }

    // Draw Hit Zone line
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 480);
    ctx.lineTo(600, 480);
    ctx.stroke();

    // Draw Notes
    this.notes.forEach(n => {
      if (n.hit) return;
      ctx.fillStyle = n.type === 'hold' ? '#ffd93d' : '#6c63ff';
      ctx.beginPath();
      ctx.arc(n.lane * this.laneWidth + this.laneWidth / 2, n.y, 16, 0, Math.PI * 2);
      ctx.fill();

      if (n.type === 'hold') {
        // Draw hold tail
        ctx.fillRect(n.lane * this.laneWidth + this.laneWidth / 2 - 4, n.y - n.duration, 8, n.duration);
      }
    });
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Notes Hit', value: `${this.notesHit}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'notes', target: 10 },
      { type: 'notes', target: 12 },
      { type: 'notes', target: 14 },
      { type: 'notes', target: 16 },
      { type: 'notes', target: 18 },
      { type: 'notes', target: 20 },
      { type: 'notes', target: 22 },
      { type: 'notes', target: 24 },
      { type: 'notes', target: 26 },
      { type: 'notes', target: 30 }
    ];
    return goals[this.level];
  }
}

window.GameClass = BeatDrop;
