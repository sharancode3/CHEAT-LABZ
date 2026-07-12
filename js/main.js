import router from './core/router.js';
import HomePage from './pages/HomePage.js';
import GamesPage from './pages/GamesPage.js';
import ArenaPage from './pages/ArenaPage.js';
import LeaderboardPage from './pages/LeaderboardPage.js';
import ChallengePage from './pages/ChallengePage.js';
import LobbyPage from './pages/LobbyPage.js';
import GamePage from './pages/GamePage.js';
import ResultsPage from './pages/ResultsPage.js';
import MatchmakingPage from './pages/MatchmakingPage.js';

// Register routes
router.register('/', HomePage);
router.register('/index.html', HomePage);
router.register('/games', GamesPage);
router.register('/games.html', GamesPage);
router.register('/arena', ArenaPage);
router.register('/arena.html', ArenaPage);
router.register('/leaderboard', LeaderboardPage);
router.register('/leaderboard.html', LeaderboardPage);
router.register('/challenge', ChallengePage);
router.register('/challenge/index.html', ChallengePage);
router.register('/challenge/lobby', LobbyPage);
router.register('/challenge/game', GamePage);
router.register('/challenge/results', ResultsPage);
router.register('/challenge/matchmaking', MatchmakingPage);

document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');
  if (appContainer) {
    router.start(appContainer);
    // Expose globally so navbar and other non-module scripts can use router.navigate()
    window._router = router;
  } else {
    console.error('No #app container found for the router to mount on.');
  }
});
