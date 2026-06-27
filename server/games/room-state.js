/**
 * room-state.js — Base Room State Handler
 * Every multiplayer game's server-side state extends this class.
 */
export class RoomState {
  constructor() {
    this.state = {};
    this.initialized = false;
  }

  /**
   * Initialize game state with room settings
   * @param {Object} settings — game-specific settings from room
   * @param {Array}  players  — array of player objects in the room
   */
  init(settings = {}, players = []) {
    this.initialized = true;
    this.state = {
      tick: 0,
      startedAt: Date.now(),
      settings,
      players: players.map(p => ({
        socketId: p.socketId,
        displayName: p.displayName,
        color: p.color,
        score: 0,
        alive: true,
      })),
    };
    return this.state;
  }

  /**
   * Process a player action and return new state
   * @param {Object} player — the player who sent the action
   * @param {string} action — action name
   * @param {Object} data   — action payload
   * @returns {Object} updated state
   */
  handleAction(player, action, data) {
    this.state.tick++;
    return this.state;
  }

  /**
   * Get current game state (safe copy for broadcast)
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Reset state for rematch
   */
  reset() {
    const { settings, players } = this.state;
    this.init(settings, players.map(p => ({ socketId: p.socketId, displayName: p.displayName, color: p.color })));
    return this.state;
  }
}

export default RoomState;
