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

const vehicleDefinitionSchemaPath='docs/preproduction/brookhaven-research/neutral-vehicle-definition-schema-v1.json';
const vehicleDefinitionSchema=JSON.parse(fs.readFileSync(vehicleDefinitionSchemaPath,'utf8'));
if(vehicleDefinitionSchema.$id!=='starblox://schemas/neutral-vehicle-definition-v1') issues.push('vehicle-definition-schema-id');
if(vehicleDefinitionSchema.type!=='object') issues.push('vehicle-definition-schema-type');
if(vehicleDefinitionSchema.additionalProperties!==false) issues.push('vehicle-definition-schema-open-object');
const vehicleDefinitionRequired=[
  'schemaVersion','id','label','archetype','era','interactionMode','capabilities','assetBinding','safety'
];
for(const field of vehicleDefinitionRequired){
  if(!(vehicleDefinitionSchema.required||[]).includes(field)) issues.push('vehicle-definition-required:'+field);
}
const vehicleCapabilityEnum=vehicleDefinitionSchema.properties?.capabilities?.items?.enum||[];
if(vehicleCapabilityEnum.length!==9) issues.push('vehicle-definition-capability-count');
if(vehicleCapabilityEnum.some(value=>/(weapon|remote|brookhaven)/i.test(String(value)))){
  issues.push('vehicle-definition-forbidden-capability');
}
const vehicleRightsEnum=vehicleDefinitionSchema.properties?.assetBinding?.properties?.rightsStatus?.enum||[];
if(!vehicleRightsEnum.includes('project-rights-verified')) issues.push('vehicle-definition-rights-gate');
const vehicleGeometryEnum=vehicleDefinitionSchema.properties?.assetBinding?.properties?.geometrySource?.enum||[];
if(!vehicleGeometryEnum.includes('project-rights-verified-conversion')) issues.push('vehicle-definition-conversion-source');
if(vehicleDefinitionSchema.properties?.safety?.properties?.externalRuntimeDependency?.const!==false){
  issues.push('vehicle-definition-runtime-boundary');
}
if(vehicleDefinitionSchema.properties?.safety?.properties?.remoteDependency?.const!==false){
  issues.push('vehicle-definition-remote-boundary');
}
if(vehicleDefinitionSchema.properties?.safety?.properties?.weaponBehavior?.const!==false){
  issues.push('vehicle-definition-weapon-boundary');
}

const vehiclePath='docs/preproduction/brookhaven-research/vehicle-system-blueprint-v1.json';
const vehicle=JSON.parse(fs.readFileSync(vehiclePath,'utf8'));
if(vehicle.schemaVersion!=='starblox-brookhaven-vehicle-blueprint-v1') issues.push('vehicle-schema');
if((vehicle.currentVehicles||[]).length!==13) issues.push('vehicle-blueprint-current-count');
if((vehicle.legacyVehicles||[]).length!==4) issues.push('vehicle-blueprint-legacy-count');
if(vehicle.status!=='production-candidate-runtime-not-wired') issues.push('vehicle-live-status');
if(vehicle.payloadPolicy?.recoveredVisualPayloads!==0) issues.push('vehicle-payload-overclaim');

const vehicleDefinitionCatalogPath='docs/preproduction/brookhaven-research/neutral-vehicle-definition-catalog-v1.json';
const vehicleDefinitionCatalog=JSON.parse(fs.readFileSync(vehicleDefinitionCatalogPath,'utf8'));
if(vehicleDefinitionCatalog.schemaVersion!=='starblox-neutral-vehicle-definition-catalog-v1') issues.push('vehicle-definition-catalog-schema');
if(vehicleDefinitionCatalog.status!=='definition-only-runtime-not-wired') issues.push('vehicle-definition-catalog-status');
if(vehicleDefinitionCatalog.definitionSchemaRef!==vehicleDefinitionSchemaPath) issues.push('vehicle-definition-catalog-schema-ref');
if(vehicleDefinitionCatalog.sourceBlueprintRef!==vehiclePath) issues.push('vehicle-definition-catalog-blueprint-ref');
if(vehicleDefinitionCatalog.rightsStatus!=='verified-for-project-use') issues.push('vehicle-definition-catalog-rights');
const vehicleDefinitions=vehicleDefinitionCatalog.definitions||[];
if(vehicleDefinitions.length!==13) issues.push('vehicle-definition-catalog-count');
if(vehicleDefinitionCatalog.definitionCount!==vehicleDefinitions.length) issues.push('vehicle-definition-catalog-count-field');

const expectedVehicleIds=new Set((vehicle.currentVehicles||[]).map(row=>row.id));
const legacyVehicleIds=new Set((vehicle.legacyVehicles||[]).map(row=>row.id));
const seenVehicleDefinitionIds=new Set();
const vehicleDefinitionAllowedKeys=Object.keys(vehicleDefinitionSchema.properties||{});
const vehicleAssetAllowedKeys=Object.keys(vehicleDefinitionSchema.properties?.assetBinding?.properties||{});
const vehicleSafetyAllowedKeys=Object.keys(vehicleDefinitionSchema.properties?.safety?.properties||{});
const allowedVehicleCapabilities=new Set(vehicleCapabilityEnum);
const baseDrivableCapabilities=['spawn','despawn','headlights','hazards','paint-token','wheel-style','driving-mode'];
const sorted=(values)=>[...(values||[])].sort().join('|');
for(const definition of vehicleDefinitions){
  const id=String(definition?.id||'');
  if(seenVehicleDefinitionIds.has(id)) issues.push('vehicle-definition-duplicate:'+id);
  seenVehicleDefinitionIds.add(id);
  if(!expectedVehicleIds.has(id)) issues.push('vehicle-definition-unexpected-id:'+id);
  if(legacyVehicleIds.has(id)) issues.push('vehicle-definition-legacy-leak:'+id);
  if(definition.schemaVersion!=='starblox-neutral-vehicle-definition-v1') issues.push('vehicle-definition-version:'+id);
  for(const field of vehicleDefinitionRequired){
    if(!(field in (definition||{}))) issues.push('vehicle-definition-missing:'+id+':'+field);
  }
  for(const key of Object.keys(definition||{})){
    if(!vehicleDefinitionAllowedKeys.includes(key)) issues.push('vehicle-definition-extra:'+id+':'+key);
  }
  const blueprintRow=(vehicle.currentVehicles||[]).find(row=>row.id===id);
  if(blueprintRow && definition.archetype!==blueprintRow.archetype) issues.push('vehicle-definition-archetype:'+id);
  if(definition.era!=='current') issues.push('vehicle-definition-era:'+id);
  const expectedInteraction=definition.archetype==='display-only'?'display-only':'drivable';
  if(definition.interactionMode!==expectedInteraction) issues.push('vehicle-definition-interaction:'+id);
  const capabilities=definition.capabilities||[];
  if(new Set(capabilities).size!==capabilities.length) issues.push('vehicle-definition-duplicate-capability:'+id);
  if(capabilities.some(value=>!allowedVehicleCapabilities.has(value))) issues.push('vehicle-definition-capability-outside-schema:'+id);
  const expectedCapabilities=definition.archetype==='display-only'
    ? ['spawn','despawn','paint-token']
    : definition.archetype==='emergency'
      ? [...baseDrivableCapabilities,'emergency-lights','emergency-siren']
      : baseDrivableCapabilities;
  if(sorted(capabilities)!==sorted(expectedCapabilities)) issues.push('vehicle-definition-capability-set:'+id);

  const assetBinding=definition.assetBinding||{};
  for(const key of Object.keys(assetBinding)){
    if(!vehicleAssetAllowedKeys.includes(key)) issues.push('vehicle-definition-asset-extra:'+id+':'+key);
  }
  if(assetBinding.status!=='identifier-only') issues.push('vehicle-definition-asset-status:'+id);
  if(assetBinding.geometrySource!=='none') issues.push('vehicle-definition-geometry-overclaim:'+id);
  if(assetBinding.rightsStatus!=='project-rights-verified') issues.push('vehicle-definition-asset-rights:'+id);
  if(!String(assetBinding.provenanceRef||'').startsWith(vehiclePath+'#')) issues.push('vehicle-definition-provenance-path:'+id);
  if(!String(assetBinding.provenanceRef||'').endsWith('#'+id)) issues.push('vehicle-definition-provenance-id:'+id);

  const safety=definition.safety||{};
  for(const key of Object.keys(safety)){
    if(!vehicleSafetyAllowedKeys.includes(key)) issues.push('vehicle-definition-safety-extra:'+id+':'+key);
  }
  if(safety.externalRuntimeDependency!==false) issues.push('vehicle-definition-external-runtime:'+id);
  if(safety.remoteDependency!==false) issues.push('vehicle-definition-remote:'+id);
  if(safety.weaponBehavior!==false) issues.push('vehicle-definition-weapon:'+id);
}
for(const id of expectedVehicleIds){
  if(!seenVehicleDefinitionIds.has(id)) issues.push('vehicle-definition-missing-id:'+id);
}

const step8CompletionPath='docs/preproduction/brookhaven-research/step-08-vehicle-completion-v2.json';
const step8Completion=JSON.parse(fs.readFileSync(step8CompletionPath,'utf8'));
if(step8Completion.schemaVersion!=='starblox-brookhaven-step-8-vehicle-completion-v2') issues.push('step8-completion-schema');
if(step8Completion.step!=='8-of-12') issues.push('step8-completion-step');
if(step8Completion.status!=='complete-neutral-vehicle-system-hardened-runtime-not-wired-live') issues.push('step8-completion-status');
if(step8Completion.rightsStatus!=='verified-for-project-use') issues.push('step8-completion-rights');
if(step8Completion.completion?.currentVehicleDefinitions!==13) issues.push('step8-completion-current-count');
if(step8Completion.completion?.legacyIdentifiersRetainedOnlyInResearchRuntime!==4) issues.push('step8-completion-legacy-count');
if(step8Completion.completion?.currentDefinitionCatalogExcludesLegacy!==true) issues.push('step8-completion-legacy-boundary');
if(step8Completion.completion?.definitionSchemaClosed!==true) issues.push('step8-completion-schema-closed');
if(step8Completion.completion?.definitionCatalogDeterministic!==true) issues.push('step8-completion-deterministic');
if(step8Completion.completion?.definitionLoaderDeepFrozen!==true) issues.push('step8-completion-loader-freeze');
if(step8Completion.completion?.runtimePreviewReadOnly!==true) issues.push('step8-completion-preview-readonly');
if(step8Completion.completion?.runtimePreviewParityCheckedAgainstExistingRuntime!==true) issues.push('step8-completion-parity');
if(step8Completion.completion?.visualPayloadStatus!=='identifier-only') issues.push('step8-completion-visual-status');
if(step8Completion.completion?.geometryPayloadAttached!==false) issues.push('step8-completion-geometry-overclaim');
if(step8Completion.completion?.projectRightsVerified!==true) issues.push('step8-completion-rights-flag');
if(step8Completion.completion?.externalRuntimeDependencyAllowed!==false) issues.push('step8-completion-external-runtime');
if(step8Completion.completion?.remoteDependencyAllowed!==false) issues.push('step8-completion-remote');
if(step8Completion.completion?.weaponBehaviorAllowed!==false) issues.push('step8-completion-weapon');
if(step8Completion.completion?.liveAppWired!==false) issues.push('step8-completion-live-app');
if(step8Completion.completion?.persistenceChanged!==false) issues.push('step8-completion-persistence');
if(step8Completion.completion?.economyChanged!==false) issues.push('step8-completion-economy');
if(step8Completion.completion?.networkingChanged!==false) issues.push('step8-completion-networking');
if(step8Completion.completion?.deploymentPerformed!==false) issues.push('step8-completion-deploy');
if(step8Completion.archetypeBoundaries?.displayOnlyVehicleId!=='tank') issues.push('step8-completion-display-id');
if(step8Completion.archetypeBoundaries?.displayOnlyVehicleDrivable!==false) issues.push('step8-completion-display-boundary');
if(step8Completion.archetypeBoundaries?.emergencyVehicleId!=='fire-truck') issues.push('step8-completion-emergency-id');
if(step8Completion.archetypeBoundaries?.emergencyControlsRestrictedToEmergencyArchetype!==true) issues.push('step8-completion-emergency-boundary');
if(step8Completion.nextStepBoundary?.step8Complete!==true) issues.push('step8-completion-flag');
if(step8Completion.nextStepBoundary?.noLiveIntegrationAuthorizedByThisReceipt!==true) issues.push('step8-completion-live-authorization');

for(const [name,artifactPath] of Object.entries(step8Completion.artifacts||{})){
  if(typeof artifactPath!=='string'||!artifactPath||!fs.existsSync(artifactPath)){
    issues.push('step8-completion-artifact:'+name);
  }
}
const step8LoaderSource=fs.readFileSync(step8Completion.artifacts.definitionLoader,'utf8');
const step8PreviewSource=fs.readFileSync(step8Completion.artifacts.runtimePreviewAdapter,'utf8');
if(!step8LoaderSource.includes('loadNeutralVehicleDefinitionCatalog')) issues.push('step8-completion-loader-export');
if(step8LoaderSource.includes('vehicleSystemRuntime')) issues.push('step8-completion-loader-runtime-coupling');
if(!step8PreviewSource.includes('buildNeutralVehicleRuntimePreview')) issues.push('step8-completion-preview-export');
if(step8PreviewSource.includes('vehicleSystemRuntime')) issues.push('step8-completion-preview-runtime-coupling');
if(step8PreviewSource.includes('spawnNeutralVehicle')||step8PreviewSource.includes('applyVehicleAction')) issues.push('step8-completion-preview-action-coupling');
if(step8PreviewSource.includes('App.jsx')||step8PreviewSource.includes('fetch(')||step8PreviewSource.includes('XMLHttpRequest')) issues.push('step8-completion-preview-live-coupling');

const townPath='docs/preproduction/brookhaven-research/town-system-blueprint-v1.json';
const town=JSON.parse(fs.readFileSync(townPath,'utf8'));
if(town.schemaVersion!=='starblox-town-system-blueprint-v1') issues.push('town-schema');
if((town.locations||[]).length!==17) issues.push('town-location-count');
if((town.locations||[]).filter(row=>row.playerFacingEligible).length!==15) issues.push('town-player-facing-count');
if(town.status!=='production-candidate-runtime-not-wired') issues.push('town-live-status');
if(town.topologyPolicy?.includes('original StarBlox proxy')!==true) issues.push('town-topology-policy');

const townLocationSchemaPath='docs/preproduction/brookhaven-research/neutral-town-location-schema-v1.json';
const townLocationSchema=JSON.parse(fs.readFileSync(townLocationSchemaPath,'utf8'));
if(townLocationSchema.$id!=='starblox://schemas/neutral-town-location-v1') issues.push('town-location-schema-id');
if(townLocationSchema.type!=='object') issues.push('town-location-schema-type');
if(townLocationSchema.additionalProperties!==false) issues.push('town-location-schema-open-object');
const townLocationRequired=[
  'schemaVersion','id','label','category','lifecycle','playerFacingEligible','evidenceRef','safety'
];
for(const field of townLocationRequired){
  if(!(townLocationSchema.required||[]).includes(field)) issues.push('town-location-required:'+field);
}
if(townLocationSchema.properties?.safety?.additionalProperties!==false) issues.push('town-location-safety-open-object');
if(townLocationSchema.properties?.safety?.properties?.externalRuntimeDependency?.const!==false) issues.push('town-location-schema-runtime-boundary');
if(townLocationSchema.properties?.safety?.properties?.remoteDependency?.const!==false) issues.push('town-location-schema-remote-boundary');
if(townLocationSchema.properties?.safety?.properties?.exactSourceCoordinatesClaimed?.const!==false) issues.push('town-location-schema-coordinate-boundary');

const townLocationCatalogPath='docs/preproduction/brookhaven-research/neutral-town-location-catalog-v1.json';
const townLocationCatalog=JSON.parse(fs.readFileSync(townLocationCatalogPath,'utf8'));
if(townLocationCatalog.schemaVersion!=='starblox-neutral-town-location-catalog-v1') issues.push('town-location-catalog-schema');
if(townLocationCatalog.status!=='definition-only-runtime-not-wired') issues.push('town-location-catalog-status');
if(townLocationCatalog.definitionSchemaRef!==townLocationSchemaPath) issues.push('town-location-catalog-schema-ref');
if(townLocationCatalog.sourceBlueprintRef!==townPath) issues.push('town-location-catalog-blueprint-ref');
if(townLocationCatalog.rightsStatus!=='verified-for-project-use') issues.push('town-location-catalog-rights');
const townDefinitions=townLocationCatalog.definitions||[];
if(townDefinitions.length!==17||townLocationCatalog.locationCount!==17) issues.push('town-location-catalog-count');
if(townLocationCatalog.playerFacingCount!==15) issues.push('town-location-catalog-player-facing-count');
if(townLocationCatalog.deferredCount!==2) issues.push('town-location-catalog-deferred-count');

const expectedTownRows=new Map((town.locations||[]).map(row=>[row.id,row]));
const seenTownDefinitionIds=new Set();
const townDefinitionAllowedKeys=Object.keys(townLocationSchema.properties||{});
const townSafetyAllowedKeys=Object.keys(townLocationSchema.properties?.safety?.properties||{});
for(const definition of townDefinitions){
  const id=String(definition?.id||'');
  if(seenTownDefinitionIds.has(id)) issues.push('town-location-duplicate:'+id);
  seenTownDefinitionIds.add(id);
  const blueprintRow=expectedTownRows.get(id);
  if(!blueprintRow) issues.push('town-location-unexpected-id:'+id);
  if(definition.schemaVersion!=='starblox-neutral-town-location-v1') issues.push('town-location-version:'+id);
  for(const field of townLocationRequired){
    if(!(field in (definition||{}))) issues.push('town-location-missing:'+id+':'+field);
  }
  for(const key of Object.keys(definition||{})){
    if(!townDefinitionAllowedKeys.includes(key)) issues.push('town-location-extra:'+id+':'+key);
  }
  if(blueprintRow){
    if(definition.label!==blueprintRow.label) issues.push('town-location-label:'+id);
    if(definition.category!==blueprintRow.category) issues.push('town-location-category:'+id);
    if(definition.playerFacingEligible!==blueprintRow.playerFacingEligible) issues.push('town-location-eligibility:'+id);
  }
  const expectedLifecycle=definition.playerFacingEligible?'player-facing':'research-deferred';
  if(definition.lifecycle!==expectedLifecycle) issues.push('town-location-lifecycle:'+id);
  if(definition.playerFacingEligible && definition.category==='research-deferred') issues.push('town-location-deferred-leak:'+id);
  if(!definition.playerFacingEligible && definition.category!=='research-deferred') issues.push('town-location-deferred-category:'+id);
  if(definition.evidenceRef!==townPath+'#'+id) issues.push('town-location-evidence-ref:'+id);
  const safety=definition.safety||{};
  for(const key of Object.keys(safety)){
    if(!townSafetyAllowedKeys.includes(key)) issues.push('town-location-safety-extra:'+id+':'+key);
  }
  if(safety.externalRuntimeDependency!==false) issues.push('town-location-external-runtime:'+id);
  if(safety.remoteDependency!==false) issues.push('town-location-remote:'+id);
  if(safety.exactSourceCoordinatesClaimed!==false) issues.push('town-location-coordinate-claim:'+id);
}
for(const id of expectedTownRows.keys()){
  if(!seenTownDefinitionIds.has(id)) issues.push('town-location-missing-id:'+id);
}
if(townDefinitions.filter(row=>row.playerFacingEligible).length!==15) issues.push('town-location-derived-player-facing-count');
if(townDefinitions.filter(row=>!row.playerFacingEligible).length!==2) issues.push('town-location-derived-deferred-count');

const townTopologyPath='docs/preproduction/brookhaven-research/starblox-proxy-town-topology-v1.json';
const townTopology=JSON.parse(fs.readFileSync(townTopologyPath,'utf8'));
if(townTopology.schemaVersion!=='starblox-proxy-town-topology-v1') issues.push('town-topology-schema');
if(townTopology.status!=='original-starblox-proxy-runtime-not-wired') issues.push('town-topology-status');
if(townTopology.sourceBlueprintRef!==townPath) issues.push('town-topology-blueprint-ref');
if(townTopology.topologyKind!=='original-starblox-proxy') issues.push('town-topology-kind');
if(townTopology.edgeSemantics!=='undirected') issues.push('town-topology-edge-semantics');
if(townTopology.locationCount!==17||(townTopology.locationIds||[]).length!==17) issues.push('town-topology-location-count');
if(townTopology.edgeCount!==14||(townTopology.edges||[]).length!==14) issues.push('town-topology-edge-count');
if(townTopology.claims?.exactSourceCoordinates!==false) issues.push('town-topology-coordinate-claim');
if(townTopology.claims?.exactSourceRoadLayout!==false) issues.push('town-topology-road-claim');
if(townTopology.claims?.exactSourceTopology!==false) issues.push('town-topology-source-topology-claim');
if(townTopology.safety?.externalRuntimeDependency!==false) issues.push('town-topology-runtime-boundary');
if(townTopology.safety?.remoteDependency!==false) issues.push('town-topology-remote-boundary');
if(townTopology.safety?.liveQuestRouting!==false) issues.push('town-topology-live-quest-boundary');

const townDefinitionIds=[...seenTownDefinitionIds].sort();
const topologyLocationIds=[...(townTopology.locationIds||[])].map(String).sort();
if(sorted(townDefinitionIds)!==sorted(topologyLocationIds)) issues.push('town-topology-location-id-parity');

const canonicalTownEdge=(edge)=>{
  const a=String(edge?.[0]||'');
  const b=String(edge?.[1]||'');
  return a.localeCompare(b)<=0?[a,b]:[b,a];
};
const townEdgeKey=(edge)=>canonicalTownEdge(edge).join('|');
const topologyEdgeKeys=[];
const topologyEdgeKeySet=new Set();
for(const edge of townTopology.edges||[]){
  if(!Array.isArray(edge)||edge.length!==2){
    issues.push('town-topology-edge-shape');
    continue;
  }
  const [a,b]=edge.map(String);
  if(a===b) issues.push('town-topology-self-edge:'+a);
  if(!seenTownDefinitionIds.has(a)||!seenTownDefinitionIds.has(b)) issues.push('town-topology-unknown-endpoint:'+a+':'+b);
  const aDef=townDefinitions.find(row=>row.id===a);
  const bDef=townDefinitions.find(row=>row.id===b);
  if(aDef?.playerFacingEligible===false||bDef?.playerFacingEligible===false) issues.push('town-topology-deferred-leak:'+a+':'+b);
  const key=townEdgeKey(edge);
  if(topologyEdgeKeySet.has(key)) issues.push('town-topology-duplicate-edge:'+key);
  topologyEdgeKeySet.add(key);
  topologyEdgeKeys.push(key);
}
const blueprintEdgeKeys=(town.proxyEdges||[]).map(townEdgeKey);
if(sorted(topologyEdgeKeys)!==sorted(blueprintEdgeKeys)) issues.push('town-topology-blueprint-edge-parity');

const step9CompletionPath='docs/preproduction/brookhaven-research/step-09-town-completion-v2.json';
const step9Completion=JSON.parse(fs.readFileSync(step9CompletionPath,'utf8'));
if(step9Completion.schemaVersion!=='starblox-brookhaven-step-9-town-completion-v2') issues.push('step9-completion-schema');
if(step9Completion.step!=='9-of-12') issues.push('step9-completion-step');
if(step9Completion.status!=='complete-neutral-town-system-hardened-runtime-not-wired-live') issues.push('step9-completion-status');
if(step9Completion.rightsStatus!=='verified-for-project-use') issues.push('step9-completion-rights');
if(step9Completion.completion?.locationDefinitions!==17) issues.push('step9-completion-location-count');
if(step9Completion.completion?.playerFacingLocations!==15) issues.push('step9-completion-player-facing-count');
if(step9Completion.completion?.researchDeferredLocations!==2) issues.push('step9-completion-deferred-count');
if(step9Completion.completion?.proxyEdges!==14) issues.push('step9-completion-edge-count');
if(step9Completion.completion?.definitionSchemaClosed!==true) issues.push('step9-completion-schema-closed');
if(step9Completion.completion?.definitionCatalogDeterministic!==true) issues.push('step9-completion-catalog-deterministic');
if(step9Completion.completion?.locationLoaderDeepFrozen!==true) issues.push('step9-completion-location-freeze');
if(step9Completion.completion?.topologyLoaderDeepFrozen!==true) issues.push('step9-completion-topology-freeze');
if(step9Completion.completion?.runtimePreviewReadOnly!==true) issues.push('step9-completion-preview-readonly');
if(step9Completion.completion?.runtimePreviewParityCheckedAgainstExistingRuntime!==true) issues.push('step9-completion-runtime-parity');
if(step9Completion.completion?.proxyTopologyParityCheckedAgainstExistingRuntime!==true) issues.push('step9-completion-topology-parity');
if(step9Completion.completion?.deferredZonesExcludedFromPlayerFacingTopology!==true) issues.push('step9-completion-deferred-boundary');
if(step9Completion.completion?.topologyKind!=='original-starblox-proxy') issues.push('step9-completion-topology-kind');
if(step9Completion.completion?.exactSourceCoordinatesClaimed!==false) issues.push('step9-completion-coordinate-claim');
if(step9Completion.completion?.exactSourceRoadLayoutClaimed!==false) issues.push('step9-completion-road-claim');
if(step9Completion.completion?.exactSourceTopologyClaimed!==false) issues.push('step9-completion-source-topology-claim');
if(step9Completion.completion?.projectRightsVerified!==true) issues.push('step9-completion-rights-flag');
if(step9Completion.completion?.externalRuntimeDependencyAllowed!==false) issues.push('step9-completion-external-runtime');
if(step9Completion.completion?.remoteDependencyAllowed!==false) issues.push('step9-completion-remote');
if(step9Completion.completion?.liveQuestRoutingEnabled!==false) issues.push('step9-completion-live-quest');
if(step9Completion.completion?.liveAppWired!==false) issues.push('step9-completion-live-app');
if(step9Completion.completion?.persistenceChanged!==false) issues.push('step9-completion-persistence');
if(step9Completion.completion?.economyChanged!==false) issues.push('step9-completion-economy');
if(step9Completion.completion?.networkingChanged!==false) issues.push('step9-completion-networking');
if(step9Completion.completion?.deploymentPerformed!==false) issues.push('step9-completion-deploy');
if(sorted(step9Completion.deferredBoundary?.ids)!==sorted(['mystery-zone','restricted-zone'])) issues.push('step9-completion-deferred-ids');
if(step9Completion.deferredBoundary?.playerFacingEligible!==false) issues.push('step9-completion-deferred-eligibility');
if(step9Completion.deferredBoundary?.topologyDegree!==0) issues.push('step9-completion-deferred-degree');
if(step9Completion.nextStepBoundary?.step9Complete!==true) issues.push('step9-completion-flag');
if(step9Completion.nextStepBoundary?.noLiveIntegrationAuthorizedByThisReceipt!==true) issues.push('step9-completion-live-authorization');

for(const [name,artifactPath] of Object.entries(step9Completion.artifacts||{})){
  if(typeof artifactPath!=='string'||!artifactPath||!fs.existsSync(artifactPath)){
    issues.push('step9-completion-artifact:'+name);
  }
}
const step9LocationLoaderSource=fs.readFileSync(step9Completion.artifacts.locationLoader,'utf8');
const step9TopologyLoaderSource=fs.readFileSync(step9Completion.artifacts.topologyLoader,'utf8');
const step9PreviewSource=fs.readFileSync(step9Completion.artifacts.runtimePreviewAdapter,'utf8');
if(!step9LocationLoaderSource.includes('loadNeutralTownLocationCatalog')) issues.push('step9-completion-location-loader-export');
if(step9LocationLoaderSource.includes('townSystemRuntime')) issues.push('step9-completion-location-loader-runtime-coupling');
if(!step9TopologyLoaderSource.includes('loadStarBloxProxyTownTopology')) issues.push('step9-completion-topology-loader-export');
if(step9TopologyLoaderSource.includes('townSystemRuntime')) issues.push('step9-completion-topology-loader-runtime-coupling');
if(!step9PreviewSource.includes('buildNeutralTownRuntimePreview')) issues.push('step9-completion-preview-export');
if(step9PreviewSource.includes('townSystemRuntime')) issues.push('step9-completion-preview-runtime-coupling');
if(step9PreviewSource.includes('unlockTownLocation')||step9PreviewSource.includes('visitTownLocation')||step9PreviewSource.includes('deriveTownRoute')) issues.push('step9-completion-preview-action-coupling');
if(step9PreviewSource.includes('App.jsx')||step9PreviewSource.includes('fetch(')||step9PreviewSource.includes('XMLHttpRequest')) issues.push('step9-completion-preview-live-coupling');

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

const progressionRuleSchemaPath='docs/preproduction/brookhaven-research/neutral-progression-rule-schema-v1.json';
const progressionRuleSchema=JSON.parse(fs.readFileSync(progressionRuleSchemaPath,'utf8'));
if(progressionRuleSchema.$id!=='starblox://schemas/neutral-progression-rule-v1') issues.push('progression-rule-schema-id');
if(progressionRuleSchema.type!=='object') issues.push('progression-rule-schema-type');
if(progressionRuleSchema.additionalProperties!==false) issues.push('progression-rule-schema-open-object');
const progressionRuleRequired=['schemaVersion','targetType','targetId','criteria','sourceRef'];
for(const field of progressionRuleRequired){
  if(!(progressionRuleSchema.required||[]).includes(field)) issues.push('progression-rule-required:'+field);
}
const progressionMetricEnum=progressionRuleSchema.properties?.criteria?.items?.properties?.metric?.enum||[];
if(sorted(progressionMetricEnum)!==sorted(['questsCompleted','stars','starWorth','masteredCount'])) issues.push('progression-rule-metric-enum');
if(progressionRuleSchema.properties?.criteria?.items?.additionalProperties!==false) issues.push('progression-criterion-open-object');
if(progressionRuleSchema.properties?.criteria?.items?.properties?.gte?.minimum!==0) issues.push('progression-threshold-minimum');

const progressionRuleCatalogPath='docs/preproduction/brookhaven-research/neutral-progression-rule-catalog-v1.json';
const progressionRuleCatalog=JSON.parse(fs.readFileSync(progressionRuleCatalogPath,'utf8'));
if(progressionRuleCatalog.schemaVersion!=='starblox-neutral-progression-rule-catalog-v1') issues.push('progression-rule-catalog-schema');
if(progressionRuleCatalog.status!=='shadow-read-only-runtime-not-wired-live') issues.push('progression-rule-catalog-status');
if(progressionRuleCatalog.ruleSchemaRef!==progressionRuleSchemaPath) issues.push('progression-rule-catalog-schema-ref');
if(progressionRuleCatalog.sourceBlueprintRef!==progressionPath) issues.push('progression-rule-catalog-blueprint-ref');
if(progressionRuleCatalog.rulePolicy!=='original-starblox-research-design-not-source-progression-parity') issues.push('progression-rule-policy');
if(progressionRuleCatalog.sourceParityClaims?.exactSourceProgression!==false) issues.push('progression-rule-source-progression-claim');
if(progressionRuleCatalog.sourceParityClaims?.exactSourceEconomy!==false) issues.push('progression-rule-source-economy-claim');
if(sorted(progressionRuleCatalog.metrics)!==sorted(['questsCompleted','stars','starWorth','masteredCount'])) issues.push('progression-rule-catalog-metrics');
if(progressionRuleCatalog.ruleCount!==42) issues.push('progression-rule-count-field');
if(progressionRuleCatalog.counts?.residential!==14) issues.push('progression-rule-residential-count-field');
if(progressionRuleCatalog.counts?.vehicle!==13) issues.push('progression-rule-vehicle-count-field');
if(progressionRuleCatalog.counts?.town!==15) issues.push('progression-rule-town-count-field');
if(progressionRuleCatalog.mutationBoundary?.readsExistingSave!==true) issues.push('progression-rule-read-save-boundary');
for(const field of ['writesExistingSave','awardsCoins','deductsCoins','awardsStars','changesStarWorth','changesXp','changesMastery','changesQuestRewards']){
  if(progressionRuleCatalog.mutationBoundary?.[field]!==false) issues.push('progression-rule-mutation:'+field);
}

const progressionRules=progressionRuleCatalog.rules||[];
if(progressionRules.length!==42) issues.push('progression-rule-catalog-count');
const progressionRuleAllowedKeys=Object.keys(progressionRuleSchema.properties||{});
const progressionCriterionAllowedKeys=Object.keys(progressionRuleSchema.properties?.criteria?.items?.properties||{});
const progressionAllowedMetrics=new Set(progressionMetricEnum);
const progressionRuleTargetKeys=new Set();
const residentialTargetIds=new Set((residential.mappings||[]).map(row=>row.neutralFeatureId));
const vehicleTargetIds=new Set(vehicleDefinitions.map(row=>row.id));
const playerFacingTownTargetIds=new Set(townDefinitions.filter(row=>row.playerFacingEligible).map(row=>row.id));
const deferredTownTargetIds=new Set(townDefinitions.filter(row=>!row.playerFacingEligible).map(row=>row.id));

for(const rule of progressionRules){
  const targetType=String(rule?.targetType||'');
  const targetId=String(rule?.targetId||'');
  const key=targetType+':'+targetId;
  if(progressionRuleTargetKeys.has(key)) issues.push('progression-rule-duplicate-target:'+key);
  progressionRuleTargetKeys.add(key);
  if(rule.schemaVersion!=='starblox-neutral-progression-rule-v1') issues.push('progression-rule-version:'+key);
  for(const field of progressionRuleRequired){
    if(!(field in (rule||{}))) issues.push('progression-rule-missing:'+key+':'+field);
  }
  for(const field of Object.keys(rule||{})){
    if(!progressionRuleAllowedKeys.includes(field)) issues.push('progression-rule-extra:'+key+':'+field);
  }
  if(!['residential','vehicle','town'].includes(targetType)) issues.push('progression-rule-target-type:'+key);
  if(targetType==='residential'&&!residentialTargetIds.has(targetId)) issues.push('progression-rule-residential-target:'+targetId);
  if(targetType==='vehicle'&&!vehicleTargetIds.has(targetId)) issues.push('progression-rule-vehicle-target:'+targetId);
  if(targetType==='town'&&!playerFacingTownTargetIds.has(targetId)) issues.push('progression-rule-town-target:'+targetId);
  if(targetType==='town'&&deferredTownTargetIds.has(targetId)) issues.push('progression-rule-deferred-town-target:'+targetId);
  if(rule.sourceRef!==progressionPath+'#'+targetType+'/'+targetId) issues.push('progression-rule-source-ref:'+key);
  const seenCriteriaMetrics=new Set();
  for(const criterion of rule.criteria||[]){
    for(const field of Object.keys(criterion||{})){
      if(!progressionCriterionAllowedKeys.includes(field)) issues.push('progression-criterion-extra:'+key+':'+field);
    }
    if(!progressionAllowedMetrics.has(criterion.metric)) issues.push('progression-criterion-metric:'+key+':'+criterion.metric);
    if(seenCriteriaMetrics.has(criterion.metric)) issues.push('progression-criterion-duplicate-metric:'+key+':'+criterion.metric);
    seenCriteriaMetrics.add(criterion.metric);
    if(!Number.isFinite(Number(criterion.gte))||Number(criterion.gte)<0) issues.push('progression-criterion-threshold:'+key+':'+criterion.metric);
  }
}
if(progressionRules.filter(row=>row.targetType==='residential').length!==14) issues.push('progression-rule-derived-residential-count');
if(progressionRules.filter(row=>row.targetType==='vehicle').length!==13) issues.push('progression-rule-derived-vehicle-count');
if(progressionRules.filter(row=>row.targetType==='town').length!==15) issues.push('progression-rule-derived-town-count');

const blueprintProgressionRules=[
  ...(progression.residential||[]),
  ...(progression.vehicles||[]),
  ...(progression.town||[])
];
const normalizeProgressionCriteria=(criteria)=>[...(criteria||[])]
  .map(row=>({metric:String(row.metric),gte:Number(row.gte)}))
  .sort((a,b)=>a.metric.localeCompare(b.metric)||a.gte-b.gte);
const blueprintProgressionByKey=new Map(blueprintProgressionRules.map(rule=>[
  rule.targetType+':'+rule.targetId,
  normalizeProgressionCriteria(rule.criteria)
]));
for(const rule of progressionRules){
  const key=rule.targetType+':'+rule.targetId;
  const expectedCriteria=blueprintProgressionByKey.get(key);
  if(!expectedCriteria){
    issues.push('progression-rule-blueprint-missing:'+key);
    continue;
  }
  if(JSON.stringify(normalizeProgressionCriteria(rule.criteria))!==JSON.stringify(expectedCriteria)){
    issues.push('progression-rule-blueprint-criteria:'+key);
  }
}
for(const key of blueprintProgressionByKey.keys()){
  if(!progressionRuleTargetKeys.has(key)) issues.push('progression-rule-catalog-missing:'+key);
}

const step10CompletionPath='docs/preproduction/brookhaven-research/step-10-progression-completion-v2.json';
const step10Completion=JSON.parse(fs.readFileSync(step10CompletionPath,'utf8'));
if(step10Completion.schemaVersion!=='starblox-brookhaven-step-10-progression-completion-v2') issues.push('step10-completion-schema');
if(step10Completion.step!=='10-of-12') issues.push('step10-completion-step');
if(step10Completion.status!=='complete-progression-shadow-hardened-runtime-not-wired-live') issues.push('step10-completion-status');
if(step10Completion.completion?.progressionRules!==42) issues.push('step10-completion-rule-count');
if(step10Completion.completion?.residentialRules!==14) issues.push('step10-completion-residential-count');
if(step10Completion.completion?.vehicleRules!==13) issues.push('step10-completion-vehicle-count');
if(step10Completion.completion?.townRules!==15) issues.push('step10-completion-town-count');
if(step10Completion.completion?.supportedMetrics!==4) issues.push('step10-completion-metric-count');
if(step10Completion.completion?.ruleSchemaClosed!==true) issues.push('step10-completion-schema-closed');
if(step10Completion.completion?.ruleCatalogDeterministic!==true) issues.push('step10-completion-catalog-deterministic');
if(step10Completion.completion?.ruleLoaderDeepFrozen!==true) issues.push('step10-completion-loader-freeze');
if(step10Completion.completion?.runtimePreviewReadOnly!==true) issues.push('step10-completion-preview-readonly');
if(step10Completion.completion?.ruleParityCheckedAgainstExistingRuntime!==true) issues.push('step10-completion-rule-parity');
if(step10Completion.completion?.evaluationParityCheckedAgainstExistingRuntime!==true) issues.push('step10-completion-evaluation-parity');
if(step10Completion.completion?.deferredTownTargetsExcluded!==true) issues.push('step10-completion-deferred-boundary');
if(step10Completion.completion?.exactSourceProgressionClaimed!==false) issues.push('step10-completion-source-progression-claim');
if(step10Completion.completion?.exactSourceEconomyClaimed!==false) issues.push('step10-completion-source-economy-claim');
if(step10Completion.completion?.readsExistingSave!==true) issues.push('step10-completion-read-save');
for(const field of ['writesExistingSave','awardsCoins','deductsCoins','awardsStars','changesStarWorth','changesXp','changesMastery','changesQuestRewards','liveAppWired','persistenceChanged','economyChanged','networkingChanged','deploymentPerformed']){
  if(step10Completion.completion?.[field]!==false) issues.push('step10-completion-mutation:'+field);
}
if(sorted(step10Completion.metricBoundary?.metrics)!==sorted(['questsCompleted','stars','starWorth','masteredCount'])) issues.push('step10-completion-metrics');
if(step10Completion.metricBoundary?.unsupportedMetricsRejected!==true) issues.push('step10-completion-unsupported-metrics');
if(step10Completion.metricBoundary?.negativeOrNonFiniteThresholdsRejected!==true) issues.push('step10-completion-threshold-boundary');
if(step10Completion.townBoundary?.playerFacingTownRuleCount!==15) issues.push('step10-completion-town-rule-count');
if(sorted(step10Completion.townBoundary?.deferredTargetIds)!==sorted(['mystery-zone','restricted-zone'])) issues.push('step10-completion-deferred-ids');
if(step10Completion.townBoundary?.deferredTargetsPresentInRules!==false) issues.push('step10-completion-deferred-targets');
if(step10Completion.nextStepBoundary?.step10Complete!==true) issues.push('step10-completion-flag');
if(step10Completion.nextStepBoundary?.noLiveIntegrationAuthorizedByThisReceipt!==true) issues.push('step10-completion-live-authorization');

for(const [name,artifactPath] of Object.entries(step10Completion.artifacts||{})){
  if(typeof artifactPath!=='string'||!artifactPath||!fs.existsSync(artifactPath)){
    issues.push('step10-completion-artifact:'+name);
  }
}
const step10RuleLoaderSource=fs.readFileSync(step10Completion.artifacts.ruleLoader,'utf8');
const step10PreviewSource=fs.readFileSync(step10Completion.artifacts.runtimePreviewAdapter,'utf8');
if(!step10RuleLoaderSource.includes('loadNeutralProgressionRuleCatalog')) issues.push('step10-completion-loader-export');
if(step10RuleLoaderSource.includes('lifeSimProgressionShadowRuntime')||step10RuleLoaderSource.includes('residentialFeatureRuntime')||step10RuleLoaderSource.includes('vehicleSystemRuntime')||step10RuleLoaderSource.includes('townSystemRuntime')) issues.push('step10-completion-loader-runtime-coupling');
if(!step10PreviewSource.includes('buildNeutralProgressionRuntimePreview')) issues.push('step10-completion-preview-export');
if(step10PreviewSource.includes('lifeSimProgressionShadowRuntime')||step10PreviewSource.includes('residentialFeatureRuntime')||step10PreviewSource.includes('vehicleSystemRuntime')||step10PreviewSource.includes('townSystemRuntime')) issues.push('step10-completion-preview-runtime-coupling');
if(step10PreviewSource.includes('localStorage')||step10PreviewSource.includes('App.jsx')||step10PreviewSource.includes('fetch(')||step10PreviewSource.includes('XMLHttpRequest')) issues.push('step10-completion-preview-live-coupling');

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

const step12Path='docs/preproduction/brookhaven-research/step-12-targeted-gap-hunt-v1.json';
const step12=JSON.parse(fs.readFileSync(step12Path,'utf8'));
if(step12.schemaVersion!=='starblox-brookhaven-step-12-gap-hunt-v1') issues.push('step12-schema');
if(step12.step!=='12-of-12') issues.push('step12-number');
if(step12.status!=='complete-targeted-github-gap-hunt') issues.push('step12-status');
if(step12.rightsContext?.status!=='verified-for-project-use') issues.push('step12-rights-status');
if((step12.searchedGaps||[]).length<8) issues.push('step12-gap-coverage');
if(step12.completion?.targetedSearchPerformed!==true) issues.push('step12-targeted-search');
if(step12.completion?.newPointersPinned!==true) issues.push('step12-new-pointers');
if(step12.completion?.deadSearchLanesRecorded!==true) issues.push('step12-dedupe');
if(step12.completion?.recoveredNewVisualPayloads!==0) issues.push('step12-payload-overclaim');
if(step12.completion?.futureSearchDedupeReady!==true) issues.push('step12-dedupe-readiness');
if(step12.completion?.twelveStepPlanComplete!==true) issues.push('step12-plan-completion');
if(step12.completion?.mergePerformed!==false) issues.push('step12-merge-boundary');
if(step12.completion?.deploymentPerformed!==false) issues.push('step12-deploy-boundary');
if((step12.postPlanPriorityQueue||[]).length<5) issues.push('step12-priority-queue');

const result={
  schemaVersion:'starblox-brookhaven-research-validation-v2',
  graphPath,
  catalogPath,
  boundaryPath,
  rightsPath,
  conversionPath,
  residentialPath,
  vehicleDefinitionSchemaPath,
  vehicleDefinitionCatalogPath,
  vehiclePath,
  step8CompletionPath,
  townPath,
  townLocationSchemaPath,
  townLocationCatalogPath,
  townTopologyPath,
  step9CompletionPath,
  progressionPath,
  progressionRuleSchemaPath,
  progressionRuleCatalogPath,
  step10CompletionPath,
  replayPath,
  readinessPath,
  step12Path,
  nodeCount:graph.nodes?.length||0,
  edgeCount:graph.edges?.length||0,
  vehicleCount:vehicle.currentVehicles?.length||0,
  vehicleDefinitionCount:vehicleDefinitions.length,
  step8Complete:step8Completion.nextStepBoundary?.step8Complete===true,
  townLocationCount:town.locations?.length||0,
  neutralTownLocationCount:townDefinitions.length,
  townProxyEdgeCount:(townTopology.edges||[]).length,
  step9Complete:step9Completion.nextStepBoundary?.step9Complete===true,
  progressionRuleCount:
    (progression.residential?.length||0)+
    (progression.vehicles?.length||0)+
    (progression.town?.length||0),
  neutralProgressionRuleCount:progressionRules.length,
  step10Complete:step10Completion.nextStepBoundary?.step10Complete===true,
  issueCount:issues.length,
  issues
};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(issues.length) process.exitCode=1;
