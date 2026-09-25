import { createHash } from 'node:crypto';
import { relative,resolve,sep } from 'node:path';

function normalizePath(value){
  return String(value).split(sep).join('/');
}

export function sha256WorldBytes(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}

function rebasePath(pathValue,fromDir,toDir){
  const absolute=resolve(fromDir,String(pathValue));
  const rel=relative(toDir,absolute);
  return normalizePath(rel || '.');
}

function rebaseTree(value,fromDir,toDir){
  if(Array.isArray(value)) return value.map(item => rebaseTree(item,fromDir,toDir));
  if(value == null || typeof value !== 'object') return value;
  const out={};
  for(const [key,child] of Object.entries(value)){
    if(key === '$path'){
      if(typeof child === 'string'){
        out[key]=rebasePath(child,fromDir,toDir);
      }else if(child && typeof child === 'object' && typeof child.optional === 'string'){
        out[key]={...child,optional:rebasePath(child.optional,fromDir,toDir)};
      }else{
        throw new Error('unsupported Rojo $path shape in base project');
      }
    }else{
      out[key]=rebaseTree(child,fromDir,toDir);
    }
  }
  return out;
}

export function buildBrookhavenStarBloxProject({
  defaultProject,
  defaultProjectDir,
  outputProjectDir,
  worldPath,
  worldBytes,
  step4Receipt
}){
  if(!defaultProject?.tree || defaultProject.tree.$className !== 'DataModel'){
    throw new Error('default StarBlox Rojo project must describe a DataModel');
  }
  const expected=step4Receipt?.output;
  if(!expected || expected.rootName !== 'BrookhavenWorldBaseline' || expected.format !== 'rbxmx'){
    throw new Error('Step 4 receipt is missing the authoritative Brookhaven world identity');
  }
  if(!(worldBytes instanceof Uint8Array) || worldBytes.byteLength === 0){
    throw new Error('generated Brookhaven world bytes are required');
  }
  const actualSha=sha256WorldBytes(worldBytes);
  if(worldBytes.byteLength !== Number(expected.bytes) || actualSha !== String(expected.sha256)){
    throw new Error(
      'generated Brookhaven world identity mismatch: expected ' +
      expected.bytes + '/' + expected.sha256 + ' got ' +
      worldBytes.byteLength + '/' + actualSha
    );
  }

  const project=rebaseTree(defaultProject,resolve(defaultProjectDir),resolve(outputProjectDir));
  project.name='StarBloxBrookhavenComposed';

  const workspace=project.tree.Workspace && typeof project.tree.Workspace === 'object'
    ? {...project.tree.Workspace}
    : {};
  if(Object.prototype.hasOwnProperty.call(workspace,'BrookhavenWorldBaseline')){
    throw new Error('base StarBlox project already defines BrookhavenWorldBaseline');
  }
  workspace.BrookhavenWorldBaseline={
    $path:normalizePath(relative(resolve(outputProjectDir),resolve(worldPath)))
  };
  project.tree.Workspace=workspace;

  return {
    project,
    receipt:{
      schemaVersion:1,
      version:'starblox-brookhaven-world-composition-v1',
      status:'composed-brookhaven-world-and-starblox-runtime',
      world:{
        rootName:'BrookhavenWorldBaseline',
        bytes:worldBytes.byteLength,
        sha256:actualSha,
        generatedEntrySequenceSha256:expected.generatedEntrySequenceSha256,
        sourceCanonicalSequenceSha256:expected.sourceCanonicalSequenceSha256,
        sourceSliceSequenceSha256:expected.sourceSliceSequenceSha256
      },
      mounts:{
        workspaceBrookhavenWorld:true,
        replicatedStorageStarBlox:Boolean(project.tree.ReplicatedStorage?.StarBlox),
        serverScriptServiceStarBlox:Boolean(project.tree.ServerScriptService?.StarBlox),
        starterPlayerStarBlox:Boolean(project.tree.StarterPlayer?.StarterPlayerScripts?.StarBlox)
      },
      boundaries:{
        baselineWorldGeometryMutationAllowed:false,
        sourceWorldFileModified:false,
        studioMutationStarted:false,
        publicationStarted:false,
        liveActivationAllowed:false
      }
    }
  };
}
