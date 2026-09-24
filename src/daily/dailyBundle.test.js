
import { describe,expect,it } from 'vitest';
import { gameModel } from '../gameModel.js';
import {
  importLegacyQuestionBank,
  updateQuestionMetadata
} from '../questionBank/questionBankV2.js';
import {
  dailySeedFromDate,
  generateDailyBundleArtifact
} from './dailyBundleFactory.js';
import {
  assertDailyPublishable,
  certifyDailyBundleArtifact,
  inspectDailyBundleArtifact
} from './dailyCertification.js';

function bank(){
  return importLegacyQuestionBank(gameModel.buildQuestions(),{
    bankId:'daily-test-bank',
    title:'Daily Test Bank'
  });
}

describe('Step 14: immutable Daily Bundle generation', () => {
  it('derives a deterministic date seed and byte-stable artifact', async () => {
    const questions=bank();
    const first=await generateDailyBundleArtifact({
      date:'2026-09-24',
      bank:questions
    });
    const second=await generateDailyBundleArtifact({
      date:'2026-09-24',
      bank:questions
    });

    expect(dailySeedFromDate('2026-09-24')).toBe(first.seed);
    expect(second).toEqual(first);
    expect(first.bundle.id).toBe('daily-2026-09-24');
    const slotCount=first.bundle.levelSpec.nodes.filter(node => node.questionSlot).length;
    expect(first.bundle.questionRefs.length).toBe(slotCount);
    expect(first.questionSet).toHaveLength(slotCount);
    expect(slotCount).toBe(8);
    expect(first.generator.fallbackUsed).toBe(true);
    expect(first.generator.fallbackReasons.join(' ')).toMatch(/no primary question selector/);
  });

  it('freezes exact question contents, Question Bank snapshot, balance snapshot, and solution certificate', async () => {
    const artifact=await generateDailyBundleArtifact({
      date:'2026-09-25',
      bank:bank()
    });

    expect(artifact.questionBankSnapshot.questionCount).toBe(200);
    expect(artifact.balanceSnapshot.hash).toMatch(/^fnv1a32:[a-f0-9]{8}$/);
    expect(artifact.bundle.questionBankSnapshot.hash).toBe(artifact.questionBankSnapshot.hash);
    expect(artifact.bundle.balanceVersion).toBe('identity-v1');
    expect(artifact.bundle.certifiedSolution).toEqual(
      artifact.bundle.levelSpec.solutionCertificate
    );

    for(const frozen of artifact.questionSet){
      expect(frozen.ref.contentHash).toBe(frozen.question.contentHash);
      expect(artifact.bundle.questionRefs).toContainEqual(frozen.ref);
    }
  });

  it('falls back to a safe deterministic grid if the requested layout cannot hold the level', async () => {
    const artifact=await generateDailyBundleArtifact({
      date:'2026-09-26',
      bank:bank(),
      spec:{
        rows:2,
        columns:2,
        stageCount:5,
        optionalCount:3
      }
    });

    expect(artifact.generator.fallbackUsed).toBe(true);
    expect(artifact.generator.fallbackReasons.join(' ')).toMatch(/layout failed/);
    expect(
      artifact.bundle.levelSpec.grid.rows * artifact.bundle.levelSpec.grid.columns
    ).toBeGreaterThanOrEqual(10);
  });

  it('falls back when a primary selector returns a valid-looking but incomplete binding set', async () => {
    const seedArtifact=await generateDailyBundleArtifact({
      date:'2026-09-26',
      bank:bank()
    });
    const firstFrozen=seedArtifact.questionSet[0];

    const artifact=await generateDailyBundleArtifact({
      date:'2026-09-27',
      bank:bank(),
      questionSelector:async ({level}) => {
        const firstSlot=level.nodes.find(node => node.questionSlot);
        return [{
          nodeId:firstSlot.nodeId,
          slot:firstSlot.questionSlot,
          ref:firstFrozen.ref
        }];
      }
    });

    expect(artifact.generator.fallbackUsed).toBe(true);
    expect(artifact.generator.fallbackReasons.join(' ')).toMatch(/binding count|omitted slot/);
    const slotCount=artifact.bundle.levelSpec.nodes.filter(node => node.questionSlot).length;
    expect(artifact.questionSet).toHaveLength(slotCount);
  });

  it('falls back when a primary question selector returns malformed bindings', async () => {
    const artifact=await generateDailyBundleArtifact({
      date:'2026-09-27',
      bank:bank(),
      questionSelector:async () => [
        {nodeId:'challenge-1',slot:{ordinal:1,roleHint:'practice'},ref:{questionId:'missing',version:1,contentHash:'bad'}}
      ]
    });

    expect(artifact.generator.fallbackUsed).toBe(true);
    expect(artifact.generator.fallbackReasons.join(' ')).toMatch(/binding count|bindings were invalid/);
    const slotCount=artifact.bundle.levelSpec.nodes.filter(node => node.questionSlot).length;
    expect(artifact.questionSet).toHaveLength(slotCount);
  });
});

describe('Step 15: Daily solvability and compatibility certification', () => {
  it('certifies a generated Daily and makes it publishable', async () => {
    const questions=bank();
    const generated=await generateDailyBundleArtifact({
      date:'2026-09-28',
      bank:questions,
      spec:{
        availableCapabilities:['multiple-choice','retry','hints'],
        requiredCapabilities:['multiple-choice','retry'],
        requiresRecoveryNode:true
      }
    });

    expect(() => assertDailyPublishable(generated)).toThrow(/certified/);

    const result=certifyDailyBundleArtifact(generated,{bank:questions});
    expect(result.ok,result.report.failures).toBe(true);
    expect(result.artifact.status).toBe('certified');
    expect(result.artifact.bundle.compatibility.ok).toBe(true);
    expect(result.report.checks.every(check => check.ok)).toBe(true);
    expect(assertDailyPublishable(result.artifact)).toBe(true);
  });

  it('rejects a tampered frozen question even when the bundle ref itself was not changed', async () => {
    const generated=await generateDailyBundleArtifact({
      date:'2026-09-29',
      bank:bank()
    });
    const tampered=JSON.parse(JSON.stringify(generated));
    tampered.questionSet[0].question.prompt+=' tampered';

    const report=inspectDailyBundleArtifact(tampered);
    expect(report.ok).toBe(false);
    expect(report.failures.some(failure =>
      failure.id === 'manifest-hash' ||
      failure.id === 'frozen-question-integrity'
    )).toBe(true);
  });

  it('rejects a modifier/capability combination that would make the Daily incompatible', async () => {
    const generated=await generateDailyBundleArtifact({
      date:'2026-09-30',
      bank:bank(),
      spec:{
        availableCapabilities:['multiple-choice'],
        requiredCapabilities:['timed-answer-ui'],
        modifiers:[
          {
            id:'speed-round',
            requiresCapabilities:['timed-answer-ui']
          }
        ]
      }
    });

    const result=certifyDailyBundleArtifact(generated);
    expect(result.ok).toBe(false);
    expect(result.report.failures.some(failure =>
      failure.id === 'daily-compatibility'
    )).toBe(true);
    expect(result.report.failures.find(failure =>
      failure.id === 'daily-compatibility'
    ).detail).toMatch(/timed-answer-ui/);
  });

  it('rejects a modifier that forbids a role required by the frozen Daily question set', async () => {
    const generated=await generateDailyBundleArtifact({
      date:'2026-10-05',
      bank:bank(),
      spec:{
        modifiers:[
          {
            id:'no-transfer',
            forbidsRoles:['transfer']
          }
        ]
      }
    });

    expect(generated.questionSet.some(item => item.question.role === 'transfer')).toBe(true);
    const result=certifyDailyBundleArtifact(generated);

    expect(result.ok).toBe(false);
    const failure=result.report.failures.find(item => item.id === 'daily-compatibility');
    expect(failure?.detail).toMatch(/forbids selected question role transfer/);
  });

  it('rejects unsafe balance requests that were clamped during Daily generation', async () => {
    const generated=await generateDailyBundleArtifact({
      date:'2026-10-01',
      bank:bank(),
      balance:{
        version:'unsafe-daily',
        economy:{coinsMult:99},
        quest:{stageCountOffset:99}
      }
    });

    expect(generated.balanceSnapshot.diagnostics.length).toBeGreaterThan(0);

    const result=certifyDailyBundleArtifact(generated);
    expect(result.ok).toBe(false);
    expect(result.report.failures.some(failure =>
      failure.id === 'balance-snapshot'
    )).toBe(true);
  });

  it('rejects a question binding whose role no longer matches the certified level slot', async () => {
    const generated=await generateDailyBundleArtifact({
      date:'2026-10-02',
      bank:bank()
    });
    const tampered=JSON.parse(JSON.stringify(generated));
    const transferIndex=tampered.questionSet.findIndex(item =>
      item.slot.roleHint === 'transfer'
    );
    tampered.questionSet[transferIndex].question.role='practice';

    const report=inspectDailyBundleArtifact(tampered);
    expect(report.ok).toBe(false);
    expect(report.failures.some(failure =>
      ['frozen-question-integrity','question-slot-bindings','manifest-hash'].includes(failure.id)
    )).toBe(true);
  });

  it('can cross-check that the source Question Bank has not drifted since the Daily was frozen', async () => {
    const original=bank();
    const generated=await generateDailyBundleArtifact({
      date:'2026-10-03',
      bank:original
    });

    const first=certifyDailyBundleArtifact(generated,{bank:original});
    expect(first.ok).toBe(true);

    const changed=updateQuestionMetadata(
      original,
      Object.keys(original.questions)[0],
      {tags:['metadata-drift']}
    );
    const report=inspectDailyBundleArtifact(generated,{bank:changed});

    expect(report.ok).toBe(false);
    expect(report.failures.some(failure =>
      failure.id === 'bank-cross-check'
    )).toBe(true);
  });

  it('rejects direct tampering with the solution graph', async () => {
    const generated=await generateDailyBundleArtifact({
      date:'2026-10-04',
      bank:bank()
    });
    const tampered=JSON.parse(JSON.stringify(generated));
    tampered.bundle.levelSpec.edges.shift();

    const report=inspectDailyBundleArtifact(tampered);
    expect(report.ok).toBe(false);
    expect(report.failures.some(failure =>
      failure.id === 'solution-certificate' ||
      failure.id === 'bundle-hash'
    )).toBe(true);
  });
});
