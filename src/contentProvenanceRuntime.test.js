import { describe, expect, it } from 'vitest';
import {
  buildContentBundle,
  provenanceDebt,
  validateContentBundle
} from './contentProvenanceRuntime.js';

const makeQuestion = (id,skill='phonics') => ({
  id,
  subject:'Reading',
  district:'Lantern Lane',
  skill,
  role:'practice',
  prompt:'Pick the correct answer.',
  choices:['yes','no','maybe'],
  answer:'yes',
  explanation:'Yes is keyed.',
  hint:'Use the clue.',
  difficulty:2,
  reward:8,
  source:'ABVM Grade 2 current source pack'
});

describe('content provenance runtime', () => {
  it('builds a deterministic bundle independent of input order', () => {
    const a = buildContentBundle(
      [makeQuestion('b'),makeQuestion('a')],
      {contentVersion:'test-v1'}
    );
    const b = buildContentBundle(
      [makeQuestion('a'),makeQuestion('b')],
      {contentVersion:'test-v1'}
    );

    expect(a.contentFingerprint).toBe(b.contentFingerprint);
    expect(a.questions.map(q => q.id)).toEqual(['a','b']);
    expect(validateContentBundle(a)).toEqual([]);
  });

  it('keeps declared-source provenance debt visible instead of pretending it is fully snapshotted', () => {
    const bundle = buildContentBundle([makeQuestion('grammar-1','language')],{
      contentVersion:'test-v1'
    });
    const debt = provenanceDebt(bundle);
    expect(debt.strictReady).toBe(false);
    expect(debt.declaredSourceCount).toBeGreaterThan(0);
    expect(validateContentBundle(bundle,{strictProvenance:true}).some(
      issue => issue.type === 'source-snapshot-required'
    )).toBe(true);
  });
});
