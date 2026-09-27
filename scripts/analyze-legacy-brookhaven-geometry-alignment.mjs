import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

function arg(name,def=null){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : def;
}
function cls(node){return String(node?.class ?? node?.className ?? 'Unknown');}
function name(node){return String(node?.name ?? cls(node));}
function kids(node){return Array.isArray(node?.children) ? node.children : [];}
function walk(node,rows=[]){
  if(!node || typeof node!=='object') return rows;
  rows.push(node);
  for(const child of kids(node)) walk(child,rows);
  return rows;
}
function prop(node,...names){
  const p=node?.properties||{};
  for(const n of names) if(p[n]!==undefined) return p[n];
  return undefined;
}
function vec(value){
  if(Array.isArray(value)) return value.map(Number);
  if(value?.Vector3) return value.Vector3.map(Number);
  return null;
}
function frame(value){
  const c=value?.CFrame ?? value?.CoordinateFrame ?? value;
  if(!c || !Array.isArray(c.position)) return null;
  return {
    position:c.position.map(Number),
    orientation:Array.isArray(c.orientation) ? c.orientation.flat().map(Number) : null
  };
}
const GEOMETRY=new Set([
  'Part','MeshPart','WedgePart','CornerWedgePart','UnionOperation','TrussPart','Seat','VehicleSeat'
]);
function geometry(dom){
  return walk(dom).filter(n=>GEOMETRY.has(cls(n))).map(n=>({
    className:cls(n),name:name(n),
    cframe:frame(prop(n,'CFrame')),
    size:vec(prop(n,'Size','size'))
  })).filter(x=>x.cframe && x.size);
}
function round(v,tol){return Math.round(v/tol);}
function key(row,delta,{includeClass=true,posTol=0.25,sizeTol=0.05,rotTol=0.02}={}){
  const p=row.cframe.position.map((v,i)=>v+delta[i]);
  const s=row.size;
  const o=row.cframe.orientation||[];
  return [
    includeClass ? row.className : '*',
    ...p.map(v=>round(v,posTol)),
    ...s.map(v=>round(v,sizeTol)),
    ...o.map(v=>round(v,rotTol))
  ].join('|');
}
function addIndex(index,k,row){
  const list=index.get(k)||[];
  list.push(row); index.set(k,list);
}
function countMatches(legacy,current,delta,options){
  const index=new Map();
  for(const row of current) addIndex(index,key(row,[0,0,0],options),row);
  let matches=0;
  const unmatchedByClass={};
  for(const row of legacy){
    const k=key(row,delta,options);
    const list=index.get(k);
    if(list && list.length){list.pop();matches++;}
    else unmatchedByClass[row.className]=(unmatchedByClass[row.className]||0)+1;
  }
  return {matches,unmatched:legacy.length-matches,matchRatio:matches/legacy.length,unmatchedByClass};
}
function shapeKey(row,{sizeTol=0.05,rotTol=0.02}={}){
  return [
    row.className,
    ...row.size.map(v=>round(v,sizeTol)),
    ...(row.cframe.orientation||[]).map(v=>round(v,rotTol))
  ].join('|');
}
function deriveTranslationCandidates(legacy,current,{deltaTol=0.25,maxPairsPerShape=100}={}){
  const li=new Map(),ci=new Map();
  for(const row of legacy) addIndex(li,shapeKey(row),row);
  for(const row of current) addIndex(ci,shapeKey(row),row);
  const counts=new Map();
  for(const [sig,lrows] of li){
    const crows=ci.get(sig);
    if(!crows || lrows.length*crows.length>maxPairsPerShape) continue;
    for(const l of lrows){
      for(const c of crows){
        const delta=c.cframe.position.map((v,i)=>v-l.cframe.position[i]);
        const q=delta.map(v=>round(v,deltaTol));
        const k=q.join('|');
        const row=counts.get(k)||{quantized:q,count:0,samples:[]};
        row.count++;
        if(row.samples.length<3) row.samples.push(delta);
        counts.set(k,row);
      }
    }
  }
  return [...counts.values()]
    .sort((a,b)=>b.count-a.count)
    .slice(0,30)
    .map(row=>({
      voteCount:row.count,
      delta:row.samples[0],
      quantizedDelta:row.quantized.map(v=>v*deltaTol)
    }));
}

const legacyDom=JSON.parse(await readFile(resolve(arg('--legacy-dom')),'utf8'));
const starbloxDom=JSON.parse(await readFile(resolve(arg('--starblox-dom')),'utf8'));
const spawn=JSON.parse(await readFile(resolve(arg('--spawn-reference')),'utf8'));
const out=resolve(arg('--out','docs/roblox-world/LEGACY_BROOKHAVEN_GEOMETRY_ALIGNMENT.json'));

const firstNine=spawn.legacy.spawnLocations.slice(0,9).map(x=>
  x.properties.CFrame.CFrame.position.map(Number)
);
const legacyOrigin=[0,1,2].map(i=>firstNine.reduce((s,p)=>s+p[i],0)/firstNine.length);
const target=spawn.starblox.spawnSource[0];
const targetPos=target.properties.CFrame.CFrame.position.map(Number);
const targetSize=target.properties.Size.Vector3.map(Number);
const targetGround=[targetPos[0],targetPos[1]+targetSize[1]/2,targetPos[2]];
const delta=targetGround.map((v,i)=>v-legacyOrigin[i]);

const legacyWorkspace=walk(legacyDom,[]).find(n=>cls(n)==='Workspace' && name(n)==='Workspace') || legacyDom;
const starbloxBaseline=walk(starbloxDom,[]).find(n=>name(n)==='BrookhavenWorldBaseline') || starbloxDom;
const legacy=geometry(legacyWorkspace);
const current=geometry(starbloxBaseline);
const strict=countMatches(legacy,current,delta,{includeClass:true,posTol:0.25,sizeTol:0.05,rotTol:0.02});
const shapeOnly=countMatches(legacy,current,delta,{includeClass:false,posTol:0.25,sizeTol:0.05,rotTol:0.02});
const translationCandidates=deriveTranslationCandidates(legacy,current);
const evaluatedCandidates=translationCandidates.map(candidate=>({
  ...candidate,
  strictMatch:countMatches(
    legacy,current,candidate.quantizedDelta,
    {includeClass:true,posTol:0.25,sizeTol:0.05,rotTol:0.02}
  )
})).sort((a,b)=>b.strictMatch.matches-a.strictMatch.matches || b.voteCount-a.voteCount);
const bestDerived=evaluatedCandidates[0]||null;

const receipt={
  schemaVersion:1,
  status:'legacy-geometry-alignment-measured',
  origin:{
    spawnDerived:{
      rule:'centroid-of-first-nine-legacy-spawnlocations-to-top-center-of-BHW_1202',
      legacySpawnCentroid:legacyOrigin,
      starbloxTargetGround:targetGround,
      translationDelta:delta,
      rotationApplied:false,
      strictClassShapeTransformMatch:strict,
      shapeTransformMatchIgnoringClass:shapeOnly
    },
    geometryDerived:{
      method:'dominant translation votes from matching class-size-orientation signatures',
      candidates:evaluatedCandidates.slice(0,10),
      best:bestDerived
    }
  },
  geometry:{
    legacyCount:legacy.length,
    starbloxCount:current.length
  },
  decisionSupport:{
    bestDerivedTranslationMatchRatio:bestDerived?.strictMatch?.matchRatio||0,
    safeToUseDerivedTranslationOverlay:
      (bestDerived?.strictMatch?.matches||0)>=Math.min(1000,current.length*0.2),
    note:'Derived translation is development evidence only and never current-live certification.'
  },
  boundary:{
    currentLiveCertificationSatisfied:false,
    exactParityClaimAllowed:false
  }
};
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
