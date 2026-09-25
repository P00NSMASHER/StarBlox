import { describe,expect,it } from 'vitest';
import {
  hashSameDaySummaryPayload,
  verifySameDaySliceSummary
} from './finalSummary.js';

function fixture(){
  const payload={
    schemaVersion:1,
    version:'starblox-same-day-slice-summary-v2',
    ok:true,
    plan:{file:'plan.json',planHash:'fnv1a32:12345678',sha256:'a'.repeat(64)},
    completedStages:['one'],
    provenance:{
      placeSources:{
        brookhaven:{sourceId:'authorized-brookhaven',input:'Brookhaven.rbxl',sha256:'b'.repeat(64),bytes:123,downloaded:true,verified:true}
      },
      codeDonors:{
        arnis:{repository:'adpena/arnis-roblox',commit:'c'.repeat(40),checkout:'vendor/arnis'}
      },
      migrationExports:{
        brookhaven:{receipt:'sources/brookhaven/export/migration-export-receipt.json',sha256:'d'.repeat(64)}
      }
    },
    integratedRun:{file:'run.json',sha256:'e'.repeat(64)},
    gates:{
      mobile:{file:'mobile.json',sha256:'f'.repeat(64),receiptHash:'sha256:'+'1'.repeat(64),integratedRunSha256:'e'.repeat(64),metrics:{}},
      security:{file:'security.json',sha256:'2'.repeat(64),receiptHash:'sha256:'+'3'.repeat(64),integratedRunSha256:'e'.repeat(64),metrics:{}},
      performance:{file:'performance.json',sha256:'4'.repeat(64),receiptHash:'sha256:'+'5'.repeat(64),integratedRunSha256:'e'.repeat(64),metrics:{}}
    },
    publicationAllowed:false,
    readyForInternalVerticalSliceReview:true
  };
  return {...payload,summaryHash:hashSameDaySummaryPayload(payload)};
}

describe('same-day final summary',()=>{
  it('accepts a fully bound final evidence bundle',()=>{
    expect(verifySameDaySliceSummary(fixture())).toEqual({ok:true,errors:[]});
  });

  it('rejects source, donor, gate and summary tampering',()=>{
    const source=fixture();
    source.provenance.placeSources.brookhaven.verified=false;
    expect(verifySameDaySliceSummary(source).ok).toBe(false);

    const donor=fixture();
    donor.provenance.codeDonors.arnis.commit='main';
    expect(verifySameDaySliceSummary(donor).ok).toBe(false);

    const gate=fixture();
    gate.gates.mobile.integratedRunSha256='0'.repeat(64);
    expect(verifySameDaySliceSummary(gate).ok).toBe(false);

    const hash=fixture();
    hash.ok=false;
    expect(verifySameDaySliceSummary(hash).errors).toContain('summary.ok must be true');
    expect(verifySameDaySliceSummary(hash).errors).toContain('summaryHash mismatch');
  });
});
