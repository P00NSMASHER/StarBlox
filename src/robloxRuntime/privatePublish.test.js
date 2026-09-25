import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

import {
  STARBLOX_PRIVATE_RELEASE_ID,
  assertPublishCompatibleXml,
  buildPrivatePublishReceipt,
  probeCurrentRelease,
  publishPlaceVersion,
  verifyPublishedRelease
} from './privatePublish.js';

function response(status,payload){
  return {
    ok:status >= 200 && status < 300,
    status,
    async text(){ return JSON.stringify(payload); }
  };
}

describe('Step 5: private Roblox place publishing', () => {
  it('commits an explicit private-staging deployment marker', () => {
    const source=readFileSync(
      new URL('../../roblox/src/shared/DeploymentManifest.luau',import.meta.url),
      'utf8'
    );
    expect(source).toContain(STARBLOX_PRIVATE_RELEASE_ID);
    expect(source).toContain('releaseChannel = "private-staging"');
    expect(source).toContain('productionActivationAllowed = false');
  });

  it('rejects Roblox classes that the place publishing API cannot safely update', () => {
    expect(() => assertPublishCompatibleXml(
      '<roblox><Item class="SurfaceAppearance"></Item></roblox>'
    )).toThrow(/SurfaceAppearance/);
    expect(assertPublishCompatibleXml(
      '<roblox><Item class="Folder"></Item></roblox>'
    )).toBe(true);
  });

  it('probes the currently running release without mutating the place', async () => {
    const fetchImpl=async (url,options={}) => {
      if(options.method === 'POST'){
        const body=JSON.parse(options.body);
        expect(body.script).toContain('STARBLOX_RELEASE_PROBE');
        return response(200,{
          path:'universes/6027194615/places/17602626136/versions/1/luau-execution-sessions/a/tasks/a',
          state:'COMPLETE'
        });
      }
      if(url.endsWith('/logs')){
        return response(200,{
          messages:['STARBLOX_RELEASE_PROBE release=none version=1']
        });
      }
      throw new Error('unexpected request: ' + url);
    };

    await expect(probeCurrentRelease({
      apiKey:'key',
      universeId:'6027194615',
      placeId:'17602626136',
      fetchImpl
    })).resolves.toEqual({
      releaseId:'none',
      versionNumber:1,
      taskPath:'universes/6027194615/places/17602626136/versions/1/luau-execution-sessions/a/tasks/a'
    });
  });

  it('publishes XML bytes only to the exact StarBlox place endpoint', async () => {
    const calls=[];
    const fetchImpl=async (url,options={}) => {
      calls.push({url,options});
      return response(200,{versionNumber:2});
    };
    const bytes=Buffer.from('<roblox></roblox>');

    await expect(publishPlaceVersion({
      apiKey:'key',
      universeId:'6027194615',
      placeId:'17602626136',
      bytes,
      fetchImpl
    })).resolves.toEqual({versionNumber:2});

    expect(calls[0].url).toBe(
      'https://apis.roblox.com/universes/v1/6027194615/places/17602626136/versions?versionType=Published'
    );
    expect(calls[0].options.headers['content-type']).toBe('application/xml');
    expect(calls[0].options.body).toBe(bytes);
  });

  it('verifies the exact new place version and private release marker', async () => {
    const fetchImpl=async (url,options={}) => {
      if(options.method === 'POST'){
        const body=JSON.parse(options.body);
        expect(body.script).toContain(STARBLOX_PRIVATE_RELEASE_ID);
        expect(body.script).toContain('game.PlaceVersion == 2');
        return response(200,{
          path:'universes/6027194615/places/17602626136/versions/2/luau-execution-sessions/b/tasks/b',
          state:'COMPLETE'
        });
      }
      if(url.endsWith('/logs')){
        return response(200,{
          messages:[
            'STARBLOX_PRIVATE_PUBLISH_OK release=' +
            STARBLOX_PRIVATE_RELEASE_ID +
            ' version=2'
          ]
        });
      }
      throw new Error('unexpected request: ' + url);
    };

    const result=await verifyPublishedRelease({
      apiKey:'key',
      universeId:'6027194615',
      placeId:'17602626136',
      releaseId:STARBLOX_PRIVATE_RELEASE_ID,
      versionNumber:2,
      fetchImpl
    });
    expect(result.versionNumber).toBe(2);
  });

  it('produces a receipt that preserves the rollback version and withholds live authority', () => {
    const receipt=buildPrivatePublishReceipt({
      universeId:'6027194615',
      placeId:'17602626136',
      releaseId:STARBLOX_PRIVATE_RELEASE_ID,
      sourceCommit:'a'.repeat(40),
      previousVersion:1,
      publishedVersion:2,
      verifiedVersion:2,
      artifactSha256:'b'.repeat(64),
      artifactBytes:1234,
      verificationTaskPath:'task/path'
    });

    expect(receipt.status).toBe('published-and-verified');
    expect(receipt.versions).toEqual({
      previous:1,
      published:2,
      verified:2
    });
    expect(receipt.rollback.preservedPreviousVersion).toBe(1);
    expect(receipt.authority).toEqual({
      experienceVisibilityChangeAttempted:false,
      publicAccessChangeAttempted:false,
      liveActivationAllowed:false,
      productionActivationAllowed:false
    });
  });
});
