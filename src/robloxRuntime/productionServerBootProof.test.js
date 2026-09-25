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
      new URL('../../.github/workflows/step9-joinfix-exec.yml',import.meta.url),
      'utf8'
    );

    expect(rokit).toContain('rojo = "rojo-rbx/rojo@7.6.1"');
    expect(workflow).toContain('wally-v0.3.2-linux.zip');
    expect(workflow).toContain('wally install');
    expect(workflow).toContain("-name 'Matter.lua'");
    expect(workflow).toContain("-name 'ProfileStore.lua'");
  });

  it('refuses native builds and private publishes when runtime packages are omitted', () => {
    const build=readFileSync(
      new URL('../../scripts/verify-roblox-native-build.mjs',import.meta.url),
      'utf8'
    );
    const publish=readFileSync(
      new URL('../../scripts/publish-private-starblox.mjs',import.meta.url),
      'utf8'
    );

    for(const dependency of ['Matter','ProfileStore','ReplicaServer','ReplicaClient']){
      expect(build).toContain(dependency);
      expect(publish).toContain(dependency);
    }
    expect(publish).toContain('refusing to publish');
  });

  it('real-engine boot proof requires the production package and bootstrap path', () => {
    const script=buildProductionServerBootProbeScript();
    expect(script).toContain('Matter package missing from published place');
    expect(script).toContain('ProfileStore package missing from published place');
    expect(script).toContain('ReplicaServer failed to require');
    expect(script).toContain('Bootstrap.start');
    expect(script).toContain('CoreLoop service missing after bootstrap');
    expect(script).toContain('private playtest telemetry service missing after bootstrap');
    expect(script).toContain('STARBLOX_PRODUCTION_SERVER_BOOT_OK');
  });
});
