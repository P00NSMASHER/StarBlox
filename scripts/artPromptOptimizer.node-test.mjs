import test from 'node:test';import assert from 'node:assert/strict';
import {compose,inferRepair,recommend,sha,train,validateExperiment,RUNTIME_PROMPT_WORD_BUDGET,RUNTIME_NEGATIVE_PROMPT_WORD_BUDGET} from './artPromptOptimizer.mjs';
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

test('runtime metadata stripping keeps product-name-only first sentences',()=>{
 const skate={id:'decor-7',name:'Skate Rack',collectionId:'decor',type:'room',tier:3,theme:'Garden Glow'};
 const brief='Single tiny two-cubby wooden roller skate rack on a plain white studio background. Inside the lower cubby is one pair of classic quad roller skates with boot uppers, metal trucks and four wheels per skate. NO room, NO collage, NO text.';
 const p=compose(skate,['furniture','camera'],'A-METADATA-GUARD',{},brief);
 assert.match(p.runtimePromptText,/tiny two-cubby wooden roller skate rack/i);
 assert.match(p.runtimePromptText,/quad roller skates/i);
});

test('runtime prompt whole-clause packing preserves furniture relationships',()=>{
 const table={id:'desks-9',name:'Art Maker Table',collectionId:'desks',type:'room',tier:3,theme:'Sunny Pop'};
 const brief='Art Maker Table, Desks & Tech, Tier 3, Sunny Pop. Single freestanding art maker table product on a plain white studio background. One wide rectangular wood worktop, four simple straight legs, one shallow drawer, one low peg rail at the back with a brush cup, scissors and colored paper. NO chair, NO room, NO wall shelves, NO collage, NO text.';
 const p=compose(table,['furniture','camera','depth'],'A-WHOLE-CLAUSE',{},brief);
 assert.match(p.runtimePromptText,/one low peg rail at the back with a brush cup/i);
 assert.match(p.runtimePromptText,/scissors and colored paper/i);
 assert(!/peg rail at the scissors/i.test(p.runtimePromptText));
 assert(p.runtimePromptText.trim().split(/\s+/).length<=RUNTIME_PROMPT_WORD_BUDGET);
});

test('runtime prompt clause balancing preserves late physical identity nouns',()=>{
 const desk={id:'desks-10',name:'Neon Streaming Desk',collectionId:'desks',type:'room',tier:4,theme:'Aqua Wave'};
 const brief='Neon Streaming Desk, Desks & Tech, Tier 4, Aqua Wave. EXACTLY ONE ordinary freestanding streaming desk in ONE product view on a plain studio background. One long horizontal graphite tabletop, exactly two simple floor supports, exactly ONE large computer monitor centered on the tabletop, exactly ONE microphone on a visible boom arm clamped to the desk edge, and one small PC box below. NO shelves, NO cabinets, NO stacked modules, NO room architecture, NO collage, NO text.';
 const p=compose(desk,['furniture','camera','depth'],'A-LIVE-LIKE',{},brief);
 assert.match(p.runtimePromptText,/monitor/i);
 assert.match(p.runtimePromptText,/microphone/i);
 assert.match(p.runtimePromptText,/tabletop/i);
 assert.match(p.runtimeNegativePromptText,/shelves/i);
 assert.match(p.runtimeNegativePromptText,/cabinets/i);
});

test('runtime prompt preserves identity details while negative prompt carries explicit exclusions',()=>{
 const desk={id:'desks-10',name:'Neon Streaming Desk',collectionId:'desks',type:'room',tier:4,theme:'Aqua Wave'};
 const brief='Neon Streaming Desk, Desks & Tech, Tier 4, Aqua Wave. EXACTLY ONE freestanding streaming DESK on a plain studio background. Make a broad horizontal worktop with exactly two supports. Put exactly TWO computer monitors and exactly ONE visible microphone boom on the desk. NO tall shelves, NO cabinets, NO repeated variants, NO collage, NO room, NO text.';
 const p=compose(desk,['furniture','camera','depth'],'A-TEST',{},brief);
 assert(p.runtimePromptText.trim().split(/\s+/).length<=RUNTIME_PROMPT_WORD_BUDGET);
 assert(p.runtimeNegativePromptText.trim().split(/\s+/).length<=RUNTIME_NEGATIVE_PROMPT_WORD_BUDGET);
 assert.match(p.runtimePromptText,/TWO computer monitors/i);
 assert.match(p.runtimePromptText,/microphone/i);
 assert.match(p.runtimeNegativePromptText,/tall shelves/i);
 assert.match(p.runtimeNegativePromptText,/cabinets/i);
 assert.match(p.runtimeNegativePromptText,/collage/i);
 assert.equal(sha(p.runtimeNegativePromptText),p.runtimeNegativePromptSha256);
 assert(!/NO tall shelves/i.test(p.runtimePromptText));
});

test('runtime prompt hash validation covers both positive and negative channels',()=>{
 const p=compose(item,['aura'],'A');
 const e={attemptId:'a',itemId:'auras-5',assetHash:'h',producer:'11',promptBlocks:['aura'],runtimePromptText:p.runtimePromptText,runtimePromptSha256:'0'.repeat(64),runtimeNegativePromptText:p.runtimeNegativePromptText,runtimeNegativePromptSha256:'0'.repeat(64)};
 const errors=validateExperiment(e);
 assert(errors.some(x=>x.includes('runtimePromptSha256')));
 assert(errors.some(x=>x.includes('runtimeNegativePromptSha256')));
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
