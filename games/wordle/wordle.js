const WORDS=["BRAVE","SNAKE","LIGHT","RACER","PUZZL","REACT","GUESS","QUICK","METAL","HYPER"];
const target=WORDS[Math.floor(Math.random()*WORDS.length)];
let row=0,col=0;const maxRows=6;const board=document.getElementById('board');const status=document.getElementById('status');const attemptsLeft=document.getElementById('attemptsLeft');const restart=document.getElementById('restart');
const hintBtn=document.getElementById('hintBtn');
const keyboard=document.getElementById('keyboard');
let hintsUsed=0;const hintedLetters=new Set();
const letters="QWERTYUIOPASDFGHJKLZXCVBNM".split("");
letters.concat(['ENTER','DEL']).forEach(l=>{const b=document.createElement('button');b.className='key';b.textContent=l;b.dataset.key=l;keyboard.appendChild(b);});
for(let r=0;r<maxRows;r++){for(let c=0;c<5;c++){const cell=document.createElement('div');cell.className='cell';cell.dataset.row=r;cell.dataset.col=c;board.appendChild(cell);}}
function setLetter(ch){if(col>=5)return;getCell(row,col).textContent=ch;col++;}
function backspace(){if(col===0)return;col--;getCell(row,col).textContent='';}
function getCell(r,c){return board.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);} 
function commit(){if(col<5)return;const guess=Array.from({length:5},(_,i)=>getCell(row,i).textContent).join('');if(guess.length<5)return;scoreGuess(guess);row++;col=0;attemptsLeft.textContent=maxRows-row; if(row===maxRows && guess!==target) end(false);}
function scoreGuess(guess){const used={};for(let i=0;i<5;i++){const cell=getCell(row,i);cell.classList.add('flip');const ch=guess[i];if(ch===target[i]){cell.style.background='#4caf50';cell.style.borderColor='#4caf50';markKey(ch,'good');}else if(target.includes(ch) && !used[ch]){cell.style.background='#c99d27';cell.style.borderColor='#c99d27';markKey(ch,'mid');used[ch]=true;}else{cell.style.background='#3b4451';cell.style.borderColor='#3b4451';markKey(ch,'bad');}}
 if(guess===target){ end(true); }
}
function markKey(ch,state){const k=keyboard.querySelector(`.key[data-key='${ch}']`); if(k && k.dataset.state!=='good'){k.dataset.state=state;}}
function end(win){status.textContent= win? `WIN! Word was ${target}`:`LOST • Word was ${target}`;restart.hidden=false;hintBtn.disabled=true;disableInput(); let base = win? ( (maxRows-row)*10 + 50 ): (maxRows-row)*5; const score = Math.max(0, base - hintsUsed*15); window.parent.postMessage({type:'game_over', gameId:'wordle', score, result: win?'won':'lost', hints:hintsUsed}, '*'); }
function disableInput(){keyboard.querySelectorAll('.key').forEach(k=>k.disabled=true);}
restart.addEventListener('click',()=>window.location.reload());
hintBtn.addEventListener('click',()=>giveHint());
keyboard.addEventListener('click',(e)=>{const k=e.target.closest('.key');if(!k)return;const v=k.dataset.key;if(v==='DEL'){backspace();return;} if(v==='ENTER'){commit();return;} setLetter(v);});
window.addEventListener('keydown',(e)=>{const k=e.key.toUpperCase(); if(k==='BACKSPACE'){backspace();return;} if(k==='ENTER'){commit();return;} if(/^[A-Z]$/.test(k)) setLetter(k);});
status.textContent=`Guess the 5-letter word. Attempts: ${maxRows-row}`;
function giveHint(){
	if(hintsUsed>=1){status.textContent=`No more hints. Attempts: ${maxRows-row}`;return;}
	// Build set of letters already guessed (committed rows only)
	const guessed=new Set();
	for(let r=0;r<row;r++){for(let c=0;c<5;c++){const ch=getCell(r,c).textContent; if(ch) guessed.add(ch);} }
	const candidates=target.split('').filter(ch=>!guessed.has(ch) && !hintedLetters.has(ch));
	if(candidates.length===0){status.textContent=`No hint available. Attempts: ${maxRows-row}`;return;}
	const reveal=candidates[Math.floor(Math.random()*candidates.length)];
	hintedLetters.add(reveal);hintsUsed++;
	// Highlight key and announce
	markKey(reveal,'good');
	const keyEl=keyboard.querySelector(`.key[data-key='${reveal}']`);
	if(keyEl){keyEl.classList.add('hint-flash');setTimeout(()=>keyEl.classList.remove('hint-flash'),1200);}
	status.textContent=`Hint: Contains letter ${reveal}. Attempts: ${maxRows-row}`;
	hintBtn.disabled=true; // single use
}