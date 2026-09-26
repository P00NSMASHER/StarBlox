import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

import { deserializeBrookhavenWorldSource } from './serializedWorldParser.js';

function readText(url){
  return readFileSync(url,'utf8');
}

describe('Phase 2: verified Brookhaven world activity bindings',()=>{
  it('spawns beside the town-center fountain and keeps activity surfaces verified',()=>{
    const bindings=readText(
      new URL('../../roblox/src/shared/WorldActivityBindings.luau',import.meta.url)
    );
    const service=readText(
      new URL('../../roblox/src/server/CoreGameLoopService.luau',import.meta.url)
    );
    const ids=[...bindings.matchAll(/BHW_(\d{4})/g)].map(match=>Number(match[1]));
    expect(ids).toEqual([1202,2442,4879,4876,3405]);
    expect(new Set(ids).size).toBe(5);

    const manifest=JSON.parse(readText(
      new URL('../../research-inputs/brookhaven/world-baseline/AUTHORITATIVE_SOURCE.json',import.meta.url)
    ));
    const step3=JSON.parse(readText(
      new URL('../../docs/roblox-world/STEP_3_SAFE_DESERIALIZATION.json',import.meta.url)
    )).receipt;
    const source=manifest.repositoryFreeze.chunks
      .slice()
      .sort((a,b)=>Number(a.order)-Number(b.order))
      .map(chunk=>readText(new URL('../../'+chunk.path,import.meta.url)))
      .join('');

    const {ir}=deserializeBrookhavenWorldSource(source,{
      sourceSha256:step3.source.sha256,
      step2FingerprintHash:step3.source.step2FingerprintHash
    });

    const spawn=ir.entries[1202-1];
    const fountain=ir.entries[2442-1];
    expect(spawn?.index).toBe(1202);
    expect(spawn.shape).toBe('Block');
    expect(spawn.anchored).toBe(true);
    expect(spawn.canCollide).toBe(true);
    expect(spawn.transparency).toBe(0);
    expect(spawn.size[0]*spawn.size[2]).toBeGreaterThan(150);
    expect(spawn.size[1]).toBeLessThanOrEqual(8);

    expect(fountain?.index).toBe(2442);
    const dx=fountain.position[0]-spawn.position[0];
    const dz=fountain.position[2]-spawn.position[2];
    expect(Math.sqrt(dx*dx+dz*dz)).toBeLessThan(20);

    for(const index of [4879,4876,3405]){
      const entry=ir.entries[index-1];
      expect(entry?.index).toBe(index);
      expect(entry.shape).toBe('Block');
      expect(entry.anchored).toBe(true);
      expect(entry.canCollide).toBe(true);
      expect(entry.transparency).toBe(0);
      expect(entry.size[1]).toBeLessThanOrEqual(3);
      expect(entry.size[0]*entry.size[2]).toBeGreaterThan(5000);
    }

    expect(bindings).toContain('FacingSourcePartName = "BHW_2442"');
    expect(service).toContain('WorldBindings.Spawn.FacingSourcePartName');
    expect(service).toContain('spawnCFrame = CFrame.lookAt(spawnPosition, fountainLookAt)');
  });
});
