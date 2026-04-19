const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
// simple sound effects via Web Audio
const AudioCtx = window.AudioContext||window.webkitAudioContext; const audioCtx = new AudioCtx();
function fx(freq=440,type='sine',dur=.12,vol=.15){const o=audioCtx.createOscillator();const g=audioCtx.createGain();o.type=type;o.frequency.value=freq;o.connect(g);g.connect(audioCtx.destination);g.gain.value=vol;o.start();o.stop(audioCtx.currentTime+dur);} 

const box = 20; // size of cell
let snake = [{ x: 10 * box, y: 10 * box }];
let direction = 'RIGHT';
let food = randomFood();
let score = 0;
let gameOver = false;
let paused = false;
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');

document.addEventListener("keydown", setDirection);

function setDirection(event) {
  const k = event.key;
  if ((k === 'ArrowLeft' || k === 'a' || k === 'A') && direction !== 'RIGHT') direction = 'LEFT';
  else if ((k === 'ArrowUp' || k === 'w' || k === 'W') && direction !== 'DOWN') direction = 'UP';
  else if ((k === 'ArrowRight' || k === 'd' || k === 'D') && direction !== 'LEFT') direction = 'RIGHT';
  else if ((k === 'ArrowDown' || k === 's' || k === 'S') && direction !== 'UP') direction = 'DOWN';
  else if (k === 'p' || k === 'P') togglePause();
  else if ((k === 'r' || k === 'R') && gameOver) restart();
}

function togglePause(){
  if (gameOver) return;
  paused = !paused;
  if (paused) {
    overlay.innerHTML = '<div>PAUSED</div><div style="font-size:1rem;font-weight:400">Press P to resume</div>';
    overlay.classList.add('show');
  } else {
    overlay.classList.remove('show');
  }
}

function randomFood() {
  const cols = Math.floor(canvas.width / box);
  const rows = Math.floor(canvas.height / box);
  return { x: Math.floor(Math.random()*cols)*box, y: Math.floor(Math.random()*rows)*box };
}

function draw() {
  if (gameOver || paused) return;

  // Glowing background effect
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw food (apple)
  ctx.beginPath();
  ctx.arc(food.x + box / 2, food.y + box / 2, box / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ff3333";
  ctx.shadowColor = "#ff0000";
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.closePath();

  // Draw snake
  for (let i = 0; i < snake.length; i++) {
    ctx.fillStyle = i === 0 ? "#00ffff" : "#39ff14";
    ctx.shadowColor = i === 0 ? "#00ffff" : "#39ff14";
    ctx.shadowBlur = 15;
    ctx.fillRect(snake[i].x, snake[i].y, box, box);
  }

  // old head position
  let snakeX = snake[0].x;
  let snakeY = snake[0].y;

  if (direction === "LEFT") snakeX -= box;
  if (direction === "UP") snakeY -= box;
  if (direction === "RIGHT") snakeX += box;
  if (direction === "DOWN") snakeY += box;

  // Check collision with walls
  if (snakeX < 0 || snakeY < 0 || snakeX >= canvas.width || snakeY >= canvas.height) {
    endGame();
    return;
  }

  // Check if snake eats the food
  if (snakeX === food.x && snakeY === food.y) {
    score++;
    food = randomFood();
    fx(640,'square',.07,.2);
  } else {
    snake.pop(); // remove tail
  }

  let newHead = { x: snakeX, y: snakeY };

  // Check if snake collides with itself
  for (let segment of snake) {
    if (newHead.x === segment.x && newHead.y === segment.y) {
      endGame();
      return;
    }
  }

  snake.unshift(newHead);

  scoreEl.textContent = 'Score: ' + score;
}

function endGame() {
  gameOver = true;
  overlay.innerHTML = `<div>GAME OVER</div><div style="font-size:1rem;font-weight:400">Score: ${score}</div><button id="restartBtn" style="padding:10px 18px;border-radius:12px;border:0;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#ff004d,#ff7a18);color:#050007">Restart (R)</button>`;
  overlay.classList.add('show');
  document.getElementById('restartBtn').addEventListener('click', restart);
  // notify parent
  try { window.parent.postMessage({ type:'game_over', gameId:'snake', result:'lost', score }, '*'); } catch(e) {}
  fx(120,'sawtooth',.4,.25);
}

function restart(){
  snake = [{ x: 10*box, y: 10*box }];
  direction = 'RIGHT';
  food = randomFood();
  score = 0; gameOver=false; paused=false;
  overlay.classList.remove('show');
}

setInterval(draw, 110);
