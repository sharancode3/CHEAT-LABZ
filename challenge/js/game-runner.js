/**
 * game-runner.js — Post-Lobby Game Loader
 *
 * Listens for game:start → launches the game within the MultiplayerContainer.
 */

import SocketClient from './socket-client.js';
import { loadGame } from '/js/core/game-loader.js';
import { MultiplayerContainer } from '/js/core/multiplayer-container.js';

let currentRoom = null;
let activeGame  = null;

async function launchGame(room) {
  currentRoom = room;
  const gameId = room.gameId;

  // Create clean mount point for our container system
  let mountPoint = document.getElementById('game-container-mount');
  if (mountPoint) mountPoint.remove();

  mountPoint = document.createElement('div');
  mountPoint.id = 'game-container-mount';
  mountPoint.style.position = 'fixed';
  mountPoint.style.inset = '0';
  mountPoint.style.zIndex = '99999';
  document.body.appendChild(mountPoint);

  // Load through containerized loader
  const loadResult = await loadGame(gameId);
  if (!loadResult.success) {
    console.error('[GameRunner] Failed to load game:', loadResult.error);
    alert('Failed to load game: ' + loadResult.error);
    exitGame();
    return;
  }

  const GameClass = loadResult.GameClass;
  const manifest = loadResult.manifest;

  try {
    const container = new MultiplayerContainer(mountPoint, GameClass, manifest, {
      room,
      mySocketId: SocketClient.getMySocketId(),
      socket: SocketClient,
      onExit: exitGame
    });

    activeGame = container;
    await container.loadAndInstantiate();
  } catch (err) {
    console.error('[GameRunner] Failed to initialize game:', err);
    alert('Failed to start the game.');
    exitGame();
  }
}

function exitGame() {
  if (activeGame?.destroy) {
    activeGame.destroy();
  }
  activeGame = null;
  document.getElementById('game-container-mount')?.remove();
  // Return to lobby state
  SocketClient.emit('room:sync', {});
}

// ── Socket Event Bindings ─────────────────────────────────────────────────────
export function initGameRunner() {
  SocketClient.on('game:start', ({ room }) => {
    launchGame(room);
  });
}
