export class BotBase {
  constructor(gameId, difficulty = 'medium') {
    this.gameId = gameId;
    this.difficulty = difficulty;
    
    // Create a fake socket ID and player data for the bot
    this.socketId = `bot_${Math.random().toString(36).substring(2, 9)}`;
    this.displayName = `${this.getBotNamePrefix()} Bot`;
    this.color = '#ff3366'; // default bot color
    this.ready = true;
    this.connected = true;
    this.score = 0;
    this.roundsWon = 0;
  }

  getBotNamePrefix() {
    return 'Alpha';
  }

  // Hook for game manager to call when game state changes and bot needs to react
  onGameStateUpdate(room, state) {
    throw new Error('onGameStateUpdate must be implemented by bot subclasses');
  }

  // Generate a realistic delay based on difficulty
  getReactionDelay() {
    switch (this.difficulty) {
      case 'easy': return 1500 + Math.random() * 1000;
      case 'medium': return 800 + Math.random() * 600;
      case 'hard': return 300 + Math.random() * 300;
      case 'impossible': return 100 + Math.random() * 100;
      default: return 1000;
    }
  }
}
