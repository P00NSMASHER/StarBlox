import { createHash } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import { buildBrookhavenStarBloxProject } from './placeComposer.js';

function fixture(){
  const worldBytes=Buffer.from('authoritative-world');
  const sha=createHash('sha256').update(worldBytes).digest('hex');
  const defaultProject={
    name:'StarBloxRoblox',
    tree:{
      $className:'DataModel',
      ReplicatedStorage:{
        Packages:{$path:{optional:'Packages'}},
        StarBlox:{$path:'src/shared'}
      },
      ServerScriptService:{
        StarBlox:{$path:'src/server'}
      },
      StarterPlayer:{
        StarterPlayerScripts:{
          StarBlox:{$path:'src/client'}
        }
      }
    }
  };
  const step4Receipt={
    output:{
      rootName:'BrookhavenWorldBaseline',
      format:'rbxmx',
      bytes:worldBytes.length,
      sha256:sha,
      generatedEntrySequenceSha256:'generated-sequence',
      sourceCanonicalSequenceSha256:'canonical-sequence',
      sourceSliceSequenceSha256:'source-slices'
    }
  };
  return {worldBytes,defaultProject,step4Receipt};
}

describe('Brookhaven + StarBlox Rojo composition',()=>{
  it('mounts the exact verified world beside all StarBlox runtime namespaces',()=>{
    const {worldBytes,defaultProject,step4Receipt}=fixture();
    const result=buildBrookhavenStarBloxProject({
      defaultProject,
      defaultProjectDir:'/repo/roblox',
      outputProjectDir:'/tmp/step5',
      worldPath:'/tmp/step5/BrookhavenWorldBaseline.rbxmx',
      worldBytes,
      step4Receipt
    });
    expect(result.project.name).toBe('StarBloxBrookhavenComposed');
    expect(result.project.tree.Workspace.BrookhavenWorldBaseline.$path)
      .toBe('BrookhavenWorldBaseline.rbxmx');
    expect(result.project.tree.ReplicatedStorage.StarBlox.$path)
      .toContain('repo/roblox/src/shared');
    expect(result.project.tree.ReplicatedStorage.Packages.$path.optional)
      .toContain('repo/roblox/Packages');
    expect(result.receipt.mounts).toEqual({
      workspaceBrookhavenWorld:true,
      replicatedStorageStarBlox:true,
      serverScriptServiceStarBlox:true,
      starterPlayerStarBlox:true
    });
    expect(result.receipt.boundaries.baselineWorldGeometryMutationAllowed).toBe(false);
    expect(result.receipt.boundaries.publicationStarted).toBe(false);
  });

  it('fails closed if generated world bytes do not match the Step 4 receipt',()=>{
    const {defaultProject,step4Receipt}=fixture();
    expect(()=>buildBrookhavenStarBloxProject({
      defaultProject,
      defaultProjectDir:'/repo/roblox',
      outputProjectDir:'/tmp/step5',
      worldPath:'/tmp/step5/BrookhavenWorldBaseline.rbxmx',
      worldBytes:Buffer.from('drifted-world'),
      step4Receipt
    })).toThrow(/identity mismatch/);
  });

  it('refuses a base project that already claims the authoritative world mount',()=>{
    const {worldBytes,defaultProject,step4Receipt}=fixture();
    defaultProject.tree.Workspace={BrookhavenWorldBaseline:{$path:'other.rbxmx'}};
    expect(()=>buildBrookhavenStarBloxProject({
      defaultProject,
      defaultProjectDir:'/repo/roblox',
      outputProjectDir:'/tmp/step5',
      worldPath:'/tmp/step5/BrookhavenWorldBaseline.rbxmx',
      worldBytes,
      step4Receipt
    })).toThrow(/already defines BrookhavenWorldBaseline/);
  });
});
