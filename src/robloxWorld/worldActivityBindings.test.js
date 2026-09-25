import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

import { deserializeBrookhavenWorldSource } from './serializedWorldParser.js';

function readText(url){
  return readFileSync(url,'utf8');
}

describe('Phase 2: verified Brookhaven world activity bindings',()=>{
  it('binds spawn and three activities to real flat surfaces in the frozen world',()=>{
    const bindings=readText(
      new URL('../../roblox/src/shared/WorldActivityBindings.luau',import.meta.url)
    );
    const ids=[...bindings.matchAll(/BHW_(\d{4})/g)].map(match=>Number(match[1]));
    expect(ids).toEqual([3461,4879,3191,4654]);
    expect(new Set(ids).size).toBe(4);

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

    for(const index of ids){
      const entry=ir.entries[index-1];
      expect(entry?.index).toBe(index);
      expect(entry.shape).toBe('Block');
      expect(entry.anchored).toBe(true);
      expect(entry.canCollide).toBe(true);
      expect(entry.transparency).toBe(0);
      expect(entry.size[1]).toBeLessThanOrEqual(3);
      expect(entry.size[0]*entry.size[2]).toBeGreaterThan(5000);
    }
  });
});
