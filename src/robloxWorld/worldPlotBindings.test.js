import { readFileSync } from 'node:fs';
import { describe,expect,it } from 'vitest';

import { deserializeBrookhavenWorldSource } from './serializedWorldParser.js';

function readText(url){
  return readFileSync(url,'utf8');
}

describe('Phase 8: verified Brookhaven house-plot bindings',()=>{
  it('binds eight runtime house plots to large separated flat surfaces in the frozen world',()=>{
    const bindings=readText(
      new URL('../../roblox/src/shared/WorldPlotBindings.luau',import.meta.url)
    );
    const ids=[...bindings.matchAll(/BHW_(\d{4})/g)].map(match=>Number(match[1]));
    expect(ids).toEqual([2966,4341,4044,4583,3700,4034,3285,1560]);
    expect(new Set(ids).size).toBe(8);

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

    const resolved=ids.map(index=>{
      const entry=ir.entries[index-1];
      expect(entry?.index).toBe(index);
      expect(entry.shape).toBe('Block');
      expect(entry.anchored).toBe(true);
      expect(entry.canCollide).toBe(true);
      expect(entry.transparency).toBe(0);
      expect(entry.size[1]).toBeLessThanOrEqual(2);
      expect(entry.size[0]).toBeGreaterThanOrEqual(20);
      expect(entry.size[2]).toBeGreaterThanOrEqual(20);
      expect(entry.size[0]*entry.size[2]).toBeGreaterThanOrEqual(900);
      return entry;
    });

    for(let i=0;i<resolved.length;i++){
      for(let j=i+1;j<resolved.length;j++){
        const a=resolved[i].position,b=resolved[j].position;
        const dx=a[0]-b[0],dz=a[2]-b[2];
        expect(Math.sqrt(dx*dx+dz*dz)).toBeGreaterThan(40);
      }
    }
  });
});
