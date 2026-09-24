import fs from 'node:fs';

const graphPath='docs/preproduction/brookhaven-research/asset-graph-v1.json';
const graph=JSON.parse(fs.readFileSync(graphPath,'utf8'));

const issues=[];
if(graph.schemaVersion!=='starblox-brookhaven-asset-graph-v1') issues.push('graph-schema');
if(!Array.isArray(graph.nodes)||!graph.nodes.length) issues.push('graph-nodes');
if(!Array.isArray(graph.edges)) issues.push('graph-edges');
const ids=new Set();
for(const node of graph.nodes||[]){
  if(!node.id) issues.push('node-missing-id');
  if(ids.has(node.id)) issues.push('duplicate-node:'+node.id);
  ids.add(node.id);
  if(!node.type) issues.push('node-missing-type:'+node.id);
  if(!Array.isArray(node.evidence)) issues.push('node-missing-evidence-array:'+node.id);
}
for(const edge of graph.edges||[]){
  if(!ids.has(edge.from)) issues.push('edge-missing-from:'+edge.from);
  if(!ids.has(edge.to)) issues.push('edge-missing-to:'+edge.to);
}
if(graph.nodeCount!==graph.nodes.length) issues.push('node-count-mismatch');
if(graph.edgeCount!==graph.edges.length) issues.push('edge-count-mismatch');

const catalogPath='docs/preproduction/brookhaven-research/resolved-catalogs-v1.json';
const catalog=JSON.parse(fs.readFileSync(catalogPath,'utf8'));
if(catalog.schemaVersion!=='starblox-brookhaven-resolved-catalogs-v1') issues.push('catalog-schema');
if((catalog.propertyCatalog||[]).length!==5) issues.push('property-catalog-count');
if((catalog.currentVehicleCatalog?.values||[]).length!==13) issues.push('current-vehicle-count');
if((catalog.legacyVehicleCatalog?.values||[]).length!==4) issues.push('legacy-vehicle-count');
if((catalog.lots?.values||[]).length!==29) issues.push('lot-count');
if((catalog.loadableCatalogRoots||[]).length!==5) issues.push('loadable-root-count');
if((catalog.propertyCatalog||[]).some(row=>row.assetPayloadStatus!=='not-recovered')) issues.push('unexpected-property-payload-claim');

const boundaryPath='docs/preproduction/brookhaven-research/reuse-boundary-v1.json';
const boundary=JSON.parse(fs.readFileSync(boundaryPath,'utf8'));
if(boundary.schemaVersion!=='starblox-brookhaven-reuse-boundary-v1') issues.push('boundary-schema');
if(boundary.boundaryDecision?.brookhavenRuntimeCodeMayShipInStarBlox!==false) issues.push('runtime-boundary');
if(boundary.boundaryDecision?.brookhavenRemoteCallsMayShipInStarBlox!==false) issues.push('remote-boundary');
if(boundary.boundaryDecision?.normalizedAuthorizedAssetsMayEventuallyShip!==true) issues.push('normalized-asset-boundary');
if(!Array.isArray(boundary.staticForbiddenTokensInLiveSrc)||!boundary.staticForbiddenTokensInLiveSrc.length) issues.push('boundary-token-list');

const rightsPath='docs/preproduction/brookhaven-research/rights-status-v1.json';
const rights=JSON.parse(fs.readFileSync(rightsPath,'utf8'));
if(rights.schemaVersion!=='starblox-brookhaven-rights-status-v1') issues.push('rights-schema');
if(rights.status!=='verified-for-project-use') issues.push('rights-status');
if(rights.effect?.runtimeExploitCode!=='still-forbidden-by-reuse-boundary') issues.push('rights-runtime-boundary');

const conversionPath='docs/preproduction/brookhaven-research/conversion-contract-v1.json';
const conversion=JSON.parse(fs.readFileSync(conversionPath,'utf8'));
if(conversion.schemaVersion!=='starblox-brookhaven-neutral-conversion-contract-v1') issues.push('conversion-schema');
if(conversion.outputSchema?.schemaVersion!=='starblox-neutral-scene-v1') issues.push('conversion-output-schema');
if(conversion.productionEligibility?.['user-asserted-authorized']!=='research-only-until-rights-evidence-recorded') issues.push('legacy-conversion-rights-boundary');
if(conversion.productionEligibility?.['project-rights-verified']!=='candidate-after-content-and-technical-QA') issues.push('verified-conversion-rights-boundary');
if(!(conversion.inputSchema?.rightsStatuses||[]).includes('project-rights-verified')) issues.push('verified-rights-input-status');

const residentialPath='docs/preproduction/brookhaven-research/residential-feature-blueprint-v1.json';
const residential=JSON.parse(fs.readFileSync(residentialPath,'utf8'));
if(residential.schemaVersion!=='starblox-residential-feature-blueprint-v1') issues.push('residential-schema');
if((residential.mappings||[]).length!==14) issues.push('residential-mapping-count');
if(residential.status!=='production-candidate-runtime-not-wired') issues.push('residential-live-status');

const vehiclePath='docs/preproduction/brookhaven-research/vehicle-system-blueprint-v1.json';
const vehicle=JSON.parse(fs.readFileSync(vehiclePath,'utf8'));
if(vehicle.schemaVersion!=='starblox-brookhaven-vehicle-blueprint-v1') issues.push('vehicle-schema');
if((vehicle.currentVehicles||[]).length!==13) issues.push('vehicle-blueprint-current-count');
if((vehicle.legacyVehicles||[]).length!==4) issues.push('vehicle-blueprint-legacy-count');
if(vehicle.status!=='production-candidate-runtime-not-wired') issues.push('vehicle-live-status');
if(vehicle.payloadPolicy?.recoveredVisualPayloads!==0) issues.push('vehicle-payload-overclaim');

const townPath='docs/preproduction/brookhaven-research/town-system-blueprint-v1.json';
const town=JSON.parse(fs.readFileSync(townPath,'utf8'));
if(town.schemaVersion!=='starblox-town-system-blueprint-v1') issues.push('town-schema');
if((town.locations||[]).length!==17) issues.push('town-location-count');
if((town.locations||[]).filter(row=>row.playerFacingEligible).length!==15) issues.push('town-player-facing-count');
if(town.status!=='production-candidate-runtime-not-wired') issues.push('town-live-status');
if(town.topologyPolicy?.includes('original StarBlox proxy')!==true) issues.push('town-topology-policy');

const progressionPath='docs/preproduction/brookhaven-research/life-sim-progression-blueprint-v1.json';
const progression=JSON.parse(fs.readFileSync(progressionPath,'utf8'));
if(progression.schemaVersion!=='starblox-life-sim-progression-blueprint-v1') issues.push('progression-schema');
if((progression.residential||[]).length!==14) issues.push('progression-residential-count');
if((progression.vehicles||[]).length!==13) issues.push('progression-vehicle-count');
if((progression.town||[]).length!==15) issues.push('progression-town-count');
if(progression.status!=='shadow-read-only-not-wired-live') issues.push('progression-live-status');
if(progression.economyBoundary?.writesExistingSave!==false) issues.push('progression-save-write-boundary');
if(progression.economyBoundary?.awardsCoins!==false) issues.push('progression-coins-boundary');
if(progression.economyBoundary?.awardsStars!==false) issues.push('progression-stars-boundary');
if(progression.economyBoundary?.changesMastery!==false) issues.push('progression-mastery-boundary');

const replayPath='docs/preproduction/brookhaven-research/step-11-replay-manifest-v1.json';
const replay=JSON.parse(fs.readFileSync(replayPath,'utf8'));
if(replay.schemaVersion!=='starblox-brookhaven-step-11-replay-manifest-v1') issues.push('step11-replay-schema');
if(replay.step!=='11-of-12') issues.push('step11-number');
if(replay.status!=='complete-ready-for-controlled-replay-no-merge-performed') issues.push('step11-status');
if(replay.strategy?.directMergeBrookhavenIntoProduct!==false) issues.push('step11-brookhaven-direct-merge-boundary');
if(replay.strategy?.directMergeLearningFactoryIntoProduct!==false) issues.push('step11-learning-direct-merge-boundary');
if(replay.strategy?.directMergeBrookhavenAndLearningFactory!==false) issues.push('step11-cross-research-merge-boundary');
if((replay.orderedReplayGroups||[]).length!==4) issues.push('step11-replay-group-count');
if(replay.exitCriteria?.liveProductFilesExcluded!==true) issues.push('step11-live-file-exclusion');
if(replay.exitCriteria?.learningFactorySeparated!==true) issues.push('step11-learning-separation');
if(replay.exitCriteria?.temporaryInheritedBuildPatchExcluded!==true) issues.push('step11-temp-patch-exclusion');
if(replay.exitCriteria?.step11Complete!==true) issues.push('step11-completion-flag');

const readinessPath='docs/preproduction/brookhaven-research/step-11-reconciliation-readiness-v1.json';
const readiness=JSON.parse(fs.readFileSync(readinessPath,'utf8'));
if(readiness.schemaVersion!=='starblox-brookhaven-step-11-reconciliation-readiness-v1') issues.push('step11-readiness-schema');
if(readiness.step11Complete!==true) issues.push('step11-readiness-completion');
if(readiness.nextSubstep?.id!=='12') issues.push('step11-next-step');

const result={
  schemaVersion:'starblox-brookhaven-research-validation-v2',
  graphPath,
  catalogPath,
  boundaryPath,
  rightsPath,
  conversionPath,
  residentialPath,
  vehiclePath,
  townPath,
  progressionPath,
  replayPath,
  readinessPath,
  nodeCount:graph.nodes?.length||0,
  edgeCount:graph.edges?.length||0,
  vehicleCount:vehicle.currentVehicles?.length||0,
  townLocationCount:town.locations?.length||0,
  progressionRuleCount:
    (progression.residential?.length||0)+
    (progression.vehicles?.length||0)+
    (progression.town?.length||0),
  issueCount:issues.length,
  issues
};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(issues.length) process.exitCode=1;
