import {describe,expect,it} from 'vitest';
import {normalizeDonorAdapterSpec,verifyDonorAdapterSpec} from './donorAdapterSpec.js';

const base=()=>({
  schemaVersion:1,
  donorId:'demo',
  repository:'owner/repo',
  commit:'a'.repeat(40),
  sourceFiles:[{path:'src/A.luau',blobSha:'b'.repeat(40)}],
  mappings:[{
    id:'demo-map',
    sources:['src/A.luau'],
    targets:['roblox/src/server/DemoAdapter.luau'],
    strategy:'port-minimum',
    authority:'StarBlox server'
  }],
  preserveAuthority:['ProfileSessionService','ReplicaStateService'],
  forbidden:['replace persistence'],
  acceptance:['tests pass']
});

describe('donor adapter spec',()=>{
  it('normalizes deterministically',()=>{
    expect(normalizeDonorAdapterSpec(base())).toEqual(normalizeDonorAdapterSpec(base()));
    expect(verifyDonorAdapterSpec(base(),{
      donorId:'demo',repository:'owner/repo',commit:'a'.repeat(40)
    }).ok).toBe(true);
  });
  it('rejects drift and unpinned mappings',()=>{
    const bad=base();
    bad.mappings[0].sources=['src/Missing.luau'];
    expect(verifyDonorAdapterSpec(bad).ok).toBe(false);
    expect(verifyDonorAdapterSpec(base(),{commit:'c'.repeat(40)}).ok).toBe(false);
  });
  it('requires StarBlox persistence and replica authority',()=>{
    const bad=base();
    bad.preserveAuthority=[];
    const result=verifyDonorAdapterSpec(bad);
    expect(result.errors.join(' ')).toMatch(/ProfileSessionService|ReplicaStateService/);
  });
});
