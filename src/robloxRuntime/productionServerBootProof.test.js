import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

import {
  buildProductionServerBootProbeScript
} from './productionServerBootProof.js';

describe('Step 9 joinability: production server boot gate', () => {
  it('pins Wally and installs packages before Roblox builds', () => {
    const rokit=readFileSync(
      new URL('../../rokit.toml',import.meta.url),
      'utf8'
    );
    const workflow=readFileSync(
      new URL('../../.github/workflows/ci.yml',import.meta.url),
      'utf8'
    );

    expect(rokit).toContain('wally = "UpliftGames/wally@0.3.2"');
    expect(workflow).toContain('wally install');
    expect(workflow).toContain('test -e Packages/Matter.lua');
    expect(workflow).toContain('test -e ServerPackages/ProfileStore.lua');
  });

  it('requires runtime packages and the native Step 6 artifact gate before release', () => {
    const build=readFileSync(
      new URL('../../scripts/verify-roblox-native-build.mjs',import.meta.url),
      'utf8'
    );
    const releaseGate=readFileSync(
      new URL('../../scripts/prepare-step6-release-gate.mjs',import.meta.url),
      'utf8'
    );

    for(const dependency of ['Matter','ProfileStore','ReplicaServer','ReplicaClient']){
      expect(build).toContain(dependency);
    }
    expect(releaseGate).toContain('inspectStep6ReleaseArtifact');
    expect(releaseGate).toContain('buildStep6ReleaseGate');
  });

  it('binds the production boot proof to the exact published place version', () => {
    const script=buildProductionServerBootProbeScript({expectedVersion:42});
    expect(script).toContain('game.PlaceVersion == 42');
    expect(script).toContain('unexpected published version');
  });

  it('real-engine boot proof requires the production package and bootstrap path', () => {
    const script=buildProductionServerBootProbeScript();
    expect(script).toContain('Matter package missing from published place');
    expect(script).toContain('ProfileStore package missing from published place');
    expect(script).toContain('ReplicaServer failed to require');
    expect(script).toContain('Bootstrap.start');
    expect(script).toContain('CoreLoop service missing after bootstrap');
    expect(script).toContain('private playtest telemetry service missing after bootstrap');
    expect(script).toContain('verified Brookhaven world mount missing');
    expect(script).toContain('Brookhaven serialized class count mismatch');
    expect(script).toContain('unexpected runtime Glue joint count');
    expect(script).toContain('Brookhaven serialized-equivalent count mismatch');
    expect(script).toContain('Brookhaven live runtime count mismatch');
    expect(script).toContain('STARBLOX_PRODUCTION_SERVER_BOOT_OK');
  });
});
