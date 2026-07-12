import { BotBase } from './bot-base.js';
import { RpsBot } from './rps-bot.js';
import { TttBot } from './ttt-bot.js';
import { ReflexBot } from './reflex-bot.js';
import { WordBot } from './word-bot.js';
import { SnakeBot } from './snake-bot.js';

export function createBotForGame(gameId, difficulty = 'medium') {
  switch (gameId) {
    case 'rock-paper-scissors': return new RpsBot(difficulty);
    case 'tic-tac-toe': return new TttBot(difficulty);
    case 'reflex-duel': return new ReflexBot(difficulty);
    case 'word-duel': return new WordBot(difficulty);
    case 'multiplayer-snake': return new SnakeBot(difficulty);
    default:
      console.warn(`[BOT MANAGER] No specific bot found for ${gameId}, falling back to BotBase`);
      return new BotBase(gameId, difficulty);
  }
}

// Global hook to notify a bot when game state updates
export function notifyBotOfGameState(room, state, gameManager) {
  if (room.mode === 'bot' && room.botPlayer) {
    try {
      room.botPlayer.onGameStateUpdate(room, state, gameManager);
    } catch (err) {
      console.warn(`[BOT ERROR] Bot failed to process state update in room ${room.code}:`, err);
    }
  }
}
