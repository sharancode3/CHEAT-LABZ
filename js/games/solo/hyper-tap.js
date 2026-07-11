import { GameBase } from '../../core/game-base.js';

class HyperTap extends GameBase {
  static logicalWidth = 440;
  static logicalHeight = 440;

  init() {
    this.score = 0;
    this.lives = 3;
    this.isOver = false;

    this.tapsCount = 0;
    this.totalTapScore = 0;

    this.time = 0;
    this.phaseX = Math.random() * Math.PI * 2;
    this.phaseY = Math.random() * Math.PI * 2;
    
    // Position parameters
    this.cx = 220;
    this.cy = 220;
    this.targetRadiusX = 0; // for moving targets (L7 / L10)
    this.targetRadiusY = 0;
    
    // Scale properties of rings
    const lvl = this.level;
    this.innerR = Math.max(10, 18 - lvl * 0.8);
    this.middleR = this.innerR * 2.2;
    this.outerR = this.innerR * 4.0;

    // Lissajous settings
    this.freqX = 3;
    this.freqY = 2;
    this.radiusX = 100 + lvl * 10;
    this.radiusY = 80 + lvl * 10;
    this.speedMultiplier = 1.0 + lvl * 0.15;

    if (lvl === 1) { this.freqX = 2; this.freqY = 1; }
    else if (lvl === 2 || lvl === 3) { this.freqX = 3; this.freqY = 2; }
    else if (lvl === 4) { this.freqX = 4; this.freqY = 3; }
    else { this.freqX = 5; this.freqY = 3; }

    // Multi-dot structures
    this.dots = [];
    this.spawnDots();

    // Visual lists
    this.popups = []; // { x, y, text, color, timer }
    this.glows = []; // { x, y, r, opacity }
    this.edgePulseTimer = 0;
  }

  spawnDots() {
    this.dots = [];
    const lvl = this.level;

    // Dot data: { x, y, offsetT, active, isTarget, isBrighter }
    this.dots.push({
      x: 220,
      y: 220,
      offsetT: 0,
      isTarget: true,
      isBrighter: true,
      opacity: 1.0
    });

    if (lvl === 6) {
      // Two dots: tap the brighter one
      this.dots.push({
        x: 220,
        y: 220,
        offsetT: Math.PI / 2,
        isTarget: false,
        isBrighter: false,
        opacity: 0.4
      });
    } else if (lvl === 9) {
      // Three dots, one target marked
      this.dots.push({
        x: 220,
        y: 220,
        offsetT: Math.PI / 3,
        isTarget: false,
        isBrighter: true,
        opacity: 1.0
      });
      this.dots.push({
        x: 220,
        y: 220,
        offsetT: (2 * Math.PI) / 3,
        isTarget: false,
        isBrighter: true,
        opacity: 1.0
      });
    } else if (lvl === 10) {
      // Decoy dots
      this.dots.push({
        x: 220,
        y: 220,
        offsetT: Math.PI / 2,
        isTarget: false,
        isBrighter: true,
        opacity: 1.0
      });
      this.dots.push({
        x: 220,
        y: 220,
        offsetT: Math.PI,
        isTarget: false,
        isBrighter: true,
        opacity: 1.0
      });
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;
    this.time += dt * this.speedMultiplier;

    // Update animations
    if (this.edgePulseTimer > 0) {
      this.edgePulseTimer = Math.max(0, this.edgePulseTimer - delta);
    }
    this.popups.forEach(p => p.timer -= delta);
    this.popups = this.popups.filter(p => p.timer > 0);

    this.glows.forEach(g => {
      g.r += delta * 0.1;
      g.opacity = Math.max(0, g.opacity - delta / 300);
    });
    this.glows = this.glows.filter(g => g.opacity > 0);

    // Target movement rotation (Level 7 & Level 10)
    if (this.level === 7 || this.level === 10) {
      const angle = this.time * 0.5;
      this.cx = 220 + Math.cos(angle) * 45;
      this.cy = 220 + Math.sin(angle) * 45;
    } else {
      this.cx = 220;
      this.cy = 220;
    }

    // Update dot movement coordinates
    this.dots.forEach(d => {
      const t = this.time + d.offsetT;
      d.x = 220 + Math.sin(t * this.freqX + this.phaseX) * this.radiusX;
      d.y = 220 + Math.sin(t * this.freqY + this.phaseY) * this.radiusY;

      // Level 8: Dot briefly invisible every 3rd tap sequence
      if (this.level === 8 && this.tapsCount % 3 === 2) {
        // Invisible phase
        d.opacity = Math.max(0, d.opacity - dt * 5.0);
      } else {
        d.opacity = Math.min(1.0, d.opacity + dt * 5.0);
      }
    });

    // Check tap action click
    const inp = this.input;
    if (inp.clicked) {
      const m = inp.getMousePos();
      
      // Determine distance from click to target center
      const targetDot = this.dots.find(d => d.isTarget);
      if (!targetDot) return;

      const clickDistToCenter = Math.hypot(m.x - this.cx, m.y - this.cy);
      const dotDistToCenter = Math.hypot(targetDot.x - this.cx, targetDot.y - this.cy);
      const hitDist = Math.hypot(m.x - targetDot.x, m.y - targetDot.y);

      let tapScore = 0;
      let popupColor = 'rgba(255, 255, 255, 0.4)';
      let popupText = "MISS";

      // If clicked inside targets, calculate accuracy score
      if (hitDist <= 28) { // click range bounds on dot
        // calculate accuracy based on target dot offset relative to ring center
        tapScore = Math.max(0, Math.round(100 - dotDistToCenter * 1.8));

        if (dotDistToCenter < this.innerR) {
          tapScore = 100;
          popupText = "+100 PERFECT";
          popupColor = '#e84393';
          this.edgePulseTimer = 200; // Edge pulse
        } else if (dotDistToCenter <= this.outerR) {
          popupText = `+${tapScore} GOOD`;
          popupColor = '#ffffff';
        } else {
          tapScore = 0;
          popupText = "MISS";
          this.lives--;
        }
      } else {
        // click missed dot completely
        tapScore = 0;
        popupText = "MISS";
        this.lives--;
      }

      this.score += tapScore;
      this.totalTapScore += tapScore;
      this.tapsCount++;

      // Trigger popups & glows
      this.popups.push({
        x: m.x,
        y: m.y,
        text: popupText,
        color: popupColor,
        timer: 600
      });

      this.glows.push({
        x: targetDot.x,
        y: targetDot.y,
        r: 10,
        opacity: 0.8
      });

      // Level 3: Phase shifts every 3 taps
      if (this.level === 3 && this.tapsCount % 3 === 0) {
        this.phaseX = Math.random() * Math.PI * 2;
        this.phaseY = Math.random() * Math.PI * 2;
      }

      // Check Goal Clear
      const targetGoal = this.level === 10 ? 20 : this.level === 9 ? 15 : 10;
      if (this.tapsCount >= targetGoal) {
        if (this.lives > 0) {
          this.levelComplete();
        } else {
          this.isOver = true;
          this.gameOver();
        }
      }
    }
  }

  render(ctx) {
    this.clear();

    const lvl = this.level;

    // Perfect edge pulse flash
    if (this.edgePulseTimer > 0) {
      ctx.strokeStyle = `rgba(232, 67, 147, ${this.edgePulseTimer / 200})`;
      ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, this.W, this.H);
    }

    // Render Concentric Rings
    ctx.lineWidth = 1.5;
    
    // Outer
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.outerR, 0, Math.PI * 2);
    ctx.stroke();

    // Middle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.middleR, 0, Math.PI * 2);
    ctx.stroke();

    // Inner (Accent Color)
    ctx.strokeStyle = 'rgba(232, 67, 147, 0.6)';
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, this.innerR, 0, Math.PI * 2);
    ctx.stroke();

    // Draw active expanding glows
    this.glows.forEach(g => {
      ctx.strokeStyle = `rgba(232, 67, 147, ${g.opacity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Draw dots
    this.dots.forEach(d => {
      if (d.opacity <= 0.05) return;
      ctx.save();
      ctx.globalAlpha = d.opacity;
      
      // Target vs Decoy color styles
      if (d.isTarget) {
        ctx.fillStyle = '#e84393';
      } else {
        // decoy dots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      }
      ctx.beginPath();
      ctx.arc(d.x, d.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Render score popups
    ctx.font = "bold 13px 'DM Sans', sans-serif";
    ctx.textAlign = 'center';
    this.popups.forEach(p => {
      ctx.fillStyle = p.color;
      // slide up float animation
      const dy = 30 * (1.0 - p.timer / 600);
      ctx.fillText(p.text, p.x, p.y - dy);
    });

    // Accuracy average bottom center
    const avg = this.tapsCount === 0 ? 0 : Math.round(this.totalTapScore / this.tapsCount);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = "12px 'DM Sans', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(`AVG ACCURACY: ${avg} / 100`, this.W / 2, this.H - 30);

    // Round taps solved tracker
    const targetGoal = lvl === 10 ? 20 : lvl === 9 ? 15 : 10;
    ctx.textAlign = 'left';
    ctx.fillText(`TAPS: ${this.tapsCount}/${targetGoal}`, 24, this.H - 24);
  }

  destroy() {
    super.destroy();
  }
}

window.GameClass = HyperTap;
export default HyperTap;
