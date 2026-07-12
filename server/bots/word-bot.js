import { BotBase } from './bot-base.js';

export class WordBot extends BotBase {
  constructor(difficulty) {
    super('word-duel', difficulty);
    this.typingInterval = null;
    this.currentWord = '';
    this.charIndex = 0;
    this.roundActive = false;
    this.room = null;
    this.gameManager = null;
  }

  getBotNamePrefix() {
    return 'Typo';
  }

  onGameStateUpdate(room, state, gameManager) {
    this.room = room;
    this.gameManager = gameManager;

    if (state.phase === 'playing' && !this.roundActive) {
      this.roundActive = true;
      this.currentWord = state.targetWord || '';
      this.charIndex = 0;
      this.scheduleNextType();
    } else if (state.phase !== 'playing') {
      this.roundActive = false;
      if (this.typingInterval) {
        clearTimeout(this.typingInterval);
        this.typingInterval = null;
      }
    } else if (state.phase === 'playing' && this.currentWord !== state.targetWord) {
      // New word presented
      this.currentWord = state.targetWord;
      this.charIndex = 0;
      if (this.typingInterval) clearTimeout(this.typingInterval);
      this.scheduleNextType();
    }
  }

  scheduleNextType() {
    if (!this.roundActive || this.charIndex >= this.currentWord.length) return;

    let wpm = 50;
    let errorRate = 0.05;

    if (this.difficulty === 'easy') { wpm = 25 + Math.random() * 10; errorRate = 0.08; }
    if (this.difficulty === 'medium') { wpm = 50 + Math.random() * 15; errorRate = 0.03; }
    if (this.difficulty === 'hard') { wpm = 80 + Math.random() * 20; errorRate = 0.01; }

    // Occasional burst for hard
    if (this.difficulty === 'hard' && Math.random() < 0.1) {
      wpm = 120;
    }

    const charsPerSecond = (wpm * 5) / 60;
    let baseDelay = 1000 / charsPerSecond;

    // Add +/- 20% jitter
    const jitter = baseDelay * 0.2;
    let delay = baseDelay + (Math.random() * jitter * 2 - jitter);

    let isError = Math.random() < errorRate;
    
    if (isError) {
      // Simulate error: extra delay for backspace
      delay += 150 + Math.random() * 100;
    }

    this.typingInterval = setTimeout(() => {
      if (!this.roundActive || !this.gameManager) return;
      
      this.charIndex++;
      
      // Emit progress to server so player sees bot typing
      this.gameManager.handlePlayerAction(this.room, this.socketId, 'word:progress', { progress: this.charIndex, total: this.currentWord.length });

      if (this.charIndex >= this.currentWord.length) {
        // Word complete
        this.gameManager.handlePlayerAction(this.room, this.socketId, 'word:complete', { word: this.currentWord });
      } else {
        this.scheduleNextType();
      }
    }, delay);
  }
}
