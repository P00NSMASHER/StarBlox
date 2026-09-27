import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

function arg(name,def=null){
  const inline=process.argv.find(v=>v.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0?process.argv[i+1]:def;
}
const sanitizationPath=resolve(arg('--sanitization','docs/roblox-world/LEGACY_BROOKHAVEN_GEOMETRY_SANITIZATION.json'));
const sourcePath=resolve(arg('--source','research-inputs/brookhaven/legacy-reference/SOURCE.json'));
const out=resolve(arg('--out','docs/roblox-world/LEGACY_BROOKHAVEN_GEOMETRY_BREADTH_GATE.json'));
const [s,source]=await Promise.all([
  readFile(sanitizationPath,'utf8').then(JSON.parse),
  readFile(sourcePath,'utf8').then(JSON.parse)
]);
if(s.status!=='legacy-brookhaven-geometry-sanitized') throw new Error('sanitization receipt required');
if(s.output.geometryCount!==14459 || s.output.forbiddenGameplayClassCount!==0 || s.output.allGeometryAnchored!==true){
  throw new Error('sanitized geometry gate prerequisites failed');
}
if(s.policy.sourceCodeExecuted!==false || s.policy.sourceCodeEvaluated!==false){
  throw new Error('legacy source code execution boundary drift');
}
const gate={
  schemaVersion:1,
  status:'development-geometry-breadth-p0-closed',
  classification:'legacy_reference_source',
  source:{
    repository:source.source.repository,
    path:source.source.path,
    sourceCommit:source.source.sourceCommit,
    sourceSha256:source.source.sha256
  },
  breadth:{
    legacyWorkspaceGeometry:14459,
    sanitizedDevelopmentGeometry:s.output.geometryCount,
    coverage:s.output.geometryCount/14459,
    previousFlattenedBaselineGeometry:4936,
    safeVisualChildren:s.output.safeVisualChildCount
  },
  safety:{
    forbiddenGameplayClasses:s.output.forbiddenGameplayClassCount,
    scriptsRemoved:s.policy.scriptsRemoved,
    remotesRemoved:s.policy.remotesRemoved,
    clickDetectorsRemoved:s.policy.clickDetectorsRemoved,
    proximityPromptsRemoved:s.policy.proximityPromptsRemoved,
    allGeometryAnchored:s.output.allGeometryAnchored,
    sourceCodeExecuted:s.policy.sourceCodeExecuted,
    sourceCodeEvaluated:s.policy.sourceCodeEvaluated
  },
  artifact:{
    deterministicModelSha256:s.output.sha256,
    deterministicModelBytes:s.output.bytes,
    generatedNamePattern:s.output.generatedNamePattern,
    workflowArtifactName:'legacy-brookhaven-geometry-baseline',
    committedBinary:false,
    reproducibleFromPinnedSource:true
  },
  activation:{
    automaticOverlayIntoCurrentFlattenedWorld:false,
    reason:'Legacy safe-world candidate is assembled separately; never overlay two unrelated coordinate/topology baselines.',
    nextUse:'Mount this complete sanitized source as the immutable witness in the dedicated legacy-development candidate.'
  },
  boundaries:{
    developmentGeometryBreadthP0Closed:true,
    currentLiveCertificationSatisfied:false,
    exactParityClaimAllowed:false,
    productionActivationAllowed:false
  }
};
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(gate,null,2)+'\n');
process.stdout.write(JSON.stringify(gate,null,2)+'\n');
