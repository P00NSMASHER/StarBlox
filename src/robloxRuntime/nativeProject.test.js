import { access,readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe,expect,it } from 'vitest';

const root=process.cwd();

async function readJson(path){
  return JSON.parse(await readFile(resolve(root,path),'utf8'));
}

describe('native Roblox Studio project boundary', () => {
  it('keeps every Rojo source path backed by repository files', async () => {
    const project=await readJson('roblox/default.project.json');

    expect(project.name).toBe('StarBloxRoblox');
    expect(project.tree?.ReplicatedStorage?.StarBlox?.$path).toBe('src/shared');
    expect(project.tree?.ServerScriptService?.StarBlox?.$path).toBe('src/server');
    expect(
      project.tree?.StarterPlayer?.StarterPlayerScripts?.StarBlox?.$path
    ).toBe('src/client');

    await Promise.all([
      access(resolve(root,'roblox/src/shared/Config.luau')),
      access(resolve(root,'roblox/src/server/Bootstrap.server.luau')),
      access(resolve(root,'roblox/src/client/Bootstrap.client.luau'))
    ]);
  });

  it('keeps step 1 staging-only and preserves the web runtime', async () => {
    const state=await readJson('roblox/migration-state.json');

    expect(state.currentStep?.number).toBeGreaterThanOrEqual(1);
    expect(state.currentStep?.status).toBe('complete');
    expect(state.runtimeAuthority).toEqual(expect.objectContaining({
      robloxStudio:'staging-target',
      webRuntime:'preserved',
      publicationAllowed:false,
      liveActivationAllowed:false
    }));
  });

  it('binds the native place to a fail-closed Studio sync baseline', async () => {
    const baseline=await readJson('roblox/native-place-baseline.json');

    expect(baseline).toEqual(expect.objectContaining({
      status:'repository-verified-sync-ready',
      placeProject:'roblox/default.project.json',
      placeName:'StarBloxRoblox'
    }));
    expect(baseline.studioConnector).toEqual(expect.objectContaining({
      project:'roblox/devFactoryPlugin/default.project.json',
      protocol:'starblox-studio-connector-v1',
      livePeerAttestationRequired:true
    }));
    expect(baseline.proof).toEqual(expect.objectContaining({
      placeBuildRequired:true,
      connectorBuildRequired:true,
      rojoServeEndpointRequired:true,
      liveStudioPeerAttested:false
    }));
    expect(baseline.authority).toEqual({
      publicationAllowed:false,
      liveActivationAllowed:false,
      productionDataMutationAllowed:false
    });
  });
});
