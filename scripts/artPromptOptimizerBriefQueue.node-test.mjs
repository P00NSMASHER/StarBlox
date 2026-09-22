import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendFromExplicitBriefs} from './artPromptOptimizerBriefQueue.mjs';
import {sha,train} from './artPromptOptimizer.mjs';

const item={id:'wall-9',name:'Art Gallery Wall',collectionId:'wall',type:'room',tier:3,theme:'Adventure Club'};
const review={decision:'REWORK',assetHash:'legacy-wall-9',reason:'flat wall emblem with weak depth'};
const briefs=[
  {variantId:'A-GALLERY-RAIL',seed:2136484253,optimizerInput:'Genuine wall-mounted oak gallery rail with brass cleats and mixed-depth frames.'},
  {variantId:'B-SHADOWBOX-TRIPTYCH',seed:2136484254,optimizerInput:'Wall-hung shadowbox triptych with a painted-wood backboard and display ledge.'}
].map(row=>({...row,optimizerInputSha256:sha(row.optimizerInput)}));

test('explicit planner concepts stay bound to upstream optimizer output',()=>{
  const rec=recommendFromExplicitBriefs(item,review,train(),briefs);
  assert.equal(rec.plannerBriefsPreserved,true);
  assert.equal(rec.variants.length,2);
  assert.deepEqual(rec.variants.map(v=>v.variant),briefs.map(v=>v.variantId));
  assert.equal(new Set(rec.variants.map(v=>v.promptSha256)).size,2);
  for(const [index,variant] of rec.variants.entries()){
    assert.equal(variant.optimizerInput,briefs[index].optimizerInput);
    assert.equal(variant.optimizerInputSha256,briefs[index].optimizerInputSha256);
    assert.equal(variant.plannerSeed,briefs[index].seed);
    assert.match(variant.upstreamVariant,/^(A-PHYSICAL|B-READABILITY)$/);
    assert.match(variant.upstreamPromptSha256,/^[0-9a-f]{64}$/);
    assert.match(variant.promptText,/Planner concept brief/);
    assert(variant.promptText.includes(briefs[index].optimizerInput));
    assert.equal(sha(variant.promptText),variant.promptSha256);
  }
});

test('tampered planner brief hash fails closed',()=>{
  const bad=briefs.map(x=>({...x}));bad[0].optimizerInputSha256='0'.repeat(64);
  assert.throws(()=>recommendFromExplicitBriefs(item,review,train(),bad),/optimizerInputSha256 mismatch/);
});

test('accepted current hash cannot be reactivated by planner request',()=>{
  const held=recommendFromExplicitBriefs(item,{decision:'ACCEPT',assetHash:'current-good'},train(),briefs);
  assert.equal(held.action,'PRESERVE_ACCEPTED_HASH');
  assert.equal(held.assetHash,'current-good');
});
