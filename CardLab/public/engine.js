export const HANDS=[
 {id:'high',name:'高牌',base:5,mult:1,up:10},
 {id:'pair',name:'一对',base:10,mult:2,up:15},
 {id:'twoPair',name:'两对',base:20,mult:2,up:15},
 {id:'three',name:'三条',base:30,mult:3,up:20},
 {id:'straight',name:'顺子',base:30,mult:4,up:25},
 {id:'flush',name:'同花',base:35,mult:4,up:20},
 {id:'house',name:'葫芦',base:40,mult:4,up:25},
 {id:'four',name:'四条',base:60,mult:7,up:30},
 {id:'straightFlush',name:'同花顺',base:100,mult:8,up:40}
];
export const MODULES=[
 {id:'spark',name:'火花',price:4,desc:'每次出牌，倍率 +4。'},
 {id:'pair',name:'双生',price:5,desc:'组合含对子时，倍率 +8。'},
 {id:'even',name:'偶数回路',price:5,desc:'每张计分的 2、4、6、8、10，筹码 +20。'},
 {id:'odd',name:'奇数回路',price:5,desc:'每张计分的 A、3、5、7、9，筹码 +20。'},
 {id:'red',name:'赤色偏移',price:5,desc:'每张计分的红桃或方块，倍率 +3。'},
 {id:'black',name:'墨色偏移',price:5,desc:'每张计分的黑桃或梅花，倍率 +3。'},
 {id:'face',name:'肖像收藏',price:5,desc:'每张计分的 J、Q、K，筹码 +30。'},
 {id:'small',name:'轻装',price:5,desc:'只出 1–3 张牌时，倍率 +10。'},
 {id:'reserve',name:'留白',price:6,desc:'每次出牌，剩余每次弃牌机会提供倍率 +3。'},
 {id:'wallet',name:'储蓄罐',price:6,desc:'每持有 $3，筹码 +10（最多 +100）。'},
 {id:'sequence',name:'连续波',price:6,desc:'顺子或同花顺，倍率 +16。'},
 {id:'flush',name:'共振',price:6,desc:'同花或同花顺，筹码 +80。'},
 {id:'echo',name:'回声',price:8,desc:'每阶段第二次及以后的出牌，最终倍率 ×1.5。'},
 {id:'anchor',name:'定锚',price:8,desc:'不再有弃牌机会时，最终倍率 ×2。'}
];
export const TARGETS=[150,300,500,800,1200,1800,2800,4200];
export const cardValue=c=>c.rank===14?11:Math.min(c.rank,10);
export const rankText=r=>({11:'J',12:'Q',13:'K',14:'A'})[r]||String(r);
export const suitText=s=>({S:'♠',H:'♥',C:'♣',D:'♦'})[s];
export function shuffled(items,rng=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function evaluate(cards){
 if(!Array.isArray(cards)||cards.length<1||cards.length>5||new Set(cards.map(c=>c.id)).size!==cards.length)throw Error('请选择 1–5 张不同的牌');
 const groups=new Map();cards.forEach(c=>groups.set(c.rank,[...(groups.get(c.rank)||[]),c]));
 const sorted=[...groups.values()].sort((a,b)=>b.length-a.length||b[0].rank-a[0].rank);
 const ranks=[...groups.keys()].sort((a,b)=>a-b),flush=cards.length===5&&cards.every(c=>c.suit===cards[0].suit);
 const straight=cards.length===5&&ranks.length===5&&(ranks[4]-ranks[0]===4||ranks.join(',')==='2,3,4,5,14');
 let index=0,scoring=sorted[0];
 if(flush&&straight){index=8;scoring=cards;}
 else if(sorted[0].length===4){index=7;scoring=sorted[0];}
 else if(sorted[0].length===3&&sorted[1]?.length===2){index=6;scoring=cards;}
 else if(flush){index=5;scoring=cards;}
 else if(straight){index=4;scoring=cards;}
 else if(sorted[0].length===3){index=3;scoring=sorted[0];}
 else if(sorted[0].length===2&&sorted[1]?.length===2){index=2;scoring=[...sorted[0],...sorted[1]];}
 else if(sorted[0].length===2){index=1;scoring=sorted[0];}
 return {hand:HANDS[index],scoring,hasPair:sorted[0].length>=2};
}
export function preview(state,cards){
 const result=evaluate(cards),level=state.levels[result.hand.id],steps=[];
 let chips=result.hand.base+(level-1)*result.hand.up+result.scoring.reduce((s,c)=>s+cardValue(c),0),mult=result.hand.mult+level-1;
 const baseChips=chips,baseMult=mult;
 for(const id of state.modules){
  let addChips=0,addMult=0;
  switch(id){
   case 'spark':addMult=4;break;
   case 'pair':if(result.hasPair)addMult=8;break;
   case 'even':addChips=20*result.scoring.filter(c=>[2,4,6,8,10].includes(c.rank)).length;break;
   case 'odd':addChips=20*result.scoring.filter(c=>[3,5,7,9,14].includes(c.rank)).length;break;
   case 'red':addMult=3*result.scoring.filter(c=>['H','D'].includes(c.suit)).length;break;
   case 'black':addMult=3*result.scoring.filter(c=>['S','C'].includes(c.suit)).length;break;
   case 'face':addChips=30*result.scoring.filter(c=>c.rank>=11&&c.rank<=13).length;break;
   case 'small':if(cards.length<=3)addMult=10;break;
   case 'reserve':addMult=state.discards*3;break;
   case 'wallet':addChips=Math.min(100,Math.floor(state.money/3)*10);break;
   case 'sequence':if(['straight','straightFlush'].includes(result.hand.id))addMult=16;break;
   case 'flush':if(['flush','straightFlush'].includes(result.hand.id))addChips=80;break;
  }
  chips+=addChips;mult+=addMult;if(addChips||addMult)steps.push({id,chips:addChips,mult:addMult});
 }
 // All additive effects resolve before multiplier effects, regardless of slot order.
 for(const id of state.modules){const factor=id==='echo'&&state.played>=1?1.5:id==='anchor'&&state.discards===0?2:1;if(factor!==1){mult*=factor;steps.push({id,factor});}}
 return {...result,level,chips,mult,baseChips,baseMult,points:Math.floor(chips*mult),steps};
}
export function startStage(s,rng=Math.random){
 s.deck=shuffled(['S','H','C','D'].flatMap(suit=>Array.from({length:13},(_,i)=>({id:`${suit}${i+2}`,rank:i+2,suit}))),rng);
 s.hand=s.deck.splice(0,8);s.score=0;s.hands=4;s.discards=3;s.played=0;s.phase='play';s.last=null;
}
export function createGame(rng=Math.random){const s={version:1,stage:0,money:6,modules:[],levels:Object.fromEntries(HANDS.map(h=>[h.id,1])),history:[],phase:'play',shop:null};startStage(s,rng);return s;}
function selectedCards(s,ids){
 if(s.phase!=='play')throw Error('当前不在出牌阶段');
 if(!Array.isArray(ids)||ids.length<1||ids.length>5||new Set(ids).size!==ids.length||ids.some(id=>!s.hand.some(c=>c.id===id)))throw Error('请选择手中的 1–5 张牌');
 return ids.map(id=>s.hand.find(c=>c.id===id));
}
function replaceCards(s,ids){s.hand=s.hand.filter(c=>!ids.includes(c.id));s.hand.push(...s.deck.splice(0,8-s.hand.length));}
export function makeShop(s,rng=Math.random){
 s.shop={modules:shuffled(MODULES.filter(m=>!s.modules.includes(m.id)),rng).slice(0,3).map(m=>({id:m.id,bought:false})),upgrades:shuffled(HANDS,rng).slice(0,2).map(h=>({id:h.id,bought:false})),rerolls:0};
}
export function play(s,ids,rng=Math.random){
 const p=preview(s,selectedCards(s,ids));s.hands--;s.played++;s.score+=p.points;s.last={name:p.hand.name,points:p.points,chips:p.chips,mult:p.mult,steps:p.steps};replaceCards(s,ids);
 if(s.score>=TARGETS[s.stage]){
  const interest=Math.min(5,Math.floor(s.money/5)),reward=5+s.hands+interest;s.money+=reward;
  s.history.unshift({stage:s.stage+1,score:s.score,target:TARGETS[s.stage],reward});s.last.reward=reward;
  s.phase=s.stage===7?'won':'shop';if(s.phase==='shop')makeShop(s,rng);
 }else if(s.hands===0)s.phase='lost';
 return p;
}
export function discard(s,ids){selectedCards(s,ids);if(s.discards===0)throw Error('弃牌机会已用完');s.discards--;replaceCards(s,ids);}
export function buyModule(s,index){
 const offer=s.shop?.modules[index],m=MODULES.find(m=>m.id===offer?.id);
 if(s.phase!=='shop'||!m||offer.bought)throw Error('商品不可购买');
 if(s.modules.length>=5)throw Error('模块已满，请先出售一个模块');if(s.money<m.price)throw Error('资金不足');
 s.money-=m.price;s.modules.push(m.id);offer.bought=true;
}
export function upgrade(s,index){const offer=s.shop?.upgrades[index];if(s.phase!=='shop'||!offer||offer.bought)throw Error('升级不可购买');if(s.money<5)throw Error('资金不足');s.money-=5;s.levels[offer.id]++;offer.bought=true;}
export function sell(s,id){if(s.phase!=='shop'||!s.modules.includes(id))throw Error('只能在商店出售已有模块');s.modules=s.modules.filter(m=>m!==id);s.money+=Math.floor(MODULES.find(m=>m.id===id).price/2);}
export function reroll(s,rng=Math.random){if(s.phase!=='shop'||s.money<3)throw Error('刷新需要 $3');s.money-=3;const n=s.shop.rerolls+1;makeShop(s,rng);s.shop.rerolls=n;}
export function nextStage(s,rng=Math.random){if(s.phase!=='shop'||s.stage>=7)throw Error('不能进入下一阶段');s.stage++;s.shop=null;startStage(s,rng);}
export function validSave(s){
 if(!s||s.version!==1||!['play','shop','won','lost'].includes(s.phase)||!Number.isInteger(s.stage)||s.stage<0||s.stage>7)return false;
 if(!['score','money','hands','discards','played'].every(k=>Number.isInteger(s[k])&&s[k]>=0)||s.hands>4||s.discards>3||s.played>4||s.hands+s.played!==4)return false;
 if(!Array.isArray(s.hand)||s.hand.length>8||!Array.isArray(s.deck)||!Array.isArray(s.modules)||s.modules.length>5||new Set(s.modules).size!==s.modules.length||s.modules.some(id=>!MODULES.some(m=>m.id===id)))return false;
 const cards=[...s.hand,...s.deck];if(new Set(cards.map(c=>c?.id)).size!==cards.length||!cards.every(c=>c&&['S','H','C','D'].includes(c.suit)&&Number.isInteger(c.rank)&&c.rank>=2&&c.rank<=14&&c.id===`${c.suit}${c.rank}`))return false;
 if(!HANDS.every(h=>Number.isInteger(s.levels?.[h.id])&&s.levels[h.id]>=1)||!Array.isArray(s.history)||s.history.length>8||!s.history.every(h=>Number.isInteger(h.stage)&&Number.isFinite(h.score)&&Number.isFinite(h.reward)))return false;
 if(s.last!==null&&(!s.last||typeof s.last.name!=='string'||!Number.isFinite(s.last.points)||!Number.isFinite(s.last.chips)||!Number.isFinite(s.last.mult)))return false;
 if(s.phase==='shop'&&(!s.shop||!Array.isArray(s.shop.modules)||s.shop.modules.length!==3||!s.shop.modules.every(o=>MODULES.some(m=>m.id===o.id)&&typeof o.bought==='boolean')||!Array.isArray(s.shop.upgrades)||s.shop.upgrades.length!==2||!s.shop.upgrades.every(o=>HANDS.some(h=>h.id===o.id)&&typeof o.bought==='boolean')||!Number.isInteger(s.shop.rerolls)))return false;
 return true;
}
