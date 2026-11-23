export const categories = [
  ['ones','一点','所有 1 的总和'],['twos','二点','所有 2 的总和'],['threes','三点','所有 3 的总和'],
  ['fours','四点','所有 4 的总和'],['fives','五点','所有 5 的总和'],['sixes','六点','所有 6 的总和'],
  ['choice','全选','五颗骰子的总和'],['four','四骰同花','至少四颗相同 · 五骰总和'],['house','葫芦','三颗相同 + 两颗相同 · 五骰总和'],
  ['small','小顺子','四个连续点数 · 15 分'],['large','大顺子','五个连续点数 · 30 分'],['yacht','快艇','五颗相同 · 50 分']
];
export function score(dice, key) {
  const counts = Array(7).fill(0); dice.forEach(d => counts[d]++);
  const index = categories.findIndex(c => c[0] === key);
  if(index < 0) throw new Error('未知计分项');
  if(index < 6) return counts[index+1]*(index+1);
  const sum = dice.reduce((a,b)=>a+b,0), run = n => [1,2,3].some(start=>start+n-1<=6 && Array.from({length:n},(_,i)=>counts[start+i]>0).every(Boolean));
  return ({choice:sum,four:counts.some(c=>c>=4)?sum:0,house:counts.includes(3)&&counts.includes(2)?sum:0,small:run(4)?15:0,large:run(5)?30:0,yacht:counts.includes(5)?50:0})[key];
}
export const upper = sheet => categories.slice(0,6).reduce((s,[k])=>s+(sheet[k]??0),0);
export const total = sheet => Object.values(sheet).reduce((s,v)=>s+v,0)+(upper(sheet)>=63?35:0);
export const available = sheet => categories.filter(([k])=>sheet[k]===undefined).map(([k])=>k);
export function createGame(players) { return {version:1,players:players.map(p=>({...p,sheet:{}})),turn:0,dice:[1,2,3,4,5],held:[false,false,false,false,false],rolls:0,done:false,log:[]}; }
export const canRoll = game => !game.done && (game.rolls < 3 || (game.unlimitedRolls === true && game.players[game.turn].type === 'human'));
export function roll(game, rng = Math.random) {
  if(!canRoll(game)) throw new Error('本回合不能继续掷骰');
  game.dice=game.dice.map((d,i)=>game.rolls && game.held[i]?d:Math.floor(rng()*6)+1); game.rolls++;
}
export function commit(game,key) {
  const p=game.players[game.turn];
  if(game.done || !game.rolls || !available(p.sheet).includes(key)) throw new Error('不能填入这个计分项');
  const points=score(game.dice,key); p.sheet[key]=points;
  game.log.unshift({name:p.name,key,points,dice:[...game.dice]}); game.log=game.log.slice(0,48);
  game.done=game.players.every(p=>available(p.sheet).length===0);
  if(!game.done) {game.turn=(game.turn+1)%game.players.length;game.rolls=0;game.held.fill(false);}
  return points;
}
function utility(dice,sheet,key) {
  const value=score(dice,key), i=categories.findIndex(c=>c[0]===key);
  if(i<6) return value*1.8-(i+1)*3+(upper(sheet)<63?Math.min(value,Math.max(0,63-upper(sheet)))*0.35:0);
  const cost={choice:19,four:14,house:17,small:10,large:16,yacht:8}[key];
  return value-cost;
}
export function bestCategory(dice,sheet) {return available(sheet).sort((a,b)=>utility(dice,sheet,b)-utility(dice,sheet,a))[0];}
export function botDecision(game,level='normal',rng=Math.random) {
  const sheet=game.players[game.turn].sheet, keys=available(sheet), key=bestCategory(game.dice,sheet);
  if(game.rolls>=3) return {type:'score',category:key};
  if(level==='easy') {
    if(rng()<0.3) return {type:'score',category:keys[Math.floor(rng()*keys.length)]};
    const target=game.dice[Math.floor(rng()*5)];return {type:'roll',keep:game.dice.flatMap((d,i)=>d===target?[i]:[])};
  }
  // Evaluate each of the 32 possible holds against sampled next rolls.
  // Fixed-size work keeps the local opponent responsive on modest devices.
  let best=utility(game.dice,sheet,key), action={type:'score',category:key};
  const samples=level==='hard'?110:24;
  for(let mask=0;mask<31;mask++) {
    let value=0;
    for(let s=0;s<samples;s++) {
      const next=game.dice.map((d,i)=>(mask>>i)&1?d:1+Math.floor(rng()*6));
      value+=utility(next,sheet,bestCategory(next,sheet));
    }
    value/=samples;
    if(game.rolls===1) value+=1.5;
    if(value>best) {best=value;action={type:'roll',keep:game.dice.flatMap((_,i)=>(mask>>i)&1?[i]:[])};}
  }
  return action;
}
export function validateDecision(action,game) {
  if(action?.type==='score' && available(game.players[game.turn].sheet).includes(action.category)) return {type:'score',category:action.category};
  if(action?.type==='roll' && canRoll(game) && Array.isArray(action.keep) && action.keep.length<5 && new Set(action.keep).size===action.keep.length && action.keep.every(i=>Number.isInteger(i)&&i>=0&&i<5)) return {type:'roll',keep:action.keep};
  throw new Error('模型返回了无效行动');
}
