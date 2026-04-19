(() => {
  'use strict';

  const query = new URLSearchParams(location.search);
  const gameId = query.get('game') || 'snake';
  const arenaMode = query.get('arena') === '1';
  const arenaRound = Number(query.get('arenaRound') || 1);
  const arenaDuration = Number(query.get('arenaDuration') || 0);
  const arenaSpeed = Math.max(1, Number(query.get('arenaSpeed') || 1));
  const arenaMult = Math.max(1, Number(query.get('arenaMult') || 1));
  const arenaHazards = (query.get('arenaHazards') || '').split(',').filter(Boolean);
  let challengeRaw = query.get('challenge');
  let activeChallenge = null;
  try { if (challengeRaw) activeChallenge = JSON.parse(decodeURIComponent(challengeRaw)); } catch {}

  const GAME_META = {
    snake:{ title:'NEON SERPENT', aspect:'16-9', controls:'Arrow keys / WASD move · SPACE boost · P/ESC pause' },
    pingpong:{ title:'LOOP RALLY', aspect:'16-9', controls:'W/S or ↑/↓ move · SPACE curve shot · P/ESC pause' },
    bubbleshooter:{ title:'ORB POP DELUXE', aspect:'4-3', controls:'Click adjacent orbs to chain · ENTER pop · Z undo · R reset' },
    carracing:{ title:'TURBO DRIFT', aspect:'16-9', controls:'WASD/Arrows steer · SPACE handbrake · P/ESC pause' },
    puzzle:{ title:'SLIDE FORGE', aspect:'4-3', controls:'Arrow keys slide · Z undo · R restart' },
    keyfrenzy:{ title:'KEY FRENZY', aspect:'16-9', controls:'Press shown key only · SPACE skip (3) · P/ESC pause' },
    dino:{ title:'ASTRO STRIDER', aspect:'16-9', controls:'SPACE/↑ jump · ↓ duck · X dash · P/ESC pause' },
    wordguesser:{ title:'CIPHER QUEST', aspect:'4-3', controls:'Type letters · ENTER submit · BACKSPACE delete' },
    reactiontime:{ title:'BLINK LAB', aspect:'1-1', controls:'SPACE for white/green · click blue · avoid red' },
    haunted:{ title:'PHANTOM CALC', aspect:'4-3', controls:'Click ghost/option with correct answer · number keys too' },
    wordle:{ title:'WORD PULSE', aspect:'4-3', controls:'Type hidden words · ENTER submit · H hint' },
    pixeldodge:{ title:'PIXEL DODGE', aspect:'1-1', controls:'WASD/Arrows move · survive incoming projectiles' },
    dodgeblitz:{ title:'DODGE BLITZ', aspect:'1-1', controls:'WASD/Arrows move · survive edge spawns · pure evasion' },
    stackblitz:{ title:'STACK BLITZ', aspect:'16-9', controls:'SPACE drop block · perfect stacks bonus' },
    memorygrid:{ title:'MEMORY GRID', aspect:'1-1', controls:'Memorize highlights, then click all highlighted cells' },
    hypertap:{ title:'HYPER TAP', aspect:'1-1', controls:'SPACE/Click tap · every 10th tap press X for bonus' },
    neonpong:{ title:'NEON PONG 1v1', aspect:'16-9', controls:'W/S or ↑/↓ move · SPACE spin boost · best of 3 rounds' },
    gravityflip:{ title:'GRAVITY FLIP', aspect:'16-9', controls:'SPACE / ↑ / Tap to flip gravity' },
    chainburst:{ title:'CHAIN BURST', aspect:'4-3', controls:'Click or tap any orb to trigger a chain burst' },
    reflexrush:{ title:'REFLEX RUSH', aspect:'1-1', controls:'RED=J · BLUE=K · GREEN=L · YELLOW=SPACE · WHITE=ENTER' },
    tilerunner:{ title:'TILE RUNNER', aspect:'4-3', controls:'WASD / Arrow keys move one tile' },
    beatdrop:{ title:'BEAT DROP', aspect:'16-9', controls:'Hit lanes with D F J K at the zone' }
  };

  const titleEl = document.getElementById('title');
  const subtitleEl = document.getElementById('subtitle');
  const scoreEl = document.getElementById('score');
  const comboEl = document.getElementById('combo');
  const levelEl = document.getElementById('level');
  const howTo = document.getElementById('howTo');
  const howToText = document.getElementById('howToText');
  const startBtn = document.getElementById('startBtn');
  const helpBtn = document.getElementById('helpBtn');
  const pauseOverlay = document.getElementById('pause');
  const gameOver = document.getElementById('gameOver');
  const finalScore = document.getElementById('finalScore');
  const bestScore = document.getElementById('bestScore');
  const runsToday = document.getElementById('runsToday');
  const closeMsg = document.getElementById('closeMsg');
  const goTitle = document.getElementById('goTitle');
  const replayBtn = document.getElementById('replayBtn');
  const lobbyBtn = document.getElementById('lobbyBtn');
  const challengeBtn = document.getElementById('challengeBtn');
  const flash = document.getElementById('flash');
  const area = document.getElementById('playArea');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const domArea = document.getElementById('domArea');

  const meta = GAME_META[gameId] || GAME_META.snake;
  titleEl.textContent = meta.title;
  subtitleEl.textContent = arenaMode ? `⚔️ ARENA ROUND ${arenaRound} — ${arenaHazards.join(' + ') || 'NO HAZARD'}` : 'CHEAT LABZ — No rules. Just scores.';
  area.classList.remove('aspect-16-9', 'aspect-4-3', 'aspect-1-1');
  area.classList.add(`aspect-${meta.aspect}`);
  if (arenaMode && arenaHazards.includes('SHRINK')) {
    area.style.transform = 'scale(.85)';
    area.style.transformOrigin = 'center';
  }
  if (arenaMode && arenaHazards.includes('DARK')) {
    area.style.filter = 'brightness(.6)';
  }

  let st = null;
  let raf = 0;
  let keys = new Set();
  let running = false;
  let paused = false;
  let ended = false;
  let last = 0;
  const LOGICAL_W = 960;
  const LOGICAL_H = 540;
  const timeoutIds = new Set();
  const intervalIds = new Set();
  let resizeTimer = 0;

  function trackTimeout(fn, ms){
    const id = window.setTimeout(() => { timeoutIds.delete(id); fn(); }, ms);
    timeoutIds.add(id);
    return id;
  }
  function clearTrackedTimers(){
    timeoutIds.forEach(id => clearTimeout(id));
    intervalIds.forEach(id => clearInterval(id));
    timeoutIds.clear();
    intervalIds.clear();
  }
  function applyCanvasDpr(){
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(LOGICAL_W * dpr);
    canvas.height = Math.floor(LOGICAL_H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function handleResize(){
    clearTimeout(resizeTimer);
    resizeTimer = trackTimeout(() => applyCanvasDpr(), 100);
  }

  function rand(min, max){ return Math.random()*(max-min)+min; }
  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function resetHud(){
    scoreEl.textContent = '0'; comboEl.textContent = 'x1'; levelEl.textContent = '1';
  }

  function setScore(v){ st.score = Math.max(0, Math.floor(v)); scoreEl.textContent = st.score; }
  function addScore(v){
    if (v <= 0) return;
    st.combo = st.combo >= 5 ? 5 : st.combo + (v >= 20 ? 1 : 0);
    const arenaFactor = arenaMode ? arenaMult : 1;
    setScore(st.score + v * st.combo * arenaFactor);
    comboEl.textContent = 'x' + st.combo;
    SoundManager?.scorePoint?.();
  }
  function breakCombo(){ st.combo = 1; comboEl.textContent = 'x1'; SoundManager?.comboBreak?.(); }
  function levelUp(){
    st.level += 1; levelEl.textContent = String(st.level);
    flash.classList.remove('hidden');
    trackTimeout(() => flash.classList.add('hidden'), 700);
    SoundManager?.levelUp?.();
  }

  function postGameOver(){
    window.parent?.postMessage({ type:'gameOver', gameId, score: st.score }, '*');
    if (arenaMode) {
      window.parent?.postMessage({ type:'arenaRoundOver', score: st.score, gameId, round: arenaRound }, '*');
    }
  }

  function endGame(reason='Game Over'){
    if (ended) return;
    ended = true;
    running = false;
    goTitle.textContent = reason.toUpperCase();
    finalScore.textContent = String(st.score);
    const best = Math.max(CheatLabz.scores.getBest(gameId), st.score);
    bestScore.textContent = String(best);
    runsToday.textContent = String(CheatLabz.scores.getRunsToday(gameId) + 1);
    const gap = best - st.score;
    const baseMsg = gap > 0 && gap <= Math.ceil(best*0.1) ? `So close — you were only ${gap} points away.` : (st.score >= best ? 'New record!' : 'Push again for a new PB.');
    closeMsg.textContent = st.info?.summary ? `${st.info.summary} · ${baseMsg}` : baseMsg;
    gameOver.classList.remove('hidden');
    SoundManager?.gameOver?.();
    postGameOver();
  }

  function togglePause(force){
    if (ended || !running) return;
    paused = typeof force === 'boolean' ? force : !paused;
    pauseOverlay.classList.toggle('hidden', !paused);
    if (paused) {
      cancelAnimationFrame(raf);
    } else {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }

  function startGame(){
    clearTrackedTimers();
    setupGame();
    howTo.classList.add('hidden');
    gameOver.classList.add('hidden');
    pauseOverlay.classList.add('hidden');
    running = true;
    paused = false;
    ended = false;
    last = performance.now();
    SoundManager?.gameStart?.();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function loop(ts){
    const dt = Math.min(0.05, (ts - last) / 1000) * (arenaMode ? arenaSpeed : 1);
    last = ts;
    if (running && !paused && !ended) {
      st.t += dt;
      if (arenaMode && arenaDuration > 0 && st.t >= arenaDuration) {
        window.parent?.postMessage({ type:'arenaRoundOver', score: st.score, gameId, round: arenaRound }, '*');
        return endGame(`Arena Round ${arenaRound} Complete`);
      }
      if (st.t - st.lastLevelAt >= 30) { st.lastLevelAt = st.t; levelUp(); }
      MODE[gameId]?.update?.(dt);
      checkChallengeProgress();
      MODE[gameId]?.draw?.();
      drawCommonCanvasHud();
      raf = requestAnimationFrame(loop);
    }
  }

  function cleanupRunner(){
    cancelAnimationFrame(raf);
    clearTrackedTimers();
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('beforeunload', cleanupRunner);
    canvas.removeEventListener('click', handleCanvasClick);
  }

  function clearDom(){ domArea.innerHTML = ''; domArea.classList.add('hidden'); canvas.classList.remove('hidden'); }

  function setupBase(){
    st = {
      score:0, combo:1, level:1, t:0, lastLevelAt:0,
      info:{},
      challengeDone:false,
    };
    keys = new Set();
    resetHud();
    clearDom();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
  }

  function drawNeonText(text, x, y, color='#b8ff00'){
    ctx.fillStyle = color;
    ctx.font = 'bold 24px Orbitron';
    ctx.fillText(text, x, y);
  }

  function drawHeart(x,y,s=1,color='#ff3c3c'){
    ctx.fillStyle=color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x-6*s,y-8*s,x-16*s,y+4*s,x,y+16*s);
    ctx.bezierCurveTo(x+16*s,y+4*s,x+6*s,y-8*s,x,y);
    ctx.fill();
  }

  function drawCommonCanvasHud(){
    if (canvas.classList.contains('hidden')) return;
    if (arenaMode && arenaHazards.includes('BLIND')) return;
    ctx.save();
    ctx.font = 'bold 20px Bebas Neue';
    ctx.fillStyle = '#f0f0f0';
    ctx.fillText(`SCORE ${Math.floor(st.score).toLocaleString()}`, 14, 24);
    if (st.combo > 1) {
      ctx.fillStyle = '#ffb300';
      ctx.fillText(`COMBO x${st.combo}`, 170, 24);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillText('COMBO x1', 170, 24);
    }
    ctx.fillStyle = '#00f5ff';
    ctx.fillText(`LEVEL ${st.level}`, 860, 24);
    if (typeof st.info?.lives === 'number') {
      for(let h=0; h<st.info.lives; h++) drawHeart(940 - h*18, 26, 0.75);
    }
    ctx.restore();
  }

  function challengeConditionMet(){
    if (!activeChallenge || st.challengeDone) return false;
    if (activeChallenge.type === 'score') return st.score >= Number(activeChallenge.target || 0);
    if (activeChallenge.type === 'survive') return st.t >= Number(activeChallenge.target || 0);
    if (activeChallenge.type === 'combo') return st.combo >= Number(activeChallenge.target || 0);
    if (activeChallenge.type === 'level') return st.level >= Number(activeChallenge.target || 0);
    return false;
  }

  function checkChallengeProgress(){
    if (!activeChallenge || st.challengeDone) return;
    if (!challengeConditionMet()) return;
    st.challengeDone = true;
    flash.textContent = 'CHALLENGE COMPLETE!';
    flash.classList.remove('hidden');
    trackTimeout(() => {
      flash.textContent = 'LEVEL UP';
      flash.classList.add('hidden');
    }, 2000);
    window.parent?.postMessage({ type:'challengeComplete', challengeId: activeChallenge.id, gameId, score: st.score }, '*');
  }

  const MODE = {};

  MODE.snake = {
    setup(){
      const grid = 24;
      const cell = Math.floor(480 / grid);
      const snake = [{x:8,y:8},{x:7,y:8},{x:6,y:8}];
      const occupied = (x, y) => snake.some(s => s.x === x && s.y === y);
      const randomFreeCell = () => {
        let x = 0;
        let y = 0;
        do {
          x = Math.floor(rand(0, grid));
          y = Math.floor(rand(0, grid));
        } while (occupied(x, y));
        return { x, y };
      };

      st.info = {
        grid,
        cell,
        snake,
        dir:{x:1,y:0},
        next:{x:1,y:0},
        food: randomFreeCell(),
        foodEaten: 0,
        timer: 0,
        baseStep: 0.13,
        step: 0.13,
        boostEnergy: 1,
        doubleScoreUntil: 0,
        chainFood: null,
        chainUntil: 0,
        powerUp: null,
        powerUntil: 0,
        isBoosting: false,
        randomFreeCell,
      };
    },
    update(dt){
      const i = st.info;
      i.doubleScoreUntil = Math.max(0, i.doubleScoreUntil - dt);
      i.powerUntil = Math.max(0, i.powerUntil - dt);
      if (i.powerUntil <= 0) i.powerUp = null;

      if (keys.has('arrowup') || keys.has('w')) i.next = {x:0,y:-1};
      if (keys.has('arrowdown') || keys.has('s')) i.next = {x:0,y:1};
      if (keys.has('arrowleft') || keys.has('a')) i.next = {x:-1,y:0};
      if (keys.has('arrowright') || keys.has('d')) i.next = {x:1,y:0};

      const boosting = keys.has(' ') && i.boostEnergy > 0;
      i.isBoosting = boosting;
      if (boosting) i.boostEnergy = Math.max(0, i.boostEnergy - dt / 2);
      else i.boostEnergy = Math.min(1, i.boostEnergy + dt / 4);

      const step = i.step / (boosting ? 2 : 1);
      i.timer += dt;
      if (i.timer < step) return;
      i.timer = 0;
      i.dir = i.next;

      const rawX = i.snake[0].x + i.dir.x;
      const rawY = i.snake[0].y + i.dir.y;
      const wallDeath = !!CheatLabz.settings.get().wallDeath;
      if (wallDeath && (rawX < 0 || rawX >= i.grid || rawY < 0 || rawY >= i.grid)) return endGame('Wall Crash');

      const head = {x:(rawX + i.grid) % i.grid, y:(rawY + i.grid) % i.grid};
      if (i.snake.some((s,idx)=>idx>2 && s.x===head.x && s.y===head.y)) return endGame('Snake Down');
      i.snake.unshift(head);

      for (let idx=0; idx<i.snake.length-1; idx++) {
        const a = i.snake[idx];
        const b = i.snake[idx+1];
        const linked = (a.x===b.x && Math.abs(a.y-b.y)<=1) || (a.y===b.y && Math.abs(a.x-b.x)<=1);
        console.assert(linked, 'Snake segment link broken', a, b);
      }

      if (i.chainFood && (head.x === i.chainFood.x && head.y === i.chainFood.y) && i.chainUntil > 0) {
        addScore(50);
        i.chainFood = null;
        i.chainUntil = 0;
      }
      if (i.chainUntil > 0) i.chainUntil -= step;
      if (i.chainUntil <= 0) i.chainFood = null;

      if (i.powerUp && head.x === i.powerUp.x && head.y === i.powerUp.y) {
        i.doubleScoreUntil = 5;
        i.powerUp = null;
        i.powerUntil = 0;
        SoundManager?.powerUp?.();
      }

      if (head.x === i.food.x && head.y === i.food.y) {
        addScore(i.doubleScoreUntil > 0 ? 20 : 10);
        i.foodEaten += 1;
        i.food = i.randomFreeCell();

        if (i.foodEaten % 10 === 0) {
          i.baseStep = Math.max(0.065, i.baseStep * 0.93);
          i.step = i.baseStep;
        }

        if (i.foodEaten % 5 === 0) {
          i.chainFood = i.randomFreeCell();
          i.chainUntil = 3;
        }

        if (!i.powerUp && Math.random() < 0.18) {
          i.powerUp = i.randomFreeCell();
          i.powerUntil = 8;
        }
      } else i.snake.pop();
    },
    draw(){
      const i = st.info;
      ctx.fillStyle='#050810'; ctx.fillRect(0,0,960,540);
      ctx.strokeStyle='rgba(0,245,255,.08)';
      for (let n=0;n<=i.grid;n++){const p=n*i.cell; ctx.beginPath();ctx.moveTo(p,0);ctx.lineTo(p,540);ctx.stroke();ctx.beginPath();ctx.moveTo(0,p);ctx.lineTo(540,p);ctx.stroke();}
      ctx.save(); ctx.translate(120,20);
      ctx.shadowColor='#b8ff00';
      ctx.shadowBlur=12;
      for(let idx=i.snake.length-1; idx>=1; idx--){
        const s = i.snake[idx];
        const alpha = 1 - ((i.snake.length-1-idx) / Math.max(1,i.snake.length) * 0.6);
        ctx.fillStyle=`rgba(184,255,0,${alpha.toFixed(3)})`;
        ctx.fillRect(s.x*i.cell, s.y*i.cell, i.cell, i.cell);
      }

      const head = i.snake[0];
      ctx.fillStyle='#b8ff00';
      ctx.fillRect(head.x*i.cell-1, head.y*i.cell-1, i.cell+2, i.cell+2);

      ctx.fillStyle='#fff';
      const hx = head.x*i.cell, hy = head.y*i.cell;
      if (i.dir.x > 0) { ctx.fillRect(hx+i.cell-7,hy+5,3,3); ctx.fillRect(hx+i.cell-7,hy+i.cell-8,3,3); }
      else if (i.dir.x < 0) { ctx.fillRect(hx+4,hy+5,3,3); ctx.fillRect(hx+4,hy+i.cell-8,3,3); }
      else if (i.dir.y < 0) { ctx.fillRect(hx+5,hy+4,3,3); ctx.fillRect(hx+i.cell-8,hy+4,3,3); }
      else { ctx.fillRect(hx+5,hy+i.cell-7,3,3); ctx.fillRect(hx+i.cell-8,hy+i.cell-7,3,3); }
      ctx.shadowBlur=0;

      const pulse = 8 + Math.sin(Date.now()/300) * 2;
      ctx.fillStyle='rgba(0,245,255,.22)';
      ctx.beginPath();
      ctx.arc(i.food.x*i.cell+10,i.food.y*i.cell+10,pulse*1.8,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#00f5ff';
      ctx.beginPath();
      ctx.arc(i.food.x*i.cell+10,i.food.y*i.cell+10,pulse,0,Math.PI*2);
      ctx.fill();

      if (i.chainFood && i.chainUntil > 0) {
        ctx.fillStyle='#ffb300';
        ctx.beginPath();
        ctx.arc(i.chainFood.x*i.cell+10,i.chainFood.y*i.cell+10,8,0,Math.PI*2);
        ctx.fill();
      }

      if (i.powerUp) {
        ctx.fillStyle = '#ffd84a';
        ctx.font = 'bold 18px Orbitron';
        ctx.fillText('⚡', i.powerUp.x*i.cell+3, i.powerUp.y*i.cell+16);
      }
      ctx.restore();

      drawNeonText('BOOST', 700, 505, '#00f5ff');
      ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(700,515,180,14);
      ctx.fillStyle = i.isBoosting ? '#ffffff' : '#b8ff00';
      ctx.fillRect(700,515,180 * i.boostEnergy,14);
      if (!i.isBoosting && i.boostEnergy < 1) {
        const waveX = 700 + ((Date.now()/8)%180);
        ctx.fillStyle='rgba(90,120,60,.45)';
        ctx.fillRect(waveX-18,515,18,14);
      }
      if (i.isBoosting) {
        ctx.strokeStyle='rgba(255,255,255,.15)';
        for(let s=0;s<7;s++){
          const y = 70 + ((s*65 + (Date.now()/14)) % 380);
          const len = 10 + (s*5 % 30);
          ctx.beginPath();
          ctx.moveTo(920-len,y);
          ctx.lineTo(920,y);
          ctx.stroke();
        }
      }
      if (i.doubleScoreUntil > 0) drawNeonText('2X SCORE', 700, 470, '#ffd84a');
      if (i.chainFood && i.chainUntil > 0) drawNeonText(`CHAIN ${i.chainUntil.toFixed(1)}s`, 700, 440, '#ffb300');
    }
  };

  MODE.pingpong = {
    setup(){
      const startVy = clamp((Math.random()-0.5)*4, -3, 3) * 60;
      st.info = {
        p:230,
        paddleH:100,
        b:{x:480,y:270,vx:-240,vy:startVy},
        lives:3,
        returns:0,
        curveCd:0,
        curvePressAt:0,
        spikeUntil:0,
        spikeWarn:0,
        pendingSpike:false,
        slowUntil:0,
        wideUntil:0,
        powerSpawnIn:6,
        power:null,
        floats:[],
        wallVibe:0,
        wallFlash:0,
        trail:[],
        paddleFlash:0,
      };
    },
    update(dt){
      const i=st.info;
      if(keys.has('arrowup')||keys.has('w')) i.p-=6*60*dt;
      if(keys.has('arrowdown')||keys.has('s')) i.p+=6*60*dt;

      i.curveCd = Math.max(0, i.curveCd - dt);
      i.spikeUntil = Math.max(0, i.spikeUntil - dt);
      i.spikeWarn = Math.max(0, i.spikeWarn - dt);
      if (i.pendingSpike && i.spikeWarn <= 0) { i.spikeUntil = 2; i.pendingSpike = false; }
      i.slowUntil = Math.max(0, i.slowUntil - dt);
      i.wideUntil = Math.max(0, i.wideUntil - dt);
      if (i.wideUntil <= 0) i.paddleH = 100;
      i.paddleFlash = Math.max(0, i.paddleFlash - dt);
      i.wallFlash = Math.max(0, i.wallFlash - dt);
      i.p = clamp(i.p, 0, 540 - i.paddleH);

      i.powerSpawnIn -= dt;
      if (i.powerSpawnIn <= 0 && !i.power) {
        i.powerSpawnIn = rand(5, 9);
        i.power = {x:480, y:270, type:Math.random()<0.5 ? 'slow' : 'wide', ttl:7, bob:0};
      }
      if (i.power) {
        i.power.bob += dt;
        i.power.ttl -= dt;
        if (i.power.ttl <= 0) i.power = null;
      }

      const moveMul = (i.spikeUntil > 0 ? 3 : 1) * (i.slowUntil > 0 ? 0.6 : 1);
      i.b.x += i.b.vx*dt*moveMul;
      i.b.y += i.b.vy*dt*moveMul;

      i.trail.unshift({x:i.b.x,y:i.b.y});
      if (i.trail.length > 5) i.trail.length = 5;

      if(i.b.y < 16 || i.b.y > 524) i.b.vy*=-1;

      if(i.b.x > 944){
        i.b.vx = -Math.abs(i.b.vx);
        i.wallVibe = 0.2;
        i.wallFlash = 0.08;
      }

      if(i.b.x < 54 && i.b.y > i.p && i.b.y < i.p + i.paddleH){
        i.returns += 1;
        const boost = 1.02;
        i.b.vx = Math.abs(i.b.vx) * boost;
        const hitOffset = (i.b.y - (i.p+i.paddleH/2)) / (i.paddleH/2);
        i.b.vy += hitOffset * 40;
        i.paddleFlash = 0.06;

        const pressDelta = performance.now() - i.curvePressAt;
        if (pressDelta <= 140 && i.curveCd <= 0) {
          i.b.vy += rand(-170,170);
          i.curveCd = 8;
          addScore(20);
        } else {
          addScore(10);
        }

        i.floats.push({x:i.b.x+14, y:i.b.y-8, text:'+10', t:0.8});

        if (i.returns % 10 === 0) {
          i.spikeWarn = 1;
          i.pendingSpike = true;
        }
      }

      if (i.power && Math.hypot(i.b.x - i.power.x, i.b.y - i.power.y) < 16) {
        if (i.power.type === 'slow') i.slowUntil = 3;
        if (i.power.type === 'wide') { i.wideUntil = 5; i.paddleH = 150; }
        SoundManager?.powerUp?.();
        i.power = null;
      }

      i.floats.forEach(f => { f.y -= 45*dt; f.t -= dt; });
      i.floats = i.floats.filter(f => f.t > 0);

      if(i.b.x<0){
        i.lives--; breakCombo(); SoundManager?.loseLife?.();
        if(i.lives<=0) return endGame('Loop Broken');
        const vy = clamp((Math.random()-0.5)*4, -3, 3) * 60;
        i.b={x:480,y:270,vx:-240,vy};
        i.trail=[];
      }

      i.wallVibe = Math.max(0, i.wallVibe - dt);
    },
    draw(){
      const i=st.info;
      const g = ctx.createLinearGradient(0,0,960,0);
      g.addColorStop(0,'#05080f');
      g.addColorStop(1,'#000000');
      ctx.fillStyle=g; ctx.fillRect(0,0,960,540);
      ctx.strokeStyle='rgba(0,245,255,.25)'; ctx.strokeRect(20,20,920,500);
      ctx.setLineDash([10,8]);
      ctx.strokeStyle='rgba(255,255,255,.3)';
      ctx.beginPath(); ctx.moveTo(480,20); ctx.lineTo(480,520); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle='#1a1a3a'; ctx.fillRect(20,2,920,2); ctx.fillRect(20,536,920,2);

      const vibe = Math.sin(performance.now()*0.05) * 3 * (i.wallVibe > 0 ? 1 : 0);
      ctx.fillStyle = i.wallFlash > 0 ? 'rgba(255,255,255,.9)' : 'rgba(255,45,120,.6)';
      ctx.fillRect(957 + vibe, 20, 4, 500);

      ctx.shadowBlur=20; ctx.shadowColor='#00f5ff';
      ctx.fillStyle = i.paddleFlash > 0 ? '#fff' : '#00f5ff';
      ctx.fillRect(20,i.p,12,i.paddleH);
      ctx.shadowBlur=0;

      const speedFactor = clamp((Math.abs(i.b.vx)-240)/300,0,1);
      const red = 255;
      const gb = Math.floor(255 - (255-60)*speedFactor);
      const ballColor = `rgb(${red},${gb},${gb})`;
      const op=[0.6,0.45,0.3,0.15,0.05];
      i.trail.forEach((t,idx)=>{ ctx.fillStyle=`rgba(255,255,255,${op[idx]||0.04})`; ctx.beginPath(); ctx.arc(t.x,t.y,Math.max(3,10-idx),0,Math.PI*2); ctx.fill(); });
      ctx.fillStyle=ballColor; ctx.shadowColor='#ff2d78'; ctx.shadowBlur=15; ctx.beginPath(); ctx.arc(i.b.x,i.b.y,10,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;

      if (i.power) {
        const py = i.power.y + Math.sin(i.power.bob*5)*5;
        if (i.power.type === 'slow') {
          ctx.strokeStyle='#00f5ff'; ctx.lineWidth=2;
          ctx.beginPath(); ctx.arc(i.power.x, py, 8, 0, Math.PI*2); ctx.stroke();
          for(let a=0;a<6;a++){ const ang=a*Math.PI/3; ctx.beginPath(); ctx.moveTo(i.power.x+Math.cos(ang)*4,py+Math.sin(ang)*4); ctx.lineTo(i.power.x+Math.cos(ang)*12,py+Math.sin(ang)*12); ctx.stroke(); }
        } else {
          ctx.fillStyle='#39ff14'; ctx.fillRect(i.power.x-12,py-4,24,8);
        }
      }

      i.floats.forEach(f => drawNeonText(f.text, f.x, f.y, '#ff2d78'));
      const drawHeart = (x,y,s=1)=>{
        ctx.fillStyle='#ff3c3c';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x-6*s,y-8*s,x-16*s,y+4*s,x,y+16*s);
        ctx.bezierCurveTo(x+16*s,y+4*s,x+6*s,y-8*s,x,y);
        ctx.fill();
      };
      for(let h=0; h<i.lives; h++) drawHeart(940 - h*18, 26, 0.8);
      drawNeonText(`RETURNS ${i.returns}`, 40, 40, '#00f5ff');
      if (i.spikeUntil > 0) drawNeonText('SPEED SPIKE!', 380, 40, '#ff3c3c');
      if (i.spikeWarn > 0) {
        ctx.fillStyle='rgba(255,60,60,.12)'; ctx.fillRect(0,0,960,540);
        drawNeonText('SPEED SPIKE INCOMING!', 280, 270, '#ff3c3c');
      }
      if (i.curveCd > 0) drawNeonText(`CURVE CD ${i.curveCd.toFixed(1)}s`, 40, 72, '#ffb300');
      if (i.curveCd <= 0) drawNeonText('CURVE READY', 40, 72, '#ffffff');
    }
  };

  MODE.bubbleshooter = {
    setup(){
      canvas.classList.add('hidden'); domArea.classList.remove('hidden');
      const colors=['#00f5ff','#ff2d78','#b8ff00','#ffb300','#9c6bff'];
      const rows=8, cols=8;
      const makeNormal = () => ({ kind:'normal', color:colors[Math.floor(Math.random()*colors.length)] });
      const grid=[...Array(rows)].map(()=>[...Array(cols)].map(()=>makeNormal()));
      let chain=[];
      let comboWindow = 0;
      domArea.innerHTML = `<div id='orbGrid' style='display:grid;grid-template-columns:repeat(8,1fr);gap:6px;max-width:560px;margin:16px auto;'></div><p class='muted'>Click adjacent same-color orbs, press ENTER (or click selected orb again) to pop chain (3+). Z undo · R reset (-20)</p>`;
      const g=domArea.querySelector('#orbGrid');
      function adj(a,b){ return Math.abs(a.r-b.r)+Math.abs(a.c-b.c)===1; }
      function inBounds(r,c){ return r>=0 && c>=0 && r<rows && c<cols; }

      function draw(){
        g.innerHTML='';
        for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
          const v=grid[r][c]; const d=document.createElement('button');
          d.style.cssText='height:52px;border-radius:50%;border:0;cursor:pointer;box-shadow:0 0 12px rgba(255,255,255,.2) inset';
          if (v.kind === 'normal') d.style.background=v.color;
          if (v.kind === 'rainbow') { d.style.background='conic-gradient(#00f5ff,#ff2d78,#b8ff00,#ffb300,#00f5ff)'; d.textContent='★'; }
          if (v.kind === 'bomb') { d.style.background='#ff3c3c'; d.textContent='💣'; }
          if (v.kind === 'star') { d.style.background='#ffe36f'; d.textContent='✦'; }
          if(chain.some(x=>x.r===r&&x.c===c)) d.style.outline='3px solid #fff';
          d.onclick=()=>{
            if(!v) return;
            const last=chain[chain.length-1];
            if (chain.some(x => x.r===r && x.c===c)) {
              pop();
              return;
            }
            const canLinkByColor = chain.length===0 || (
              adj(last,{r,c}) && (
                v.kind !== 'normal' || grid[last.r][last.c].kind !== 'normal' || v.color === grid[last.r][last.c].color
              )
            );
            if(canLinkByColor) chain.push({r,c});
            draw();
          };
          g.appendChild(d);
        }
      }

      function scoreForLen(n){
        if (n <= 2) return 0;
        if (n === 3) return 30;
        if (n === 4) return 50;
        if (n === 5) return 75;
        if (n === 6) return 110;
        return 150 + (n-7) * 50;
      }

      function maybeSpawnSpecial(){
        if (st.score < 500 || st.score % 500 > 180) return;
        const emptyish = [];
        for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) if (grid[r][c]?.kind === 'normal') emptyish.push([r,c]);
        if (!emptyish.length) return;
        const [r,c] = emptyish[Math.floor(rand(0, emptyish.length))];
        const roll = Math.random();
        grid[r][c] = roll < 0.34 ? {kind:'rainbow'} : roll < 0.67 ? {kind:'bomb'} : {kind:'star'};
      }

      function pop(){
        if(chain.length<3){ breakCombo(); chain=[]; return draw(); }

        const remove = new Set(chain.map(({r,c}) => `${r},${c}`));
        for (const {r,c} of chain) {
          const cell = grid[r][c];
          if (!cell) continue;
          if (cell.kind === 'bomb') {
            for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) {
              const nr=r+dr,nc=c+dc;
              if (inBounds(nr,nc)) remove.add(`${nr},${nc}`);
            }
          }
          if (cell.kind === 'star') {
            for (let cc=0;cc<cols;cc++) remove.add(`${r},${cc}`);
          }
          if (cell.kind === 'rainbow') {
            const base = chain.find(x => !(grid[x.r][x.c]?.kind && grid[x.r][x.c].kind !== 'normal'));
            const baseColor = base ? grid[base.r][base.c]?.color : null;
            if (baseColor) {
              [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dr,dc]) => {
                const nr=r+dr,nc=c+dc;
                if (inBounds(nr,nc) && grid[nr][nc]?.color === baseColor) remove.add(`${nr},${nc}`);
              });
            }
          }
        }

        remove.forEach(key => {
          const [r,c] = key.split(',').map(Number);
          grid[r][c]=null;
        });

        for(let c=0;c<cols;c++){
          const col=[]; for(let r=rows-1;r>=0;r--) if(grid[r][c]) col.push(grid[r][c]);
          for(let r=rows-1;r>=0;r--) grid[r][c]=col[rows-1-r]||makeNormal();
        }

        const base = scoreForLen(chain.length);
        const comboMul = comboWindow > 0 ? 2 : 1;
        addScore(base * comboMul);
        comboWindow = 2;
        maybeSpawnSpecial();
        chain=[]; draw();
      }

      st.info = {
        keyHandler:(e)=>{ if(e.key==='Enter') pop(); if(e.key.toLowerCase()==='z'){ chain.pop(); draw(); } if(e.key.toLowerCase()==='r'){ setScore(st.score-20); chain=[]; draw(); } },
        updateLocal:(dt)=>{ comboWindow = Math.max(0, comboWindow - dt); }
      };
      draw();
    },
    update(dt){ st.info?.updateLocal?.(dt); }, draw(){}
  };

  MODE.carracing = {
    setup(){
      st.info={
        x:460,y:470,v:220,baseV:220,obs:[],spawn:0,spin:0,
        lap:1,lapDist:0,totalDist:0,drifting:false,driftScore:0,offtrackCd:0,
        boostPads:[{x:250,y:210,cool:0},{x:710,y:340,cool:0}],
        boostUntil:0,
        rivals:[{x:280,y:100,v:120}],
      };
    },
    update(dt){
      const i=st.info;

      if(keys.has('arrowup')||keys.has('w')) i.v = clamp(i.v+520*dt,120,520);
      else i.v = clamp(i.v-320*dt,120,460);

      i.boostUntil = Math.max(0, i.boostUntil - dt);
      const speedMul = i.boostUntil > 0 ? 1.7 : 1;

      i.drifting = keys.has(' ');
      if(i.spin<=0){
        if(keys.has('arrowleft')||keys.has('a')) i.x-=300*dt;
        if(keys.has('arrowright')||keys.has('d')) i.x+=300*dt;
      }

      const onTrack = i.x >= 140 && i.x <= 820;
      if (!onTrack && i.offtrackCd <= 0) {
        setScore(st.score - 50);
        breakCombo();
        i.offtrackCd = 0.5;
      }
      i.offtrackCd = Math.max(0, i.offtrackCd - dt);
      i.x=clamp(i.x,110,850);

      i.spawn-=dt;
      if(i.spawn<=0){
        i.spawn=Math.max(0.3,1.1-st.level*0.08);
        const typesByLap = i.lap === 1 ? ['debris'] : i.lap === 2 ? ['debris','oil'] : ['debris','oil','ghost'];
        const t = typesByLap[Math.floor(rand(0,typesByLap.length))];
        i.obs.push({x:rand(150,810),y:-40,t});
      }

      i.obs.forEach(o=>o.y += i.v*dt*0.6*speedMul + 120);
      i.obs = i.obs.filter(o=>o.y<600);

      i.rivals.forEach(r => {
        r.y += (r.v + i.lap*18) * dt;
        if (r.y > 620) { r.y = -40; r.x = rand(170,790); }
        if(Math.abs(r.x-i.x)<34 && Math.abs(r.y-i.y)<44){ i.spin=0.5; SoundManager?.loseLife?.(); }
      });

      for(const o of i.obs){
        if(Math.abs(o.x-i.x)<34 && Math.abs(o.y-i.y)<44){
          if(o.t==='oil' || o.t==='ghost'){ i.spin=0.5; }
          setScore(st.score-50); breakCombo(); SoundManager?.loseLife?.();
        }
      }

      i.boostPads.forEach(p => {
        p.cool = Math.max(0, p.cool - dt);
        if (p.cool <= 0 && Math.abs(p.x-i.x)<28 && Math.abs(p.y-i.y)<34) {
          i.boostUntil = 2;
          p.cool = 5;
          SoundManager?.powerUp?.();
        }
      });

      if (i.drifting && onTrack && (keys.has('arrowleft') || keys.has('arrowright') || keys.has('a') || keys.has('d'))) {
        i.driftScore += dt * 90;
      } else if (i.driftScore > 0) {
        addScore(Math.floor(i.driftScore));
        i.driftScore = 0;
      }

      i.spin=Math.max(0,i.spin-dt);

      i.lapDist += i.v*dt*speedMul;
      i.totalDist += i.v*dt*speedMul;
      if (i.lapDist >= 2400) {
        i.lap += 1;
        i.lapDist = 0;
        if (i.lap <= 3) {
          levelUp();
          i.rivals.push({x:rand(170,790),y:rand(-200,-40),v:120 + i.lap*15});
        } else {
          addScore(Math.max(200, Math.floor(1800 - st.t * 40)));
          return endGame('Run Complete');
        }
      }

      addScore(1 + Math.floor(i.v/220));
    },
    draw(){
      const i=st.info;
      ctx.fillStyle='#111'; ctx.fillRect(0,0,960,540);
      ctx.fillStyle='#2a2a2a'; ctx.fillRect(120,0,720,540);
      ctx.strokeStyle='rgba(255,255,255,.4)'; ctx.setLineDash([18,18]);
      for(let x=240;x<840;x+=120){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,540);ctx.stroke();}
      ctx.setLineDash([]);

      i.boostPads.forEach(p => {
        ctx.fillStyle = p.cool > 0 ? 'rgba(255,180,0,.25)' : '#ffd84a';
        ctx.fillRect(p.x-26,p.y-10,52,20);
        ctx.fillStyle = p.cool > 0 ? 'rgba(255,255,255,.3)' : '#111';
        ctx.fillText('>>', p.x-12, p.y+6);
      });

      i.rivals.forEach(r => {
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = '#b9c9ff';
        ctx.fillRect(r.x-20,r.y-36,40,72);
        ctx.globalAlpha = 1;
      });

      i.obs.forEach(o=>{
        if(o.t==='oil'){ ctx.fillStyle='#7d2cff'; ctx.fillRect(o.x-18,o.y-18,36,36); }
        else if (o.t==='ghost'){ ctx.globalAlpha=0.55; ctx.fillStyle='#d9e7ff'; ctx.fillRect(o.x-18,o.y-18,36,36); ctx.globalAlpha=1; }
        else { ctx.fillStyle='#777'; ctx.fillRect(o.x-18,o.y-18,36,36); }
      });

      ctx.save(); ctx.translate(i.x,i.y); if(i.spin>0) ctx.rotate(Math.sin(performance.now()/50)*0.4);
      ctx.fillStyle=i.drifting?'#00f5ff':'#ff2d78'; ctx.fillRect(-20,-36,40,72); ctx.restore();

      drawNeonText(`LAP ${Math.min(i.lap,3)}/3`, 40, 40, '#00f5ff');
      drawNeonText(`DRIFT ${Math.floor(i.driftScore)}`, 40, 74, '#ffb300');
      if (! (i.x >= 140 && i.x <= 820)) drawNeonText('OFF TRACK -50', 700, 40, '#ff3c3c');
    }
  };

  MODE.puzzle = {
    setup(){
      canvas.classList.add('hidden'); domArea.classList.remove('hidden');
      const n=4; let grid = Array.from({length:n},()=>Array(n).fill(0));
      let history=[];
      function spawn(){ const empty=[]; for(let r=0;r<n;r++)for(let c=0;c<n;c++) if(!grid[r][c]) empty.push([r,c]); if(!empty.length) return; const [r,c]=empty[Math.floor(Math.random()*empty.length)]; grid[r][c]=Math.random()<0.8?1:2; }
      function draw(){
        domArea.innerHTML = `<div id='forge' style='display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:520px;margin:16px auto'></div><p class='muted'>Arrow keys slide · Z undo (x3) · R restart</p>`;
        const f=domArea.querySelector('#forge');
        for(let r=0;r<n;r++) for(let c=0;c<n;c++){
          const v=grid[r][c]; const d=document.createElement('div');
          d.style.cssText='height:92px;border-radius:10px;display:grid;place-items:center;font:700 34px Bebas Neue;background:#1a1a2a;color:#fff';
          d.textContent=v?String(v):''; if(v>=8) d.style.background='#ff3c3c'; else if(v>=4) d.style.background='#ffb300'; else if(v>=2) d.style.background='#00f5ff';
          f.appendChild(d);
        }
      }
      function move(dir){
        history.push(grid.map(r=>r.slice())); if(history.length>3) history.shift();
        let merged=0;
        const lines=[];
        if(dir==='left'||dir==='right') for(let r=0;r<n;r++) lines.push(grid[r]);
        else for(let c=0;c<n;c++) lines.push([grid[0][c],grid[1][c],grid[2][c],grid[3][c]]);
        const rev = dir==='right'||dir==='down';
        const mapped = lines.map(line=>{
          let a=(rev?line.slice().reverse():line).filter(Boolean);
          for(let i=0;i<a.length-1;i++) if(a[i]===a[i+1]){ a[i]+=a[i+1]; merged++; addScore(a[i]); a.splice(i+1,1);} 
          while(a.length<n) a.push(0);
          if(rev) a.reverse();
          return a;
        });
        if(dir==='left'||dir==='right'){ for(let r=0;r<n;r++) grid[r]=mapped[r]; }
        else { for(let c=0;c<n;c++) for(let r=0;r<n;r++) grid[r][c]=mapped[c][r]; }
        if(merged>=3) addScore(50);
        spawn(); draw();
      }
      st.info = { keyHandler:(e)=>{
        const k=e.key.toLowerCase();
        if(k==='arrowleft') move('left'); if(k==='arrowright') move('right'); if(k==='arrowup') move('up'); if(k==='arrowdown') move('down');
        if(k==='z'&&history.length){ grid=history.pop(); draw(); }
        if(k==='r'){ grid=Array.from({length:n},()=>Array(n).fill(0)); spawn(); spawn(); setScore(0); draw(); }
      }};
      spawn(); spawn(); draw();
    }, update(){}, draw(){}
  };

  MODE.keyfrenzy = {
    setup(){ st.info={target:'A',timer:1.2,skip:3,count:0}; pick(); function pick(){ st.info.target='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(rand(0,36))]; st.info.timer=Math.max(0.4,1.2-st.level*0.04);} st.info.pick=pick; },
    update(dt){ st.info.timer-=dt; if(st.info.timer<=0){ breakCombo(); if(++st.info.count>=60) return endGame('Missed!'); st.info.pick(); } },
    draw(){
      ctx.fillStyle='#08080c'; ctx.fillRect(0,0,960,540);
      ctx.fillStyle='rgba(255,45,120,.2)'; ctx.fillRect(80,80,800,380);
      ctx.fillStyle='#fff'; ctx.font='bold 220px Orbitron'; ctx.textAlign='center'; ctx.fillText(st.info.target,480,350);
      drawNeonText(`SKIP: ${st.info.skip}`,40,40,'#ffb300');
      ctx.fillStyle='#00f5ff'; ctx.fillRect(280,440,400*(st.info.timer/1.2),14);
      ctx.textAlign='left';
    }
  };

  MODE.dino = {
    setup(){ st.info={y:430,vy:0,duck:false,dash:0,dashCd:0,obs:[],spawn:0,lives:2,speed:220}; },
    update(dt){
      const i=st.info;
      if((keys.has(' ')||keys.has('arrowup')) && i.y>=430) i.vy=-520;
      i.duck = keys.has('arrowdown');
      if((keys.has('x')||keys.has('d'))&&i.dashCd<=0){ i.dash=0.3; i.dashCd=6; }
      i.dash=Math.max(0,i.dash-dt); i.dashCd=Math.max(0,i.dashCd-dt);
      i.vy += 1200*dt; i.y = Math.min(430, i.y + i.vy*dt); if(i.y>=430) i.vy=0;
      i.spawn-=dt; if(i.spawn<=0){ i.spawn=Math.max(0.45,1.2-st.level*0.08); i.obs.push({x:980,w:30+rand(0,25),h:30+rand(0,40)}); }
      i.speed *= 1 + dt*0.005;
      i.obs.forEach(o=>o.x -= (i.speed + (i.dash>0?280:0))*dt);
      i.obs=i.obs.filter(o=>o.x>-100);
      for(const o of i.obs){
        const ph = i.duck?34:64;
        if(o.x<130 && o.x+o.w>80 && 460-o.h < i.y+ph){
          i.lives--; i.obs=[]; breakCombo();
          if(i.lives<=0) return endGame('Out of Oxygen');
        }
      }
      addScore(1);
    },
    draw(){
      const i=st.info; ctx.fillStyle='#05060f'; ctx.fillRect(0,0,960,540);
      ctx.fillStyle='#1a2550'; for(let s=0;s<120;s++){ctx.fillRect((s*79 + st.t*60)%960, rand(0,350),2,2)}
      ctx.fillStyle='#00f5ff'; ctx.fillRect(0,470,960,8);
      ctx.fillStyle=i.dash>0?'#00f5ff':'#b8ff00'; ctx.fillRect(80,i.y,42,i.duck?34:64);
      ctx.fillStyle='#ffb300'; i.obs.forEach(o=>ctx.fillRect(o.x,460-o.h,o.w,o.h));
      drawNeonText('Lives: '+i.lives, 800, 40, '#ff3c3c');
    }
  };

  MODE.wordguesser = {
    setup(){
      canvas.classList.add('hidden'); domArea.classList.remove('hidden');
      const words=['GLITCH','NEON','DRIVE','STACK','QUEST','BLINK','RALLY','FORGE'];
      const target=words[Math.floor(rand(0,words.length))];
      let guesses=[]; let cur=''; let streak=0;
      domArea.innerHTML=`<div id='board' style='display:grid;grid-template-rows:repeat(6,1fr);gap:8px;max-width:520px;margin:8px auto'></div><p class='muted'>Guess the 5-letter word. ENTER submit.</p>`;
      const board=domArea.querySelector('#board');
      function draw(){
        board.innerHTML='';
        for(let r=0;r<6;r++){
          const row=document.createElement('div'); row.style.cssText='display:grid;grid-template-columns:repeat(5,1fr);gap:6px';
          const g=guesses[r] || (r===guesses.length?cur:'');
          for(let c=0;c<5;c++){
            const ch=g[c]||''; const d=document.createElement('div');
            d.style.cssText='height:62px;border:1px solid rgba(255,255,255,.2);display:grid;place-items:center;font:700 28px Orbitron;background:#0d2218';
            if(guesses[r]){
              if(ch===target[c]) d.style.background='#39ff14';
              else if(target.includes(ch)) d.style.background='#ffb300'; else d.style.background='#444';
            }
            d.textContent=ch; row.appendChild(d);
          }
          board.appendChild(row);
        }
      }
      function submit(){
        if(cur.length!==5) return;
        guesses.push(cur);
        if(cur===target){ addScore(500 - (guesses.length-1)*80 + Math.max(0,Math.floor((90-st.t)*3))); return endGame('Round Clear'); }
        cur=''; breakCombo();
        if(guesses.length>=6) endGame('No Attempts');
        draw();
      }
      st.info={ keyHandler:(e)=>{
        const k=e.key.toUpperCase();
        if(/^[A-Z]$/.test(k)&&cur.length<5) cur+=k;
        if(e.key==='Backspace') cur=cur.slice(0,-1);
        if(e.key==='Enter') submit();
        draw();
      }};
      draw();
    }, update(){}, draw(){}
  };

  MODE.reactiontime = {
    setup(){ st.info={target:null,round:0,max:15,next:1,avg:0,sum:0,best:9999}; },
    update(dt){ const i=st.info; i.next-=dt; if(i.next<=0 && !i.target){ const type=Math.random()<0.2?'red':['white','green','blue'][Math.floor(rand(0,3))]; i.target={x:rand(80,880),y:rand(80,460),r:24,color:type,t:0}; }
      if(i.target) i.target.t += dt; },
    draw(){ const i=st.info; ctx.fillStyle='#070711'; ctx.fillRect(0,0,960,540); if(i.target){ const map={white:'#fff',green:'#39ff14',blue:'#00f5ff',red:'#ff3c3c'}; ctx.fillStyle=map[i.target.color]; ctx.beginPath(); ctx.arc(i.target.x,i.target.y,i.target.r,0,Math.PI*2); ctx.fill(); }
      drawNeonText(`Round ${i.round}/${i.max}`,40,40,'#b8ff00'); drawNeonText(`Best ${i.best===9999?'—':i.best+'ms'}`,40,72,'#00f5ff'); }
  };

  MODE.haunted = {
    setup(){
      canvas.classList.add('hidden'); domArea.classList.remove('hidden');
      let lives=3; let cur={a:0,b:0,op:'+'}; let options=[];
      domArea.innerHTML=`<h2 style='font-family:Orbitron;margin-bottom:8px'>Equation: <span id='eq'></span></h2><div id='opts' style='display:grid;grid-template-columns:repeat(3,1fr);gap:8px'></div><p class='muted'>Choose the correct answer before lives reach zero.</p>`;
      const eq=domArea.querySelector('#eq'), opts=domArea.querySelector('#opts');
      const make=()=>{ const ops=['+','-','×']; cur={a:Math.floor(rand(2,22)),b:Math.floor(rand(2,15)),op:ops[Math.floor(rand(0,ops.length))]}; const ans=cur.op==='+'?cur.a+cur.b:cur.op==='-'?cur.a-cur.b:cur.a*cur.b; options=[ans, ans+Math.floor(rand(1,7)), ans-Math.floor(rand(1,6))].sort(()=>Math.random()-0.5); eq.textContent=`${cur.a} ${cur.op} ${cur.b} = ? · Lives ${lives}`; opts.innerHTML=''; options.forEach(v=>{ const b=document.createElement('button'); b.textContent=v; b.onclick=()=>pick(v); opts.appendChild(b);}); st.info.answer=String(ans); };
      const pick=(v)=>{ const ans=Number(st.info.answer); if(v===ans){ addScore(st.level%10===0?30:10); } else { lives--; breakCombo(); if(lives<=0) return endGame('Haunted Out'); } make(); };
      st.info={ answer:'', keyHandler:(e)=>{ if(/^[0-9]$/.test(e.key)){ const n=Number(e.key); if(options.includes(n)) pick(n);} } };
      make();
    }, update(){}, draw(){}
  };

  MODE.wordle = {
    setup(){
      canvas.classList.add('hidden'); domArea.classList.remove('hidden');
      const words=['CODE','GRID','LIME','NEON','STACK','PULSE','GHOST','DODGE'];
      const hidden=[...words].sort(()=>Math.random()-0.5).slice(0,6);
      let found=[]; let cur=''; let hints=3;
      domArea.innerHTML=`<p>Find words (${hidden.length}). Type word and press ENTER.</p><p class='muted'>H for hint (-50)</p><div id='found'></div><div id='cur' style='font:700 30px Bebas Neue;margin-top:10px'></div>`;
      const foundEl=domArea.querySelector('#found'), curEl=domArea.querySelector('#cur');
      const draw=()=>{foundEl.innerHTML='Found: '+found.join(', '); curEl.textContent=cur; if(found.length===hidden.length){ addScore(500); endGame('Grid Cleared'); }};
      st.info={keyHandler:(e)=>{const k=e.key.toUpperCase(); if(/^[A-Z]$/.test(k)&&cur.length<8) cur+=k; if(e.key==='Backspace') cur=cur.slice(0,-1); if(e.key==='Enter'){ if(hidden.includes(cur)&&!found.includes(cur)){ found.push(cur); addScore(cur.length>=6?120:cur.length>=5?80:50);} else breakCombo(); cur=''; } if(k==='H'&&hints>0){ hints--; setScore(st.score-50); const rem=hidden.find(w=>!found.includes(w)); if(rem) cur=rem[0]; } draw();}};
      draw();
    }, update(){}, draw(){}
  };

  MODE.pixeldodge = {
    setup(){ st.info={x:480,y:270,p:[],spawn:0,frame:0,shieldUntil:0,shieldSpawn:32,exits:0,exitMilestone:0}; },
    update(dt){
      const i=st.info;
      let dx=0,dy=0;
      if(keys.has('arrowup')||keys.has('w')) dy-=1;
      if(keys.has('arrowdown')||keys.has('s')) dy+=1;
      if(keys.has('arrowleft')||keys.has('a')) dx-=1;
      if(keys.has('arrowright')||keys.has('d')) dx+=1;
      if(dx&&dy){dx*=0.707;dy*=0.707;}
      const sp=250;
      i.x=clamp(i.x+dx*sp*dt,8,952); i.y=clamp(i.y+dy*sp*dt,8,532);

      i.shieldUntil=Math.max(0,i.shieldUntil-dt);
      i.shieldSpawn-=dt;
      if(i.shieldSpawn<=0){ i.shieldSpawn=32; i.shieldUntil=3; }

      i.spawn-=dt;
      if(i.spawn<=0){
        i.spawn=Math.max(0.14,0.7-st.level*0.018);
        const typeRoll=Math.random();
        if(typeRoll<0.4){
          const side=Math.floor(rand(0,4)); let x=0,y=0,vx=0,vy=0;
          if(side===0){x=rand(0,960);y=-10;vy=200;}
          if(side===1){x=970;y=rand(0,540);vx=-200;}
          if(side===2){x=rand(0,960);y=550;vy=-200;}
          if(side===3){x=-10;y=rand(0,540);vx=200;}
          i.p.push({x,y,vx,vy,t:'red',c:'#ff3c3c'});
        } else if (typeRoll<0.7) {
          const side=Math.floor(rand(0,4)); const base=side===0?Math.PI/2:side===1?Math.PI:side===2?-Math.PI/2:0;
          [-0.26,0,0.26].forEach(a=>{
            const ang=base+a; const spd=210;
            const sx = side===1?970:side===3?-10:rand(100,860);
            const sy = side===0?-10:side===2?550:rand(90,450);
            i.p.push({x:sx,y:sy,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,t:'yellow',c:'#ffcc33'});
          });
        } else if (typeRoll<0.88) {
          const side=Math.floor(rand(0,4));
          const x = side===1?970:side===3?-10:rand(100,860);
          const y = side===0?-10:side===2?550:rand(90,450);
          i.p.push({x,y,vx:0,vy:0,t:'cyan',c:'#00f5ff',homing:3});
        } else {
          const cx=rand(200,760),cy=rand(130,410);
          for(let n=0;n<8;n++){ const ang=n*Math.PI/4; i.p.push({x:cx,y:cy,vx:Math.cos(ang)*170,vy:Math.sin(ang)*170,t:'white',c:'#fff'}); }
        }
      }

      i.p.forEach(o=>{
        if(o.t==='cyan'&&o.homing>0){
          o.homing-=dt;
          const tx=i.x-o.x, ty=i.y-o.y; const d=Math.hypot(tx,ty)||1;
          o.vx += (tx/d)*90*dt; o.vy += (ty/d)*90*dt;
        }
        o.x+=o.vx*dt*(1+st.level*0.06); o.y+=o.vy*dt*(1+st.level*0.06);
      });
      i.p=i.p.filter(o=>{
        const out=o.x<-30||o.x>990||o.y<-30||o.y>570;
        if(out) i.exits++;
        return !out;
      });

      if(i.shieldUntil<=0 && i.p.some(o=>Math.hypot(o.x-i.x,o.y-i.y)<11)) return endGame('Pixel Down');

      i.frame++;
      if(i.frame%12===0) addScore(1);
      const milestones = Math.floor(i.exits / 10);
      if (milestones > i.exitMilestone) {
        addScore((milestones - i.exitMilestone) * 10);
        i.exitMilestone = milestones;
      }
    },
    draw(){
      const i=st.info;
      ctx.fillStyle='#050810'; ctx.fillRect(0,0,960,540);
      ctx.fillStyle='rgba(0,245,255,.25)'; for(let s=0;s<70;s++){ctx.fillRect((s*59 + st.t*80)%960, (s*37)%540, 2,2);} 
      i.p.forEach(o=>{ctx.fillStyle=o.c;ctx.fillRect(o.x-3,o.y-3,6,6)});
      ctx.fillStyle='#fff'; ctx.fillRect(i.x-8,i.y-8,16,16);
      ctx.fillStyle='#0b1a2d'; ctx.fillRect(i.x-2,i.y-2,4,4);
      if(i.shieldUntil>0){ ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.beginPath(); ctx.arc(i.x,i.y,12+Math.sin(st.t*14)*2,0,Math.PI*2); ctx.stroke(); }
    }
  };

  MODE.dodgeblitz = {
    setup(){ st.info={x:480,y:270,enemies:[],spawn:0,time:0,passed:0,waveTimer:20,wavePause:0,secTick:0,passMilestone:0}; },
    update(dt){
      const i=st.info;
      i.time += dt;
      i.waveTimer -= dt;
      if (i.waveTimer <= 0) { i.wavePause = 1; i.waveTimer = 18; addScore(25); }
      i.wavePause = Math.max(0, i.wavePause - dt);

      const sp = 260;
      let dx = 0, dy = 0;
      if(keys.has('arrowup')||keys.has('w')) dy -= 1;
      if(keys.has('arrowdown')||keys.has('s')) dy += 1;
      if(keys.has('arrowleft')||keys.has('a')) dx -= 1;
      if(keys.has('arrowright')||keys.has('d')) dx += 1;
      if (dx && dy) { dx *= 0.707; dy *= 0.707; }
      i.x = clamp(i.x + dx * sp * dt, 10, 950);
      i.y = clamp(i.y + dy * sp * dt, 10, 530);

      if (i.wavePause <= 0) {
        i.spawn -= dt;
        if (i.spawn <= 0) {
          i.spawn = Math.max(0.35, 0.95 - i.time * 0.006);
          const edge = Math.floor(rand(0,4));
          let x=0,y=0,vx=0,vy=0;
          const speed = 120 + i.time * 3.2;
          if(edge===0){x=rand(0,960);y=-10;vx=0;vy=speed;}
          if(edge===1){x=970;y=rand(0,540);vx=-speed;vy=0;}
          if(edge===2){x=rand(0,960);y=550;vx=0;vy=-speed;}
          if(edge===3){x=-10;y=rand(0,540);vx=speed;vy=0;}
          i.enemies.push({x,y,vx,vy,c:['#ff2d78','#00f5ff','#b8ff00','#ffb300'][Math.floor(rand(0,4))]});
        }
      }

      i.enemies.forEach(e => { if (i.wavePause <= 0) { e.x += e.vx*dt; e.y += e.vy*dt; } });
      i.enemies = i.enemies.filter(e => {
        const out = e.x<-30||e.x>990||e.y<-30||e.y>570;
        if (out) i.passed++;
        return !out;
      });

      if(i.enemies.some(e=>Math.hypot(e.x-i.x,e.y-i.y)<11)) return endGame(`Survived ${Math.floor(i.time)}s`);
      i.secTick += dt;
      if (i.secTick >= 1) {
        const wholeSecs = Math.floor(i.secTick);
        addScore(wholeSecs);
        i.secTick -= wholeSecs;
      }
      const passMilestones = Math.floor(i.passed / 10);
      if (passMilestones > i.passMilestone) {
        addScore((passMilestones - i.passMilestone) * 5);
        i.passMilestone = passMilestones;
      }
    },
    draw(){
      const i=st.info;
      ctx.fillStyle='#050810'; ctx.fillRect(0,0,960,540);
      ctx.strokeStyle='rgba(0,245,255,.08)';
      for(let r=40;r<520;r+=40){ctx.beginPath();ctx.moveTo(480,r);ctx.lineTo(480+(r-270),r);ctx.stroke();ctx.beginPath();ctx.moveTo(480,r);ctx.lineTo(480-(r-270),r);ctx.stroke();}
      i.enemies.forEach(e=>{ ctx.fillStyle=e.c; ctx.beginPath(); ctx.moveTo(e.x,e.y-7); ctx.lineTo(e.x+7,e.y+7); ctx.lineTo(e.x-7,e.y+7); ctx.closePath(); ctx.fill();});
      ctx.fillStyle='#fff'; ctx.shadowColor='#00f5ff'; ctx.shadowBlur=14; ctx.beginPath(); ctx.arc(i.x,i.y,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      drawNeonText(`TIME ${Math.floor(i.time)}s`, 40, 40, '#00f5ff');
      if (i.wavePause > 0) drawNeonText('WAVE CLEAR', 390, 270, '#b8ff00');
    }
  };

  MODE.stackblitz = {
    setup(){ st.info={stack:[{x:320,y:460,w:320}],phase:0,center:480,w:320,speed:1.4,combo:0,perfectFlash:0}; },
    update(dt){
      const i=st.info;
      i.phase += dt * i.speed;
      i.perfectFlash = Math.max(0, i.perfectFlash - dt);
      const swing = Math.max(85, Math.min(230, i.w*0.9));
      i.x = i.center + Math.sin(i.phase) * swing - i.w/2;
    },
    draw(){
      const i=st.info;
      ctx.fillStyle='#0b1022'; ctx.fillRect(0,0,960,540);
      ctx.fillStyle='rgba(255,255,255,.05)'; for(let y=0;y<540;y+=26){ctx.fillRect(0,y,960,1);} 
      i.stack.forEach((b,idx)=>{
        ctx.fillStyle=`hsl(${(idx*28)%360} 84% 60%)`; ctx.fillRect(b.x,b.y,b.w,24);
        ctx.fillStyle='rgba(255,255,255,.35)'; ctx.fillRect(b.x,b.y,b.w,3);
        ctx.fillStyle='rgba(0,0,0,.2)'; ctx.fillRect(b.x,b.y+21,b.w,3);
      });
      const activeY = 460 - i.stack.length*24;
      ctx.fillStyle = i.perfectFlash>0 ? '#fff' : '#00f5ff';
      ctx.fillRect(i.x, activeY, i.w, 24);
    },
  };

  MODE.memorygrid = {
    setup(){
      canvas.classList.add('hidden'); domArea.classList.remove('hidden');
      let round=1, streak=0, seq=[], selected=[], showing=true, phase='memorize';
      domArea.innerHTML=`<h3 id='mgTitle' style='text-align:center;font-family:Orbitron;margin-top:8px'>MEMORIZE</h3><div id='mg' style='display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:420px;margin:16px auto'></div><p class='muted'>Click highlighted cells in any order.</p>`;
      const mg=domArea.querySelector('#mg'); const title=domArea.querySelector('#mgTitle');
      function sizeForRound(){ return round<3?3:round<6?4:5; }
      function cellsForRound(){ return Math.min(2 + round, 10); }
      function durationForRound(){ return Math.max(0.6, 1.5 - round*0.1); }
      function pickSeq(n,total){ const set=new Set(); while(set.size<n) set.add(Math.floor(rand(0,total))); return [...set]; }
      function draw(correctSet=null, wrongIdx=-1){
        const size=sizeForRound(); const total=size*size;
        mg.style.gridTemplateColumns=`repeat(${size},1fr)`;
        mg.innerHTML='';
        for(let idx=0; idx<total; idx++){
          const b=document.createElement('button');
          b.style.height=size===5?'68px':'86px';
          let bg='#1b1b2b';
          if(showing && seq.includes(idx)) bg='#00f5ff';
          if(correctSet?.has(idx)) bg='#39ff14';
          if(wrongIdx===idx) bg='#ff3c3c';
          b.style.background=bg;
          b.style.border='1px solid rgba(255,255,255,.15)';
          b.style.borderRadius='8px';
          b.onclick=()=>click(idx);
          mg.appendChild(b);
        }
      }
      function startRound(){
        const size=sizeForRound();
        seq=pickSeq(cellsForRound(), size*size);
        selected=[];
        showing=true;
        phase='memorize';
        title.textContent='MEMORIZE';
        draw();
        trackTimeout(()=>{ showing=false; phase='recall'; title.textContent='RECALL'; draw(); }, durationForRound()*1000);
      }
      function click(idx){
        if(phase!=='recall') return;
        if(selected.includes(idx)) return;
        if(!seq.includes(idx)){
          draw(new Set(selected), idx);
          breakCombo();
          streak=0;
          setScore(Math.floor(st.score * 0.85));
          round=Math.max(1, round-1);
          trackTimeout(startRound, 600);
          return;
        }
        selected.push(idx);
        draw(new Set(selected));
        if(selected.length===seq.length){
          streak++;
          const mul = streak>=3 ? 2 : 1;
          addScore(seq.length * round * 15 * mul);
          round++;
          trackTimeout(startRound, 500);
        }
      }
      st.info={ summary:'Memory grid clear' };
      startRound();
    }, update(){}, draw(){}
  };

  MODE.hypertap = {
    setup(){ st.info={time:10,taps:0,bonus:false,ripples:[],shake:0,confetti:[],ended:false,best:CheatLabz.scores.getBest('hypertap')}; },
    update(dt){
      const i=st.info;
      i.time-=dt;
      i.shake=Math.max(0,i.shake-dt);
      i.ripples.forEach(r=>{r.r += 180*dt; r.a -= dt*3.3;});
      i.ripples=i.ripples.filter(r=>r.a>0);
      i.confetti.forEach(c=>{c.x+=c.vx*dt; c.y+=c.vy*dt; c.vy+=260*dt; c.a-=dt*0.8;});
      i.confetti=i.confetti.filter(c=>c.a>0);
      if(i.time<=0 && !i.ended){
        i.ended=true;
        for(let n=0;n<60;n++){ const ang=rand(0,Math.PI*2), sp=rand(120,360); i.confetti.push({x:480,y:270,vx:Math.cos(ang)*sp,vy:Math.sin(ang)*sp,a:1,c:['#00f5ff','#ff2d78','#b8ff00','#ffb300'][Math.floor(rand(0,4))]}); }
        setScore(Math.max(st.score, i.taps * 2));
        const tps=(i.taps/10).toFixed(1);
        const rating=i.taps>80?'⚡ LIGHTNING FINGERS':i.taps<30?'🙄 WARMING UP':'🔥 HOT HANDS';
        st.info.summary=`${i.taps} taps · ${tps} taps/s · PB ${Math.max(i.best,i.taps)} · ${rating}`;
        trackTimeout(()=>endGame('Tap Session End'), 1200);
      }
    },
    draw(){
      const i=st.info;
      const sx = i.shake>0 ? rand(-2,2) : 0;
      const sy = i.shake>0 ? rand(-2,2) : 0;
      ctx.save(); ctx.translate(sx,sy);
      ctx.fillStyle='#090813'; ctx.fillRect(0,0,960,540);
      i.ripples.forEach(r=>{ctx.strokeStyle=`rgba(255,255,255,${r.a})`;ctx.beginPath();ctx.arc(480,270,r.r,0,Math.PI*2);ctx.stroke();});
      i.confetti.forEach(c=>{ctx.fillStyle=`rgba(${c.c==='#00f5ff'?'0,245,255':c.c==='#ff2d78'?'255,45,120':c.c==='#b8ff00'?'184,255,0':'255,179,0'},${c.a})`;ctx.fillRect(c.x,c.y,4,4);});
      ctx.fillStyle='#fff'; ctx.font='bold 210px Bebas Neue'; ctx.textAlign='center'; ctx.fillText(String(i.taps),480,300); ctx.textAlign='left';
      drawNeonText(`Time ${Math.max(0,i.time).toFixed(1)}s`,40,48,'#00f5ff');
      ctx.restore();
    }
  };

  MODE.neonpong = {
    setup(){ st.info={p:230,ai:230,b:{x:480,y:270,vx:-250,vy:130},s:0,aiS:0,round:1,wins:0,aiWins:0,longest:0,rally:0,fastest:0}; },
    update(dt){
      const i=st.info;
      if(keys.has('w')||keys.has('arrowup')) i.p-=320*dt;
      if(keys.has('s')||keys.has('arrowdown')) i.p+=320*dt;
      i.p=clamp(i.p,40,500);

      const aiSpeed=(200 + (i.round-1)*28) * dt;
      if(i.ai + 50 < i.b.y - 8) i.ai += aiSpeed;
      if(i.ai + 50 > i.b.y + 8) i.ai -= aiSpeed;
      i.ai=clamp(i.ai,40,500);

      i.b.x+=i.b.vx*dt; i.b.y+=i.b.vy*dt;
      if(i.b.y<10||i.b.y>530) i.b.vy*=-1;

      if(i.b.x<34&&i.b.y>i.p-50&&i.b.y<i.p+50){
        i.rally++; i.longest=Math.max(i.longest,i.rally);
        const off=(i.b.y-i.p)/50; i.b.vx=Math.abs(i.b.vx)*1.02; i.b.vy += off*40;
        if((keys.has('w')&&i.b.vy<0)||(keys.has('s')&&i.b.vy>0)){ i.b.vy*=1.12; i.b.vx*=1.1; addScore(10); }
      }
      if(i.b.x>926&&i.b.y>i.ai-50&&i.b.y<i.ai+50){
        i.rally++; i.longest=Math.max(i.longest,i.rally);
        const off=(i.b.y-i.ai)/50; i.b.vx=-Math.abs(i.b.vx)*1.02; i.b.vy += off*35;
      }
      i.fastest=Math.max(i.fastest, Math.abs(i.b.vx));
      i.b.vx = clamp(i.b.vx, -520, 520);
      i.b.vy = clamp(i.b.vy, -360, 360);

      if(i.b.x<0){ i.aiS++; i.rally=0; i.b={x:480,y:270,vx:260,vy:rand(-140,140)}; }
      if(i.b.x>960){ i.s++; i.rally=0; i.b={x:480,y:270,vx:-260,vy:rand(-140,140)}; addScore(100); }

      if(i.s>=7 || i.aiS>=7){
        if(i.s>i.aiS) i.wins++; else i.aiWins++;
        if(i.wins>=2 || i.aiWins>=2){
          st.info.summary = `Rounds ${i.wins}-${i.aiWins} · Longest rally ${i.longest} · Fastest ${Math.floor(i.fastest)}`;
          setScore(i.wins>i.aiWins?1200:300);
          return endGame(i.wins>i.aiWins?'YOU WIN':'YOU LOSE');
        }
        i.round++; i.s=0; i.aiS=0; i.b={x:480,y:270,vx:-260,vy:rand(-120,120)};
      }
    },
    draw(){
      const i=st.info;
      ctx.fillStyle='#05050b'; ctx.fillRect(0,0,960,540);
      ctx.strokeStyle='rgba(0,245,255,.25)'; ctx.setLineDash([12,12]); ctx.beginPath(); ctx.moveTo(480,0); ctx.lineTo(480,540); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle='#00f5ff'; ctx.fillRect(18,i.p-50,12,100);
      ctx.fillStyle='#ff2d78'; ctx.fillRect(930,i.ai-50,12,100);
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(i.b.x,i.b.y,10,0,Math.PI*2); ctx.fill();
      ctx.font='bold 52px Bebas Neue'; ctx.fillText(String(i.s),420,60); ctx.fillText(String(i.aiS),520,60);
      drawNeonText(`ROUND ${i.round} · MATCH ${i.wins}-${i.aiWins}`, 330, 30, '#ffb300');
    }
  };

  MODE.gravityflip = {
    setup(){
      st.info={
        yLane:0, rot:0, speed:180, dist:0, obs:[], spawn:0, perfectUntil:0, speedTier:0,
        frag:[], dead:false
      };
    },
    update(dt){
      const i=st.info;
      i.speed *= (1 + dt*0.0025);
      i.dist += i.speed * dt;
      addScore((i.speed*dt)/20);
      const tier = Math.floor(st.t/15);
      if (tier > i.speedTier) { i.speedTier = tier; addScore(100); }
      i.perfectUntil = Math.max(0, i.perfectUntil - dt);

      i.spawn -= dt;
      if (i.spawn <= 0) {
        i.spawn = Math.max(0.45, 1.0 - i.speed/600);
        const kind = ['spike','gap','bar'][Math.floor(rand(0,3))];
        const lane = Math.random() < 0.5 ? 0 : 1;
        i.obs.push({x:980,w:kind==='bar'?26:34,lane,kind,vy:kind==='bar'?rand(-20,20):0});
      }
      i.obs.forEach(o=>{ o.x -= i.speed*dt; if(o.kind==='bar') o.vy += Math.sin(st.t*3)*2; });
      i.obs = i.obs.filter(o=>o.x > -60);

      const py = i.yLane===0 ? 430 : 110;
      const px = 190;
      for (const o of i.obs){
        const oy = o.lane===0 ? 430 : 110;
        if (Math.abs(o.x-px) < 10 && Math.abs(oy-py) < 10) {
          if (o.kind === 'spike' || o.kind === 'bar') return endGame('Gravity Failed');
          if (o.kind === 'gap') return endGame('Fell Into Gap');
        }
        if (Math.abs(o.x-px) < 14 && o.kind !== 'gap') i.perfectUntil = 0.1;
      }
      i.rot = Math.max(0, i.rot - dt*12);
    },
    draw(){
      const i=st.info;
      ctx.fillStyle='#130b22'; ctx.fillRect(0,0,960,540);
      for(let s=0;s<80;s++){ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect((s*53-st.t*40)%960,(s*37)%540,2,2);} 
      ctx.fillStyle='#1e1630'; ctx.fillRect(0,145,960,6); ctx.fillRect(0,385,960,6);
      ctx.strokeStyle='rgba(184,255,0,.6)'; ctx.strokeRect(0,145,960,6); ctx.strokeRect(0,385,960,6);
      i.obs.forEach(o=>{
        const y=o.lane===0?430:110;
        if(o.kind==='spike'){ ctx.fillStyle='#ff2d78'; ctx.beginPath(); ctx.moveTo(o.x,y+8); ctx.lineTo(o.x+10,y-10); ctx.lineTo(o.x+20,y+8); ctx.fill(); }
        if(o.kind==='gap'){ ctx.fillStyle='#060606'; ctx.fillRect(o.x,y-12,o.w,24); ctx.strokeStyle='rgba(255,60,60,.65)'; ctx.strokeRect(o.x,y-12,o.w,24); }
        if(o.kind==='bar'){ ctx.fillStyle='#ffb300'; ctx.fillRect(o.x,y-16+o.vy,18,32); }
      });
      const py = i.yLane===0 ? 430 : 110;
      const px = 190;
      ctx.save(); ctx.translate(px,py); ctx.rotate(i.rot*Math.PI); ctx.fillStyle='#fff'; ctx.fillRect(-8,-8,16,16); ctx.restore();
      if(i.perfectUntil>0) drawNeonText('PERFECT FLIP +25', 360, 60, '#ffb300');
    },
    keyHandler(e){
      const k=e.key.toLowerCase();
      if(k===' '||k==='arrowup'){ const i=st.info; i.yLane=1-i.yLane; i.rot=1; if(i.perfectUntil>0) addScore(25); }
    }
  };

  MODE.chainburst = {
    setup(){
      canvas.classList.add('hidden'); domArea.classList.remove('hidden');
      const colors=['#ff7f6e','#00f5ff','#b87bff','#ffcf53','#ffffff'];
      let grid=Array.from({length:7},()=>Array.from({length:7},()=>Math.floor(rand(0,5))));
      let turns=0, multTurns=0;
      domArea.innerHTML=`<div id='cb' style='display:grid;grid-template-columns:repeat(7,1fr);gap:6px;max-width:460px;margin:12px auto'></div><p class='muted'>Tap any orb. Chains pop adjacent matching colors.</p>`;
      const cb=domArea.querySelector('#cb');
      const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
      function flood(r,c,color,vis){
        const key=`${r},${c}`; if(vis.has(key)||r<0||c<0||r>=7||c>=7||grid[r][c]!==color) return;
        vis.add(key); dirs.forEach(([dr,dc])=>flood(r+dr,c+dc,color,vis));
      }
      function scoreChain(n){
        if(n<=0) return 0;
        if(n===1) return 10;
        if(n===2) return 25;
        if(n===3) return 50;
        if(n===4) return 80;
        return 80 + (n-4)*40;
      }
      function refill(){
        for(let c=0;c<7;c++){
          const col=[];
          for(let r=6;r>=0;r--) if(grid[r][c]!==null) col.push(grid[r][c]);
          while(col.length<7) col.push(Math.floor(rand(0,5)));
          for(let r=6;r>=0;r--) grid[r][c]=col[6-r];
        }
      }
      function draw(){
        cb.innerHTML='';
        let filled=0;
        for(let r=0;r<7;r++) for(let c=0;c<7;c++){
          const v=grid[r][c];
          if(v!==null) filled++;
          const b=document.createElement('button');
          b.style.height='52px'; b.style.borderRadius='10px'; b.style.border='1px solid rgba(255,255,255,.18)';
          b.style.background=v===null?'#090913':colors[v];
          b.onclick=()=>burst(r,c);
          cb.appendChild(b);
        }
        cb.style.boxShadow = filled > 39 ? '0 0 0 2px rgba(255,60,60,.5) inset' : 'none';
      }
      function hasValidChain(){
        for(let r=0;r<7;r++) for(let c=0;c<7;c++) if(grid[r][c]!==null){
          if(r<6&&grid[r+1][c]===grid[r][c]) return true;
          if(c<6&&grid[r][c+1]===grid[r][c]) return true;
        }
        return false;
      }
      function burst(r,c){
        turns++;
        const color=grid[r][c];
        const vis=new Set();
        flood(r,c,color,vis);
        vis.forEach(k=>{ const [rr,cc]=k.split(',').map(Number); grid[rr][cc]=null; });
        let points=scoreChain(vis.size);
        if(multTurns>0){ points*=2; multTurns--; }
        addScore(points);
        if(vis.size>=5) multTurns=3;
        refill();
        for(let t=0;t<3;t++){ const rr=Math.floor(rand(0,7)); const cc=Math.floor(rand(0,7)); grid[rr][cc]=Math.floor(rand(0,5)); }
        draw();
        const full = grid.flat().every(v=>v!==null);
        if(full && !hasValidChain()) endGame('Grid Locked');
      }
      draw();
    }, update(){}, draw(){}
  };

  MODE.reflexrush = {
    setup(){ st.info={map:[{c:'#ff3c3c',k:'j',n:'J'},{c:'#30a0ff',k:'k',n:'K'},{c:'#39ff14',k:'l',n:'L'},{c:'#ffdd33',k:' ',n:'SPACE'},{c:'#ffffff',k:'enter',n:'ENTER'}],sig:null,timer:0,window:1.2,ok:0,strikes:0,streak:0,fireUntil:0,msg:''}; },
    update(dt){
      const i=st.info;
      i.fireUntil=Math.max(0,i.fireUntil-dt);
      i.timer-=dt;
      if(!i.sig || i.timer<=0){
        if(i.sig){ i.strikes++; breakCombo(); if(i.strikes>=3) return endGame('Reflex Overload'); i.msg='MISS'; }
        let next=i.map[Math.floor(rand(0,i.map.length))];
        if(i.sig && next.k===i.sig.k) next=i.map[(i.map.indexOf(next)+1)%i.map.length];
        i.sig=next;
        i.window=Math.max(0.35,1.2-Math.floor(i.ok/5)*0.02);
        i.timer=i.window;
      }
    },
    draw(){
      const i=st.info;
      ctx.fillStyle=i.sig?.c||'#111'; ctx.globalAlpha=.28; ctx.fillRect(0,0,960,540); ctx.globalAlpha=1;
      ctx.fillStyle='#090913'; ctx.fillRect(320,130,320,280);
      ctx.fillStyle='#fff'; ctx.font='bold 110px Bebas Neue'; ctx.textAlign='center'; ctx.fillText(i.sig?.n||'?',480,285);
      const p=i.timer/(i.window||1);
      ctx.strokeStyle='#fff'; ctx.lineWidth=8; ctx.beginPath(); ctx.arc(480,270,130,-Math.PI/2,-Math.PI/2+Math.PI*2*p); ctx.stroke();
      for(let s=0;s<3;s++){ ctx.fillStyle=s<i.strikes?'#ff3c3c':'rgba(255,255,255,.2)'; ctx.fillText('☠',60+s*36,50); }
      if(i.fireUntil>0) drawNeonText('ON FIRE x2', 380, 90, '#ffb300');
      if(i.msg) drawNeonText(i.msg, 430, 460, i.msg==='HIT'?'#39ff14':'#ff3c3c');
    },
    keyHandler(e){
      const i=st.info; if(!i.sig) return;
      const k=e.key.toLowerCase();
      const norm = k===' ' ? ' ' : k;
      if(!['j','k','l',' ','enter'].includes(norm)) return;
      if(norm===i.sig.k){
        const ratio = i.timer / i.window;
        const mult = ratio>0.75?3:ratio>0.5?2:ratio>0.25?1.5:1;
        const fire = i.fireUntil>0 ? 2 : 1;
        addScore(Math.floor(100*mult*fire));
        i.ok++; i.streak++; i.msg='HIT';
        if(i.streak>=10) i.fireUntil=30;
        i.sig=null;
      } else {
        i.strikes++; i.streak=0; i.msg='WRONG'; breakCombo();
        if(i.strikes>=3) endGame('3 Strikes');
      }
    }
  };

  MODE.tilerunner = {
    setup(){
      function makeBoard(trap){
        const b=Array.from({length:4},()=>Array.from({length:6},()=>Math.random()<trap));
        for(let c=0;c<6;c++){ const safe=Math.floor(rand(0,4)); b[safe][c]=false; }
        return b;
      }
      st.info={x:0,y:Math.floor(rand(0,4)),lives:3,run:1,trap:0.3,board:makeBoard(0.3),revealed:new Set(),fails:0};
      st.info.makeBoard=makeBoard;
    },
    update(){
      const i=st.info;
      if(i.x>=5){
        addScore(200 + i.lives*50);
        i.run++; i.x=0; i.y=Math.floor(rand(0,4)); i.revealed.clear(); i.fails=0;
        i.trap=Math.min(0.6,0.3 + (i.run-1)*0.05);
        i.board=i.makeBoard(i.trap);
      }
      if(i.lives<=0) endGame('No Lives');
    },
    draw(){
      const i=st.info;
      ctx.fillStyle='#0b1018'; ctx.fillRect(0,0,960,540);
      const ox=180, oy=120, w=100, h=78, gap=12;
      for(let r=0;r<4;r++) for(let c=0;c<6;c++){
        const key=`${r},${c}`;
        const rev=i.revealed.has(key);
        const trap=i.board[r][c];
        ctx.fillStyle = rev ? (trap?'#361414':'#1b5421') : '#17431d';
        ctx.fillRect(ox+c*(w+gap), oy+r*(h+gap), w, h);
        ctx.strokeStyle='rgba(255,255,255,.15)'; ctx.strokeRect(ox+c*(w+gap), oy+r*(h+gap), w, h);
      }
      const px=ox+i.x*(w+gap)+w/2, py=oy+i.y*(h+gap)+h/2;
      ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(px,py,14,0,Math.PI*2); ctx.fill();
    },
    keyHandler(e){
      const i=st.info;
      const k=e.key.toLowerCase();
      let nx=i.x, ny=i.y;
      if(k==='arrowleft'||k==='a') nx--;
      if(k==='arrowright'||k==='d') nx++;
      if(k==='arrowup'||k==='w') ny--;
      if(k==='arrowdown'||k==='s') ny++;
      nx=clamp(nx,0,5); ny=clamp(ny,0,3);
      if(nx===i.x && ny===i.y) return;
      i.x=nx; i.y=ny;
      const key=`${i.y},${i.x}`;
      i.revealed.add(key);
      if(i.board[i.y][i.x]){
        i.lives--; breakCombo(); i.fails++;
        if(i.fails>=2){
          const col=i.x;
          for(let r=0;r<4;r++) if(!i.board[r][col]){ i.revealed.add(`${r},${col}`); break; }
          setScore(st.score-30);
        }
        i.x=0; i.y=Math.floor(rand(0,4));
      }
    }
  };

  MODE.beatdrop = {
    setup(){ st.info={notes:[],spawn:0,bpm:90,combo:0,maxCombo:0,hp:100,hitY:480,feverUntil:0,total:0,perfect:0}; },
    update(dt){
      const i=st.info;
      i.feverUntil=Math.max(0,i.feverUntil-dt);
      if(Math.floor(st.t)%30===0) i.bpm=Math.min(150,90+Math.floor(st.t/30)*5);
      i.spawn-=dt;
      if(i.spawn<=0){
        const beat=60/i.bpm;
        i.spawn=beat;
        const pattern=[0,1,2,3,1,2,0,3,2,1,0,3,0,2,1,3];
        const lane=pattern[Math.floor(st.t*2)%pattern.length];
        i.notes.push({lane,y:-20,hit:false});
      }
      i.notes.forEach(n=>n.y += 320*dt);
      const missed=i.notes.filter(n=>!n.hit && n.y>i.hitY+130).length;
      if(missed){ i.hp-=missed*8; i.combo=0; breakCombo(); }
      i.notes=i.notes.filter(n=>n.y<=i.hitY+140 && !n.hit);
      if(i.hp<=0) return endGame('HP Empty');
    },
    draw(){
      const i=st.info;
      ctx.fillStyle='#090b12'; ctx.fillRect(0,0,960,540);
      const lx=[220,360,500,640], lc=['#00f5ff','#b8ff00','#ffb300','#ff2d78'];
      for(let n=0;n<4;n++){
        ctx.fillStyle='rgba(255,255,255,.04)'; ctx.fillRect(lx[n]-40,40,80,470);
        ctx.fillStyle=lc[n]; ctx.fillRect(lx[n]-40,i.hitY,80,6);
      }
      i.notes.forEach(n=>{ ctx.fillStyle=lc[n.lane]; ctx.beginPath(); ctx.arc(lx[n.lane],n.y,14,0,Math.PI*2); ctx.fill(); });
      ctx.fillStyle='#fff'; ctx.fillRect(20,22,Math.max(0,i.hp)*2,12);
      drawNeonText(`HP ${Math.max(0,Math.floor(i.hp))}% · COMBO ${i.combo}`, 20, 18, '#ffb300');
      if(i.feverUntil>0) drawNeonText('FEVER MODE x3', 390, 60, '#ff2d78');
    },
    keyHandler(e){
      const i=st.info;
      const map={d:0,f:1,j:2,k:3}; const lane=map[e.key.toLowerCase()];
      if(lane===undefined) return;
      i.total++;
      const note=i.notes.find(n=>n.lane===lane && !n.hit);
      if(!note){ i.hp-=8; i.combo=0; breakCombo(); return; }
      const delta=Math.abs(note.y-i.hitY);
      if(delta<=16){
        note.hit=true; i.combo++; i.maxCombo=Math.max(i.maxCombo,i.combo); i.perfect++; addScore(100*i.combo*(i.feverUntil>0?3:1)); i.hp=Math.min(100,i.hp+3);
      } else if(delta<=38){
        note.hit=true; i.combo=Math.max(1,i.combo); addScore(50*Math.max(1,i.combo)*(i.feverUntil>0?3:1));
      } else { i.hp-=8; i.combo=0; breakCombo(); }
      if(i.combo>0 && i.combo%50===0) i.feverUntil=10;
      if(i.total>=220){
        const acc = i.total ? (i.perfect/i.total)*100 : 0;
        st.info.summary = `Accuracy ${acc.toFixed(1)}% · Max Combo ${i.maxCombo}`;
        return endGame('Set Complete');
      }
    }
  };

  // default fallback to pixel dodge for any missing mode
  for (const id of Object.keys(GAME_META)) if(!MODE[id]) MODE[id] = MODE.pixeldodge;

  function setupGame(){
    setupBase();
    MODE[gameId].setup?.();
  }

  // Global input routing
  function handleKeyDown(e){
    let k = e.key.toLowerCase();
    if (arenaMode && arenaHazards.includes('REVERSE')) {
      if (k === 'arrowleft') k = 'arrowright';
      else if (k === 'arrowright') k = 'arrowleft';
      else if (k === 'a') k = 'd';
      else if (k === 'd') k = 'a';
    }
    if (!howTo.classList.contains('hidden') && (k === ' ' || k === 'spacebar')) {
      e.preventDefault();
      startGame();
      return;
    }
    if (k === 'p' || k === 'escape') { if (running && !ended) { togglePause(); e.preventDefault(); } return; }
    if (ended && k === 'r') { startGame(); return; }
    if (!running || paused || ended) return;

    keys.add(k);

    if (gameId === 'pingpong' && k === ' ') {
      st.info.curvePressAt = performance.now();
    }

    if (gameId === 'neonpong' && k === ' ') {
      const i = st.info;
      i.b.vy += (i.b.vy >= 0 ? 1 : -1) * 60;
      i.b.vx *= 1.06;
      addScore(5);
    }

    if (gameId === 'keyfrenzy') {
      if (k === ' ') {
        if (st.info.skip > 0) { st.info.skip--; st.info.pick(); }
      } else if (k === st.info.target.toLowerCase()) { addScore(10); st.info.count++; st.info.pick(); }
      else { breakCombo(); st.info.count++; if(st.info.count>=60) endGame('Typing Out'); }
    }

    if (gameId === 'reactiontime') {
      const i=st.info;
      if(!i.target) return;
      const rt=Math.floor(i.target.t*1000);
      if(i.target.color==='red'){ setScore(st.score-50); breakCombo(); }
      else if(i.target.color==='white' || i.target.color==='green'){ addScore(rt<150?100:rt<250?75:rt<400?50:rt<600?25:10); i.best=Math.min(i.best,rt); i.sum+=rt; i.round++; i.target=null; i.next=rand(0.5,1.4); if(i.round>=i.max) endGame('Round Complete'); }
    }

    if (gameId === 'hypertap') {
      if(k===' '){
        st.info.taps++;
        addScore(2);
        st.info.bonus = st.info.taps%10===0;
        st.info.shake = 0.08;
        st.info.ripples.push({r:10,a:1});
      }
      if(k==='x' && st.info.bonus){ addScore(20); st.info.bonus=false; }
    }

    if (gameId === 'stackblitz' && k === ' ') {
      const i=st.info;
      const top=i.stack.at(-1);
      const left=Math.max(i.x,top.x);
      const right=Math.min(i.x+i.w, top.x+top.w);
      const overlap=Math.max(0,right-left);
      if(overlap<=0) return endGame('Stack Fell');
      const perfect = Math.abs((i.x+i.w/2)-(top.x+top.w/2)) <= Math.max(4, top.w*0.04);
      i.w = perfect ? top.w : overlap;
      i.x = perfect ? top.x : left;
      i.stack.push({x:i.x,y:460-i.stack.length*24,w:i.w});
      if (perfect) {
        i.combo++;
        i.perfectFlash = 0.22;
        addScore(30 + i.combo*5);
      } else {
        i.combo = 0;
        addScore(10);
        breakCombo();
      }
      i.speed = Math.min(2.8, i.speed + 0.05);
      i.center = i.x + i.w/2;
      if(i.stack.length>=18) return endGame('Tower Complete');
    }

    MODE[gameId].keyHandler?.(e);
    st.info?.keyHandler?.(e);
  }

  function handleKeyUp(e){ keys.delete(e.key.toLowerCase()); }

  function handleCanvasClick(e){
    if (!howTo.classList.contains('hidden')) { startGame(); return; }
    if (!running || paused || ended) return;
    if (gameId === 'reactiontime') {
      const i=st.info; if(!i.target) return;
      const r=canvas.getBoundingClientRect(); const x=(e.clientX-r.left)*(canvas.width/r.width); const y=(e.clientY-r.top)*(canvas.height/r.height);
      if(Math.hypot(x-i.target.x,y-i.target.y)<=i.target.r){
        const rt=Math.floor(i.target.t*1000);
        if(i.target.color==='blue' || i.target.color==='white') { addScore(rt<150?100:rt<250?75:rt<400?50:rt<600?25:10); i.best=Math.min(i.best,rt); i.sum+=rt; i.round++; i.target=null; i.next=rand(0.5,1.4); if(i.round>=i.max) endGame('Round Complete'); }
        else { setScore(st.score-50); breakCombo(); i.target=null; i.next=0.8; }
      }
    }
    if (gameId === 'hypertap') {
      st.info.taps++;
      addScore(2);
      st.info.bonus = st.info.taps%10===0;
      st.info.shake = 0.08;
      st.info.ripples.push({r:10,a:1});
    }
    if (gameId === 'gravityflip') {
      const i = st.info;
      i.yLane = 1 - i.yLane;
      i.rot = 1;
      if (i.perfectUntil > 0) addScore(25);
    }
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('click', handleCanvasClick);
  window.addEventListener('resize', handleResize);
  window.addEventListener('beforeunload', cleanupRunner);

  helpBtn.addEventListener('click', () => { if(!ended){ howTo.classList.remove('hidden'); togglePause(true); } });
  startBtn.addEventListener('click', () => startGame());
  replayBtn.addEventListener('click', () => startGame());
  challengeBtn.addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}?challenge=${gameId}&score=${st.score}`;
    try { await navigator.clipboard.writeText(url); challengeBtn.textContent='COPIED!'; trackTimeout(()=>challengeBtn.textContent='CHALLENGE',1200); } catch {}
  });
  lobbyBtn.addEventListener('click', () => {
    cleanupRunner();
    window.parent?.postMessage({ type:'closeGame' }, '*');
  });

  // initial how-to
  const challengeLine = activeChallenge ? `<br><br>⚡ DAILY CHALLENGE: ${activeChallenge.text}` : '';
  howToText.innerHTML = `${meta.controls}${challengeLine}<br><br><span class='kbd'>P</span>/<span class='kbd'>ESC</span> pause · <span class='kbd'>R</span> replay on game over`;
  applyCanvasDpr();
  setupGame();
})();