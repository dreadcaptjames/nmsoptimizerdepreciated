'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const win={};
const sandbox=vm.createContext({window:win});
for(const file of ['data.js','catalog-expanded.js','corvette.js','optimizer.js'])vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),sandbox,{filename:file});
const SOLVER=win.ATLAS_SOLVER, GEAR=win.ATLAS_DATA.gear, CV=win.ATLAS_CORVETTE;
function synthetic(count=4){
 const families=Object.fromEntries(['primary','secondary','third','fourth','fifth'].map((key,i)=>[key,{name:key,core:key+' Core',upgrade:key+' Module',maxUpgrades:count-1,sc:'upgrade',adjacency:'true',color:'blue'}]));
 const goals={range:{weights:{primary:9,secondary:0,third:0,fourth:0,fifth:0},label:'Long range'}};
 return {families,goals};
}
function profile(gear,{cols=8,rows=5,sc=[],blocked=[],enabled=Object.keys(gear.families),fixedTiles=[],depth=3,goal='range'}={}){
 return {cols,rows,sc,blocked,enabled,addons:[],depth,fixedTiles,goal};
}
function checkValid(res,p,blocked=p.blocked){
 const nonneg=res.map.filter(i=>i>=0);
 assert.equal(nonneg.length,res.tiles.length,'all tiles placed exactly once');
 assert.equal(new Set(nonneg).size,res.tiles.length,'no duplicate tile references');
 for(const i of blocked)assert.equal(res.map[i],-1,'blocked slot remains empty');
 for(let i=0;i<res.tiles.length;i++)assert(nonneg.includes(i),'tile was not omitted');
}
function groups(res,gear){
 const cells=new Map();const {map,tiles}=res;
 for(let p=0;p<map.length;p++){
   const t=tiles[map[p]];
   if(!t||t.noAdjacency||gear.families[t.family]?.adjacency==='none'||t.family==='underwater'&&t.role!=='upgrade')continue;
   const arr=cells.get(t.family)||[];arr.push(p);cells.set(t.family,arr);
 }
 const result={};
 for(const [key,positions] of cells){
   const todo=new Set(positions);let components=0;
   while(todo.size){components++;const q=[todo.values().next().value];todo.delete(q[0]);
     while(q.length){const p=q.pop();for(const n of SOLVER.getNeighbors(p,gear._cols,gear._rows)){
       if(todo.has(n)&&SOLVER.areAdjacent(tiles[map[p]],tiles[map[n]],gear)){todo.delete(n);q.push(n);}
     }}
   }
   result[key]=components;
 }
 return result;
}
test('secondary families are connected when priority SC positions are close',()=>{
 const gear=synthetic();const p=profile(gear,{sc:[0,1],cols:8,rows:5});gear._cols=p.cols;gear._rows=p.rows;
 const r=SOLVER.solve({gear,profile:p});checkValid(r,p);
 const g=groups(r,gear);
 for(const key of Object.keys(gear.families))assert.equal(g[key],1,`${key} should be contiguous`);
 assert.equal(r.stats.fragmentedGroups,0);
 for(const pos of p.sc)assert.equal(r.tiles[r.map[pos]].family,'primary','chosen goal protected on SC slots');
});
test('all families cluster even without supercharged slots',()=>{
 const gear=synthetic();const p=profile(gear,{sc:[],cols:8,rows:5});gear._cols=p.cols;gear._rows=p.rows;
 const r=SOLVER.solve({gear,profile:p});checkValid(r,p);
 for(const [key,count] of Object.entries(groups(r,gear)))assert.equal(count,1,`${key} should be contiguous`);
 assert.equal(r.stats.fragmentedGroups,0);
});
test('widely separated SC assignments may split the primary, but do not split secondary groups',()=>{
 const gear=synthetic();const p=profile(gear,{cols:8,rows:5,sc:[0,7,32,39]});gear._cols=p.cols;gear._rows=p.rows;
 const r=SOLVER.solve({gear,profile:p});checkValid(r,p);
 for(const pos of p.sc)assert.equal(r.tiles[r.map[pos]].family,'primary');
 const g=groups(r,gear);
 for(const key of ['secondary','third','fourth','fifth'])assert.equal(g[key],1,`${key} should still form a contiguous group`);
 assert(g.primary>1,'four corners cannot connect with only four primary tiles');
});
test('blocked slots do not get occupied, and same-family clusters are still sought',()=>{
 const gear=synthetic(),p=profile(gear,{cols:8,rows:5,sc:[8,9],blocked:[6,14,22,30,38]});gear._cols=p.cols;gear._rows=p.rows;
 const r=SOLVER.solve({gear,profile:p});checkValid(r,p);
 for(const pos of p.sc)assert.equal(r.tiles[r.map[pos]].family,'primary');
 assert.equal(r.stats.fragmentedGroups,0,'barrier still leaves enough room for contiguous groups');
});
test('Corvette construction modules, including no-adjacency reactors and tractor beam, appear exactly once',()=>{
 const gear={...GEAR.starship,families:{...GEAR.starship.families,...CV.specialFamilies}};
 const fixed=CV.technologyManifest({'tractor':1,'zenith-reactor':1,'forsaken-limos-reactor':1,'photon-array':1,'titan-booster':1}).tiles;
 const p=profile(gear,{cols:8,rows:5,sc:[1,2,3,4],fixedTiles:fixed,goal:'explorer',enabled:['hyperdrive','pulse','shield','infra']});
 const r=SOLVER.solve({gear,profile:p});checkValid(r,p);
 const ids=r.tiles.map(t=>t.id);
 for(const f of fixed)assert.equal(ids.filter(id=>id===f.id).length,1,f.id+' must be unique');
 assert.equal(r.tiles.find(t=>t.partId==='tractor')?.noAdjacency,true);
 assert.equal(r.tiles.filter(t=>t.partId==='tractor').length,1);
 const scSelected=SOLVER.superchargedPlan(r.tiles,gear,gear.goals[p.goal],p.sc.length).selected;
 for(const id of scSelected)assert(p.sc.some(pos=>r.map[pos]===id),'priority SC tile must remain in marked position');
});
test('same inputs produce exactly the same planned layout',()=>{
 const gear=synthetic(),p=profile(gear,{cols:8,rows:5,sc:[1,9]});
 const a=SOLVER.solve({gear,profile:p}),b=SOLVER.solve({gear,profile:p});
 assert.deepEqual([...a.map],[...b.map]);
});
test('real starship long range uses SC for hyperdrive, while secondary groups connect',()=>{
 const gear=GEAR.starship;
 const p={cols:10,rows:6,sc:[1,2,11,12],blocked:[],goal:'explorer',enabled:['hyperdrive','pulse','launch','shield','infra','photon'],addons:[],depth:3};
 gear._cols=p.cols;gear._rows=p.rows;
 const r=SOLVER.solve({gear,profile:p});checkValid(r,p);
 for(const pos of p.sc)assert.equal(r.tiles[r.map[pos]].family,'hyperdrive');
 for(const key of ['pulse','launch','shield','infra','photon'])assert.equal(groups(r,gear)[key],1,key+' should connect');
});
