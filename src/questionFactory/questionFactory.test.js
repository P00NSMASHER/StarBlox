
import { describe,expect,it } from 'vitest';
import { gameModel } from '../gameModel.js';
import {
  createGenerationCheckpoint,
  parseGeneratedResponse,
  runOfflineGeneration
} from './offlineQuestionFactory.js';
import {
  ingestValidatedCandidates,
  validateGeneratedCandidates
} from './questionQualityPipeline.js';
import {
  createQuestionBankSnapshot,
  importLegacyQuestionBank
} from '../questionBank/questionBankV2.js';

const CHUNKS=[
  {
    id:'chunk-culture',
    text:'Culture includes traditions, foods, music, stories, and ways of life shared by a group. A family may celebrate its culture by preparing traditional foods and singing songs together.',
    header:'Vocabulary / Culture',
    subject:'Reading',
    district:'Story Street',
    skill:'vocabulary',
    conceptIds:['culture'],
    source:'ABVM Grade 2 source fixture'
  },
  {
    id:'chunk-creation',
    text:'Creation is a gift from God. We show gratitude by caring for creation. Putting litter in the trash is one way to care for the world around us.',
    header:'Religion / Creation',
    subject:'Religion',
    district:'Wordwood Garden',
    skill:'religion-application',
    conceptIds:['creation-care'],
    source:'Religion Unit 1 source fixture'
  }
];

function generatedCulture(){
  return {
    prompt:'Which action best shows a family sharing its culture?',
    choices:[
      'Preparing traditional foods and singing family songs together.',
      'Ignoring every family tradition.',
      'Throwing away all family stories.'
    ],
    answer:'Preparing traditional foods and singing family songs together.',
    explanation:'The source says culture includes traditions, foods, music, stories, and ways of life shared by a group.',
    hint:'Look for an action involving shared traditions, food, or music.',
    subject:'Reading',
    district:'Story Street',
    skill:'vocabulary',
    role:'transfer',
    difficulty:3,
    reward:10,
    atomicFacts:[
      'Culture includes shared traditions and foods.',
      'Culture can include music and stories.'
    ],
    evidence:[
      'Culture includes traditions, foods, music, stories, and ways of life shared by a group.',
      'A family may celebrate its culture by preparing traditional foods and singing songs together.'
    ]
  };
}

function generatedCreation(){
  return {
    prompt:'Which choice shows gratitude for creation?',
    choices:[
      'Put litter in the trash after a picnic.',
      'Leave paper on the grass.',
      'Pull up healthy plants for no reason.'
    ],
    answer:'Put litter in the trash after a picnic.',
    explanation:'The source says gratitude for creation can be shown by caring for the world around us.',
    hint:'Choose the action that cares for the world.',
    subject:'Religion',
    district:'Wordwood Garden',
    skill:'religion-application',
    role:'transfer',
    difficulty:3,
    reward:10,
    atomicFacts:['Creation is a gift from God.','People can show gratitude by caring for creation.'],
    evidence:[
      'Creation is a gift from God.',
      'Putting litter in the trash is one way to care for the world around us.'
    ]
  };
}

describe('Step 8: offline question generation', () => {
  it('parses JSON and fenced JSON responses', () => {
    const raw=JSON.stringify({questions:[generatedCulture()]});
    const fence=String.fromCharCode(96).repeat(3);
    expect(parseGeneratedResponse(raw)).toHaveLength(1);
    expect(parseGeneratedResponse(fence + 'json\n' + raw + '\n' + fence)).toHaveLength(1);
  });

  it('generates candidates offline with source provenance and resumable checkpoints', async () => {
    const calls=[];
    const checkpoints=[];
    const provider={
      metadata:{provider:'fixture-provider',model:'fixture-model'},
      async generate(request){
        calls.push(request.chunk.id);
        const question=request.chunk.id === 'chunk-culture' ? generatedCulture() : generatedCreation();
        return JSON.stringify({questions:[question]});
      }
    };

    const first=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider,
      runId:'run-1',
      checkpoint:createGenerationCheckpoint({runId:'run-1'}),
      onCheckpoint:value => checkpoints.push(value)
    });

    const resumed=await runOfflineGeneration({
      chunks:CHUNKS,
      provider,
      runId:'run-1',
      checkpoint:first
    });

    expect(calls).toEqual(['chunk-culture','chunk-creation']);
    expect(checkpoints).toHaveLength(1);
    expect(resumed.processedChunkIds).toEqual(['chunk-culture','chunk-creation']);
    expect(resumed.candidates).toHaveLength(2);
    expect(resumed.candidates[0].sourceChunkId).toBe('chunk-culture');
    expect(resumed.candidates[0].generation.provider).toBe('fixture-provider');
  });

  it('records generation errors without losing completed chunks', async () => {
    let attempts=0;
    const provider={
      async generate(){
        attempts++;
        throw new Error('model unavailable');
      }
    };

    const result=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider,
      runId:'run-errors',
      maxRetries:2
    });

    expect(attempts).toBe(2);
    expect(result.processedChunkIds).toEqual(['chunk-culture']);
    expect(result.candidates).toEqual([]);
    expect(result.errors[0].error).toMatch(/unavailable/);
  });
});

describe('Step 9: validation, evidence and deduplication', () => {
  it('strictly keeps reviewer-approved grounded questions and links support chunks', async () => {
    const generated=await runOfflineGeneration({
      chunks:CHUNKS,
      provider:{
        metadata:{provider:'fixture',model:'reviewed'},
        async generate(request){
          return {questions:[
            request.chunk.id === 'chunk-culture' ? generatedCulture() : generatedCreation()
          ]};
        }
      },
      runId:'quality-run'
    });

    const reviewer={
      async review({candidates}){
        return {
          results:candidates.map(candidate => ({
            candidateId:candidate.candidateId,
            decision:'keep',
            score:95,
            reasons:['grounded and clear']
          }))
        };
      }
    };

    const result=await validateGeneratedCandidates({
      candidates:generated.candidates,
      chunks:CHUNKS,
      reviewer,
      mode:'strict',
      minScore:80
    });

    expect(result.reviewerFailed).toBe(false);
    expect(result.accepted).toHaveLength(2);
    expect(result.rejected).toHaveLength(0);
    expect(result.duplicates).toHaveLength(0);
    expect(result.accepted.every(item => item.quality.verifiedEvidence.length > 0)).toBe(true);
    expect(result.accepted.every(item => item.supportingChunkIds.includes(item.sourceChunkId))).toBe(true);
  });

  it('fails closed in strict mode when reviewer output is missing', async () => {
    const generated=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider:{async generate(){ return {questions:[generatedCulture()]}; }},
      runId:'strict-failure'
    });

    const result=await validateGeneratedCandidates({
      candidates:generated.candidates,
      chunks:CHUNKS,
      reviewer:null,
      mode:'strict',
      minScore:80
    });

    expect(result.reviewerFailed).toBe(true);
    expect(result.accepted).toHaveLength(0);
    expect(result.rejected).toHaveLength(1);
  });

  it('rejects evidence quotes that are not actually present in source material', async () => {
    const generated=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider:{
        async generate(){
          const question=generatedCulture();
          question.evidence=['This sentence does not exist in the source.'];
          return {questions:[question]};
        }
      },
      runId:'bad-evidence'
    });

    const reviewer={
      async review({candidates}){
        return {results:candidates.map(candidate => ({
          candidateId:candidate.candidateId,decision:'keep',score:99,reasons:[]
        }))};
      }
    };

    const result=await validateGeneratedCandidates({
      candidates:generated.candidates,
      chunks:CHUNKS,
      reviewer,
      mode:'strict'
    });

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0].quality.evidenceErrors.join(' ')).toMatch(/not found/);
  });

  it('requires evidence quotes to preserve exact case and punctuation', async () => {
    const generated=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider:{
        async generate(){
          const question=generatedCulture();
          question.evidence=[
            'culture includes traditions, foods, music, stories, and ways of life shared by a group.'
          ];
          return {questions:[question]};
        }
      },
      runId:'exact-evidence'
    });

    const reviewer={
      async review({candidates}){
        return {results:candidates.map(candidate => ({
          candidateId:candidate.candidateId,decision:'keep',score:99,reasons:[]
        }))};
      }
    };

    const result=await validateGeneratedCandidates({
      candidates:generated.candidates,
      chunks:CHUNKS,
      reviewer,
      mode:'strict'
    });

    expect(result.accepted).toHaveLength(0);
    expect(result.rejected[0].quality.evidenceErrors.join(' ')).toMatch(/not found exactly/);
  });

  it('supports reviewer rewrite but re-validates the rewritten structure and evidence', async () => {
    const generated=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider:{async generate(){ return {questions:[generatedCulture()]}; }},
      runId:'rewrite-run'
    });
    const original=generated.candidates[0];

    const reviewer={
      async review(){
        return {results:[{
          candidateId:original.candidateId,
          decision:'rewrite',
          score:93,
          reasons:['make stem more direct'],
          revised:{prompt:'Which family activity is an example of culture?'}
        }]};
      }
    };

    const result=await validateGeneratedCandidates({
      candidates:[original],
      chunks:CHUNKS,
      reviewer,
      mode:'strict'
    });

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0].prompt).toBe('Which family activity is an example of culture?');
    expect(result.accepted[0].quality.reviewerDecision).toBe('rewrite');
  });

  it('deduplicates near-identical candidates', async () => {
    const generated=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider:{
        async generate(){
          const a=generatedCulture();
          const b={...generatedCulture(),prompt:'Which action best shows a family sharing their culture?'};
          return {questions:[a,b]};
        }
      },
      runId:'dedup-run',
      questionsPerChunk:2
    });

    const reviewer={
      async review({candidates}){
        return {results:candidates.map(candidate => ({
          candidateId:candidate.candidateId,decision:'keep',score:95,reasons:[]
        }))};
      }
    };

    const result=await validateGeneratedCandidates({
      candidates:generated.candidates,
      chunks:CHUNKS,
      reviewer,
      mode:'strict',
      similarityThreshold:0.75
    });

    expect(result.accepted).toHaveLength(1);
    expect(result.duplicates).toHaveLength(1);
  });

  it('ingests only validated candidates as pending non-production Question Bank entries', async () => {
    const bank=importLegacyQuestionBank(gameModel.buildQuestions());
    const before=createQuestionBankSnapshot(bank);
    const generated=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider:{async generate(){ return {questions:[generatedCulture()]}; }},
      runId:'ingest-run'
    });
    const reviewer={
      async review({candidates}){
        return {results:candidates.map(candidate => ({
          candidateId:candidate.candidateId,decision:'keep',score:97,reasons:[]
        }))};
      }
    };
    const quality=await validateGeneratedCandidates({
      candidates:generated.candidates,
      chunks:CHUNKS,
      reviewer,
      bank,
      mode:'strict'
    });

    expect(quality.accepted).toHaveLength(1);
    const ingested=ingestValidatedCandidates(bank,quality.accepted);
    const after=createQuestionBankSnapshot(ingested.bank);

    expect(ingested.inserted).toHaveLength(1);
    expect(ingested.inserted[0].lifecycle).toBe('pending');
    expect(after.questionCount).toBe(before.questionCount);
    expect(ingested.bank.questions[ingested.inserted[0].questionId].lifecycle).toBe('pending');

    const stored=ingested.bank.questions[ingested.inserted[0].questionId]
      .versions[String(ingested.inserted[0].version)];
    const evidenceRows=stored.provenance.filter(item => item.kind === 'verified-evidence');
    const reviewRow=stored.provenance.find(item => item.kind === 'quality-review');
    expect(evidenceRows.length).toBeGreaterThan(0);
    expect(evidenceRows.some(item =>
      item.label === 'Culture includes traditions, foods, music, stories, and ways of life shared by a group.' &&
      item.reference.startsWith('chunk-hash:')
    )).toBe(true);
    expect(reviewRow?.label).toMatch(/^strict:keep:/);
    expect(reviewRow?.reference).toMatch(/^validation-receipt:/);
  });

  it('rejects post-review candidate mutation at the ingestion boundary', async () => {
    const bank=importLegacyQuestionBank(gameModel.buildQuestions());
    const generated=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider:{async generate(){ return {questions:[generatedCulture()]}; }},
      runId:'post-review-mutation'
    });
    const reviewer={
      async review({candidates}){
        return {results:candidates.map(candidate => ({
          candidateId:candidate.candidateId,decision:'keep',score:97,reasons:[]
        }))};
      }
    };
    const quality=await validateGeneratedCandidates({
      candidates:generated.candidates,
      chunks:CHUNKS,
      reviewer,
      bank,
      mode:'strict'
    });

    const tampered=JSON.parse(JSON.stringify(quality.accepted[0]));
    tampered.answer='Ignoring every family tradition.';

    expect(() => ingestValidatedCandidates(bank,[tampered]))
      .toThrow(/validation receipt does not match candidate content/);
  });

  it('does not allow generated ingestion to override pending lifecycle', async () => {
    const bank=importLegacyQuestionBank(gameModel.buildQuestions());
    const generated=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider:{async generate(){ return {questions:[generatedCulture()]}; }},
      runId:'pending-only'
    });
    const reviewer={
      async review({candidates}){
        return {results:candidates.map(candidate => ({
          candidateId:candidate.candidateId,decision:'keep',score:97,reasons:[]
        }))};
      }
    };
    const quality=await validateGeneratedCandidates({
      candidates:generated.candidates,
      chunks:CHUNKS,
      reviewer,
      bank,
      mode:'strict'
    });

    expect(() => ingestValidatedCandidates(bank,quality.accepted,{
      lifecycle:'published'
    })).toThrow(/only be ingested with pending lifecycle/);
  });

  it('refuses ingestion of candidates that did not pass strict independent review', async () => {
    const bank=importLegacyQuestionBank(gameModel.buildQuestions());
    const generated=await runOfflineGeneration({
      chunks:CHUNKS.slice(0,1),
      provider:{async generate(){ return {questions:[generatedCulture()]}; }},
      runId:'deterministic-only'
    });
    const quality=await validateGeneratedCandidates({
      candidates:generated.candidates,
      chunks:CHUNKS,
      bank,
      mode:'deterministic'
    });

    expect(quality.accepted).toHaveLength(1);
    expect(() => ingestValidatedCandidates(bank,quality.accepted))
      .toThrow(/requires a strict review receipt/);
  });
});
