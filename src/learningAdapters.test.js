import { describe, expect, it } from 'vitest';
import { createLearningEvent, toQuestionV2 } from './learningContracts.js';
import {
  appendLearningEvent,
  createLearningLedger,
  masteryEvidenceEvents
} from './learningEventLedger.js';
import { buildPsiKtSequence } from './psiKtShadowAdapter.js';
import {
  buildRiffReviewCommands,
  RIFF_RATING
} from './riffShadowAdapter.js';
import {
  adaptEdGameClawCourseStructure,
  validateInteractionCandidate
} from './edGameClawShadowAdapter.js';
import {
  pickQuestV2Shadow,
  scoreQuestionV2Shadow
} from './selectorV2Shadow.js';

function question(id,skill,role='practice',district='Lantern Lane'){
  return toQuestionV2({
    id,
    subject:'Reading',
    district,
    skill,
    role,
    prompt:'Pick the answer.',
    choices:['yes','no','maybe'],
    answer:'yes',
    explanation:'Yes.',
    hint:'Think.',
    difficulty:2,
    reward:8,
    source:'ABVM Grade 2 current source pack'
  },{contentVersion:'test-v1'});
}

describe('learning factory adapters', () => {
  it('keeps retries out of mastery evidence and PSI-KT default sequences', () => {
    const q = question('q-1','phonics');
    const first = createLearningEvent({question:q,choice:'no',timestamp:10});
    const retry = createLearningEvent({question:q,choice:'yes',timestamp:20,wasRetry:true,hintUsed:true});

    let ledger = createLearningLedger();
    ledger = appendLearningEvent(ledger,first);
    ledger = appendLearningEvent(ledger,retry);

    expect(masteryEvidenceEvents(ledger).map(e => e.eventId)).toEqual([first.eventId]);
    const psi = buildPsiKtSequence(ledger.events);
    expect(psi.correct_seq).toEqual([0]);
    expect(psi.event_ids).toEqual([first.eventId]);
  });

  it('maps wrong and assisted events to conservative Riff ratings', () => {
    const q = question('q-2','phonics');
    const wrong = createLearningEvent({question:q,choice:'no',timestamp:10});
    const retry = createLearningEvent({question:q,choice:'yes',timestamp:20,wasRetry:true});
    const reviews = buildRiffReviewCommands([wrong,retry]);

    expect(reviews[0].rating).toBe(RIFF_RATING.AGAIN);
    expect(reviews[1].rating).toBe(RIFF_RATING.HARD);
  });

  it('adapts EdGameClaw structure as non-executable shadow interaction candidates', () => {
    const candidates = adaptEdGameClawCourseStructure({
      course:{title:'Plants'},
      chunks:[{
        id:'roots',
        title:'Roots move water',
        content:'Roots absorb and move water.',
        mechanic:'custom_simulation',
        simulationHint:'Drag water through the root.'
      }]
    },{
      contentVersion:'plants-v1',
      sourceIds:['abvm-grade2-current-source-pack']
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].status).toBe('shadow-candidate');
    expect(validateInteractionCandidate(candidates[0])).toEqual([]);
    expect(candidates[0].html).toBeUndefined();
  });

  it('ranks due low-mastery skills above otherwise similar candidates while preserving quest diversity', () => {
    const now = 100 * 86400000;
    const questions = [
      question('transfer','vocabulary','transfer','Wordwood Garden'),
      question('p1','phonics','practice','Lantern Lane'),
      question('p2','spelling','practice','Lantern Lane'),
      question('s1','inference','practice','Story Street'),
      question('w1','high-frequency-words','practice','Wordwood Garden'),
      question('r1','religion-unit-1','review','Story Street')
    ];
    const profile = {
      skills:{
        phonics:{psiMastery:0.2,psiUncertainty:0.4,fsrsDue:true,lastSeenAt:0},
        spelling:{psiMastery:0.9,psiUncertainty:0.1,fsrsDue:false,lastSeenAt:0}
      }
    };

    expect(
      scoreQuestionV2Shadow(questions[1],profile,now)
    ).toBeGreaterThan(
      scoreQuestionV2Shadow(questions[2],profile,now)
    );

    const picked = pickQuestV2Shadow(questions,profile,5,now);
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map(q => q.id)).size).toBe(5);
    expect(picked.some(q => q.role === 'transfer')).toBe(true);
  });
});
