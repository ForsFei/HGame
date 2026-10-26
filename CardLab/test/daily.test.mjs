import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyConfig,createDailyGame,createSeededGame,validSave,play,makeShop,reroll,nextStage} from '../public/engine.js';
import {recordRun,validRecord,dailyResults} from '../public/records.js';

test('daily date uses Shanghai midnight and validates real calendar dates',()=>{
 assert.equal(dailyConfig(new Date('2026-10-25T15:59:59Z')).dailyDate,'2026-10-25');
 assert.equal(dailyConfig(new Date('2026-10-25T16:00:00Z')).dailyDate,'2026-10-26');
 assert.deepEqual(dailyConfig('2026-10-26'),{dailyDate:'2026-10-26',seed:'DAILY-20261026',deckProfile:'trimmed',difficulty:'normal',version:5});
 const decks=new Set(['2026-10-26','2026-10-27','2026-10-28'].map(d=>dailyConfig(d).deckProfile));assert.equal(decks.size,3);
 assert.equal(dailyConfig('2028-02-29').dailyDate,'2028-02-29');
 for(const date of ['2026-02-29','2026-02-30','2026-13-01','2026-10-1','wrong',null])assert.throws(()=>dailyConfig(date));
});

test('daily games repeat deck and shop streams; restored games keep original date across midnight',()=>{
 const a=createDailyGame('2026-10-26'),b=createDailyGame(new Date('2026-10-25T16:00:00Z'));
 assert.deepEqual(a.hand,b.hand);assert.notEqual(a.runId,b.runId);assert.ok(validSave(a));
 for(const s of [a,b]){s.phase='shop';makeShop(s);reroll(s);}assert.deepEqual(a.shop,b.shop);
 const restore=JSON.parse(JSON.stringify(a));nextStage(restore);nextStage(a);assert.deepEqual(a.hand,restore.hand);assert.equal(restore.dailyDate,'2026-10-26');assert.ok(validSave(restore));
 for(const change of [{difficulty:'relaxed'},{deckProfile:'numeric'},{seed:'CUSTOM'},{version:4},{dailyDate:'invalid'}])assert.equal(validSave({...a,...change}),false);
 assert.ok(validSave(createSeededGame('DAILY-20261026')));
});

test('daily records retain dates, deduplicate finishes and replay the same configuration',()=>{
 const s=createDailyGame('2026-10-26');for(let i=0;i<4;i++)play(s,[s.hand[0].id]);assert.equal(s.phase,'lost');
 const records=recordRun([],s);assert.ok(validRecord(records[0]));assert.equal(records[0].dailyDate,s.dailyDate);assert.equal(recordRun(records,s).length,1);assert.deepEqual(createDailyGame(records[0].dailyDate).hand,createDailyGame(s.dailyDate).hand);
 assert.equal(validRecord({...records[0],dailyDate:'2026-10-27'}),false);
 const custom={...s,runId:'custom'};delete custom.dailyDate;const mixed=recordRun(records,custom);assert.equal(dailyResults(mixed,'2026-10-26').attempts,1);assert.equal(mixed[0].dailyDate,null);
});

test('daily best prioritizes victory, stage reached, total and best hand; ordinary and other dates excluded',()=>{
 const base={dailyDate:'2026-10-26',outcome:'lost',stage:1,total:100,bestHand:40};
 const records=[{...base,id:'low'},{...base,id:'high-total',total:99999},{...base,id:'stage',stage:7,total:900},{...base,id:'win',outcome:'won',stage:8,total:800},{...base,id:'other-day',dailyDate:'2026-10-25',outcome:'won',total:999999},{...base,id:'custom',dailyDate:null}];
 const before=structuredClone(records),result=dailyResults(records,'2026-10-26');assert.equal(result.attempts,4);assert.equal(result.wins,1);assert.equal(result.best.id,'win');assert.deepEqual(records,before);
 assert.equal(dailyResults(records.filter(r=>r.id!=='win'),'2026-10-26').best.id,'stage');assert.deepEqual(dailyResults(records,'2020-01-01'),{attempts:0,wins:0,best:null});
 assert.equal(dailyResults([{...base,id:'a'},{...base,id:'b',total:101}],'2026-10-26').best.id,'b');
 assert.equal(dailyResults([{...base,id:'a'},{...base,id:'b',bestHand:41}],'2026-10-26').best.id,'b');
});
