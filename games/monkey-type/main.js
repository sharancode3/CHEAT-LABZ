/*\n * Crazy Type (Monkey Type) Game Implementation\n * Features: falling words w/ HP, difficulty tiers, timer & endless modes, streak scoring, lives, power-ups, hotseat mode, persistence, fullscreen, mute, analytics hook, debug tools.\n */
import { sound } from '../../shared/soundManager.js';
import { shuffle, randInt, clamp, sendAnalytics } from '../../shared/utils.js';

// ===== CONFIG =====
const CONFIG = {
  baseSpawnInterval: 1400,
  difficultyTiers: {
    easy: { speedRange: [45, 70], weight: 0.5 },
    medium: { speedRange: [70, 95], weight: 0.35 },
    hard: { speedRange: [95, 125], weight: 0.15 }
  },
  powerupChance: 0.05,
  powerupDurations: { double: 10000, slow: 7000 },
  maxLives: 3,
  timerModes: [60, 120],
  endlessTimeAdd: 30, // each milestone extends time in endless
  wordHPBase: 1, // base hp per char
  spawnAcceleration: 0.92, // spawn interval multiplier each level
  levelWordTarget: 14, // words per level up
  highScoreKey: 'crazytype_highscore',
  longestStreakKey: 'crazytype_longeststreak'
};

// ===== WORD LIST =====
// Simple built-in 500-word list (sample trimmed for brevity; add full list as needed)
import words500 from './wordlist.js';
let customWords = null; // user uploaded list

// ===== STATE =====
const state = {
  mode: 'timer', // 'timer' or 'endless'
  timerLength: 60,
  elapsed: 0,
  running: false,
  paused: false,
  words: [],
  nextSpawnAt: 0,
  spawnInterval: CONFIG.baseSpawnInterval,
  level: 1,
  score: 0,
  lives: CONFIG.maxLives,
  typed: 0,
  correct: 0,
  streak: 0,
  longestStreak: parseInt(localStorage.getItem(CONFIG.longestStreakKey)||'0',10),
  powerups: { double:false, slow:false },
  powerupTimeouts: {},
  hotseat: false,
  activePlayer: 0,
  players: [ { score:0, streak:0, correct:0, typed:0, lives:CONFIG.maxLives }, { score:0, streak:0, correct:0, typed:0, lives:CONFIG.maxLives } ],
  debug: false,
  lastFrame: 0,
  highScore: parseInt(localStorage.getItem(CONFIG.highScoreKey)||'0',10)
};

// ===== DOM =====
const field = document.getElementById('field');
const overlay = document.getElementById('overlay');
const scoreEl = id('score');
const comboEl = id('combo');
const accuracyEl = id('accuracy');
const wpmEl = id('wpm');
const levelEl = id('level');
const timeEl = id('time');
const livesEl = id('lives');
const wordsEl = id('words');
const highScoreEl = id('highScore');
const settingsForm = document.getElementById('settings');
const powerupsEl = document.getElementById('powerups');
const debugInfo = document.getElementById('debugInfo');

function id(x){return document.getElementById(x);} // helper

// ===== WORD OBJECT CREATION =====
function createWord(text){
  const el = document.createElement('div');
  el.className = 'word';
  const done = document.createElement('span'); done.className='done';
  const left = document.createElement('span'); left.className='left'; left.textContent = text;
  el.appendChild(done); el.appendChild(left);
  field.appendChild(el);
  const speedBase = randInt(45,110); // base vertical speed px/s
  // pick tier by weights
  const tier = pickTier();
  const speed = randInt(...tier.speedRange); // px per second downward
  const hp = text.length * CONFIG.wordHPBase;
  const x = randInt(10, field.clientWidth - 80);
  const y = -25; // start above top
  el.style.left = x+'px'; el.style.top = y+'px';
  return { text, progress:0, hp, speed, x, y, el, done, left, removed:false };
}

function pickTier(){
  const r = Math.random();
  let acc=0; for(const [tier,data] of Object.entries(CONFIG.difficultyTiers)){
    acc += data.weight; if(r <= acc) return data;
  }
  return CONFIG.difficultyTiers.easy; // fallback
}

function wordSource(){
  return customWords || words500;
}

function pickWord(){
  const list = wordSource();
  return list[randInt(0,list.length-1)];
}

// ===== POWERUPS =====
function maybeSpawnPowerup(){
  if(Math.random() < CONFIG.powerupChance){
    const type = ['double','slow','clear'][randInt(0,2)];
    activatePowerup(type);
  }
}
function activatePowerup(type){
  if(type==='clear'){ clearScreen(); sound.chord([620,540,700]); badgeFlash('CLEAR'); return; }
  state.powerups[type] = true; badgeFlash(type.toUpperCase()); sound.tone(type==='double'?880:300,'triangle',0.25,0.6);
  updatePowerupBadges();
  if(state.powerupTimeouts[type]) clearTimeout(state.powerupTimeouts[type]);
  state.powerupTimeouts[type] = setTimeout(()=>{state.powerups[type]=false; updatePowerupBadges();}, CONFIG.powerupDurations[type]);
}
function clearScreen(){
  state.words.forEach(w=> removeWord(w,true));
  state.words = [];
}
function badgeFlash(label){
  const b = document.createElement('div'); b.className='badge active'; b.textContent=label; powerupsEl.appendChild(b); setTimeout(()=>b.remove(),1500);
}
function updatePowerupBadges(){
  powerupsEl.querySelectorAll('.badge.static').forEach(x=>x.remove());
  Object.entries(state.powerups).forEach(([k,v])=>{
    const el = document.createElement('div'); el.className='badge static' + (v?' active':''); el.textContent = k.toUpperCase(); powerupsEl.appendChild(el);
  });
}

// ===== GAME FLOW =====
function startGame(){
  resetState(); state.running=true; state.paused=false; overlay.classList.remove('show'); sound.tone(600,'square',0.2,0.5); sendAnalytics('start',{mode:state.mode}); loop(performance.now());
}
function resetState(){
  state.words.forEach(w=> w.el.remove()); state.words=[];
  state.score=0; state.lives=CONFIG.maxLives; state.typed=0; state.correct=0; state.streak=0; state.level=1; state.elapsed=0; state.spawnInterval=CONFIG.baseSpawnInterval; state.nextSpawnAt=0; state.powerups={double:false,slow:false}; Object.values(state.powerupTimeouts).forEach(clearTimeout); state.powerupTimeouts={}; updateHUD(); updatePowerupBadges();
}
function gameOver(){
  state.running=false; overlay.innerHTML = `<div style='font-size:2.2rem'>GAME OVER</div>` + statsLine(); overlay.classList.add('show'); sound.chord([780,660,540]);
  const acc = accuracy(); const wpm= wpmCalc();
  sendAnalytics('gameover',{score:state.score,accuracy:acc,wpm});
  if(state.score>state.highScore){ state.highScore=state.score; localStorage.setItem(CONFIG.highScoreKey,String(state.highScore)); }
  if(state.streak>state.longestStreak){ state.longestStreak=state.streak; localStorage.setItem(CONFIG.longestStreakKey,String(state.longestStreak)); }
}
function statsLine(){
  return `<div class='statsLine'>Score ${state.score} • WPM ${wpmCalc()} • Acc ${accuracy()}% • Longest Streak ${state.longestStreak}</div><div><button id='playBtn'>Play Again</button> <button id='exportBtn' class='secondary'>Export JSON</button></div>`;
}
function exportScore(){
  const payload = { score:state.score, accuracy:accuracy(), wpm:wpmCalc(), longestStreak:state.longestStreak, timestamp:Date.now() };
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='crazytype_score.json'; a.click();
}

// ===== LOOP =====
function loop(ts){
  if(!state.running) return;
  const dt = state.lastFrame? (ts - state.lastFrame)/1000 : 0; state.lastFrame = ts;
  if(!state.paused){
    state.elapsed += dt;
    // spawn logic
    if(ts >= state.nextSpawnAt){
      spawnWord(); maybeSpawnPowerup(); adjustSpawnInterval();
      state.nextSpawnAt = ts + state.spawnInterval * (state.powerups.slow?1.6:1);
    }
    // move words
    for(let i=state.words.length-1;i>=0;i--){ const w = state.words[i]; w.y += (w.speed * (state.powerups.slow?0.4:1)) * dt; w.el.style.top = w.y+'px'; if(w.y > field.clientHeight - 8){ // missed
        removeWord(w,false); state.words.splice(i,1); state.lives--; state.streak=0; sound.tone(180,'sawtooth',0.25,0.6); if(state.lives<=0) { gameOver(); return; }
      }
    }
    // timer mode end
    if(state.mode==='timer' && state.elapsed >= state.timerLength){ gameOver(); return; }
  }
  updateHUD(); if(state.debug) showDebug(dt); requestAnimationFrame(loop);
}

function spawnWord(){
  const w = createWord(pickWord()); state.words.push(w);
}
function adjustSpawnInterval(){
  // Increase difficulty gradually
  if(state.words.length && state.words.length % CONFIG.levelWordTarget === 0){
    state.level++; state.spawnInterval = Math.max(380, state.spawnInterval * CONFIG.spawnAcceleration); sound.chord([520,640,760]); sendAnalytics('levelup',{level:state.level});
  }
}
function removeWord(w, cleared){
  if(w.removed) return; w.removed=true; w.el.style.transition='opacity .25s, transform .25s'; w.el.style.opacity='0'; w.el.style.transform='scale(.6) translateY(-10px)'; setTimeout(()=> w.el.remove(),250); if(cleared) sound.tone(520,'sine',0.15,0.5);
}

// ===== INPUT HANDLING =====
document.addEventListener('keydown', e => {
  if(e.key==='F11'){ e.preventDefault(); toggleFullscreen(); }
  if(!state.running){ if(e.key===' '){ startGame(); } return; }
  if(e.key==='Escape'){ togglePause(); return; }
  if(e.key==='p' || e.key==='P'){ togglePause(); return; }
  if(state.paused) return;
  if(e.key.length===1 && /[a-zA-Z]/.test(e.key)){
    processChar(e.key.toLowerCase());
  }
});

function processChar(ch){
  state.typed++;
  // find candidate word whose next char matches
  let target = null; for(const w of state.words){ const next = w.text[w.progress]; if(next && next.toLowerCase()===ch){ target=w; break; } }
  if(!target){ // wrong
    state.streak=0; sound.tone(160,'sawtooth',0.2,0.6); return; }
  target.progress++; target.hp--; state.correct++; state.streak++; if(state.streak>state.longestStreak) state.longestStreak=state.streak;
  const baseScore = 10 + target.progress * 2 + state.level*3; const streakMult = 1 + clamp(state.streak/25,0,2.5); const powerMult = state.powerups.double?2:1; state.score += Math.round(baseScore * streakMult * powerMult);
  // update DOM
  target.done.textContent = target.text.slice(0,target.progress); target.left.textContent = target.text.slice(target.progress);
  sound.tone(480 + Math.min(state.streak*4,260),'square',0.07,0.5);
  if(target.hp<=0 || target.progress>=target.text.length){ // destroyed
    removeWord(target,true); state.words = state.words.filter(w=>w!==target); state.score += 20 + state.level*5; state.streak += 2; maybeSpawnPowerup();
  }
}

// ===== CALCS / HUD =====
function accuracy(){ return state.typed? Math.round((state.correct/state.typed)*100): 100; }
function wpmCalc(){ const elapsed = Math.max(state.elapsed,0.001); return Math.round(((state.correct/5)/elapsed)*60); }
function updateHUD(){
  scoreEl.textContent = state.score; comboEl.textContent = 'x'+state.streak; accuracyEl.textContent = accuracy()+'%'; wpmEl.textContent = wpmCalc(); levelEl.textContent = state.level; livesEl.textContent = state.lives; wordsEl.textContent = state.words.length; timeEl.textContent = state.mode==='timer'? (state.timerLength - Math.floor(state.elapsed))+'s' : Math.floor(state.elapsed)+'s'; highScoreEl.textContent = state.highScore; }

// ===== PAUSE / FULLSCREEN =====
function togglePause(){ if(!state.running) return; state.paused=!state.paused; if(state.paused){ overlay.innerHTML = `<div style='font-size:2.2rem'>PAUSED</div><div style='font-size:1rem;font-weight:600'>P / ESC to resume</div>`; overlay.classList.add('show'); sound.tone(300,'triangle',0.2,0.5); } else { overlay.classList.remove('show'); sound.tone(660,'triangle',0.15,0.5);} }
function toggleFullscreen(){ if(!document.fullscreenElement){ field.requestFullscreen().catch(()=>{}); } else { document.exitFullscreen(); } }

// ===== SETTINGS =====
settingsForm.addEventListener('change', e => {
  const formData = new FormData(settingsForm);
  state.mode = formData.get('mode');
  state.timerLength = parseInt(formData.get('timer')||'60',10);
  if(formData.get('hotseat')==='on'){ state.hotseat=true; } else state.hotseat=false;
});

// Upload custom words .txt
id('uploadWords').addEventListener('change', e => {
  const file = e.target.files[0]; if(!file) return; const reader = new FileReader(); reader.onload = evt => { const text = evt.target.result; const arr = text.split(/\s+/).filter(w=>w.length>0 && w.length<18); if(arr.length){ customWords = arr; id('uploadStatus').textContent = 'Loaded '+arr.length+' words.'; } else id('uploadStatus').textContent='No valid words.'; }; reader.readAsText(file);
});

// ===== OVERLAY INIT =====
function intro(){ overlay.innerHTML = `<div style='font-size:2.6rem'>CRAZY TYPE</div><div style='font-size:1rem;font-weight:600;max-width:560px;line-height:1.5'>Type falling words before they reach bottom. Build streak for multiplier. Power-ups: DOUBLE (2x points), SLOW (slow time), CLEAR (remove all). SPACE to start.</div><div><button id='startBtn'>Start (SPACE)</button></div>`; overlay.classList.add('show'); id('startBtn').addEventListener('click', startGame); }
intro();

// ===== EXPORT / ACTION BUTTONS =====
overlay.addEventListener('click', e => { if(e.target && e.target.id==='playBtn'){ startGame(); } if(e.target && e.target.id==='exportBtn'){ exportScore(); } });

id('start').addEventListener('click', startGame);
id('pause').addEventListener('click', togglePause);
id('restart').addEventListener('click', startGame);
id('mute').addEventListener('click', ()=> { const m = sound.toggleMute(); id('mute').textContent = m? 'Unmute':'Mute'; });
id('fullscreen').addEventListener('click', toggleFullscreen);

// ===== DEBUG =====
id('debugToggle').addEventListener('click', ()=> { state.debug=!state.debug; debugInfo.style.display = state.debug? 'block':'none'; });
function showDebug(dt){ debugInfo.textContent = `dt=${(dt*1000).toFixed(1)}ms\nspawnInt=${state.spawnInterval.toFixed(0)}\nwords=${state.words.length}\nlevel=${state.level}\nstreak=${state.streak}`; }

// ===== HOTSEAT (Simplified) =====
// Switch active player every 30 seconds for demonstration.
setInterval(()=>{ if(state.hotseat && state.running && !state.paused){ state.activePlayer = 1 - state.activePlayer; sendAnalytics('hotseat_switch',{active:state.activePlayer}); } },30000);

// ===== EXPORT WORDLIST MODULE PLACEHOLDER =====
// wordlist.js will export default array of words.
