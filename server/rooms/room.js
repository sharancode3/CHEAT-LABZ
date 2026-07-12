export class Room {
  constructor(code, gameId, mode, maxPlayers, settings = {}) {
    this.code = code;
    this.gameId = gameId;
    this.mode = mode; // 'pvp' or 'bot'
    this.maxPlayers = maxPlayers;
    this.players = new Map(); // socketId -> PlayerData
    this.botPlayer = null;
    
    // Lifecycle states: CREATED, WAITING, COUNTDOWN, PLAYING, FINISHED, CLOSED
    this.state = 'CREATED';
    this.gameState = {};
    this.settings = settings;
    
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }

  touch() {
    this.lastActivity = Date.now();
  }

  addPlayer(socketId, sessionToken, displayName, color) {
    if (this.players.size >= this.maxPlayers) {
      throw new Error('Room is full');
    }

    const playerData = {
      socketId,
      sessionToken,
      displayName,
      color,
      ready: false,
      connected: true,
      score: 0,
      roundsWon: 0
    };

    this.players.set(socketId, playerData);
    this.touch();
    
    if (this.state === 'CREATED') {
      this.state = 'WAITING';
    }

    return playerData;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.touch();
  }

  getPlayerBySessionToken(token) {
    for (const player of this.players.values()) {
      if (player.sessionToken === token) {
        return player;
      }
    }
    return null;
  }

  getPlayerBySocketId(socketId) {
    return this.players.get(socketId) || null;
  }

  getConnectedPlayersCount() {
    let count = 0;
    for (const p of this.players.values()) {
      if (p.connected) count++;
    }
    return count;
  }

  serialize() {
    return {
      code: this.code,
      gameId: this.gameId,
      mode: this.mode,
      maxPlayers: this.maxPlayers,
      state: this.state,
      players: Array.from(this.players.values()).map(p => ({
        socketId: p.socketId,
        displayName: p.displayName,
        color: p.color,
        ready: p.ready,
        connected: p.connected,
        score: p.score,
        roundsWon: p.roundsWon
      })),
      hasBot: this.botPlayer !== null,
      gameState: this.gameState,
      settings: this.settings
    };
  }
}
