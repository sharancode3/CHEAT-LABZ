import { GameBase } from './game-base.js';

export class MultiplayerGameBase extends GameBase {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {Object} room
   * @param {string} mySocketId
   * @param {Object} socket
   */
  constructor(canvas, room, mySocketId, socket) {
    // Pass null as container initially; the container will assign itself after instantiation
    super(canvas, null);

    this.room = room;
    this.mySocketId = mySocketId;
    this.socket = socket;

    // Identify opponent
    this.opponent = room && room.players ? room.players.find(p => p.socketId !== mySocketId) : null;
  }

  /**
   * Socket event router. Subclasses override to handle custom room actions.
   */
  onSocketMessage(event, data) {
    // Subclasses override this
  }

  /**
   * Sends a gameplay action to the server.
   */
  sendAction(action, data) {
    if (this.socket && typeof this.socket.emit === 'function') {
      this.socket.emit('game:action', { action, data });
    } else if (this.container && this.container.socket) {
      this.container.socket.emit('game:action', { action, data });
    }
  }

  /**
   * Returns opponent's display name.
   */
  getOpponentName() {
    return this.opponent ? (this.opponent.displayName || 'Opponent') : 'Opponent';
  }

  /**
   * Helper to check if it's currently the player's turn.
   */
  isMyTurn() {
    if (!this.room) return false;
    return this.room.currentTurn === this.mySocketId;
  }

  /**
   * Opponent disconnect notification.
   */
  onOpponentDisconnect() {
    // Optional override
  }
}
