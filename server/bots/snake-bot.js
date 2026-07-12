import { BotBase } from './bot-base.js';

export class SnakeBot extends BotBase {
  constructor(difficulty) {
    super('multiplayer-snake', difficulty);
    this.lastTickProcessed = -1;
  }

  getBotNamePrefix() {
    return 'Slither';
  }

  onGameStateUpdate(room, state, gameManager) {
    if (state.phase !== 'playing') return;
    
    // Ensure we only process once per tick
    if (this.lastTickProcessed === state.tickCount) return;
    this.lastTickProcessed = state.tickCount;

    const botSnake = state.snakes.find(s => s.id === this.socketId);
    if (!botSnake || !botSnake.alive) return;

    const newDirection = this.calculateDirection(botSnake, state);
    if (newDirection && newDirection !== botSnake.direction) {
      gameManager.handlePlayerAction(room, this.socketId, 'snake:turn', { direction: newDirection });
    }
  }

  calculateDirection(botSnake, state) {
    const head = botSnake.segments[0];
    const possibleMoves = this.getValidMoves(head, botSnake.direction, state);
    
    if (possibleMoves.length === 0) return null; // No escape

    if (this.difficulty === 'easy') {
      // 15% chance to turn randomly if valid
      if (Math.random() < 0.15) {
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)].dir;
      }
      
      // Greedy to nearest food
      let bestMove = possibleMoves[0];
      let minDistance = Infinity;
      
      for (const move of possibleMoves) {
        const d = this.getClosestFoodDistance(move.pos, state.food);
        if (d < minDistance) {
          minDistance = d;
          bestMove = move;
        }
      }
      return bestMove.dir;
    }

    if (this.difficulty === 'medium') {
      // Flood fill safety check
      const safeMoves = possibleMoves.filter(m => this.floodFillCount(m.pos, state) >= 5);
      const movesToConsider = safeMoves.length > 0 ? safeMoves : possibleMoves;
      
      let bestMove = movesToConsider[0];
      let minDistance = Infinity;
      
      for (const move of movesToConsider) {
        const d = this.getClosestFoodDistance(move.pos, state.food);
        if (d < minDistance) {
          minDistance = d;
          bestMove = move;
        }
      }
      return bestMove.dir;
    }

    if (this.difficulty === 'hard') {
      // Prioritize survival: flood fill
      const safeMoves = possibleMoves.map(m => {
        return { ...m, space: this.floodFillCount(m.pos, state) };
      });
      
      safeMoves.sort((a, b) => b.space - a.space);
      if (safeMoves.length === 0) return null;

      // If very trapped, just take the one with most space
      if (safeMoves[0].space < 20) {
        return safeMoves[0].dir;
      }

      // Filter to generally safe moves
      const goodMoves = safeMoves.filter(m => m.space > 10);
      
      // Check interception
      const playerSnake = state.snakes.find(s => s.id !== this.socketId && s.alive);
      if (playerSnake) {
        const projected = this.projectPlayer(playerSnake, state, 3);
        for (const m of goodMoves) {
          if (this.distance(m.pos, projected) < 2) {
            return m.dir; // Aggressive cut off
          }
        }
      }

      // Otherwise target food
      let bestMove = goodMoves[0];
      let minDistance = Infinity;
      for (const move of goodMoves) {
        const d = this.getClosestFoodDistance(move.pos, state.food);
        if (d < minDistance) {
          minDistance = d;
          bestMove = move;
        }
      }
      return bestMove.dir;
    }

    return null;
  }

  getValidMoves(head, currentDir, state) {
    const moves = [];
    const dirs = [
      { dir: 'up', dx: 0, dy: -1, opp: 'down' },
      { dir: 'down', dx: 0, dy: 1, opp: 'up' },
      { dir: 'left', dx: -1, dy: 0, opp: 'right' },
      { dir: 'right', dx: 1, dy: 0, opp: 'left' }
    ];

    for (const d of dirs) {
      if (d.opp === currentDir) continue; // Can't reverse
      const nx = head.x + d.dx;
      const ny = head.y + d.dy;
      
      if (this.isCellFree(nx, ny, state)) {
        moves.push({ dir: d.dir, pos: { x: nx, y: ny } });
      }
    }
    return moves;
  }

  isCellFree(x, y, state) {
    if (x < 0 || x >= state.gridWidth || y < 0 || y >= state.gridHeight) return false;
    for (const s of state.snakes) {
      if (!s.alive) continue;
      // check segments
      for (let i = 0; i < s.segments.length; i++) {
        // if it's the tail, it will move next tick unless they just ate, but assume unsafe to be simple
        if (s.segments[i].x === x && s.segments[i].y === y) return false;
      }
    }
    return true;
  }

  getClosestFoodDistance(pos, foods) {
    if (!foods || foods.length === 0) return 999;
    let min = Infinity;
    for (const f of foods) {
      const d = Math.abs(pos.x - f.x) + Math.abs(pos.y - f.y); // Manhattan
      if (d < min) min = d;
    }
    return min;
  }

  distance(p1, p2) {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  }

  floodFillCount(startPos, state) {
    const visited = new Set();
    const q = [startPos];
    visited.add(`${startPos.x},${startPos.y}`);
    let count = 0;
    
    // Cap at 40 to save CPU
    while (q.length > 0 && count < 40) {
      const curr = q.shift();
      count++;
      
      const neighbors = [
        { x: curr.x + 1, y: curr.y },
        { x: curr.x - 1, y: curr.y },
        { x: curr.x, y: curr.y + 1 },
        { x: curr.x, y: curr.y - 1 }
      ];
      
      for (const n of neighbors) {
        const key = `${n.x},${n.y}`;
        if (!visited.has(key) && this.isCellFree(n.x, n.y, state)) {
          visited.add(key);
          q.push(n);
        }
      }
    }
    return count;
  }

  projectPlayer(snake, state, ticksAhead) {
    let x = snake.segments[0].x;
    let y = snake.segments[0].y;
    for (let i = 0; i < ticksAhead; i++) {
      if (snake.direction === 'up') y--;
      if (snake.direction === 'down') y++;
      if (snake.direction === 'left') x--;
      if (snake.direction === 'right') x++;
    }
    return { x, y };
  }
}
