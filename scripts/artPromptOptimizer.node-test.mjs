import test from 'node:test';import assert from 'node:assert/strict';
import {compose,inferRepair,recommend,sha,train,validateExperiment,RUNTIME_PROMPT_WORD_BUDGET} from './artPromptOptimizer.mjs';
const item={id:'auras-5',name:'Garden Fireflies',collectionId:'auras',type:'avatar',tier:2,theme:'Galaxy Glow'};
const docs=[{path:'r/05.json',data:{reviewer:'05',reviews:[{itemId:'auras-5',assetHash:'h1',producer:'11',decision:'ACCEPT',reason:'layered translucent particle volume'},{itemId:'auras-6',assetHash:'h2',producer:'11',decision:'REWORK',reason:'flat generic ring with weak card readability'}]}}];
test('learns only from independent exact hash',()=>{const m=train({experiments:[{attemptId:'a',itemId:'auras-5',assetHash:'h1',producer:'11',collectionId:'auras',tier:2,promptBlocks:['aura','depth']}],reviewDocs:docs});assert.equal(m.trainingExamples,1);assert.equal(m.stats.global.aura.accept,1)});
test('stale hash excluded',()=>{const m=train({experiments:[{attemptId:'a',itemId:'auras-5',assetHash:'old',producer:'11',promptBlocks:['aura']}],reviewDocs:docs});assert.equal(m.trainingExamples,0);assert.equal(m.excluded[0].reason,'NO_INDEPENDENT_EXACT_HASH_REVIEW')});
test('self review excluded',()=>{const m=train({experiments:[{attemptId:'a',itemId:'auras-5',assetHash:'h1',producer:'11',promptBlocks:['aura']}],reviewDocs:[{path:'x',data:{reviewer:'11',reviews:[{itemId:'auras-5',assetHash:'h1',producer:'11',decision:'ACCEPT'}]}}]});assert.equal(m.trainingExamples,0)});
test('flat ring maps to shared failure taxonomy and repair structure',()=>{const r=inferRepair({decision:'REWORK',reason:'flat generic ring with weak card readability'});assert(r.failureCodes.includes('FLAT_COMPOSITION'));assert(r.failureCodes.includes('SMALL_CARD_READABILITY'));assert(r.blocks.includes('physical'));assert(r.blocks.includes('card'));assert.equal(r.technical,false)});
test('technical blocker never triggers prompt regen',()=>{const r=recommend(item,{decision:'BLOCKED',reason:'corrupt WebP signature'},train(),4);assert.equal(r.action,'TECHNICAL_REPAIR_NOT_PROMPT_REGEN')});
test('blocked evidence state never triggers prompt regen',()=>{const r=recommend(item,{decision:'BLOCKED_EVIDENCE_NOT_DECISION',reason:'render proof missing'},train(),4);assert.equal(r.action,'TECHNICAL_REPAIR_NOT_PROMPT_REGEN')});
test('non-rework review state holds instead of regenerating',()=>{const r=recommend(item,{decision:'PENDING_REVIEW',reason:'waiting on reviewer'},train(),4);assert.equal(r.action,'HOLD_NOT_REGEN')});
test('theme failure code feeds theme repair block',()=>{const r=inferRepair({decision:'REWORK',reason:'exact theme mismatch with otherwise good dimensionality'});assert(r.failureCodes.includes('THEME_MISMATCH'));assert(r.blocks.includes('theme'));assert(r.blocks.includes('original'))});
test('accepted hash is preserved',()=>{const r=recommend(item,{decision:'ACCEPT',assetHash:'ok'},train(),4);assert.equal(r.action,'PRESERVE_ACCEPTED_HASH');assert.equal(r.assetHash,'ok')});
test('rework gets four distinct prompt variants',()=>{const r=recommend(item,{decision:'REWORK',assetHash:'bad',reason:'flat ring'},train({reviewDocs:docs}),4);assert.equal(r.variants.length,4);assert.equal(new Set(r.variants.map(x=>x.promptSha256)).size,4);for(const v of r.variants){assert.match(v.promptText,/auras-5 — Garden Fireflies/);assert.match(v.promptText,/Galaxy Glow/);assert.match(v.promptText,/600×600 Store card/)}});
test('runtime prompt stays bounded while full provenance prompt is preserved',()=>{
 const longBrief=Array.from({length:120},(_,i)=>`detail${i}`).join(' ');
 const p=compose(item,['aura','depth'],'A-PHYSICAL',{},longBrief);
 assert.equal(sha(p.runtimePromptText),p.runtimePromptSha256);
 assert(p.runtimePromptText.trim().split(/\s+/).length<=RUNTIME_PROMPT_WORD_BUDGET);
 assert.match(p.runtimePromptText,/auras-5/);
 assert.match(p.runtimePromptText,/Galaxy Glow/);
 assert.match(p.promptText,/detail119/);
 assert.notEqual(p.runtimePromptText,p.promptText);
});

test('prompt hash validation catches tampering',()=>{const p=compose(item,['aura'],'A');assert.equal(sha(p.promptText),p.promptSha256);assert(validateExperiment({attemptId:'a',itemId:'auras-5',assetHash:'h',producer:'11',promptBlocks:['aura'],promptText:'x',promptSha256:'0'.repeat(64)}).some(x=>x.includes('mismatch')))});

test('positive companion language does not trigger technical or readability repair',()=>{
 const r=inferRepair({decision:'REWORK',reason:'Strong rounded toy volume and silhouette survive card scale. The exact Galaxy Glow theme is missing.',checks:{identity:'PASS',themeTier:'FAIL',silhouette:'PASS',materialLighting:'PASS',cardReadability:'PASS',originality:'PASS',duplicateVisual:'PASS'}});
 assert.deepEqual(r.failureCodes,['THEME_MISMATCH']);
 assert.equal(r.technical,false);
 assert(r.blocks.includes('theme'));
 assert(!r.blocks.includes('card'));
 assert(!r.blocks.includes('depth'));
});


test('normalized failure codes override ambiguous prose in prompt repair',()=>{
 const r=inferRepair({decision:'REWORK',reason:'needs refinement',failureCodes:['THEME_MISMATCH','NEAR_DUPLICATE_TEMPLATE']});
 assert.deepEqual(r.failureCodes,['THEME_MISMATCH','NEAR_DUPLICATE_TEMPLATE']);
 assert(r.blocks.includes('theme'));
 assert(r.blocks.includes('original'));
 assert(r.blocks.includes('silhouette'));
});

test('prompt variants carry exact normalized failure taxonomy and reviewer reason',()=>{
 const rec=recommend(item,{decision:'REWORK',assetHash:'bad',reason:'exact theme mismatch',failureCodes:['THEME_MISMATCH']},train(),2);
 assert.equal(rec.variants.length,2);
 for(const variant of rec.variants){
  assert.deepEqual(variant.failureCodes,['THEME_MISMATCH']);
  assert.match(variant.promptText,/Exact-hash reviewer failure taxonomy: THEME_MISMATCH/);
  assert.match(variant.promptText,/Human reviewer reason: exact theme mismatch/);
  assert.match(variant.promptText,/preserving qualities that were not implicated/i);
 }
});

test('unknown supplied failure codes are ignored and prose fallback still works',()=>{
 const r=inferRepair({decision:'REWORK',reason:'flat ring',failureCodes:['NOT_A_REAL_CODE']});
 assert(r.failureCodes.includes('FLAT_COMPOSITION'));
 assert(!r.failureCodes.includes('NOT_A_REAL_CODE'));
});

test('structured request runtime spends CLIP budget on repair substance instead of duplicate metadata',()=>{
 const skate={id:'decor-7',name:'Skate Rack',collectionId:'decor',type:'room',tier:3,theme:'Garden Glow'};
 const brief='Skate Rack, Room Decor, Tier 3, Garden Glow. Create ONE compact freestanding roller-skate storage rack as the unmistakable dominant product, isolated on a simple premium light-neutral studio background. Keep all skates contained inside the rack and the entire product fully inside frame with generous negative space.';
 const p=compose(skate,['furniture','camera','depth'],'A-PHYSICAL-CLEAN',{failureCodes:['SMALL_CARD_READABILITY','WEAK_SILHOUETTE_IDENTITY']},brief);
 assert(p.runtimePromptText.trim().split(/\s+/).length<=RUNTIME_PROMPT_WORD_BUDGET);
 assert.match(p.runtimePromptText,/compact freestanding roller-skate storage rack/i);
 assert.match(p.runtimePromptText,/unmistakable dominant product/i);
 assert.match(p.runtimePromptText,/isolated on a simple premium/i);
 assert(!p.runtimePromptText.includes('Skate Rack, Room Decor, Tier 3, Garden Glow.'));
});
