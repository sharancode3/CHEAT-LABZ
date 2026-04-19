/* CHEAT LABZ � Shared Utilities */
const CheatLabz={
  store:{
    get(key){try{return JSON.parse(localStorage.getItem("cheatLabz_"+key))}catch{return null}},
    set(key,val){localStorage.setItem("cheatLabz_"+key,JSON.stringify(val))},
    remove(key){localStorage.removeItem("cheatLabz_"+key)}
  },
  player:{
    getName(){
      let name = CheatLabz.store.get("playerName");
      if(!name){
        name = "Player_"+Math.floor(1000+Math.random()*9000);
        CheatLabz.store.set("playerName", name);
      }
      return name.startsWith("Guest_") ? name : "Guest_" + name;
    },
    setName(n){
      const clean = (n||"").trim().replace(/^Guest_/i,"");
      CheatLabz.store.set("playerName", clean || ("Player_"+Math.floor(1000+Math.random()*9000)));
    },
  },
  scores:{
    save(gameId,score){
      const key=gameId+"_scores";
      const arr=CheatLabz.store.get(key)||[];
      const playerName = CheatLabz.player.getName();
      arr.push({score,date:Date.now(),playerName,player:playerName,gameId});
      CheatLabz.store.set(key,arr);
      const runs=CheatLabz.store.get("totalRuns")||0;
      CheatLabz.store.set("totalRuns",runs+1);
    },
    getBest(gameId){
      const arr=CheatLabz.store.get(gameId+"_scores")||[];
      return arr.length?Math.max(...arr.map(s=>s.score)):0;
    },
    getRuns(gameId){return(CheatLabz.store.get(gameId+"_scores")||[]).length},
    getAll(gameId){return CheatLabz.store.get(gameId+"_scores")||[]},
    getTotalRuns(){return CheatLabz.store.get("totalRuns")||0},
    getRunsToday(gameId){
      const today=new Date().toDateString();
      return(CheatLabz.store.get(gameId+"_scores")||[]).filter(s=>new Date(s.date).toDateString()===today).length;
    },
    resetAll(){const keys=Object.keys(localStorage).filter(k=>k.startsWith("cheatLabz_"));keys.forEach(k=>localStorage.removeItem(k))}
  },
  settings:{
    get(){return CheatLabz.store.get("settings")||{theme:"dark",sfxVolume:50,wallDeath:false,showControls:true}},
    set(s){CheatLabz.store.set("settings",s)},
  },
  achievements:{
    check(gameId,score){
      const a=CheatLabz.store.get("achievements")||{};
      const earned=[];
      if(!a["first_run"]){a["first_run"]=true;earned.push("First Run!")}
      const runs=CheatLabz.scores.getRuns(gameId);
      if(runs>=10&&!a["ten_runs"]){a["ten_runs"]=true;earned.push("10 Runs!")}
      if(runs>=100&&!a["hundred_runs"]){a["hundred_runs"]=true;earned.push("100 Runs!")}
      if(score>=1000&&!a["score_1k"]){a["score_1k"]=true;earned.push("Score Over 1000!")}
      if(score>=5000&&!a["score_5k"]){a["score_5k"]=true;earned.push("Score Over 5000!")}
      CheatLabz.store.set("achievements",a);
      return earned;
    }
  },
  countUp(el,target,duration=1000){
    let start=0;const step=target/(duration/16);
    const tick=()=>{start=Math.min(start+step,target);el.textContent=Math.floor(start);if(start<target)requestAnimationFrame(tick)};
    tick();
  }
};
