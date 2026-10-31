'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const env={window:{}};
vm.createContext(env);
for(const filename of ['data.js','catalog-expanded.js','corvette.js','optimizer.js'])
  vm.runInContext(fs.readFileSync(path.join(root,filename),'utf8'),env,{filename});
const solver=env.window.ATLAS_SOLVER, data=env.window.ATLAS_DATA, CV=env.window.ATLAS_CORVETTE;
const gear={...data.gear.starship,families:{...data.gear.starship.families,...CV.specialFamilies}};
function connectedPositions(result, family){
  const positions=result.map.flatMap((idx,p)=>result.tiles[idx]?.family===family?[p]:[]);
  const pending=new Set(positions),parts=[];
  while(pending.size){const start=pending.values().next().value;pending.delete(start);
    const queue=[start],component=[start];
    for(let k=0;k<queue.length;k++)for(const n of solver.getNeighbors(queue[k],10,6))if(pending.delete(n)){queue.push(n);component.push(n);}
    parts.push(component);
  }
  return {positions,parts};
}
const counts={
  'forsaken-legion-hab':3,
  'forsaken-chelone-reactor':2,
  'forsaken-vantage-cockpit':1,
  'hydraulic-legs':3,
  'forsaken-eldritch-thruster':2,
  'forsaken-razor-jet':1,
  'photon-array':3,
  'tractor':1,
  'catalog-internal-landing-bay':1,
};
const addons=['launch:aqua','launch:auto','launch:efficient',
  'hyperdrive:indium','hyperdrive:atlantid',
  'pulse:sub','pulse:instability','pulse:assist',
  'shield:ablative','photon:nonlinear',
  'scanners:conflict','scanners:economy','utility:teleport','utility:cargo'];
const originalSC=[0,7,9,25];
const profile={cols:10,rows:6,goal:'explorer',depth:3,
  sc:originalSC,blocked:[],enabled:['hyperdrive','launch','pulse','shield','photon','scanners','utility'],
  addons,fixedTiles:CV.technologyManifest(counts).tiles};
test('exact 2026-10-31 uploaded Corvette manifest keeps all 3 Legion-Class Habs and 2 Chelone Generators contiguous',()=>{
  const res=solver.solve({gear,profile});
  assert.equal(res.tiles.length,50,'PDF has 50 of 60 technology slots occupied');
  const hab=connectedPositions(res,'cv-hab'),reactor=connectedPositions(res,'cv-chelone');
  assert.equal(hab.positions.length,3);
  assert.equal(reactor.positions.length,2);
  assert.equal(hab.parts.length,1,`habs split across ${JSON.stringify(hab.parts)}`);
  assert.equal(reactor.parts.length,1,`generators split across ${JSON.stringify(reactor.parts)}`);
  for(const pos of originalSC)assert.equal(res.tiles[res.map[pos]].family,'hyperdrive');
  assert.equal(res.map.filter(i=>i>=0).length,50);
  assert.equal(new Set(res.map.filter(i=>i>=0)).size,50);
  const habTiles=res.tiles.filter(t=>t.family==='cv-hab');
  const reactorTiles=res.tiles.filter(t=>t.family==='cv-chelone');
  assert.equal(solver.areAdjacent(habTiles[0],habTiles[1],gear),false,'do not manufacture a hab stat link');
  assert.equal(solver.areAdjacent(reactorTiles[0],reactorTiles[1],gear),false,'do not manufacture a reactor stat link');
  assert.equal(res.stats.physicalSplitGroups,0);
  console.log('PDF replica: hab slots',hab.positions.map(p=>`R${Math.floor(p/10)+1}C${p%10+1}`).join(', '),
    'reactor slots',reactor.positions.map(p=>`R${Math.floor(p/10)+1}C${p%10+1}`).join(', '),
    'total split groups',res.stats.fragmentedGroups,'verified links',res.stats.connections);
});
test('unverified physical grouping applies to two independent built modules without creating adjacency score',()=>{
  const fixed=CV.technologyManifest({'forsaken-chelone-reactor':2,'forsaken-legion-hab':3,'tractor':2}).tiles;
  const p={cols:10,rows:6,goal:'explorer',depth:3,sc:[],blocked:[],enabled:[],addons:[],fixedTiles:fixed};
  const res=solver.solve({gear,profile:p});
  for(const family of ['cv-chelone','cv-hab','cv-tractor'])assert.equal(connectedPositions(res,family).parts.length,1);
  assert.equal(res.stats.connections,0,'physical proximity must not count as game adjacency');
  assert.equal(res.stats.adjacencyScore,0);
});

test('different reactor models are placed in a shared physical cluster with no fabricated bonus',()=>{
  const fixed=CV.technologyManifest({'zenith-reactor':1,'medusa-reactor':1,'forsaken-chelone-reactor':1,'forsaken-limos-reactor':1}).tiles;
  const p={cols:10,rows:6,goal:'explorer',depth:3,sc:[],blocked:[],enabled:[],addons:[],fixedTiles:fixed};
  const r=solver.solve({gear,profile:p});
  const positions=r.map.flatMap((id,pos)=>r.tiles[id]?.partId?.endsWith('-reactor')?[pos]:[]);
  assert.equal(positions.length,4);
  const reachable=new Set([positions[0]]),q=[positions[0]];
  for(let i=0;i<q.length;i++)for(const n of solver.getNeighbors(q[i],10,6))if(positions.includes(n)&&!reachable.has(n)){reachable.add(n);q.push(n);}
  assert.equal(reachable.size,4,'different reactor model tiles should form one physical cluster');
  assert.equal(r.stats.connections,0);
  assert.equal(r.stats.adjacencyScore,0);
});
