import test from 'node:test';
import assert from 'node:assert/strict';
import {attachPromptRecommendations,buildRegenerationQueue} from './artRegenerationQueue.mjs';

const base={observations:[],current:[]};
test('freezes accepted hashes',()=>{
  const corpus={...base,current:[{itemId:'wall-1',collectionId:'wall',assetHash:'a',decision:'ACCEPT',independent:true,failureCodes:[]}]};
  const q=buildRegenerationQueue({corpus});
  assert.equal(q.selected.length,0); assert.equal(q.preserve[0].reason,'PRESERVE_ACCEPTED_EXACT_HASH');
});
test('routes technical defects away from generation',()=>{
  const row={itemId:'tops-11',collectionId:'tops',assetHash:'a',decision:'REWORK',independent:true,failureCodes:['TECHNICAL_INTEGRITY'],reviewer:'01',producer:'09'};
  const q=buildRegenerationQueue({corpus:{observations:[row],current:[row]}});
  assert.equal(q.actionable.length,0); assert.equal(q.blocked[0].reason,'TECHNICAL_REPAIR_REQUIRED_NOT_PROMPT_REGEN');
});
test('authoritative pending exact hash suppresses regeneration',()=>{
  const row={itemId:'decor-3',collectionId:'decor',assetHash:'old',decision:'REWORK',independent:true,failureCodes:['FLAT_COMPOSITION'],reviewer:'14',producer:'09',tier:2};
  const authoritativeState={items:{'decor-3':{pendingCandidate:{assetHash:'new',repositoryPath:'public/assets/catalog-candidates/decor-3-v2.png'}}}};
  const q=buildRegenerationQueue({corpus:{observations:[row],current:[row]},authoritativeState});
  assert.equal(q.selected.length,0);
  assert.equal(q.pending[0].pendingCandidates[0].assetHash,'new');
  assert.equal(q.pending[0].reason,'AUTHORITATIVE_NEWER_CANDIDATE_PENDING_EXACT_HASH_REVIEW');
});

test('stale lane snapshots cannot suppress regeneration',()=>{
  const row={itemId:'wall-9',collectionId:'wall',assetHash:'reviewed-v12',decision:'REWORK',independent:true,failureCodes:['WEAK_SILHOUETTE_IDENTITY'],reviewer:'02',producer:'13',tier:3};
  const staleLaneDocuments=[{path:'lane-05.json',data:{wallCandidates:[{id:'wall-9',blobSha:'ancient-svg',status:'READY_FOR_REVIEW'}]}}];
  const authoritativeState={items:{'wall-9':{state:'REWORK_NEEDS_PRODUCTION',pendingCandidate:null}}};
  const q=buildRegenerationQueue({corpus:{observations:[row],current:[row]},authoritativeState,laneDocuments:staleLaneDocuments});
  assert.equal(q.pending.length,0);
  assert.equal(q.selected[0].itemId,'wall-9');
});
test('selects bounded highest-priority work per producer',()=>{
  const rows=Array.from({length:6},(_,i)=>({itemId:'wall-'+(i+5),collectionId:'wall',assetHash:'h'+i,decision:'REWORK',independent:true,failureCodes:['WEAK_DEPTH'],reviewer:'14',producer:'05',tier:i%5+1,name:'x',theme:'y'}));
  const q=buildRegenerationQueue({corpus:{observations:rows,current:rows}});
  assert.equal(q.selected.length,4); assert(q.selected[0].priority>=q.selected[1].priority);
});

test('selected work carries reviewer-derived prompt variants',()=>{
  const row={itemId:'wall-5',collectionId:'wall',assetHash:'old',decision:'REWORK',independent:true,failureCodes:['WEAK_DEPTH','THEME_MISMATCH'],reviewer:'14',producer:'05',tier:2,name:'Vine Wall Art',theme:'Galaxy Glow',reason:'theme weak and depth too flat'};
  const baseQueue=buildRegenerationQueue({corpus:{observations:[row],current:[row]}});
  const queue=attachPromptRecommendations(baseQueue,{
    items:[{id:'wall-5',collectionId:'wall',name:'Vine Wall Art',type:'room',tier:2,theme:'Galaxy Glow'}],
    reviewDocs:[{path:'14.json',data:{reviewer:'14',reviews:[{itemId:'wall-5',assetHash:'old',producer:'05',decision:'REWORK',reason:'theme weak and depth too flat'}]}}]
  });
  assert.equal(queue.selected.length,1);
  assert.equal(queue.selected[0].promptRecommendation.decision,'REWORK');
  assert.equal(queue.selected[0].promptRecommendation.variants.length,4);
  assert(queue.selected[0].promptRecommendation.failureCodes.includes('THEME_MISMATCH'));
  assert(queue.selected[0].promptRecommendation.variants.every(v=>v.promptText.includes('wall-5')));
});


test('queue passes normalized failure taxonomy directly into prompt compiler',()=>{
  const row={
    itemId:'decor-5',collectionId:'decor',assetHash:'old',decision:'REWORK',
    independent:true,failureCodes:['THEME_MISMATCH','NEAR_DUPLICATE_TEMPLATE'],
    reviewer:'14',producer:'09',tier:2,name:'Plant Wall',theme:'Galaxy Glow',
    reason:'needs refinement'
  };
  const baseQueue=buildRegenerationQueue({corpus:{observations:[row],current:[row]}});
  const queue=attachPromptRecommendations(baseQueue,{
    items:[{id:'decor-5',collectionId:'decor',name:'Plant Wall',type:'room',tier:2,theme:'Galaxy Glow'}],
    reviewDocs:[]
  });
  const rec=queue.selected[0].promptRecommendation;
  assert.deepEqual(rec.failureCodes,['THEME_MISMATCH','NEAR_DUPLICATE_TEMPLATE']);
  assert(rec.repairBlocks.includes('theme'));
  assert(rec.repairBlocks.includes('original'));
  assert(rec.repairBlocks.includes('silhouette'));
});


test('unfilled release fallback enters queue without fabricated review',()=>{
  const fallbackBacklog={productionQueue:[{
    itemId:'desks-7',collectionId:'desks',name:'Sunny Creator Desk',tier:3,theme:'Garden Glow',
    state:'UNFILLED_NEEDS_PRODUCTION',route:{producer:'03',reviewer:'05'}
  }]};
  const baseQueue=buildRegenerationQueue({corpus:{observations:[],current:[]},fallbackBacklog});
  assert.equal(baseQueue.selected.length,1);
  assert.equal(baseQueue.selected[0].sourceState,'UNFILLED_RELEASE_BLOCKER');
  assert.equal(baseQueue.selected[0].releaseBlocking,true);
  assert.equal(baseQueue.selected[0].reviewedHash,null);
  assert.equal(baseQueue.selected[0].producer,'03');
  assert.equal(baseQueue.selected[0].reviewer,'05');

  const queue=attachPromptRecommendations(baseQueue,{
    items:[{id:'desks-7',collectionId:'desks',name:'Sunny Creator Desk',type:'room',tier:3,theme:'Garden Glow'}],
    reviewDocs:[]
  });
  const rec=queue.selected[0].promptRecommendation;
  assert.equal(rec.decision,'UNREVIEWED');
  assert.equal(rec.sourceReviewHash,null);
  assert.equal(rec.variants.length,4);
  assert(rec.variants.every(v=>v.promptText.includes('desks-7')));
});

test('canonical interim live-verification state blocks stale REWORK regeneration',()=>{
  const row={itemId:'companions-5',collectionId:'companions',assetHash:'old-review',decision:'REWORK',independent:true,failureCodes:['THEME_MISMATCH'],reviewer:'05',producer:'06',tier:2};
  const authoritativeState={items:{'companions-5':{state:'CANONICAL_INTERIM_NEEDS_LIVE_VERIFICATION',pendingCandidate:{assetHash:'generated-v2'}}}};
  const q=buildRegenerationQueue({corpus:{observations:[row],current:[row]},authoritativeState});
  assert.equal(q.selected.length,0);
  assert.equal(q.pending.length,0);
  assert.equal(q.preserve[0].reason,'CANONICAL_INTERIM_REQUIRES_LIVE_VERIFICATION_NOT_REGENERATION');
});
