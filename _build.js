const fs = require('fs');
const path = require('path');

// ============ INDEX.HTML ============
const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>CHEAT LABZ — No rules. Just scores.</title>
<meta name="description" content="CHEAT LABZ — A chaotic, fast, fun, neon-soaked browser arcade."/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=DM+Mono:wght@400;500&family=Bebas+Neue&family=Boogaloo&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="style.css"/>
</head>
<body class="dark">
<canvas id="starfield" aria-hidden="true"></canvas>
<div class="scanlines" aria-hidden="true"></div>

<!-- HANDLE MODAL -->
<div id="handleModal" class="modal-overlay hidden">
  <div class="modal-box">
    <h2>SET YOUR HANDLE</h2>
    <p class="mono">Choose a name for the leaderboard</p>
    <input id="handleInput" type="text" maxlength="16" placeholder="Enter nickname..." autofocus/>
    <button id="handleSave" class="btn-neon">LET'S GO</button>
  </div>
</div>

<!-- SETTINGS PANEL -->
<div id="settingsPanel" class="settings-panel hidden">
  <div class="settings-inner">
    <div class="settings-header"><h3>SETTINGS</h3><button id="settingsClose" class="close-x">&times;</button></div>
    <label>Player Handle<input id="sHandle" type="text" maxlength="16"/></label>
    <label>SFX Volume<input id="sVolume" type="range" min="0" max="100" value="50"/><span id="sVolVal">50%</span></label>
    <label>Theme
      <select id="sTheme"><option value="dark">Dark</option><option value="light">Light</option></select>
    </label>
    <label><input id="sWallDeath" type="checkbox"/> Wall Death (Snake)</label>
    <label><input id="sShowControls" type="checkbox" checked/> Show Controls Overlay</label>
    <button id="sReset" class="btn-danger">Reset All Scores</button>
  </div>
</div>

<!-- HEADER -->
<header id="header" class="header">
  <a class="brand" href="index.html">
    <span class="brand-logo">&#9883;</span>
    <span class="brand-text"><strong>CHEAT L&Delta;BZ</strong><small>No rules. Just scores.</small></span>
  </a>
  <nav class="nav-links">
    <a href="#hero" class="nav-a active">HOME</a>
    <a href="#games" class="nav-a">ARCADE</a>
    <a href="#leaderboard" class="nav-a">LEADERBOARD</a>
    <a href="#howtoplay" class="nav-a">HOW TO PLAY</a>
  </nav>
  <div class="header-right">
    <button id="themeToggle" class="icon-btn" title="Toggle theme">&#9790;</button>
    <button id="sfxToggle" class="icon-btn sfx-on" title="Toggle SFX">&#128266;</button>
    <button id="settingsBtn" class="icon-btn" title="Settings">&#9881;</button>
    <span id="playerBadge" class="player-badge">Player</span>
  </div>
  <div class="header-glow"></div>
</header>

<!-- HERO -->
<section id="hero" class="hero">
  <h1 id="heroTitle" class="glitch-text">PICK A GAME. BREAK THE RECORD.</h1>
  <div class="hero-btns">
    <button id="browseBtn" class="btn-neon">BROWSE ALL GAMES</button>
    <button id="randomBtn" class="btn-outline">RANDOM GAME</button>
  </div>
  <div class="live-strip">
    <span>&#127918; <strong id="liveGames">16</strong> Games Live</span>
    <span>&#127942; <strong id="liveRuns">0</strong> Total Runs</span>
    <span>&#9889; Season 3 Active</span>
  </div>
</section>

<!-- STATS BAR -->
<section class="stats-bar">
  <div class="stat-pill"><span class="stat-label">Most Played</span><span id="statMostPlayed" class="stat-val">—</span></div>
  <div class="stat-pill"><span class="stat-label">Best Streak</span><span id="statStreak" class="stat-val">0</span></div>
  <div class="stat-pill"><span class="stat-label">Total Runs</span><span id="statTotalRuns" class="stat-val">0</span></div>
  <div class="stat-pill"><span class="stat-label">Fav Category</span><span id="statFavCat" class="stat-val">—</span></div>
  <div class="stat-pill"><span class="stat-label">Last Played</span><span id="statLastPlayed" class="stat-val">—</span></div>
</section>

<!-- HOT RIGHT NOW -->
<section class="featured-section">
  <div class="section-head">
    <h2>&#128293; HOT RIGHT NOW</h2>
    <div class="chip-row">
      <button class="chip active" data-chip="trending">TRENDING</button>
      <button class="chip" data-chip="new">NEW</button>
      <button class="chip" data-chip="chill">CHILL</button>
    </div>
  </div>
  <div id="featuredRow" class="featured-row"></div>
</section>

<!-- FILTER & SEARCH -->
<section id="games" class="arcade-section">
  <div class="section-head">
    <h2>GAME LIBRARY</h2>
    <div class="sort-row">
      <select id="sortSelect">
        <option value="trending">TRENDING</option>
        <option value="new">NEW</option>
        <option value="easy">EASIEST</option>
        <option value="hard">HARDEST</option>
        <option value="az">A-Z</option>
      </select>
    </div>
  </div>
  <div class="filter-bar">
    <button class="pill active" data-filter="all">ALL</button>
    <button class="pill" data-filter="arcade">ARCADE</button>
    <button class="pill" data-filter="puzzle">PUZZLE</button>
    <button class="pill" data-filter="racing">RACING</button>
    <button class="pill" data-filter="skill">SKILL</button>
  </div>
  <input id="searchInput" class="search-bar" type="search" placeholder="Search games..."/>
  <div id="gameGrid" class="game-grid"></div>
  <p id="emptyState" class="empty-state hidden">No games match your filters.</p>
</section>

<!-- LEADERBOARD -->
<section id="leaderboard" class="lb-section">
  <h2>LEADERBOARD</h2>
  <div class="lb-tabs">
    <select id="lbGameSelect"></select>
  </div>
  <div id="lbTable" class="lb-table"></div>
  <button id="lbReset" class="btn-small btn-danger">Reset My Scores</button>
</section>

<!-- HOW TO PLAY -->
<section id="howtoplay" class="htp-section">
  <h2>HOW TO PLAY</h2>
  <p class="mono">Select any game card and click PLAY NOW. Each game shows controls before starting. Press P or ESC to pause. Press R to replay after game over.</p>
</section>

<!-- GAME FULLSCREEN CONTAINER -->
<div id="gameContainer" class="game-container hidden">
  <div class="game-topbar">
    <button id="gameBack" class="btn-small">&larr; BACK TO LOBBY</button>
    <span id="gameTitle" class="game-title-bar"></span>
    <button id="gamePause" class="btn-small">PAUSE (P)</button>
  </div>
  <div id="gameFrame" class="game-frame"></div>
</div>

<!-- ACHIEVEMENT TOAST -->
<div id="achievementToast" class="achievement-toast hidden"></div>

<footer class="footer">
  <small>&copy; 2026 CHEAT L&Delta;BZ &mdash; No rules. Just scores.</small>
</footer>

<script src="shared/utils.js"></script>
<script src="shared/soundManager.js"></script>
<script src="script.js"></script>
</body>
</html>`;

fs.writeFileSync('index.html', indexHTML);
console.log('✅ index.html written');
