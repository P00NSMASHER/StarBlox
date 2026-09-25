import { createHash } from 'node:crypto';
import { readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

import {
  ensurePinnedSource,
  verifyPinnedSourceBytes
} from './sourceBootstrap.js';

function pin(bytes){
  return {
    url:'https://example.test/source.rbxl',
    sha256:createHash('sha256').update(bytes).digest('hex'),
    bytes:bytes.length
  };
}

describe('same-day authorized source bootstrap',()=>{
  it('downloads missing source bytes only when the exact pin matches',async()=>{
    const bytes=Buffer.from('authorized-place-fixture');
    const root=resolve(tmpdir(),'starblox-bootstrap-'+Date.now());
    const input=resolve(root,'sources','fixture.rbxl');
    let calls=0;

    const result=await ensurePinnedSource({
      source:{id:'fixture',download:pin(bytes)},
      input,
      fetchImpl:async()=>{
        calls++;
        return {
          ok:true,
          status:200,
          arrayBuffer:async()=>bytes
        };
      }
    });

    expect(result.downloaded).toBe(true);
    expect(result.verified).toBe(true);
    expect(calls).toBe(1);
    expect(await readFile(input)).toEqual(bytes);

    const second=await ensurePinnedSource({
      source:{id:'fixture',download:pin(bytes)},
      input,
      fetchImpl:async()=>{ throw new Error('network should not be used'); }
    });
    expect(second.downloaded).toBe(false);
    expect(second.verified).toBe(true);

    await rm(root,{recursive:true,force:true});
  });

  it('rejects downloaded or existing byte drift',async()=>{
    const expected=Buffer.from('expected');
    const wrong=Buffer.from('wrong');

    expect(()=>verifyPinnedSourceBytes('fixture',wrong,pin(expected)))
      .toThrow(/fingerprint mismatch/);

    const root=resolve(tmpdir(),'starblox-bootstrap-bad-'+Date.now());
    const input=resolve(root,'fixture.rbxl');
    await expect(ensurePinnedSource({
      source:{id:'fixture',download:pin(expected)},
      input,
      fetchImpl:async()=>({
        ok:true,
        status:200,
        arrayBuffer:async()=>wrong
      })
    })).rejects.toThrow(/fingerprint mismatch/);

    await rm(root,{recursive:true,force:true});
  });

  it('fails closed on download errors',async()=>{
    const bytes=Buffer.from('expected');
    const root=resolve(tmpdir(),'starblox-bootstrap-http-'+Date.now());
    await expect(ensurePinnedSource({
      source:{id:'fixture',download:pin(bytes)},
      input:resolve(root,'fixture.rbxl'),
      fetchImpl:async()=>({ok:false,status:503})
    })).rejects.toThrow(/HTTP 503/);
    await rm(root,{recursive:true,force:true});
  });
});
