import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFactoryState,versionFrom} from './artFactoryState.mjs';

test('extracts highest explicit v-number from evidence paths',()=>{
  assert.equal(versionFrom('w13-wall9-v13-exact-triptych','public/assets/wall-9-v12.png'),13);
  assert.equal(versionFrom('no-version-here'),null);
});

test('verified staged successor outranks current REWORK',()=>{
  const items=[{id:'wall-9',name:'Art Gallery Wall',collectionId:'wall',tier:3,theme:'Adventure Club'}];
  const review={itemId:'wall-9',assetHash:'v12hash',assetPath:'public/assets/catalog-candidates/cpu/wall-9-w13-v12-a.png',decision:'REWORK',independent:true,reviewer:'02',producer:'13',failureCodes:[]};
  const corpus={observations:[review],current:[review]};
  const staged=[{itemId:'wall-9',assetHash:'v13hash',repositoryPath:'public/assets/catalog-candidates/cpu/wall-9-w13-v13-a.png',queueId:'w13-wall9-v13-exact-triptych',version:13,producer:'13',reviewer:'02',valid:true,evidencePath:'generated/v13/staged-output.json'}];
  const state=buildFactoryState({items,manifest:{items:{}},corpus,stagedCandidates:staged,fallbackBacklog:{allMissing:[{itemId:'wall-9',route:{producer:'13',reviewer:'02'}}]}});
  assert.equal(state.items['wall-9'].state,'PENDING_EXACT_HASH_REVIEW');
  assert.equal(state.items['wall-9'].pendingCandidate.assetHash,'v13hash');
});

test('staged evidence older than current reviewed version cannot become pending',()=>{
  const items=[{id:'wall-9',name:'Art Gallery Wall',collectionId:'wall',tier:3,theme:'Adventure Club'}];
  const review={itemId:'wall-9',assetHash:'v12hash',assetPath:'public/assets/catalog-candidates/cpu/wall-9-w13-v12-a.png',decision:'REWORK',independent:true,reviewer:'02',producer:'13',failureCodes:[]};
  const corpus={observations:[review],current:[review]};
  const staged=[{itemId:'wall-9',assetHash:'legacy',repositoryPath:'public/assets/catalog/wall-9.svg',queueId:'legacy-v1',version:1,producer:'05',reviewer:'14',valid:true}];
  const state=buildFactoryState({items,manifest:{items:{}},corpus,stagedCandidates:staged,fallbackBacklog:{allMissing:[]}});
  assert.equal(state.items['wall-9'].state,'REWORK_NEEDS_PRODUCTION');
  assert.equal(state.items['wall-9'].pendingCandidate,null);
  assert.equal(state.items['wall-9'].route.reviewer,'02');
});

test('terminal exact-hash review freezes the same staged candidate',()=>{
  const items=[{id:'desks-10',name:'Neon Streaming Desk',collectionId:'desks',tier:4,theme:'Aqua Wave'}];
  const review={itemId:'desks-10',assetHash:'samehash',assetPath:'public/assets/catalog-candidates/cpu/desks-10-v14.png',decision:'REWORK',independent:true,reviewer:'05',producer:'03',failureCodes:[]};
  const corpus={observations:[review],current:[review]};
  const staged=[{itemId:'desks-10',assetHash:'samehash',repositoryPath:'public/assets/catalog-candidates/cpu/desks-10-v14.png',version:14,producer:'03',reviewer:'05',valid:true}];
  const state=buildFactoryState({items,manifest:{items:{}},corpus,stagedCandidates:staged,fallbackBacklog:{allMissing:[]}});
  assert.equal(state.items['desks-10'].state,'REWORK_NEEDS_PRODUCTION');
  assert.equal(state.items['desks-10'].pendingCandidate,null);
});

test('interim canonical companion is a live-verification blocker',()=>{
  const items=[{id:'companions-2',name:'Moon Cat',collectionId:'companions',tier:1,theme:'Cloud Pop'}];
  const manifest={items:{'companions-2':{assetPath:'/assets/catalog/companions-2.svg',status:'interim-not-verified'}}};
  const state=buildFactoryState({items,manifest,corpus:{observations:[],current:[]},stagedCandidates:[],fallbackBacklog:{allMissing:[]}});
  assert.equal(state.items['companions-2'].state,'CANONICAL_INTERIM_NEEDS_LIVE_VERIFICATION');
  assert.equal(state.items['companions-2'].releaseBlocking,true);
});

test('canonical interim verification outranks alternate REWORK and staged replacement evidence',()=>{
  const items=[{id:'companions-5',name:'Pebble Turtle',collectionId:'companions',tier:2,theme:'Galaxy Glow'}];
  const manifest={items:{'companions-5':{assetPath:'/assets/catalog/companions-5.svg',status:'interim-not-verified'}}};
  const review={itemId:'companions-5',assetHash:'old-review',assetPath:'/assets/catalog-candidates/companions-5-detail.webp',decision:'REWORK',independent:true,reviewer:'05',producer:'06',failureCodes:['THEME_MISMATCH']};
  const corpus={observations:[review],current:[review]};
  const staged=[{itemId:'companions-5',assetHash:'generated-v2',repositoryPath:'public/assets/catalog-candidates/cpu/companions-5-v2.png',version:2,producer:'06',reviewer:'05',valid:true}];
  const state=buildFactoryState({items,manifest,corpus,stagedCandidates:staged,fallbackBacklog:{allMissing:[]}});
  assert.equal(state.items['companions-5'].state,'CANONICAL_INTERIM_NEEDS_LIVE_VERIFICATION');
  assert.equal(state.items['companions-5'].releaseBlocking,true);
});
