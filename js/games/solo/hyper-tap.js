import { GameBase } from '../../core/game-base.js';

class HyperTap extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.dots = [];
    this.score = 0;
    this.lives = 3;
    this.tapsCount = 0;

    this.time = 0;
    this.setupLevel();
  }

  setupLevel() {
    const lvl = this.level;
    const dotCount = lvl >= 8 ? 3 : (lvl >= 5 ? 2 : 1);
    
    // Dot size shrinks as level goes up
    const radius = Math.max(15, 35 - lvl * 2);

    for (let i = 0; i < dotCount; i++) {
      this.dots.push({
        x: 300,
        y: 300,
        radius: radius,
        speed: 100 + lvl * 20,
        offset: i * (Math.PI / 2),
        type: lvl >= 6 ? 'lissajous' : 'linear'
      });
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;
    this.time += dt;

    this.dots.forEach(d => {
      if (d.type === 'linear') {
        // Move in a horizontal linear back and forth path
        d.x = 300 + Math.sin(this.time * (d.speed / 100) + d.offset) * 200;
        d.y = 300;
      } else {
        // Lissajous curve motion
        d.x = 300 + Math.sin(this.time * (d.speed / 100) * 2 + d.offset) * 200;
        d.y = 300 + Math.cos(this.time * (d.speed / 100) * 3 + d.offset) * 200;
      }
    });

    // Poll mouse/touch clicks
    const inp = this.input;
    if (inp.wasMouseClicked()) {
      const m = inp.getMousePos();
      
      // Check if clicked any dot
      let hit = false;
      this.dots.forEach(d => {
        const dist = this.distance(m.x, m.y, d.x, d.y);
        if (dist <= d.radius + 10) { // Slight click buffer
          hit = true;
          this.tapsCount++;
          this.score += 50;
        }
      });

      if (!hit) {
        this.lives--;
      } else {
        // Check Goal
        const goal = this.getLevelGoal();
        if (this.tapsCount >= goal.target) {
          this.levelComplete();
        }
      }
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Targets
    this.dots.forEach((d, idx) => {
      ctx.fillStyle = idx === 0 ? '#6c63ff' : '#00d4aa';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Taps', value: `${this.tapsCount}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'taps', target: 5 },
      { type: 'taps', target: 6 },
      { type: 'taps', target: 8 },
      { type: 'taps', target: 10 },
      { type: 'taps', target: 12 },
      { type: 'taps', target: 14 },
      { type: 'taps', target: 16 },
      { type: 'taps', target: 18 },
      { type: 'taps', target: 20 },
      { type: 'taps', target: 25 }
    ];
    return goals[this.level];
  }
}

window.GameClass = HyperTap;
