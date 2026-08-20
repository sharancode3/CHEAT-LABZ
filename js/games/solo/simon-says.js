import { GameBase } from '../../core/game-base.js';

export class SimonSays extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.sequence = [];
    this.playerStepIndex = 0;
    
    // States: GENERATE_STEP, PLAYBACK, AWAIT_INPUT, VALIDATE, STRIKE, GAME_OVER
    this.gameState = 'GENERATE_STEP';
    this.stateTimer = 1.0; // Initial delay
    
    this.playbackIndex = 0;
    this.playbackTimer = 0;
    this.activeQuadrant = -1; // -1 for none, 0-3 for lighting up
    
    this.inputTimeout = 3.0; // 3 seconds to input
    this.currentInputTimer = 0;
    
    // Centers of quadrants
    this.cx = this.W / 2;
    this.cy = this.H / 2;
    this.radius = 250;
    
    this.quadrants = [
      { id: 0, color: '#10b981', freq: 261.63 }, // Green (Top-Left)
      { id: 1, color: '#ef4444', freq: 329.63 }, // Red (Top-Right)
      { id: 2, color: '#facc15', freq: 392.00 }, // Yellow (Bottom-Left)
      { id: 3, color: '#3b82f6', freq: 523.25 }  // Blue (Bottom-Right)
    ];
    
    this.strikes = 0;
    this.maxStrikes = 3;
    
    this.setupInput();
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver || this.gameState !== 'AWAIT_INPUT') return;
      
      const mx = this.input.mouse.x;
      const my = this.input.mouse.y;
      
      // Check which quadrant was clicked
      // Distance from center
      const dist = Math.hypot(mx - this.cx, my - this.cy);
      if (dist <= this.radius) {
        let q = -1;
        if (mx < this.cx && my < this.cy) q = 0; // Top-Left
        else if (mx >= this.cx && my < this.cy) q = 1; // Top-Right
        else if (mx < this.cx && my >= this.cy) q = 2; // Bottom-Left
        else if (mx >= this.cx && my >= this.cy) q = 3; // Bottom-Right
        
        if (q !== -1) {
          this.handlePlayerInput(q);
        }
      }
    };
  }
  
  handlePlayerInput(q) {
    this.activeQuadrant = q;
    
    if (window.Sound) {
      window.Sound.playTone(this.quadrants[q].freq, 'square', 0.1);
    }
    
    this.gameState = 'VALIDATE';
    this.stateTimer = 0.2; // Show color for 200ms
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    switch (this.gameState) {
      case 'GENERATE_STEP':
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          // Add new step
          this.sequence.push(Math.floor(Math.random() * 4));
          this.playbackIndex = 0;
          this.gameState = 'PLAYBACK';
          this.stateTimer = 0.5; // Small delay before playback
        }
        break;
        
      case 'PLAYBACK':
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          if (this.playbackIndex < this.sequence.length) {
            // Flash next
            this.activeQuadrant = this.sequence[this.playbackIndex];
            if (window.Sound) {
              window.Sound.playTone(this.quadrants[this.activeQuadrant].freq, 'square', 0.1);
            }
            
            // Calculate flash time based on round
            const flashTime = Math.max(0.12, 0.5 - (this.sequence.length * 0.025));
            this.playbackTimer = flashTime;
            this.gameState = 'PLAYBACK_FLASH';
          } else {
            // Sequence done, await input
            this.gameState = 'AWAIT_INPUT';
            this.playerStepIndex = 0;
            this.currentInputTimer = this.inputTimeout;
            this.activeQuadrant = -1;
          }
        }
        break;
        
      case 'PLAYBACK_FLASH':
        this.playbackTimer -= delta;
        if (this.playbackTimer <= 0) {
          this.activeQuadrant = -1; // Turn off
          this.playbackIndex++;
          this.gameState = 'PLAYBACK';
          this.stateTimer = 0.1; // Gap between flashes
        }
        break;
        
      case 'AWAIT_INPUT':
        this.currentInputTimer -= delta;
        if (this.currentInputTimer <= 0) {
          // Timeout Strike!
          this.triggerStrike();
        }
        break;
        
      case 'VALIDATE':
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          this.activeQuadrant = -1;
          
          // Check correctness
          const expected = this.sequence[this.playerStepIndex];
          // We saved the chosen quadrant in activeQuadrant before clearing it?
          // No, we need to pass it or check it.
          // Wait, handlePlayerInput sets it, then we clear it above. We should have checked it.
          // Let's modify handlePlayerInput to also check it directly.
        }
        break;
        
      case 'STRIKE':
        this.stateTimer -= delta;
        if (this.stateTimer <= 0) {
          if (this.strikes >= this.maxStrikes) {
            this.lives = 0; // Trigger game over natively through engine
            this.isOver = true;
          } else {
            // Replay sequence from start
            this.playbackIndex = 0;
            this.gameState = 'PLAYBACK';
            this.stateTimer = 1.0;
          }
        }
        break;
    }
  }
  
  handlePlayerInput(q) {
    this.activeQuadrant = q;
    
    if (window.Sound) {
      window.Sound.playTone(this.quadrants[q].freq, 'square', 0.1);
    }
    
    // Check correctness immediately
    if (q === this.sequence[this.playerStepIndex]) {
      // Correct!
      this.score += 100 * this.level;
      this.playerStepIndex++;
      
      if (this.playerStepIndex >= this.sequence.length) {
        // Round complete
        this.gameState = 'GENERATE_STEP';
        this.stateTimer = 1.0;
        this.score += 500 * this.level; // Round bonus
        
        // Every 5 rounds, complete level
        if (this.sequence.length % 5 === 0) {
           // We can advance level
           // this.levelComplete(); 
           // For arcade endless feel, just keep going
        }
      } else {
        // Await next input
        this.gameState = 'AWAIT_INPUT';
        this.currentInputTimer = this.inputTimeout;
        // Keep lit for a moment
        setTimeout(() => { if (this.gameState === 'AWAIT_INPUT') this.activeQuadrant = -1; }, 200);
      }
    } else {
      // Incorrect!
      this.triggerStrike();
    }
  }

  triggerStrike() {
    this.strikes++;
    this.activeQuadrant = -1;
    this.gameState = 'STRIKE';
    this.stateTimer = 2.0;
    if (window.Sound) window.Sound.playTone(100, 'sawtooth', 0.5); // Buzzer
  }

  render(ctx) {
    this.clear();
    
    // Draw Stats
    ctx.fillStyle = '#fff';
    ctx.font = '24px "JetBrains Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`ROUND: ${this.sequence.length}`, this.W / 2, 50);
    
    // Draw Strikes
    for (let i = 0; i < this.maxStrikes; i++) {
      ctx.fillStyle = i < this.strikes ? '#f43f5e' : '#333';
      ctx.font = '30px "JetBrains Mono"';
      ctx.fillText("X", this.W / 2 - 40 + i * 40, 90);
    }
    
    // Draw Input Timer Bar
    if (this.gameState === 'AWAIT_INPUT') {
      ctx.fillStyle = '#111';
      ctx.fillRect(this.W / 2 - 200, 120, 400, 10);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(this.W / 2 - 200, 120, 400 * (this.currentInputTimer / this.inputTimeout), 10);
    }
    
    // Draw Quadrants
    ctx.lineWidth = 10;
    
    // We can draw a full circle and then slice it, or just use arc paths
    for (let i = 0; i < 4; i++) {
      const q = this.quadrants[i];
      const isLit = this.activeQuadrant === i;
      
      ctx.beginPath();
      // Define angles
      let startAngle = 0;
      let endAngle = 0;
      if (i === 0) { startAngle = Math.PI; endAngle = Math.PI * 1.5; } // TL
      else if (i === 1) { startAngle = Math.PI * 1.5; endAngle = 0; } // TR
      else if (i === 2) { startAngle = Math.PI / 2; endAngle = Math.PI; } // BL
      else if (i === 3) { startAngle = 0; endAngle = Math.PI / 2; } // BR
      
      ctx.moveTo(this.cx, this.cy);
      ctx.arc(this.cx, this.cy, this.radius, startAngle, endAngle);
      ctx.closePath();
      
      ctx.fillStyle = isLit ? q.color : this.adjustColor(q.color, -0.6); // Darken if not lit
      if (isLit) {
        ctx.shadowColor = q.color;
        ctx.shadowBlur = 30;
      }
      
      ctx.fill();
      ctx.shadowBlur = 0;
      
      ctx.strokeStyle = '#0f172a'; // Dark borders
      ctx.stroke();
    }
    
    // Draw center hole
    ctx.beginPath();
    ctx.arc(this.cx, this.cy, 60, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.stroke();
    
    // State overlays
    if (this.gameState === 'STRIKE') {
      ctx.fillStyle = 'rgba(244, 63, 94, 0.2)'; // Red flash
      ctx.fillRect(0, 0, this.W, this.H);
      
      ctx.fillStyle = '#f43f5e';
      ctx.font = '40px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 20;
      ctx.fillText("STRIKE!", this.W / 2, this.H / 2);
      ctx.shadowBlur = 0;
    }
  }

  // Helper to darken colors (very basic)
  adjustColor(color, percent) {
    // Note: color is hex like #10b981
    let r = parseInt(color.substring(1,3), 16);
    let g = parseInt(color.substring(3,5), 16);
    let b = parseInt(color.substring(5,7), 16);
    
    r = parseInt(r * (1 + percent));
    g = parseInt(g * (1 + percent));
    b = parseInt(b * (1 + percent));
    
    r = (r<255)?(r<0?0:r):255;
    g = (g<255)?(g<0?0:g):255;
    b = (b<255)?(b<0?0:b):255;
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

export default SimonSays;
