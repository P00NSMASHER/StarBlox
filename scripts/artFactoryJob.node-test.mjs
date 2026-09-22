import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildBatchPlans,buildJobPlan,deriveSeed,validateJobPlan,RIGHTS_BASIS} from './artFactoryJob.mjs';

const item={id:'decor-3',name:'Arcade Mini',collectionId:'decor',type:'room',tier:3,theme:'Arcade Pop'};
const variants=['A-PHYSICAL','B-READABILITY','C-THEME-TIER','D-REPAIR'].map((variant,i)=>{
  const promptText=`prompt-${i}-${variant}`;
  return {variant,promptBlocks:['physical','card'],promptText,promptSha256:createHash('sha256').update(promptText).digest('hex')};
});
const recommendation={sourceReviewHash:'bad-hash',variants};

test('factory job planning is deterministic and rights-bound',()=>{
  const args={item,recommendation,producer:'09',sourceHead:'abc123',modelId:'model-x',modelRevision:'rev-y'};
  const a=buildJobPlan(args),b=buildJobPlan(args);
  assert.deepEqual(a,b);
  assert.equal(a.rightsBasis,RIGHTS_BASIS);
  assert.equal(new Set(a.attempts.map(x=>x.seed)).size,4);
  assert.equal(validateJobPlan(a).length,0);
});

test('seed derives from item prompt and variant',()=>{
  const x=deriveSeed('decor-3',variants[0].promptSha256,variants[0].variant);
  const y=deriveSeed('decor-3',variants[0].promptSha256,variants[0].variant);
  assert.equal(x,y); assert(x>0);
});

test('accepted or otherwise non-generating recommendations cannot become jobs',()=>{
  assert.throws(()=>buildJobPlan({item,recommendation:{action:'PRESERVE_ACCEPTED_HASH'},producer:'09',sourceHead:'h',modelId:'m',modelRevision:'r'}),/not eligible/);
});

test('tampering with a prompt is detected',()=>{
  const p=buildJobPlan({item,recommendation,producer:'09',sourceHead:'abc123',modelId:'m',modelRevision:'r'});
  p.attempts[0].promptText+=' tampered';
  assert(validateJobPlan(p).some(x=>x.includes('prompt hash mismatch')));
});

test('producer batch planning compiles selected queue items only',()=>{
  const item2={id:'decor-4',name:'Plush Stack',collectionId:'decor',type:'room',tier:2,theme:'Candy Core'};
  const recommendation2={sourceReviewHash:'bad-2',variants};
  const queue={selected:[
    {itemId:'decor-3',producer:'09',promptRecommendation:recommendation},
    {itemId:'decor-4',producer:'09',promptRecommendation:recommendation2},
    {itemId:'wall-5',producer:'05',promptRecommendation:recommendation}
  ]};
  const batch=buildBatchPlans({
    queue,items:[item,item2],producer:'09',sourceHead:'abc123',
    modelId:'model-x',modelRevision:'rev-y'
  });
  assert.equal(batch.plans.length,2);
  assert.deepEqual(batch.plans.map(x=>x.item.id),['decor-3','decor-4']);
  assert.equal(batch.index.itemCount,2);
  assert.equal(batch.index.producer,'09');
  assert.match(batch.index.batchSha256,/^[0-9a-f]{64}$/);
  assert(batch.plans.every(plan=>validateJobPlan(plan).length===0));
});
