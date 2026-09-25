import {describe,expect,it} from 'vitest';
import {createBrookhavenMountedProject} from './worldMountProject.js';

describe('Target architecture Step 5 Brookhaven mount project',()=>{
  it('adds only the locked world mount and preserves StarBlox roots',()=>{
    const base={
      name:'StarBloxRoblox',
      tree:{
        $className:'DataModel',
        ReplicatedStorage:{StarBlox:{$path:'src/shared'}},
        ServerScriptService:{StarBlox:{$path:'src/server'}},
        StarterPlayer:{StarterPlayerScripts:{StarBlox:{$path:'src/client'}}}
      }
    };
    const mounted=createBrookhavenMountedProject(base,'../tmp/BrookhavenWorldBaseline.rbxmx');
    expect(mounted.name).toBe('StarBloxBrookhavenMounted');
    expect(mounted.tree.Workspace.BrookhavenWorldBaseline.$path)
      .toBe('../tmp/BrookhavenWorldBaseline.rbxmx');
    expect(mounted.tree.ReplicatedStorage).toEqual(base.tree.ReplicatedStorage);
    expect(mounted.tree.ServerScriptService).toEqual(base.tree.ServerScriptService);
    expect(mounted.tree.StarterPlayer).toEqual(base.tree.StarterPlayer);
    expect(base.tree.Workspace).toBeUndefined();
  });

  it('fails closed if a Brookhaven world mount already exists',()=>{
    expect(()=>createBrookhavenMountedProject({
      tree:{Workspace:{BrookhavenWorldBaseline:{$path:'other.rbxmx'}}}
    },'world.rbxmx')).toThrow(/already defines/);
  });
});
