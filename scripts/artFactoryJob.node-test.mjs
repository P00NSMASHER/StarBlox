import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildBatchPlans,buildJobPlan,buildRequestPlans,deriveSeed,validateJobPlan,RIGHTS_BASIS} from './artFactoryJob.mjs';

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


test('structured request planning preserves authoritative briefs and contextual reference provenance',()=>{
  const wall9={id:'wall-9',name:'Art Gallery Wall',collectionId:'wall',type:'room',tier:3,theme:'Adventure Club'};
  const wall10={id:'wall-10',name:'Neon City Sign',collectionId:'wall',type:'room',tier:4,theme:'Cloud Pop'};
  const briefA='Wall 9 exact prepared gallery rail brief.';
  const briefB='Wall 9 exact prepared shadowbox brief.';
  const briefC='Wall 10 exact prepared acrylic skyline brief.';
  const briefD='Wall 10 exact prepared layered cloud city brief.';
  const h=s=>createHash('sha256').update(s).digest('hex');
  const request={
    schemaVersion:2,
    kind:'STARBLOX_ART_FACTORY_BATCH_REQUEST',
    planner:'12',
    producer:'13',
    reviewer:'14',
    renderOwner:'14',
    integrationOwner:'08',
    branch:'screenshot-match-preproduction',
    sourceHead:'old-request-head',
    batchId:'w13-wall-9-10-test',
    scope:['wall-9','wall-10'],
    reviewSource:{decision:'REWORK'},
    references:{originalStoreReference:{
      requiredBeforeGeneration:true,
      repositoryPath:'docs/preproduction/reference-screenshots/originals/store-1448x1086.jpeg',
      sha256:'b'.repeat(64),
      gitBlobSha:'3'.repeat(40),
      dimensions:[1448,1086],
      role:'VISUAL_DIRECTION_CONTEXT_NOT_AUTOMATIC_IP_ADAPTER_CONDITIONING'
    }},
    items:{
      'wall-9':{
        currentLegacy:{reviewDecision:'REWORK',gitBlobSha1:'9'.repeat(40),plannerSourceEvidence:'Flat wall art with weak mount depth.'},
        variants:[
          {variantId:'A-GALLERY-RAIL',seed:100,optimizerInput:briefA,optimizerInputSha256:h(briefA)},
          {variantId:'B-SHADOWBOX',seed:101,optimizerInput:briefB,optimizerInputSha256:h(briefB)}
        ]
      },
      'wall-10':{
        currentLegacy:{reviewDecision:'REWORK',gitBlobSha1:'8'.repeat(40),plannerSourceEvidence:'Generic flat sign with weak material depth.'},
        variants:[
          {variantId:'A-ACRYLIC',seed:200,optimizerInput:briefC,optimizerInputSha256:h(briefC)},
          {variantId:'B-CLOUD-CITY',seed:201,optimizerInput:briefD,optimizerInputSha256:h(briefD)}
        ]
      }
    }
  };
  const model={stats:{global:{},collection:{},tier:{}},current:new Map()};
  const batch=buildRequestPlans({
    request,requestPath:'requests/wall.json',items:[wall9,wall10],producer:'13',sourceHead:'current-head',
    modelId:'stabilityai/stable-diffusion-xl-base-1.0',modelRevision:'462165984030d82259a11f4367a4eed129e94a7b',
    model
  });
  assert.equal(batch.plans.length,2);
  assert.equal(batch.index.kind,'STARBLOX_ART_FACTORY_REQUEST_BATCH_PLAN');
  assert.equal(batch.index.contextReferences[0].sha256,'b'.repeat(64));
  assert.match(batch.plans[0].attempts[0].promptText,/Wall 9 exact prepared gallery rail brief/);
  assert.match(batch.plans[1].attempts[0].promptText,/Wall 10 exact prepared acrylic skyline brief/);
  assert.equal(batch.plans[0].requestContext.plannerVariants[0].plannerSeed,100);
  assert.notEqual(batch.plans[0].requestContext.plannerVariants[0].compiledSeed,100);
  assert(batch.plans.every(plan=>validateJobPlan(plan).length===0));
});

test('structured request planning fails closed on unresolved reference or tampered optimizer input',()=>{
  const wall={id:'wall-9',name:'Art Gallery Wall',collectionId:'wall',type:'room',tier:3,theme:'Adventure Club'};
  const brief='prepared brief';
  const base={
    kind:'STARBLOX_ART_FACTORY_BATCH_REQUEST',producer:'13',branch:'screenshot-match-preproduction',
    batchId:'test',scope:['wall-9'],reviewSource:{decision:'REWORK'},
    references:{originalStoreReference:{requiredBeforeGeneration:true}},
    items:{'wall-9':{currentLegacy:{reviewDecision:'REWORK'},variants:[
      {variantId:'A',optimizerInput:brief,optimizerInputSha256:'0'.repeat(64)},
      {variantId:'B',optimizerInput:'other',optimizerInputSha256:createHash('sha256').update('other').digest('hex')}
    ]}}
  };
  const model={stats:{global:{},collection:{},tier:{}},current:new Map()};
  const args={request:base,items:[wall],producer:'13',sourceHead:'h',modelId:'m',modelRevision:'r',model};
  assert.throws(()=>buildRequestPlans(args),/reference path\/hash\/blob is unresolved/);
  const resolved=structuredClone(base);
  resolved.references.originalStoreReference={
    requiredBeforeGeneration:true,repositoryPath:'store.jpg',sha256:'b'.repeat(64),gitBlobSha:'3'.repeat(40)
  };
  assert.throws(()=>buildRequestPlans({...args,request:resolved}),/optimizerInputSha256 mismatch/);
});
