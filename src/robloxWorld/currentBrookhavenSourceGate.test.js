import {describe,expect,it} from 'vitest';
import {buildCurrentBrookhavenSourceReceipt} from './currentBrookhavenSourceGate.js';

describe('current Brookhaven source candidate gate',()=>{
  it('locks exact candidate identity but does not promote it to exact parity',()=>{
    const bytes=Buffer.from('<roblox version="4"></roblox>','utf8');
    const receipt=buildCurrentBrookhavenSourceReceipt({
      candidateBytes:bytes,
      fileName:'Brookhaven-current.rbxlx',
      placeId:4924922222,
      placeVersion:123,
      capturedAt:'2026-09-26T21:30:00-04:00',
      referenceSourceSha256:'e9abef1d41b85a8f83aca36ba661de41f4321562937c1e2eea907395c292d694'
    });

    expect(receipt.status).toBe('current-live-source-candidate-captured');
    expect(receipt.candidate.bytes).toBe(bytes.length);
    expect(receipt.provenance.placeId).toBe(4924922222);
    expect(receipt.provenance.placeVersion).toBe(123);
    expect(receipt.proofState.candidateIdentityLocked).toBe(true);
    expect(receipt.proofState.structuralParityVerified).toBe(false);
    expect(receipt.proofState.renderedParityVerified).toBe(false);
    expect(receipt.proofState.exactParityClaimAllowed).toBe(false);
    expect(receipt.authority.mayReplaceFrozenReference).toBe(false);
    expect(receipt.authority.productionActivationAllowed).toBe(false);
  });

  it('rejects unsupported or unversioned candidates',()=>{
    const base={
      candidateBytes:Buffer.from('x'),
      fileName:'current.rbxlx',
      placeId:4924922222,
      placeVersion:1,
      capturedAt:'2026-09-26T21:30:00-04:00',
      referenceSourceSha256:'e9abef1d41b85a8f83aca36ba661de41f4321562937c1e2eea907395c292d694'
    };
    expect(()=>buildCurrentBrookhavenSourceReceipt({...base,fileName:'current.txt'})).toThrow();
    expect(()=>buildCurrentBrookhavenSourceReceipt({...base,placeVersion:0})).toThrow();
    expect(()=>buildCurrentBrookhavenSourceReceipt({...base,capturedAt:'not-a-time'})).toThrow();
  });
});
