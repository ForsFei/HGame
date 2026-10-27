import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,previewPlacement,createLayoutHistory,clearLayoutHistory,editLayout,undoLayout,redoLayout,validSave,sell,startBattle} from '../public/engine.js';

test('placement previews report occupied objects, out-of-bounds cells and changed adjacency without mutation',()=>{
 const s=createGame('PREVIEW'),before=structuredClone(s);
 const conflict=previewPlacement(s,'i1',3,0);assert.equal(conflict.valid,false);assert.deepEqual(conflict.conflicts,['i2']);
 const outside=previewPlacement(s,'i1',4,3);assert.equal(outside.outOfBounds,1);assert.equal(outside.valid,false);
 const valid=previewPlacement(s,'i3',0,3);assert.equal(valid.valid,true);assert.ok(valid.changes.some(c=>c.uid==='i1'&&c.stat==='damage'&&c.before===9&&c.after===6));assert.deepEqual(s,before);
 s.items.push({uid:`i${s.nextId++}`,type:'spark',x:null,y:null,rotation:3});
 const l=previewPlacement(s,s.items.at(-1).uid,0,2);assert.deepEqual(l.cells,[[0,3],[1,3],[1,2]]);assert.equal(l.valid,true);assert.equal(l.cells.some(([x,y])=>x===0&&y===2),false);
});
test('geometry edits undo and redo while preserving resources, seed and inventory identities',()=>{
 const s=createGame('HISTORY'),h=createLayoutHistory(s),initial=structuredClone(s);
 editLayout(s,h,'stash','i3');editLayout(s,h,'place','i3',0,3);assert.equal(h.past.length,2);assert.equal(h.future.length,0);
 const final=structuredClone(s);undoLayout(s,h);assert.equal(s.items[2].x,null);undoLayout(s,h);assert.deepEqual(s,initial);assert.ok(validSave(s));
 redoLayout(s,h);redoLayout(s,h);assert.deepEqual(s,final);assert.ok(validSave(s));
 s.gold=21;s.hp=25;undoLayout(s,h);assert.equal(s.gold,21);assert.equal(s.hp,25);assert.equal(s.seed,initial.seed);assert.deepEqual(s.items.map(i=>i.uid),initial.items.map(i=>i.uid));
});
test('invalid edits and no-ops do not add history; new edits branch; retention is twenty steps',()=>{
 const s=createGame('BRANCH'),h=createLayoutHistory(s);editLayout(s,h,'rotate','i3');undoLayout(s,h);
 const before=structuredClone(s),oldHistory=structuredClone(h);assert.throws(()=>editLayout(s,h,'place','i1',3,0));assert.deepEqual(s,before);assert.deepEqual(h,oldHistory);
 assert.equal(editLayout(s,h,'place','i1',0,0),false);assert.deepEqual(h,oldHistory);
 editLayout(s,h,'stash','i3');assert.equal(h.future.length,0);assert.throws(()=>redoLayout(s,h));
 clearLayoutHistory(s,h);for(let i=0;i<25;i++)editLayout(s,h,'rotate','i3');assert.equal(h.past.length,20);
 for(let i=0;i<20;i++)undoLayout(s,h);assert.throws(()=>undoLayout(s,h));assert.equal(h.future.length,20);assert.ok(validSave(s));
});
test('inventory changes invalidate history and combat cannot undo or preview layout',()=>{
 const s=createGame('BOUNDARY'),h=createLayoutHistory(s);editLayout(s,h,'rotate','i3');sell(s,'i3');const sold=structuredClone(s);
 assert.throws(()=>undoLayout(s,h));assert.deepEqual(s,sold);assert.equal(h.past.length,0);assert.equal(h.future.length,0);
 clearLayoutHistory(s,h);editLayout(s,h,'rotate','i2');startBattle(s);const battle=structuredClone(s);assert.throws(()=>undoLayout(s,h));assert.throws(()=>redoLayout(s,h));assert.throws(()=>previewPlacement(s,'i1',0,0));assert.deepEqual(s,battle);
 const restored=JSON.parse(JSON.stringify(s));assert.ok(validSave(restored));assert.equal(createLayoutHistory(restored).past.length,0);
});
