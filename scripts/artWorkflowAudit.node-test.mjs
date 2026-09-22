import test from 'node:test';
import assert from 'node:assert/strict';
import {auditWorkflow} from './artWorkflowAudit.mjs';

const items=Array.from({length:192},(_,i)=>({id:'x-'+(i+1)}));

test('healthy cross-stage state passes',()=>{
  const manifest={target:192,items:{'x-1':{assetPath:'/assets/catalog/x-1.png',status:'final-portable'}}};
  const corpus={conflicts:[],observations:[],current:[{itemId:'x-1',assetPath:'/assets/catalog/x-1.png',assetHash:'h1',decision:'ACCEPT',independent:true,reviewer:'05',producer:'03'}]};
  const queue={selected:[],pending:[],blocked:[],preserve:[]};
  const fallback={productionQueue:[],acceptedAwaitingCanonical:[],blockedEvidence:[]};
  const report=auditWorkflow({items,manifest,corpus,queue,fallback,blobByPath:{'public/assets/catalog/x-1.png':'h1'}});
  assert.equal(report.status,'PASS');
  assert.equal(report.errors.length,0);
  assert.equal(report.summary.currentAcceptedCanonical,1);
});

test('accepted art cannot re-enter regeneration',()=>{
  const manifest={target:192,items:{}};
  const current={itemId:'x-1',assetPath:'/assets/catalog/x-1.png',assetHash:'h1',decision:'ACCEPT',independent:true,reviewer:'05',producer:'03'};
  const queue={selected:[{itemId:'x-1',reviewedHash:'h1',producer:'03',failureCodes:[]}],pending:[],blocked:[],preserve:[]};
  const report=auditWorkflow({items,manifest,corpus:{conflicts:[],observations:[current],current:[current]},queue,fallback:{productionQueue:[],acceptedAwaitingCanonical:[],blockedEvidence:[]},blobByPath:{'public/assets/catalog/x-1.png':'h1'}});
  assert.equal(report.status,'FAIL');
  assert(report.errors.some(x=>x.code==='REGEN_NOT_CURRENT_REWORK'));
  assert(report.errors.some(x=>x.code==='ACCEPTED_ITEM_SELECTED_FOR_REGEN'));
});

test('known rework cannot be marked final portable',()=>{
  const manifest={target:192,items:{'x-2':{assetPath:'/assets/catalog/x-2.png',status:'final-portable'}}};
  const current={itemId:'x-2',assetPath:'/assets/catalog/x-2.png',assetHash:'h2',decision:'REWORK',independent:true,reviewer:'14',producer:'05'};
  const report=auditWorkflow({items,manifest,corpus:{conflicts:[],observations:[current],current:[current]},queue:{selected:[],pending:[],blocked:[],preserve:[]},fallback:{productionQueue:[],acceptedAwaitingCanonical:[],blockedEvidence:[]},blobByPath:{'public/assets/catalog/x-2.png':'h2'}});
  assert(report.errors.some(x=>x.code==='KNOWN_REWORK_MARKED_FINAL'));
});

test('active batches enforce one producer and non-overlapping scopes',()=>{
  const activeBatch={policy:{maxConcurrentProductionBatches:4,maxItemsPerBatch:4},batches:[
    {batchId:'a',producer:'05',scope:['x-3']},
    {batchId:'b',producer:'05',scope:['x-3']}
  ]};
  const report=auditWorkflow({items,manifest:{target:192,items:{}},corpus:{conflicts:[],observations:[],current:[]},queue:{selected:[],pending:[],blocked:[],preserve:[]},fallback:{productionQueue:[],acceptedAwaitingCanonical:[],blockedEvidence:[]},activeBatch});
  assert(report.errors.some(x=>x.code==='ACTIVE_BATCH_DUPLICATE_PRODUCER'));
  assert(report.errors.some(x=>x.code==='ACTIVE_BATCH_SCOPE_COLLISION'));
});
