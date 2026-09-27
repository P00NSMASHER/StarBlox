import { describe,expect,it } from 'vitest';
import { createStep5MountProject,verifyStep5MountedWorld } from './worldMountVerification.js';

function node(className,name,children=[],properties={}){
  return {class:className,name,properties,children};
}
function baseline(){
  const children=[];
  for(let i=1;i<=5492;i++){
    children.push(node('Part','BHW_'+String(i).padStart(4,'0')));
  }
  return node('Model','BrookhavenWorldBaseline',children);
}
function isolatedDom(){
  return node('DataModel','DataModel',[
    node('Workspace','Workspace',[baseline()])
  ]);
}
function mountedDom(){
  return node('DataModel','DataModel',[
    node('ServerStorage','ServerStorage',[baseline()]),
    node('Workspace','Workspace',[]),
    node('ReplicatedStorage','ReplicatedStorage',[node('Folder','StarBlox')]),
    node('ServerScriptService','ServerScriptService',[node('Folder','StarBlox')]),
    node('StarterPlayer','StarterPlayer',[
      node('StarterPlayerScripts','StarterPlayerScripts',[node('Folder','StarBlox')])
    ])
  ]);
}
const lock={
  status:'exactness-verified-and-baseline-locked',
  baseline:{modelSha256:'a'.repeat(64)},
  readOnlyPolicy:{
    baselineMutationAllowed:false,
    runtimeMayParentGameplayIntoBaseline:false
  }
};

describe('Target architecture Step 5 StarBlox world mount boundary',()=>{
  it('mounts the immutable witness in ServerStorage and keeps Workspace runtime-owned',()=>{
    const project=createStep5MountProject({
      name:'StarBloxRoblox',
      tree:{
        $className:'DataModel',
        ReplicatedStorage:{StarBlox:{$path:'src/shared'}},
        ServerScriptService:{StarBlox:{$path:'src/server'}}
      }
    });
    expect(project.tree.ServerStorage.BrookhavenWorldBaseline.$path)
      .toBe('.step5-generated/BrookhavenWorldBaseline.rbxmx');
    expect(project.tree.Workspace).toBeUndefined();
    expect(project.tree.ReplicatedStorage.StarBlox.$path).toBe('src/shared');
  });

  it('proves the locked world is unchanged while runtime is mounted beside it',()=>{
    const receipt=verifyStep5MountedWorld({
      isolatedDom:isolatedDom(),
      mountedDom:mountedDom(),
      exactnessLock:lock,
      baselineShaBefore:'a'.repeat(64),
      baselineShaAfter:'a'.repeat(64)
    });
    expect(receipt.status).toBe('starblox-mounted-beside-locked-world');
    expect(receipt.baseline.subtreeInstanceCount).toBe(5493);
    expect(receipt.runtime.mounted).toBe(true);
    expect(receipt.runtime.parentedIntoBaseline).toBe(false);
    expect(receipt.runtime.projectionName).toBe('BrookhavenWorldRuntime');
    expect(receipt.runtime.projectionPresentInStaticArtifact).toBe(false);
    expect(receipt.baseline.witnessLocation).toBe('ServerStorage/BrookhavenWorldBaseline');
    expect(receipt.boundaries.worldBaselineMutated).toBe(false);
  });

  it('fails closed if runtime touches the baseline or Workspace is already owned',()=>{
    expect(()=>createStep5MountProject({
      tree:{$className:'DataModel',Workspace:{}}
    })).toThrow(/may not own Workspace/);

    const tampered=mountedDom();
    tampered.children[0].children[0].children[0].properties.Transparency=0.5;
    expect(()=>verifyStep5MountedWorld({
      isolatedDom:isolatedDom(),
      mountedDom:tampered,
      exactnessLock:lock,
      baselineShaBefore:'a'.repeat(64),
      baselineShaAfter:'a'.repeat(64)
    })).toThrow(/subtree changed/);
  });
});
