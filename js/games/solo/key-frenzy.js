import { GameBase } from '../../core/game-base.js';

class KeyFrenzy extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.letters = "abcdefghijklmnopqrstuvwxyz".split('');
    this.currentSequence = [];
    this.userInput = [];
    
    this.timeLimit = 5000; // ms
    this.timer = this.timeLimit;
    
    this.keysPressed = 0;
    this.blindRound = this.level === 10; // Level 10 is all blind
    
    this.status = 'idle'; // 'idle', 'success', 'fail'
    this.statusTimer = 0;

    this.nextSequence();
  }

  nextSequence() {
    this.userInput = [];
    this.currentSequence = [];
    
    // Sequence length scales with level
    const seqLength = this.level === 1 ? 1 : Math.min(6, Math.floor(this.level / 2) + 1);
    
    for (let i = 0; i < seqLength; i++) {
      const char = this.randomChoice(this.letters);
      this.currentSequence.push(char);
    }

    // Time limit scales down with level
    this.timeLimit = Math.max(1500, 6000 - this.level * 450);
    this.timer = this.timeLimit;
    this.status = 'idle';
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    if (this.statusTimer > 0) {
      this.statusTimer -= delta;
      if (this.statusTimer <= 0) {
        if (this.status === 'success') {
          this.nextSequence();
        } else {
          this.lives--;
          if (this.lives > 0) {
            this.nextSequence();
          }
        }
      }
      return;
    }

    this.timer -= delta;
    if (this.timer <= 0) {
      this.status = 'fail';
      this.statusTimer = 800;
      return;
    }

    // Read Input
    const inp = this.input;
    this.letters.forEach(char => {
      if (inp.wasPressed(char)) {
        this.userInput.push(char);
        
        // Verify input sequence matches so far
        const index = this.userInput.length - 1;
        if (this.userInput[index] !== this.currentSequence[index]) {
          this.status = 'fail';
          this.statusTimer = 800;
        } else if (this.userInput.length === this.currentSequence.length) {
          this.status = 'success';
          this.statusTimer = 500;
          this.score += this.currentSequence.length * 10;
          this.keysPressed += this.currentSequence.length;

          // Check Goal
          const goal = this.getLevelGoal();
          if (this.keysPressed >= goal.target) {
            this.levelComplete();
          }
        }
      }
    });
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw timer bar
    const barWidth = (this.timer / this.timeLimit) * 400;
    ctx.fillStyle = '#ffd93d';
    ctx.fillRect(100, 100, barWidth, 10);

    // Draw target sequence
    ctx.textAlign = 'center';
    ctx.font = '24px DM Sans';
    
    // Handle blind round rendering logic
    const showSequence = !this.blindRound || (this.timer > this.timeLimit - 1000);

    this.currentSequence.forEach((char, index) => {
      const x = 300 + (index - (this.currentSequence.length - 1) / 2) * 50;
      const y = 300;

      // Draw Key Border
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.strokeRect(x - 20, y - 25, 40, 50);

      if (showSequence) {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(char.toUpperCase(), x, y + 8);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillText('?', x, y + 8);
      }

      // Draw User Typed overlay
      if (index < this.userInput.length) {
        ctx.fillStyle = 'rgba(108,99,255,0.3)';
        ctx.fillRect(x - 20, y - 25, 40, 50);
      }
    });

    // Feedback Overlay
    if (this.status === 'success') {
      ctx.fillStyle = '#00d4aa';
      ctx.font = '20px Press Start 2P';
      ctx.fillText('SUCCESS!', 300, 420);
    } else if (this.status === 'fail') {
      ctx.fillStyle = '#ef4444';
      ctx.font = '20px Press Start 2P';
      ctx.fillText('FAILED!', 300, 420);
    }
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Keys Typed', value: `${this.keysPressed}/${this.getLevelGoal().target}` },
      { label: 'Level', value: this.level }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'keys', target: 5 },
      { type: 'keys', target: 8 },
      { type: 'keys', target: 12 },
      { type: 'keys', target: 15 },
      { type: 'keys', target: 18 },
      { type: 'keys', target: 20 },
      { type: 'keys', target: 22 },
      { type: 'keys', target: 25 },
      { type: 'keys', target: 28 },
      { type: 'keys', target: 30 }
    ];
    return goals[this.level];
  }
}

window.GameClass = KeyFrenzy;
