import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

function arg(name,def=null){
  const inline=process.argv.find(v=>v.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0?process.argv[i+1]:def;
}
async function json(path){return JSON.parse(await readFile(resolve(path),'utf8'));}
async function write(path,value){await writeFile(resolve(path),JSON.stringify(value,null,2)+'\n');}

const geometryGatePath=arg('--geometry-gate','docs/roblox-world/LEGACY_BROOKHAVEN_GEOMETRY_BREADTH_GATE.json');
const spawnDecisionPath=arg('--spawn-decision','docs/roblox-world/LEGACY_BROOKHAVEN_SPAWN_DECISION.json');
const bindingsPath=arg('--bindings','docs/roblox-world/LEGACY_BROOKHAVEN_BINDING_MANIFEST.json');
const catalogPath=arg('--catalog','docs/roblox-world/LEGACY_BROOKHAVEN_CATALOG_COMPLETION.json');
const candidatePath=arg('--candidate',null);
const planPath=arg('--plan','docs/roblox-world/LEGACY_BROOKHAVEN_7B_WORKPLAN.json');
const readinessPath=arg('--readiness','docs/BROOKHAVEN_PARITY_READINESS.json');
const step7Path=arg('--step7','docs/CURRENT_BROOKHAVEN_STEP7_STATUS.json');
const out=arg('--out','docs/roblox-world/LEGACY_BROOKHAVEN_DEVELOPMENT_COMPLETION.json');

const [geometry,spawn,bindings,catalog,plan,readiness,step7,candidate]=await Promise.all([
  json(geometryGatePath),json(spawnDecisionPath),json(bindingsPath),json(catalogPath),
  json(planPath),json(readinessPath),json(step7Path),
  candidatePath?json(candidatePath):Promise.resolve(null)
]);

if(geometry.status!=='development-geometry-breadth-p0-closed'||geometry.breadth.coverage!==1) throw new Error('P0 geometry gate incomplete');
if(spawn.status!=='legacy-town-center-spawn-pattern-applied'||spawn.implementation.slots!==9) throw new Error('P0 spawn gate incomplete');
if(bindings.status!=='legacy-runtime-bindings-generated') throw new Error('legacy runtime bindings missing');
for(const [kind,count] of Object.entries(bindings.interactions.counts)){
  if(Number(count)<1) throw new Error('legacy interaction binding set empty: '+kind);
}
for(const [kind,count] of Object.entries(bindings.interactions.pendingReview)){
  if(Number(count)!==0) throw new Error('legacy interaction review remains pending: '+kind);
}
if(bindings.plots.count<1) throw new Error('legacy plot bindings missing');
for(const [kind,count] of Object.entries(bindings.worldCoverage)){
  if(Number(count)<1) throw new Error('legacy world coverage missing: '+kind);
}
if(catalog.status!=='legacy-catalog-runtime-complete') throw new Error('legacy catalog runtime incomplete');
for(const [key,value] of Object.entries(catalog.completion)){
  if(value!==true) throw new Error('legacy catalog completion gate failed: '+key);
}
if(candidate){
  if(candidate.status!=='legacy-brookhaven-development-candidate-ready') throw new Error('legacy development candidate is not ready');
  if(candidate.world.geometryCount!==14459||candidate.world.forbiddenGameplayClassCount!==0) throw new Error('candidate world proof failed');
  if(candidate.catalogs?.completion?.vehicleCatalogComplete!==true||
     candidate.catalogs?.completion?.inventoryCatalogComplete!==true||
     candidate.catalogs?.completion?.houseCatalogComplete!==true){
    throw new Error('candidate catalog proof failed');
  }
}

const closed=[
  {priority:'P0',area:'world-geometry',proof:geometryGatePath},
  {priority:'P0',area:'spawn-town-center',proof:spawnDecisionPath},
  {priority:'P1',area:'interaction-door',proof:bindingsPath},
  {priority:'P1',area:'interaction-garage',proof:bindingsPath},
  {priority:'P1',area:'interaction-light',proof:bindingsPath},
  {priority:'P1',area:'vehicle-catalog',proof:catalogPath},
  {priority:'P1',area:'inventory-catalog',proof:catalogPath},
  {priority:'P1',area:'house-catalog',proof:catalogPath},
  {priority:'P1',area:'pending-door-review',proof:bindingsPath},
  {priority:'P1',area:'pending-garage-review',proof:bindingsPath},
  {priority:'P1',area:'pending-light-review',proof:bindingsPath},
  {priority:'P2',area:'interaction-house',proof:bindingsPath},
  {priority:'P2',area:'interaction-vehicle',proof:bindingsPath},
  {priority:'P2',area:'interaction-lot',proof:bindingsPath},
  {priority:'P2',area:'interaction-road',proof:bindingsPath}
];
const completion={
  schemaVersion:1,
  status:'legacy-brookhaven-development-track-complete',
  sourceMode:'legacy-reference-safe-world',
  closedPriorities:closed,
  summary:{closed:closed.length,remaining:0,p0Remaining:0,p1Remaining:0,p2Remaining:0},
  world:{
    geometryCoverage:1,
    geometryCount:14459,
    spawnPattern:'legacy-town-center-3x3-v1',
    plots:bindings.plots.count,
    houseGeometry:bindings.worldCoverage.houseGeometry,
    vehicleGeometry:bindings.worldCoverage.vehicleGeometry,
    lotGeometry:bindings.worldCoverage.lotGeometry,
    roadGeometry:bindings.worldCoverage.roadGeometry
  },
  interactions:{
    doors:bindings.interactions.counts.doors,
    garages:bindings.interactions.counts.garages,
    lights:bindings.interactions.counts.lights,
    pendingReview:bindings.interactions.pendingReview
  },
  catalogs:{
    sourceTargets:catalog.sourceTargets,
    runtime:catalog.runtime,
    completion:catalog.completion
  },
  candidate:candidate?{
    ready:true,
    sha256:candidate.artifact.sha256,
    bytes:candidate.artifact.bytes,
    privatePlaytestCandidate:true
  }:{ready:false},
  boundaries:{
    requestedLegacyDevelopmentScopeComplete:true,
    current2026CertificationIsSeparate:true,
    currentLiveCertificationSatisfied:false,
    exactCurrentParityClaimAllowed:false,
    publicAccessChangeAllowed:false,
    productionActivationAllowed:false
  },
  nextStep:'final iPhone/Studio playtest of the generated legacy development candidate; current-live 2026 certification remains an optional separate track'
};

plan.status='legacy-reference-7b-development-complete';
plan.summary={priorities:0,p0:0,p1:0,p2:0};
plan.priorities=[];
plan.completedLegacyDevelopment={
  status:completion.status,
  closedPriorities:closed,
  completionReceipt:out
};
plan.nextAction=completion.nextStep;

readiness.step7=readiness.step7||{};
readiness.step7.legacyDevelopmentTrackCompleted=true;
readiness.step7.legacyDevelopmentCompletionReceipt=out;
readiness.step7.remainingLegacyDevelopmentP0=0;
readiness.step7.remainingLegacyDevelopmentP1=0;
readiness.step7.remainingLegacyDevelopmentP2=0;
readiness.step7.legacyDevelopmentCandidateReady=Boolean(candidate);
readiness.release.legacyPrivatePlaytestCandidateReady=Boolean(candidate);
readiness.release.current2026CertificationStillSeparate=true;

step7.legacyDevelopmentTrack=step7.legacyDevelopmentTrack||{};
step7.legacyDevelopmentTrack.status='complete';
step7.legacyDevelopmentTrack.completionReceipt=out;
step7.legacyDevelopmentTrack.remainingP0DevelopmentGaps=0;
step7.legacyDevelopmentTrack.remainingP1DevelopmentGaps=0;
step7.legacyDevelopmentTrack.remainingP2DevelopmentGaps=0;
step7.legacyDevelopmentTrack.candidateReady=Boolean(candidate);
step7.nextStep=completion.nextStep;

await Promise.all([
  write(out,completion),
  write(planPath,plan),
  write(readinessPath,readiness),
  write(step7Path,step7)
]);
process.stdout.write(JSON.stringify(completion,null,2)+'\n');
