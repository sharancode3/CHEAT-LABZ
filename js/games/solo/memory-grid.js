import { GameBase } from '../../core/game-base.js';

class MemoryGrid extends GameBase {
  static WIDTH = 600;
  static HEIGHT = 600;

  init() {
    this.gridSize = 3; // 3x3 at start
    if (this.level >= 4) this.gridSize = 4;
    if (this.level >= 7) this.gridSize = 5;
    if (this.level >= 10) this.gridSize = 6;

    this.sequence = [];
    this.playerIndex = 0;

    this.gameState = 'SHOWING'; // 'SHOWING', 'PLAYING', 'SUCCESS', 'FAIL'
    this.stateTimer = 800; // ms
    this.flashIndex = 0;
    this.activeFlashCellId = -1;

    this.cells = [];
    this.setupGrid();
    this.generateSequence();

    this.score = 0;
    this.lives = 3;
    this.roundsCompleted = 0;
  }

  setupGrid() {
    this.cells = [];
    const padding = 20;
    const size = (600 - padding * 2) / this.gridSize;

    for (let c = 0; c < this.gridSize; c++) {
      for (let r = 0; r < this.gridSize; r++) {
        const index = c * this.gridSize + r;
        this.cells.push({
          id: index,
          x: padding + c * size + 4,
          y: padding + r * size + 4,
          w: size - 8,
          h: size - 8,
          scale: 1.0
        });
      }
    }
  }

  generateSequence() {
    // Sequence length scales with level
    const seqLength = 2 + this.level; // Level 1 is 3, Level 10 is 12-15
    this.sequence = [];
    for (let i = 0; i < seqLength; i++) {
      this.sequence.push(Math.floor(Math.random() * this.cells.length));
    }
    this.playerIndex = 0;
    this.flashIndex = 0;
    this.gameState = 'SHOWING';
    this.stateTimer = 600;
    this.activeFlashCellId = this.sequence[0];
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;

    const dt = delta / 1000;

    // Decay scale animations for visual bounce
    this.cells.forEach(c => {
      c.scale = this.lerp(c.scale, 1.0, 10 * dt);
    });

    if (this.gameState === 'SHOWING') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        if (this.activeFlashCellId !== -1) {
          // Pause between flashes
          this.activeFlashCellId = -1;
          this.stateTimer = 200; // Gap
        } else {
          this.flashIndex++;
          if (this.flashIndex >= this.sequence.length) {
            this.gameState = 'PLAYING';
            this.playerIndex = 0;
          } else {
            this.activeFlashCellId = this.sequence[this.flashIndex];
            this.stateTimer = 500;
          }
        }
      }
    }

    if (this.gameState === 'PLAYING') {
      // Poll Click Input
      const inp = this.input;
      if (inp.wasMouseClicked()) {
        const m = inp.getMousePos();
        // Check which cell was clicked
        const clickedCell = this.cells.find(c => 
          m.x >= c.x && m.x <= c.x + c.w &&
          m.y >= c.y && m.y <= c.y + c.h
        );

        if (clickedCell) {
          clickedCell.scale = 1.15;
          const targetId = this.sequence[this.playerIndex];
          
          if (clickedCell.id === targetId) {
            this.playerIndex++;
            this.score += 10;
            
            if (this.playerIndex >= this.sequence.length) {
              this.roundsCompleted++;
              this.gameState = 'SUCCESS';
              this.stateTimer = 1000;
            }
          } else {
            this.lives--;
            this.gameState = 'FAIL';
            this.stateTimer = 1000;
          }
        }
      }
    }

    if (this.gameState === 'SUCCESS' || this.gameState === 'FAIL') {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        if (this.gameState === 'SUCCESS') {
          // Check Goal
          const goal = this.getLevelGoal();
          if (this.roundsCompleted >= goal.target) {
            this.levelComplete();
          } else {
            this.generateSequence();
          }
        } else {
          if (this.lives > 0) {
            this.generateSequence();
          }
        }
      }
    }
  }

  render() {
    this.clearCanvas();
    const ctx = this.ctx;

    // Draw Grid Cells
    this.cells.forEach(c => {
      ctx.save();
      ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
      ctx.scale(c.scale, c.scale);
      
      let fillStyle = '#111118';
      let strokeStyle = 'rgba(255,255,255,0.08)';

      if (this.gameState === 'SHOWING' && c.id === this.activeFlashCellId) {
        fillStyle = '#6c63ff';
        strokeStyle = '#ffffff';
      }

      ctx.fillStyle = fillStyle;
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2;

      ctx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.strokeRect(-c.w / 2, -c.h / 2, c.w, c.h);
      ctx.restore();
    });

    // Feedback Overlay
    if (this.gameState === 'SUCCESS') {
      ctx.fillStyle = '#00d4aa';
      ctx.font = '20px Press Start 2P';
      ctx.textAlign = 'center';
      ctx.fillText('PERFECT!', 300, 300);
    } else if (this.gameState === 'FAIL') {
      ctx.fillStyle = '#ef4444';
      ctx.font = '20px Press Start 2P';
      ctx.textAlign = 'center';
      ctx.fillText('WRONG SEQUENCE!', 300, 300);
    }
  }

  destroy() {
    super.destroy();
  }

  getStats() {
    return [
      { label: 'Rounds', value: `${this.roundsCompleted}/${this.getLevelGoal().target}` },
      { label: 'Sequence', value: this.sequence.length }
    ];
  }

  getLevelGoal() {
    const goals = [
      null,
      { type: 'rounds', target: 2 },
      { type: 'rounds', target: 2 },
      { type: 'rounds', target: 3 },
      { type: 'rounds', target: 3 },
      { type: 'rounds', target: 4 },
      { type: 'rounds', target: 4 },
      { type: 'rounds', target: 5 },
      { type: 'rounds', target: 5 },
      { type: 'rounds', target: 6 },
      { type: 'rounds', target: 6 }
    ];
    return goals[this.level];
  }
}

window.GameClass = MemoryGrid;
