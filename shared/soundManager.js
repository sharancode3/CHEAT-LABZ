/* CHEAT LABZ Sound Manager — Web Audio API */
const SoundManager=(()=>{let ctx=null,_vol=0.5,_muted=false;
function getCtx(){if(!ctx)ctx=new(window.AudioContext||window.webkitAudioContext)();if(ctx.state==="suspended")ctx.resume();return ctx}
function gn(v){const c=getCtx(),g=c.createGain();g.gain.value=_muted?0:v*_vol;g.connect(c.destination);return g}
function tone(f,d,t="sine",v=0.3){const c=getCtx(),g=gn(v),o=c.createOscillator();o.type=t;o.frequency.value=f;o.connect(g);o.start();o.stop(c.currentTime+d)}
function glide(f1,f2,d,t="sine",v=0.3){const c=getCtx(),g=gn(v),o=c.createOscillator();o.type=t;o.frequency.setValueAtTime(f1,c.currentTime);o.frequency.linearRampToValueAtTime(f2,c.currentTime+d);o.connect(g);o.start();o.stop(c.currentTime+d)}
return{
get volume(){return _vol},set volume(v){_vol=Math.max(0,Math.min(1,v))},
get muted(){return _muted},set muted(v){_muted=!!v},toggle(){_muted=!_muted;return _muted},
scorePoint(){glide(523,659,0.08,"sine",0.25)},
comboUp(){[523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,0.06,"sine",0.2),i*50))},
comboBreak(){glide(400,200,0.25,"sawtooth",0.15)},
powerUp(){glide(300,1200,0.15,"sine",0.2)},
loseLife(){glide(300,80,0.35,"sawtooth",0.25)},
gameOver(){[523,440,349,262].forEach((f,i)=>setTimeout(()=>tone(f,0.2,"triangle",0.25),i*180))},
gameStart(){[392,523,659].forEach((f,i)=>setTimeout(()=>tone(f,0.1,"sine",0.2),i*80))},
levelUp(){[659,880].forEach((f,i)=>setTimeout(()=>tone(f,0.12,"sine",0.25),i*100))},
btnHover(){tone(800,0.02,"sine",0.05)},
btnClick(){tone(600,0.04,"square",0.08)},
correct(){glide(500,700,0.1,"sine",0.2)},
wrong(){glide(350,200,0.15,"sawtooth",0.15)},
tick(){tone(1000,0.015,"sine",0.1)}
}})();
