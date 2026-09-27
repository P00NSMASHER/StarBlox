import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {
  analyzeInteractionCandidates,
  candidateReceipt,
  parseBrookhavenSerializedWorld,
} from './interactionCandidateAnalyzer.js';

function frozenSource(){
  let source='';
  for(let index=1;index<=8;index++){
    const name=String(index).padStart(4,'0');
    source+=readFileSync(new URL('../../research-inputs/brookhaven/world-baseline/source/chunk-'+name+'.txt',import.meta.url),'utf8');
  }
  return source;
}

describe('Brookhaven interaction candidate analysis',()=>{
  it('parses the exact frozen 4,936-entry world without executing Lua',()=>{
    const entries=parseBrookhavenSerializedWorld(frozenSource());
    expect(entries).toHaveLength(4936);
    expect(entries[0].id).toBe(1);
    expect(entries.at(-1).id).toBe(4936);
  });

  it('reproduces the conservative candidate counts on the frozen world',()=>{
    const analysis=analyzeInteractionCandidates(parseBrookhavenSerializedWorld(frozenSource()));

    expect(analysis.seats).toHaveLength(271);
    expect(analysis.vehicleSeats).toHaveLength(2);
    expect(analysis.likelyDoors).toHaveLength(148);
    expect(analysis.likelyGarageDoors).toHaveLength(173);
    expect(analysis.neonParts).toHaveLength(206);
    expect(analysis.smallNeon).toHaveLength(137);
  });

  it('fails closed: candidate discovery never authorizes runtime activation',()=>{
    const receipt=candidateReceipt(analyzeInteractionCandidates(parseBrookhavenSerializedWorld(frozenSource())));

    expect(receipt.schemaVersion).toBe('starblox-brookhaven-interaction-candidates-v1');
    expect(receipt.activationAllowed).toBe(false);
    expect(receipt.reviewRequired).toBe(true);
    expect(receipt.counts.likelyDoors).toBe(148);
    expect(receipt.candidateIds.vehicleSeats).toHaveLength(2);
  });
});
