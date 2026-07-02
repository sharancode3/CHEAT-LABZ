import { GameBase } from '../../core/game-base.js';

class ReflexRush extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.roundsCount = 0;
    this.targetDirection = 'UP';
    this.isFalseStimulus = false;

    this.timeLimit = 2000; // ms
    this.timer = this.timeLimit;
    
    this.status = 'idle'; // 'idle', 'success', 'fail'
    this.statusTimer = 0;

    this.score = 0;
    this.lives = 3;

    this.nextRound();
  }

  nextRound() {
    const lvl = this.level;
    
    // Choose direction
    const dirs = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
    this.targetDirection = this.randomChoice(dirs);

    // False stimuli (distractor/decoy targets) appear at Level 4+
    this.isFalseStimulus = (lvl >= 4 && Math.random() < 0.35);

    // Window shrinks based on level
    this.timeLimit = Math.max(500, 2000 - lvl * 140);
    this.timer = this.timeLimit;
    this.status = 'idle';
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.statusTimer > 0) {
      this.statusTimer -= delta;
      if (this.statusTimer <= 0) {
        this.nextRound();
      }
      return;
    }

    this.timer -= delta;
    if (this.timer <= 0) {
      if (this.isFalseStimulus) {
        // Correct behavior: do NOT press for false stimuli!
        this.roundsCount++;
        this.score += 20;
        
        const goal = this.getLevelGoal();
        if (this.roundsCount >= goal.target) {
          this.levelComplete();
        } else {
          this.nextRound();
        }
      } else {
        this.lives--;
        this.status = 'fail';
        this.statusTimer = 800;
      }
      return;
    }

    // Read Input
    const inp = this.input;
    let inputDir = '';
    if (inp.wasPressedAny(inp.ACTIONS.UP)) inputDir = 'UP';
    if (inp.wasPressedAny(inp.ACTIONS.DOWN)) inputDir = 'DOWN';
    if (inp.wasPressedAny(inp.ACTIONS.LEFT)) inputDir = 'LEFT';
    if (inp.wasPressedAny(inp.ACTIONS.RIGHT)) inputDir = 'RIGHT';

    if (inputDir !== '') {
      if (this.isFalseStimulus) {
        // Player hit a decoy -> penalty!
        this.lives--;
        this.status = 'fail';
        this.statusTimer = 800;
      } else if (inputDir === this.targetDirection) {
        this.roundsCount++;
        this.score += 30;

        const goal = this.getLevelGoal();
        if (this.roundsCount >= goal.target) {
          this.levelComplete();
        } else {
          this.status = 'success';
          this.statusTimer = 400;
        }
      } else {
        this.lives--;
        this.status = 'fail';
        this.statusTimer = 800;
      }
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw timer bar
    const barWidth = (this.timer / this.timeLimit) * 400;
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(100, 100, barWidth, 10);

    // Draw Target direction arrow
    ctx.strokeStyle = this.isFalseStimulus ? '#ef4444' : '#6c63ff'; // Red means decoy/false!
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.save();
    ctx.translate(300, 300);

    if (this.targetDirection === 'DOWN') ctx.rotate(Math.PI);
    if (this.targetDirection === 'LEFT') ctx.rotate(-Math.PI / 2);
    if (this.targetDirection === 'RIGHT') ctx.rotate(Math.PI / 2);

    // Draw Arrow path pointing UP
    ctx.beginPath();
    ctx.moveTo(0, 40);
    ctx.lineTo(0, -40);
    ctx.moveTo(-20, -20);
    ctx.lineTo(0, -40);
    ctx.lineTo(20, -20);
    ctx.stroke();
    ctx.restore();

    // False Stimulus Instruction tag
    if (this.isFalseStimulus) {
      ctx.fillStyle = '#ef4444';
      ctx.font = '16px Press Start 2P';
      ctx.textAlign = 'center';
      ctx.fillText('DON\'T PRESS!', 300, 480);
    }

    if (this.status === 'success') {
      ctx.fillStyle = '#00d4aa';
      ctx.font = '18px Press Start 2P';
      ctx.textAlign = 'center';
      ctx.fillText('GOOD!', 300, 480);
    } else if (this.status === 'fail') {
      ctx.fillStyle = '#ef4444';
      ctx.font = '18px Press Start 2P';
      ctx.textAlign = 'center';
      ctx.fillText('MISS!', 300, 480);
    }
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Rounds', value: `${this.roundsCount}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'rounds', target: 5 },
      { type: 'rounds', target: 6 },
      { type: 'rounds', target: 7 },
      { type: 'rounds', target: 8 },
      { type: 'rounds', target: 9 },
      { type: 'rounds', target: 10 },
      { type: 'rounds', target: 11 },
      { type: 'rounds', target: 12 },
      { type: 'rounds', target: 13 },
      { type: 'rounds', target: 15 }
    ];
    return goals[this.level];
  }
}

window.GameClass = ReflexRush;
