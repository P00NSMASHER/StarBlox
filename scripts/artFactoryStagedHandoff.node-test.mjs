import test from 'node:test';
import assert from 'node:assert/strict';
import {buildStagedHandoff,verifyStagedHandoff} from './artFactoryStagedHandoff.mjs';

const queue={
  kind:'STARBLOX_ART_FACTORY_CPU_GENERATION_QUEUE',
  branch:'screenshot-match-preproduction',
  queueId:'w03-desk10-v15-mic-studio',
  producer:'03',
  items:['desks-10'],
  reviewerByItem:{'desks-10':'05'}
};
const staged={
  kind:'STARBLOX_ART_FACTORY_STAGED_OUTPUT',
  status:'STAGED_EXACT_BYTES_VERIFIED',
  item:{id:'desks-10'},
  attempt:{producer:'03'},
  output:{
    repoPath:'public/assets/catalog-candidates/cpu/desks-10-v15.png',
    gitBlobSha:'a'.repeat(40),
    sha256:'b'.repeat(64)
  },
  review:{reviewer:'05',routing:{queueId:'w03-desk10-v15-mic-studio'}}
};

test('binds exact candidate to immutable staged commit',()=>{
  const handoff=buildStagedHandoff({
    queue,
    stagedOutputs:[staged],
    stagedCommitSha:'c'.repeat(40),
    generationSourceSha:'d'.repeat(40),
    workflowRunId:'123',
    blobAtPath:{'public/assets/catalog-candidates/cpu/desks-10-v15.png':'a'.repeat(40)}
  });
  assert.equal(handoff.kind,'STARBLOX_ART_FACTORY_STAGED_HANDOFF');
  assert.equal(handoff.stagedCommitSha,'c'.repeat(40));
  assert.equal(handoff.items[0].gitBlobSha,'a'.repeat(40));
  assert.equal(handoff.policy.downstreamQaMustUseStagedCommitSha,true);
});

test('fails closed when immutable commit does not contain exact blob',()=>{
  assert.throws(()=>buildStagedHandoff({
    queue,
    stagedOutputs:[staged],
    stagedCommitSha:'c'.repeat(40),
    generationSourceSha:'d'.repeat(40),
    blobAtPath:{'public/assets/catalog-candidates/cpu/desks-10-v15.png':'e'.repeat(40)}
  }),/immutable commit blob mismatch/);
});

test('fails closed on reviewer routing mismatch',()=>{
  const bad=structuredClone(staged);
  bad.review.reviewer='01';
  assert.throws(()=>buildStagedHandoff({
    queue,
    stagedOutputs:[bad],
    stagedCommitSha:'c'.repeat(40),
    generationSourceSha:'d'.repeat(40),
    blobAtPath:{'public/assets/catalog-candidates/cpu/desks-10-v15.png':'a'.repeat(40)}
  }),/reviewer route mismatch/);
});

test('requires a full immutable staged SHA',()=>{
  assert.throws(()=>buildStagedHandoff({
    queue,
    stagedOutputs:[staged],
    stagedCommitSha:'short',
    generationSourceSha:'d'.repeat(40),
    blobAtPath:{'public/assets/catalog-candidates/cpu/desks-10-v15.png':'a'.repeat(40)}
  }),/immutable staged commit SHA required/);
});

test('verifies immutable checkout against staged handoff',()=>{
  const handoff=buildStagedHandoff({
    queue,
    stagedOutputs:[staged],
    stagedCommitSha:'c'.repeat(40),
    generationSourceSha:'d'.repeat(40),
    blobAtPath:{'public/assets/catalog-candidates/cpu/desks-10-v15.png':'a'.repeat(40)}
  });
  const result=verifyStagedHandoff({
    handoff,
    checkoutSha:'c'.repeat(40),
    blobAtPath:{'public/assets/catalog-candidates/cpu/desks-10-v15.png':'a'.repeat(40)}
  });
  assert.equal(result.itemCount,1);
});

test('rejects moving branch checkout even when candidate blob still exists',()=>{
  const handoff=buildStagedHandoff({
    queue,
    stagedOutputs:[staged],
    stagedCommitSha:'c'.repeat(40),
    generationSourceSha:'d'.repeat(40),
    blobAtPath:{'public/assets/catalog-candidates/cpu/desks-10-v15.png':'a'.repeat(40)}
  });
  assert.throws(()=>verifyStagedHandoff({
    handoff,
    checkoutSha:'e'.repeat(40),
    blobAtPath:{'public/assets/catalog-candidates/cpu/desks-10-v15.png':'a'.repeat(40)}
  }),/checkout SHA mismatch/);
});
