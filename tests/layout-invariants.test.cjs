'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const win={};const sandbox=vm.createContext({window:win});
for(const f of ['data.js','corvette.js','optimizer.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),sandbox);
const solver=win.ATLAS_SOLVER, DATA=win.ATLAS_DATA.gear, CV=win.ATLAS_CORVETTE;
const plan=(gear,goal,enabled,cols,rows,sc=[],blocked=[],fixedTiles=[])=>({cols,rows,sc,blocked,goal,enabled,addons:[],depth:3,fixedTiles});
for(const [key,goal,sc,cols,rows] of [
 ['exosuit','mobility',[0,1,10],10,6],
 ['starship','explorer',[0,1,10,11],10,6],
 ['starship','combat',[0,1,10,11],10,6],
 ['multitool','combat',[0,1,8,9],8,5],
 ['exocraft','travel',[0,1],8,5],
 ['freighter','expedition',[0,1,10,11],10,6]
])test(`${key}: ${goal} keeps selected SC modules, unique tiles and valid map`,()=>{
 const gear=DATA[key],p=plan(gear,goal,gear.goals[goal].defaults||Object.keys(gear.families),cols,rows,sc);
 if(key==='exocraft')p.vehicle='roamer';
 const res=solver.solve({gear,profile:p});
 const placed=res.map.filter(x=>x>=0);
 assert.equal(placed.length,res.tiles.length);
 assert.equal(new Set(placed).size,res.tiles.length);
 const selected=solver.superchargedPlan(res.tiles,gear,gear.goals[goal],sc.length).selected;
 for(const id of selected)assert(sc.some(pos=>res.map[pos]===id),'selected SC slot must not be displaced');
 assert(Number.isFinite(res.stats.score));
 assert(res.stats.fragmentedGroups>=0);
});
test('Tractor Beam and independent reactors are never given invented adjacency',()=>{
 const gear={...DATA.starship,families:{...DATA.starship.families,...CV.specialFamilies}};
 const fixed=CV.technologyManifest({'tractor':2,'zenith-reactor':1,'medusa-reactor':1}).tiles;
 const p=plan(gear,'explorer',['hyperdrive','pulse','shield'],8,4,[0,1,8,9],[],fixed);
 const res=solver.solve({gear,profile:p});
 assert.equal(res.tiles.filter(x=>x.partId==='tractor').length,2);
 for(const tile of fixed)assert.equal(res.tiles.filter(x=>x.id===tile.id).length,1);
 for(const t of res.tiles.filter(x=>x.partId==='tractor'))assert.equal(solver.scValue(t,gear,gear.goals.explorer),0);
});
