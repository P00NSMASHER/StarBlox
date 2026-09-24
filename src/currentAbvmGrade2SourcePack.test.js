import { describe, expect, it } from 'vitest';
import { gameModel } from './gameModel.js';
import {
  ABVM_GRADE2_FALLBACK_SOURCE
} from './currentAbvmGrade2SourcePack.js';
import {
  currentLearningSourceSnapshots
} from './currentLearningSourceSnapshots.js';
import {
  resolveSourceIds
} from './learningSourceRegistry.js';

describe('ABVM Grade 2 fallback snapshot', () => {
  it('covers exactly the six current grammar questions using the broad fallback source', () => {
    const grammar = gameModel.buildQuestions()
      .filter(question => question.id.startsWith('grammar-'))
      .sort((a,b) => a.id.localeCompare(b.id));

    const supported = ABVM_GRADE2_FALLBACK_SOURCE.claims
      .flatMap(claim => claim.supports)
      .sort();

    expect(grammar.map(question => question.id)).toEqual([
      'grammar-0','grammar-1','grammar-2',
      'grammar-3','grammar-4','grammar-5'
    ]);
    expect(supported).toEqual(grammar.map(question => question.id));

    for(const question of grammar){
      expect(resolveSourceIds(question))
        .toEqual(['abvm-grade2-current-source-pack']);
    }
  });

  it('is present in the canonical source-snapshot set with explicit in-repo provenance wording', () => {
    const snapshots = currentLearningSourceSnapshots();
    const snapshot = snapshots['abvm-grade2-current-source-pack'];

    expect(snapshot.payload.snapshotKind)
      .toBe('canonical-in-repo-fallback-representation');
    expect(snapshot.payload.provenanceNote)
      .toMatch(/not asserted to be an external original ABVM source file/i);
  });
});
