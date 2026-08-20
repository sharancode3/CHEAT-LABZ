import { GameBase } from '../../core/game-base.js';

export class Hangman extends GameBase {
  static logicalWidth = 800;
  static logicalHeight = 800;

  init() {
    const wordList = [
      "ALGORITHM", "ENCRYPTION", "CYBERSPACE", "BANDWIDTH", 
      "FIREWALL", "MAINFRAME", "SYNTAX", "PROTOCOL", 
      "KEYBOARD", "PROCESSOR", "MALWARE", "TERMINAL"
    ];
    
    this.targetWord = wordList[Math.floor(Math.random() * wordList.length)];
    this.guessedLetters = new Set();
    
    this.maxStrikes = 6;
    this.currentStrikes = 0;
    
    this.setupInput();
  }

  setupInput() {
    this.input.onKeyDown = (e) => {
      if (this.isPaused || this.isOver) return;
      
      const char = e.key.toUpperCase();
      
      if (char.length === 1 && char >= 'A' && char <= 'Z') {
        this.guess(char);
      }
    };
  }

  guess(char) {
    if (this.guessedLetters.has(char)) {
      if (window.Sound) window.Sound.playTone(300, 'square', 0.05); // already guessed
      return;
    }
    
    this.guessedLetters.add(char);
    
    if (this.targetWord.includes(char)) {
      if (window.Sound) window.Sound.playTone(600, 'sine', 0.1);
      this.score += 100;
      this.checkWin();
    } else {
      this.currentStrikes++;
      if (window.Sound) window.Sound.playTone(150, 'sawtooth', 0.2);
      this.checkLoss();
    }
  }

  checkWin() {
    let allGuessed = true;
    for (let i = 0; i < this.targetWord.length; i++) {
      if (!this.guessedLetters.has(this.targetWord[i])) {
        allGuessed = false;
        break;
      }
    }
    
    if (allGuessed) {
      this.score += 500;
      if (window.Sound) window.Sound.playTone(800, 'sine', 0.3);
      this.isOver = true;
      setTimeout(() => this.levelComplete(), 1500);
    }
  }

  checkLoss() {
    if (this.currentStrikes >= this.maxStrikes) {
      this.lives = 0;
      this.isOver = true;
      if (window.Sound) window.Sound.playTone(100, 'square', 0.5);
    }
  }

  update(delta) {
    // Handled by events
  }

  render(ctx) {
    this.clear();
    
    // Draw Hangman Structure (Cyber theme)
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Base
    ctx.beginPath(); ctx.moveTo(100, 700); ctx.lineTo(300, 700); ctx.stroke();
    // Pole
    ctx.beginPath(); ctx.moveTo(200, 700); ctx.lineTo(200, 200); ctx.stroke();
    // Top
    ctx.beginPath(); ctx.moveTo(195, 200); ctx.lineTo(400, 200); ctx.stroke();
    // Rope
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#64748b';
    ctx.beginPath(); ctx.moveTo(400, 200); ctx.lineTo(400, 280); ctx.stroke();
    
    // Draw Body Parts (Cyber red) based on strikes
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 8;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10;
    
    if (this.currentStrikes >= 1) { // Head
      ctx.beginPath(); ctx.arc(400, 320, 40, 0, Math.PI * 2); ctx.stroke();
    }
    if (this.currentStrikes >= 2) { // Torso
      ctx.beginPath(); ctx.moveTo(400, 360); ctx.lineTo(400, 500); ctx.stroke();
    }
    if (this.currentStrikes >= 3) { // Left Arm
      ctx.beginPath(); ctx.moveTo(400, 400); ctx.lineTo(330, 470); ctx.stroke();
    }
    if (this.currentStrikes >= 4) { // Right Arm
      ctx.beginPath(); ctx.moveTo(400, 400); ctx.lineTo(470, 470); ctx.stroke();
    }
    if (this.currentStrikes >= 5) { // Left Leg
      ctx.beginPath(); ctx.moveTo(400, 500); ctx.lineTo(340, 600); ctx.stroke();
    }
    if (this.currentStrikes >= 6) { // Right Leg
      ctx.beginPath(); ctx.moveTo(400, 500); ctx.lineTo(460, 600); ctx.stroke();
      
      // X eyes
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(385, 305); ctx.lineTo(395, 315); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(395, 305); ctx.lineTo(385, 315); ctx.stroke();
      
      ctx.beginPath(); ctx.moveTo(405, 305); ctx.lineTo(415, 315); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(415, 305); ctx.lineTo(405, 315); ctx.stroke();
    }
    
    ctx.shadowBlur = 0;
    
    // Draw Masked Word
    ctx.font = '60px "JetBrains Mono"';
    ctx.textAlign = 'center';
    
    let displayStr = "";
    for (let i = 0; i < this.targetWord.length; i++) {
      const char = this.targetWord[i];
      if (this.guessedLetters.has(char) || (this.isOver && this.lives === 0)) {
        displayStr += char + " ";
      } else {
        displayStr += "_ ";
      }
    }
    
    // Draw word with logic colors
    if (this.isOver && this.lives === 0) ctx.fillStyle = '#ef4444'; // Red if lost
    else if (this.isOver) ctx.fillStyle = '#10b981'; // Green if won
    else ctx.fillStyle = '#fff';
    
    ctx.fillText(displayStr, this.W / 2 + 100, 100);
    
    // Draw Guessed Letters Bank
    ctx.font = '24px "JetBrains Mono"';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText("DATA BANK:", 550, 200);
    
    let bankX = 550;
    let bankY = 240;
    
    // A-Z mapping
    for (let i = 0; i < 26; i++) {
      const char = String.fromCharCode(65 + i);
      
      if (this.guessedLetters.has(char)) {
        if (this.targetWord.includes(char)) {
          ctx.fillStyle = '#10b981'; // Correct
        } else {
          ctx.fillStyle = '#ef4444'; // Wrong
        }
      } else {
        ctx.fillStyle = '#334155'; // Not guessed
      }
      
      ctx.fillText(char, bankX, bankY);
      
      bankX += 30;
      if (bankX > 750) {
        bankX = 550;
        bankY += 40;
      }
    }
    
    // Game Over Overlay (minimal)
    if (this.isOver) {
      ctx.fillStyle = this.lives === 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)';
      ctx.fillRect(0, 0, this.W, this.H);
    }
  }
}

export default Hangman;
