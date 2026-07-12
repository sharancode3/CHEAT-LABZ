import { BotBase } from './bot-base.js';

export class RpsBot extends BotBase {
  constructor(difficulty) {
    super('rock-paper-scissors', difficulty);
    this.playerHistory = [];
    this.botWinStreak = 0;
    this.lastBotChoice = null;
    this.choices = ['rock', 'paper', 'scissors'];
  }

  getBotNamePrefix() {
    return 'RPS';
  }

  onGameStateUpdate(room, state, gameManager) {
    // Only react if we are in the 'choose' state and bot hasn't chosen yet
    if (state.phase !== 'choose') return;
    
    // Determine if bot already submitted a choice this round (we'd need gameManager context to know this,
    // or just track it locally based on round number).
    // Let's assume the state has a round number.
    if (this.lastReactedRound === state.currentRound) return;
    this.lastReactedRound = state.currentRound;

    // Calculate choice immediately
    const choice = this.calculateChoice(state);

    // Delay submission
    const delay = this.getReactionDelay();
    setTimeout(() => {
      // In a real implementation, we emit this choice back to the game manager.
      // We assume gameManager has a method handlePlayerAction(socketId, action, data)
      if (gameManager) {
        gameManager.handlePlayerAction(room, this.socketId, 'rps:choice', { choice });
      }
    }, delay);
  }

  calculateChoice(state) {
    // Update our history if previous round data is available
    if (state.previousRounds && state.previousRounds.length > this.playerHistory.length) {
      const lastRound = state.previousRounds[state.previousRounds.length - 1];
      const player = lastRound.players.find(p => p.socketId !== this.socketId);
      const bot = lastRound.players.find(p => p.socketId === this.socketId);
      
      if (player && player.choice) {
        this.playerHistory.push(player.choice);
      }
      
      if (bot && player && bot.winner) {
        this.botWinStreak++;
      } else {
        this.botWinStreak = 0;
      }
    }

    if (this.difficulty === 'easy') {
      return this.getRandomChoice();
    }

    if (this.difficulty === 'medium') {
      return this.getMediumChoice();
    }

    if (this.difficulty === 'hard') {
      return this.getHardChoice();
    }

    return this.getRandomChoice();
  }

  getRandomChoice() {
    return this.choices[Math.floor(Math.random() * 3)];
  }

  getMediumChoice() {
    // Track last 5 choices
    const recent = this.playerHistory.slice(-5);
    if (recent.length < 3) return this.getRandomChoice();

    const counts = { rock: 0, paper: 0, scissors: 0 };
    for (const choice of recent) counts[choice]++;

    // Counter dominant pattern
    if (counts.rock >= 3) return 'paper';
    if (counts.paper >= 3) return 'scissors';
    if (counts.scissors >= 3) return 'rock';

    return this.getRandomChoice();
  }

  getHardChoice() {
    // Psychological pressure
    if (this.botWinStreak >= 3 && this.lastBotChoice) {
      // Human tends to switch when losing, bot stays to exploit
      const choice = this.lastBotChoice;
      this.lastBotChoice = choice;
      return choice;
    }

    // Markov chain analysis
    if (this.playerHistory.length < 2) return this.getRandomChoice();

    const transitions = { rock: { rock: 0, paper: 0, scissors: 0 }, paper: { rock: 0, paper: 0, scissors: 0 }, scissors: { rock: 0, paper: 0, scissors: 0 } };
    
    for (let i = 0; i < this.playerHistory.length - 1; i++) {
      const current = this.playerHistory[i];
      const next = this.playerHistory[i+1];
      transitions[current][next]++;
    }

    const lastChoice = this.playerHistory[this.playerHistory.length - 1];
    const trans = transitions[lastChoice];
    const total = trans.rock + trans.paper + trans.scissors;

    if (total === 0) return this.getRandomChoice();

    // Predict next
    let predicted = 'rock';
    if (trans.paper > trans.rock && trans.paper > trans.scissors) predicted = 'paper';
    if (trans.scissors > trans.rock && trans.scissors > trans.paper) predicted = 'scissors';

    // Counter prediction
    const counters = { rock: 'paper', paper: 'scissors', scissors: 'rock' };
    const choice = counters[predicted];
    this.lastBotChoice = choice;
    return choice;
  }

  getReactionDelay() {
    // Delay: 200-500ms calculation
    return 200 + Math.random() * 300;
  }
}
