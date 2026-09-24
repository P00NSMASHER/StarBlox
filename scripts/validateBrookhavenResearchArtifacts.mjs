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

const result={
  schemaVersion:'starblox-brookhaven-research-validation-v1',
  graphPath,
  catalogPath,
  nodeCount:graph.nodes?.length||0,
  edgeCount:graph.edges?.length||0,
  issueCount:issues.length,
  issues
};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(issues.length) process.exitCode=1;
