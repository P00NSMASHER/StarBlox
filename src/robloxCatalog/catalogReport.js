
import { verifyRobloxCapabilityCatalog } from './capabilityCatalog.js';

export function capabilityCatalogMarkdown(catalog){
  const validation=verifyRobloxCapabilityCatalog(catalog);
  if(!validation.ok){
    throw new Error('invalid Roblox capability catalog: ' + validation.errors[0]);
  }

  const lines=[
    '# Roblox / Brookhaven Capability Catalog',
    '',
    'Catalog hash: ' + catalog.catalogHash,
    '',
    '## Summary',
    '',
    '- Sources: ' + catalog.summary.sourceCount,
    '- Instances: ' + catalog.summary.instanceCount,
    '- Scripts: ' + catalog.summary.scriptCount,
    '- Remotes: ' + catalog.summary.remoteCount,
    '- Unique asset IDs: ' + catalog.summary.assetIdCount,
    '- Capability groups: ' + catalog.summary.capabilityCount,
    '- System candidates: ' + catalog.summary.systemCandidateCount,
    '- Risk flags: ' + (catalog.summary.riskFlags.join(', ') || 'none'),
    '',
    '## Highest-leverage system candidates',
    ''
  ];

  for(const item of catalog.systemCandidates.slice(0,30)){
    lines.push(
      '- **' + item.name + '** — ' +
      item.engineeringLeverageScore + '/10; ' +
      item.instanceCount + ' instances; ' +
      item.scriptCount + ' scripts; ' +
      item.remoteCount + ' remotes; ' +
      'reuse: **' + item.reuseRecommendation + '**; ' +
      'capabilities: ' + (item.capabilities.join(', ') || 'unclassified')
    );
  }

  lines.push('', '## Capability coverage', '');
  for(const [name,value] of Object.entries(catalog.capabilities)){
    lines.push('- **' + name + '** — ' + value.count + ' matching instances');
  }

  lines.push('', '## Reuse review queue', '');
  const review=catalog.instances
    .filter(record => record.reuse.class === 'review' || record.reuse.class === 'refactor')
    .slice(0,100);

  for(const record of review){
    lines.push(
      '- ' + record.path + ' (' + record.className + ') — **' +
      record.reuse.class + '** — ' + record.reuse.reason
    );
  }

  lines.push('', '## Asset IDs', '');
  for(const asset of catalog.assets.slice(0,100)){
    lines.push(
      '- ' + asset.assetId + ' — ' + asset.references + ' references; examples: ' +
      asset.examples.join(', ')
    );
  }

  return lines.join('\n') + '\n';
}
