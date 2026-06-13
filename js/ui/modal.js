

let currentGame = null;

window.launchGameModal = async (gameId, config = {}) => {
  const modal = document.getElementById('game-modal');
  const canvas = document.getElementById('game-canvas');
  const titleEl = document.getElementById('game-modal-title');
  const scoreEl = document.getElementById('game-modal-score');
  
  if (!modal || !canvas) return;

  const gameInfo = GAMES.find(g => g.id === gameId);
  if (gameInfo) {
    titleEl.innerText = gameInfo.name.toUpperCase();
  } else {
    titleEl.innerText = gameId.toUpperCase();
  }
  
  scoreEl.innerText = 'SCORE: 0';

  try {
    // Dynamically import the game module
    const module = await import(`../games/${gameId}.js`);
    const GameClass = module.default;

    if (!GameClass) {
      console.error(`Game module ${gameId} does not export a default class.`);
      return;
    }

    // Show modal
    modal.classList.remove('hidden');

    // Add close listener
    const closeBtn = document.getElementById('close-game');
    const onClose = () => {
      if (currentGame) {
        currentGame.destroy();
        currentGame = null;
      }
      modal.classList.add('hidden');
      closeBtn.removeEventListener('click', onClose);
      document.removeEventListener('keydown', onEsc);
    };
    
    const onEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };

    closeBtn.addEventListener('click', onClose);
    document.addEventListener('keydown', onEsc);

    // Instantiate game
    currentGame = new GameClass(canvas, config);

    // Provide a callback for the game to update the modal score
    currentGame.onScoreChange = (score) => {
      scoreEl.innerText = `SCORE: ${score}`;
    };

    // Auto-start or show instructions based on GameShell implementation
    if (currentGame.showInstructions) {
      currentGame.showInstructions();
    } else {
      currentGame.start();
    }

  } catch (err) {
    console.error('Failed to load game:', err);
    alert('Failed to load game. Check console.');
  }
};
