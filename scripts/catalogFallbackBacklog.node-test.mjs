import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFallbackBacklog} from './catalogFallbackBacklog.mjs';

const items=[
  {id:'desks-7',name:'Sunny Creator Desk',collectionId:'desks',tier:3,theme:'Garden Glow'},
  {id:'wall-5',name:'Garden Garland',collectionId:'wall',tier:2,theme:'Art Attack'},
  {id:'decor-5',name:'Plant Wall',collectionId:'decor',tier:2,theme:'Pixel Party'},
  {id:'tops-1',name:'Hoodie',collectionId:'tops',tier:1,theme:'Cloud Pop'}
];

test('missing mapped IDs become exact fallback backlog',()=>{
  const report=buildFallbackBacklog({
    items,
    manifest:{items:{'tops-1':{assetPath:'/x.png'}}},
    reviewCorpus:{current:[]}
  });
  assert.equal(report.fallbackCount,3);
  assert.deepEqual(report.summary.byCollection,{desks:1,wall:1,decor:1});
  assert.equal(report.releaseBlocked,true);
});

test('routes release-critical families to the right producer and reviewer',()=>{
  const report=buildFallbackBacklog({items:[items[0],items[1],items[2]],manifest:{items:{}},reviewCorpus:{current:[]}});
  const byId=new Map(report.allMissing.map(x=>[x.itemId,x]));
  assert.deepEqual(byId.get('desks-7').route,{producer:'03',reviewer:'05'});
  assert.deepEqual(byId.get('wall-5').route,{producer:'05',reviewer:'14'});
  assert.deepEqual(byId.get('decor-5').route,{producer:'09',reviewer:'14'});
});

test('accepted missing art is integration work, not regeneration work',()=>{
  const report=buildFallbackBacklog({
    items:[items[0]],
    manifest:{items:{}},
    reviewCorpus:{current:[{itemId:'desks-7',decision:'ACCEPT',assetHash:'h',reviewer:'05',producer:'03'}]}
  });
  assert.equal(report.productionQueue.length,0);
  assert.equal(report.acceptedAwaitingCanonical.length,1);
  assert.equal(report.acceptedAwaitingCanonical[0].state,'ACCEPT_AWAITING_CANONICAL');
});

test('known rework remains production work and is never treated as accepted',()=>{
  const report=buildFallbackBacklog({
    items:[items[1]],
    manifest:{items:{}},
    reviewCorpus:{current:[{itemId:'wall-5',decision:'REWORK',assetHash:'old',reviewer:'14',producer:'05',failureCodes:['WEAK_DEPTH']}]}
  });
  assert.equal(report.productionQueue.length,1);
  assert.equal(report.productionQueue[0].state,'REWORK_NEEDS_PRODUCTION');
  assert.deepEqual(report.productionQueue[0].currentReview.failureCodes,['WEAK_DEPTH']);
});
