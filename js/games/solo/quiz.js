import { GameBase } from '../../core/game-base.js';

export class Quiz extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    this.questions = [
      {
        q: "WHAT DOES CPU STAND FOR?",
        options: ["CENTRAL PROCESS UNIT", "COMPUTER PERSONAL UNIT", "CENTRAL PROCESSING UNIT", "CENTRAL PROCESSOR UNIT"],
        answer: 2
      },
      {
        q: "WHICH IS NOT A JAVASCRIPT TYPE?",
        options: ["UNDEFINED", "NUMBER", "BOOLEAN", "FLOAT"],
        answer: 3
      },
      {
        q: "WHAT DOES CSS STAND FOR?",
        options: ["CASCADING STYLE SHEETS", "COMPUTER STYLE SHEETS", "CREATIVE STYLE SHEETS", "COLORFUL STYLE SHEETS"],
        answer: 0
      },
      {
        q: "WHO CREATED LINUX?",
        options: ["BILL GATES", "LINUS TORVALDS", "STEVE JOBS", "MARK ZUCKERBERG"],
        answer: 1
      },
      {
        q: "WHAT IS 10 IN BINARY?",
        options: ["1010", "1100", "0110", "1001"],
        answer: 0
      },
      {
        q: "WHAT IS THE DOM?",
        options: ["DOCUMENT OBJECT MODEL", "DATA OBJECT MODEL", "DOCUMENT ORIENTED MODEL", "DATA ORIENTED MODEL"],
        answer: 0
      },
      {
        q: "WHICH HTTP METHOD IS IDEMPOTENT?",
        options: ["POST", "PUT", "PATCH", "ALL OF ABOVE"],
        answer: 1
      },
      {
        q: "WHAT YEAR WAS JAVASCRIPT INVENTED?",
        options: ["1990", "1993", "1995", "1998"],
        answer: 2
      },
      {
        q: "WHAT IS THE TIME COMPLEXITY OF BINARY SEARCH?",
        options: ["O(1)", "O(N)", "O(N LOG N)", "O(LOG N)"],
        answer: 3
      },
      {
        q: "WHICH DATA STRUCTURE USES LIFO?",
        options: ["QUEUE", "TREE", "STACK", "GRAPH"],
        answer: 2
      }
    ];
    
    // Shuffle questions
    for (let i = this.questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
    }
    
    this.currentIndex = 0;
    
    this.maxTime = 15.0; // 15 seconds per question
    this.timer = this.maxTime;
    
    this.streak = 0;
    this.multiplier = 1.0;
    
    this.state = 'PLAYING'; // PLAYING, REVEAL
    this.revealTimer = 0;
    this.selectedOption = -1;
    
    this.setupInput();
  }

  setupInput() {
    this.input.onMouseDown = (e) => {
      if (this.isPaused || this.isOver || this.state === 'REVEAL') return;
      
      const btnW = 600;
      const btnH = 60;
      const startY = 350;
      const gap = 20;
      const offsetX = (this.W - btnW) / 2;
      
      for (let i = 0; i < 4; i++) {
        const y = startY + i * (btnH + gap);
        if (e.x >= offsetX && e.x <= offsetX + btnW &&
            e.y >= y && e.y <= y + btnH) {
          this.submitAnswer(i);
          break;
        }
      }
    };
  }

  submitAnswer(optIndex) {
    this.selectedOption = optIndex;
    const currentQ = this.questions[this.currentIndex];
    
    if (optIndex === currentQ.answer) {
      // Correct
      this.streak++;
      this.multiplier = Math.min(4.0, 1.0 + (this.streak * 0.5));
      
      // Decay score math
      const timeRatio = this.timer / this.maxTime; // 1.0 to 0.0
      // Formula: 1000 * (1 - t/2Tmax) * M -> rewritten based on specs
      // Specs say: Points = 1000 * (1.0 - (TimeTaken / (2 * Tmax))) * M
      // TimeTaken = Tmax - timer
      const timeTaken = this.maxTime - this.timer;
      const basePoints = 1000 * (1.0 - (timeTaken / (2 * this.maxTime)));
      this.score += Math.round(basePoints * this.multiplier);
      
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.1);
      
    } else {
      // Incorrect
      this.streak = 0;
      this.multiplier = 1.0;
      this.lives--;
      
      if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.3);
    }
    
    this.state = 'REVEAL';
    this.revealTimer = 2.0; // 2 seconds to show answer
  }

  nextQuestion() {
    this.currentIndex++;
    if (this.currentIndex >= this.questions.length) {
      this.isOver = true;
      this.score += this.lives * 1000;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.5);
      setTimeout(() => this.levelComplete(), 2000);
    } else {
      this.state = 'PLAYING';
      this.timer = this.maxTime;
      this.selectedOption = -1;
    }
  }

  update(delta) {
    if (this.isPaused || this.isOver) return;
    
    if (this.state === 'PLAYING') {
      this.timer -= delta;
      if (this.timer <= 0) {
        this.timer = 0;
        // Timeout counts as incorrect
        this.streak = 0;
        this.multiplier = 1.0;
        this.lives--;
        this.selectedOption = -1;
        this.state = 'REVEAL';
        this.revealTimer = 2.0;
        if (window.Sound) window.Sound.playTone(100, 'square', 0.4);
      }
    } else if (this.state === 'REVEAL') {
      this.revealTimer -= delta;
      if (this.revealTimer <= 0) {
        if (this.lives <= 0) {
          this.isOver = true;
          setTimeout(() => this.levelComplete(), 2000);
        } else {
          this.nextQuestion();
        }
      }
    }
  }

  render(ctx) {
    this.clear();
    
    if (this.currentIndex >= this.questions.length) {
      // Victory screen
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = '#fff';
      ctx.font = '50px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText("QUIZ COMPLETE!", this.W / 2, this.H / 2);
      return;
    }
    
    const currentQ = this.questions[this.currentIndex];
    
    // Top Bar (Timer)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, this.W, 10);
    
    let timeColor = '#10b981';
    if (this.timer < 5) timeColor = '#ef4444';
    else if (this.timer < 10) timeColor = '#eab308';
    
    ctx.fillStyle = timeColor;
    ctx.fillRect(0, 0, this.W * (this.timer / this.maxTime), 10);
    
    // Multiplier & Streak
    ctx.font = '20px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#a855f7';
    ctx.fillText(`STREAK: ${this.streak}`, 20, 50);
    ctx.fillText(`MULT: ${this.multiplier.toFixed(1)}x`, 20, 80);
    
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Q: ${this.currentIndex + 1}/${this.questions.length}`, this.W - 20, 50);
    
    // Question Text
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font = '30px "Press Start 2P"';
    
    // Auto wrap simple
    const maxLineW = 700;
    let words = currentQ.q.split(' ');
    let line = '';
    let y = 180;
    
    for (let i = 0; i < words.length; i++) {
      let testLine = line + words[i] + ' ';
      let metrics = ctx.measureText(testLine);
      if (metrics.width > maxLineW && i > 0) {
        ctx.fillText(line, this.W / 2, y);
        line = words[i] + ' ';
        y += 40;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, this.W / 2, y);
    
    // Options
    const btnW = 600;
    const btnH = 60;
    const startY = 350;
    const gap = 20;
    const offsetX = (this.W - btnW) / 2;
    
    ctx.font = '24px "JetBrains Mono"';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i < 4; i++) {
      const by = startY + i * (btnH + gap);
      
      let bgColor = '#1e293b';
      let strokeColor = '#334155';
      let textColor = '#fff';
      
      if (this.state === 'REVEAL') {
        if (i === currentQ.answer) {
          bgColor = '#10b981'; // Green for correct
          strokeColor = '#059669';
        } else if (i === this.selectedOption) {
          bgColor = '#ef4444'; // Red for wrong selection
          strokeColor = '#b91c1c';
        } else {
          bgColor = '#0f172a'; // Fade others
          textColor = '#475569';
        }
      } else {
        // Hover effect could go here using this.input.mouse, but skipped for brevity
      }
      
      ctx.fillStyle = bgColor;
      ctx.fillRect(offsetX, by, btnW, btnH);
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(offsetX, by, btnW, btnH);
      
      ctx.fillStyle = textColor;
      ctx.fillText(currentQ.options[i], this.W / 2, by + btnH / 2);
    }
    
    if (this.isOver && this.lives <= 0) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }
}

export default Quiz;
