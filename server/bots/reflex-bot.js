import { BotBase } from './bot-base.js';

export class ReflexBot extends BotBase {
  constructor(difficulty) {
    super('reflex-duel', difficulty);
    this.reactedToStimulus = false;
  }

  getBotNamePrefix() {
    return 'Reflex';
  }

  onGameStateUpdate(room, state, gameManager) {
    // Only react when stimulus is active
    if (state.phase !== 'stimulus' || this.reactedToStimulus) return;
    
    this.reactedToStimulus = true;

    // Check miss chance
    let missChance = 0;
    if (this.difficulty === 'easy') missChance = 0.10;
    if (this.difficulty === 'medium') missChance = 0.03;
    
    if (Math.random() < missChance) {
      // Bot missed it entirely this round
      return;
    }

    // Check false start (if phase transitions to waiting-for-stimulus, we could trigger it there. 
    // But since the stimulus is already active, we just do normal reaction. To simulate false starts,
    // we should actually hook into 'wait' phase. Let's do that below)
    
    const delay = this.getReactionDelay();
    setTimeout(() => {
      if (gameManager) {
        // Bot always presses the right key, it's just about timing
        gameManager.handlePlayerAction(room, this.socketId, 'reflex:press', {});
      }
    }, delay);
  }
  
  // Custom hook if we need to react during 'wait' phase for false starts
  onWaitPhaseStart(room, state, gameManager) {
    this.reactedToStimulus = false;

    let falseStartChance = 0;
    if (this.difficulty === 'easy') falseStartChance = 0.20;
    if (this.difficulty === 'medium') falseStartChance = 0.05;
    if (this.difficulty === 'hard') falseStartChance = 0.01;

    if (Math.random() < falseStartChance) {
      // False start! Bot presses before stimulus
      const falseStartDelay = 500 + Math.random() * 1000;
      setTimeout(() => {
        // Double check we are still in wait phase so we don't accidentally do a valid press
        if (gameManager && room.gameState.phase === 'wait') {
          gameManager.handlePlayerAction(room, this.socketId, 'reflex:press', {});
        }
      }, falseStartDelay);
    }
  }

  getReactionDelay() {
    if (this.difficulty === 'easy') {
      return 600 + Math.random() * 300; // 600-900ms
    }
    if (this.difficulty === 'medium') {
      return 250 + Math.random() * 150; // 250-400ms
    }
    if (this.difficulty === 'hard') {
      // Gaussian distribution around 160ms
      let u = 0, v = 0;
      while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
      while(v === 0) v = Math.random();
      let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      num = num / 10.0 + 0.5; // Translate to 0 -> 1
      if (num > 1 || num < 0) num = 0.5; // resample between 0 and 1
      
      const mean = 160;
      const stdDev = 20; // 95% within 120-200ms
      return Math.max(120, mean + (num - 0.5) * stdDev * 4); 
    }
    return 500;
  }
}
