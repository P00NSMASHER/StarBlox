import { createHash } from 'node:crypto';

export const STARBLOX_WORLD_MOUNT_VERSION='starblox-world-mount-verification-v1';

function sha256(data){
  return createHash('sha256').update(data).digest('hex');
}
function fail(message){
  throw new Error('Step 5 world mount: '+message);
}
function clone(value){
  return JSON.parse(JSON.stringify(value));
}
function canonicalValue(value){
  if(Array.isArray(value)) return value.map(canonicalValue);
  if(value && typeof value === 'object'){
    return Object.fromEntries(
      Object.keys(value).sort().map(key=>[key,canonicalValue(value[key])])
    );
  }
  return value;
}
function nodeClass(node){
  return String(node?.class ?? node?.className ?? 'Unknown');
}
function nodeName(node){
  return String(node?.name ?? nodeClass(node));
}
function canonicalNode(node){
  const children=(Array.isArray(node?.children) ? node.children : [])
    .map(canonicalNode)
    .sort((a,b)=>
      a.name.localeCompare(b.name) ||
      a.className.localeCompare(b.className) ||
      JSON.stringify(a).localeCompare(JSON.stringify(b))
    );
  return {
    className:nodeClass(node),
    name:nodeName(node),
    properties:canonicalValue(node?.properties && typeof node.properties === 'object' ? node.properties : {}),
    children
  };
}
function subtreeHash(node){
  return sha256(Buffer.from(JSON.stringify(canonicalNode(node)),'utf8'));
}
function walk(node,path=[],rows=[]){
  if(!node || typeof node !== 'object') return rows;
  const name=nodeName(node);
  const next=[...path,name];
  rows.push({node,path:next});
  for(const child of Array.isArray(node.children) ? node.children : []){
    walk(child,next,rows);
  }
  return rows;
}
function pathEndsWith(path,suffix){
  if(path.length < suffix.length) return false;
  return suffix.every((value,index)=>path[path.length-suffix.length+index]===value);
}
function findUniqueByName(dom,name,label){
  const matches=walk(dom).filter(row=>nodeName(row.node)===name);
  if(matches.length !== 1) fail(label+' expected exactly one '+name+' node; found '+matches.length);
  return matches[0];
}
function findPath(dom,suffix,label){
  const matches=walk(dom).filter(row=>pathEndsWith(row.path,suffix));
  if(matches.length !== 1) fail(label+' expected exactly one path '+suffix.join('/')+'; found '+matches.length);
  return matches[0];
}
function descendantRows(node){
  return walk(node,[]).slice(1);
}
function countTree(node){
  return 1+(Array.isArray(node?.children) ? node.children.reduce((sum,child)=>sum+countTree(child),0) : 0);
}

export function createStep5MountProject(baseProject,{baselinePath='.step5-generated/BrookhavenWorldBaseline.rbxmx'}={}){
  if(baseProject?.tree?.$className !== 'DataModel') fail('base Rojo project must have a DataModel tree');
  if(Object.prototype.hasOwnProperty.call(baseProject.tree,'Workspace')){
    fail('base StarBlox Rojo project may not own Workspace during Step 5');
  }
  if(typeof baselinePath !== 'string' || !baselinePath.trim()) fail('baselinePath is required');

  const tree=clone(baseProject.tree);
  tree.Workspace={
    BrookhavenWorldBaseline:{
      $path:baselinePath
    }
  };
  return Object.freeze({
    ...clone(baseProject),
    name:'StarBloxStep5MountedWorld',
    tree
  });
}

export function verifyStep5MountedWorld({
  isolatedDom,
  mountedDom,
  exactnessLock,
  baselineShaBefore,
  baselineShaAfter
}={}){
  if(exactnessLock?.status !== 'exactness-verified-and-baseline-locked'){
    fail('verified exactness lock is required before mounting');
  }
  const expectedSha=exactnessLock?.baseline?.modelSha256;
  if(!/^[a-f0-9]{64}$/.test(expectedSha || '')) fail('exactness lock baseline SHA is invalid');
  if(baselineShaBefore !== expectedSha || baselineShaAfter !== expectedSha){
    fail('baseline model bytes changed before or during mounting');
  }
  if(exactnessLock?.readOnlyPolicy?.baselineMutationAllowed !== false ||
     exactnessLock?.readOnlyPolicy?.runtimeMayParentGameplayIntoBaseline !== false){
    fail('exactness lock does not prohibit baseline mutation/parenting');
  }

  const isolated=findUniqueByName(isolatedDom,'BrookhavenWorldBaseline','isolated world');
  const mounted=findUniqueByName(mountedDom,'BrookhavenWorldBaseline','mounted world');
  if(!pathEndsWith(mounted.path,['Workspace','BrookhavenWorldBaseline'])){
    fail('Brookhaven baseline is not mounted directly under Workspace');
  }

  const isolatedHash=subtreeHash(isolated.node);
  const mountedHash=subtreeHash(mounted.node);
  if(isolatedHash !== mountedHash){
    fail('Brookhaven baseline subtree changed during Rojo mounting/build');
  }

  const isolatedCount=countTree(isolated.node);
  const mountedCount=countTree(mounted.node);
  if(isolatedCount !== 5493 || mountedCount !== 5493){
    fail('Brookhaven baseline subtree instance count drift');
  }

  const baselineDescendants=descendantRows(mounted.node);
  const forbiddenClasses=new Set(['Script','LocalScript','ModuleScript','RemoteEvent','RemoteFunction','UnreliableRemoteEvent']);
  const forbidden=baselineDescendants.filter(row=>forbiddenClasses.has(nodeClass(row.node)));
  if(forbidden.length) fail('gameplay scripts/remotes were parented into the locked baseline');

  const runtimePaths=[
    ['ReplicatedStorage','StarBlox'],
    ['ServerScriptService','StarBlox'],
    ['StarterPlayer','StarterPlayerScripts','StarBlox']
  ];
  for(const suffix of runtimePaths){
    const row=findPath(mountedDom,suffix,'StarBlox runtime mount');
    if(pathEndsWith(row.path,['BrookhavenWorldBaseline',...suffix])){
      fail('StarBlox runtime was mounted inside Brookhaven baseline');
    }
  }

  return Object.freeze({
    schemaVersion:1,
    version:STARBLOX_WORLD_MOUNT_VERSION,
    status:'starblox-mounted-beside-locked-world',
    baseline:Object.freeze({
      modelSha256:expectedSha,
      fileBytesUnchanged:true,
      isolatedSubtreeSha256:isolatedHash,
      mountedSubtreeSha256:mountedHash,
      subtreeInstanceCount:mountedCount,
      scriptsOrRemotesAdded:0
    }),
    runtime:Object.freeze({
      mounted:true,
      mountCount:runtimePaths.length,
      mounts:Object.freeze(runtimePaths.map(path=>path.join('/'))),
      parentedIntoBaseline:false
    }),
    boundaries:Object.freeze({
      worldBaselineMutated:false,
      committedWorldAssetCreated:false,
      publicationStarted:false,
      liveActivationAllowed:false
    }),
    nextStep:'target-architecture-6-integration-and-release-gates'
  });
}


export function inspectStep6ReleaseArtifact(dom){
  const mounted=findUniqueByName(dom,'BrookhavenWorldBaseline','Step 6 release artifact');
  if(!pathEndsWith(mounted.path,['Workspace','BrookhavenWorldBaseline'])){
    fail('Step 6 release artifact baseline is not mounted directly under Workspace');
  }

  const mountedHash=subtreeHash(mounted.node);
  const mountedCount=countTree(mounted.node);
  const baselineDescendants=descendantRows(mounted.node);
  const forbiddenClasses=new Set([
    'Script','LocalScript','ModuleScript',
    'RemoteEvent','RemoteFunction','UnreliableRemoteEvent'
  ]);
  const forbidden=baselineDescendants.filter(row=>forbiddenClasses.has(nodeClass(row.node)));

  const runtimePaths=[
    ['ReplicatedStorage','StarBlox'],
    ['ServerScriptService','StarBlox'],
    ['StarterPlayer','StarterPlayerScripts','StarBlox']
  ];
  const runtimeRows=runtimePaths.map(suffix=>findPath(dom,suffix,'Step 6 StarBlox runtime mount'));
  for(const row of runtimeRows){
    if(row.path.includes('BrookhavenWorldBaseline')){
      fail('Step 6 release artifact parents StarBlox runtime into Brookhaven baseline');
    }
  }

  return Object.freeze({
    baseline:Object.freeze({
      mountedSubtreeSha256:mountedHash,
      subtreeInstanceCount:mountedCount,
      scriptsOrRemotesInsideBaseline:forbidden.length
    }),
    runtime:Object.freeze({
      mountCount:runtimePaths.length,
      mounts:Object.freeze(runtimePaths.map(path=>path.join('/'))),
      parentedIntoBaseline:false
    })
  });
}
