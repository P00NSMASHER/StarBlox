import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReviewCorpus,classifyFailure,normalizeReviewDocuments} from './artReviewNormalizer.mjs';

test('classifies concrete visual defects',()=>{
  const codes=classifyFailure({decision:'REWORK',reason:'Flat circular ring with weak near/far depth, palette-only theme and poor card readability.'});
  assert(codes.includes('FLAT_COMPOSITION'));
  assert(codes.includes('WEAK_DEPTH'));
  assert(codes.includes('THEME_MISMATCH'));
  assert(codes.includes('SMALL_CARD_READABILITY'));
});

test('accept has no failure codes',()=>assert.deepEqual(classifyFailure({decision:'ACCEPT',reason:'great depth'}),[]));

test('decision map is authoritative current state',()=>{
  const docs=[{path:'05.json',data:{reviewer:'05',reviews:[{itemId:'auras-1',assetHash:'old',producer:'11',decision:'REWORK',reason:'flat'}],decisions:{'auras-1':{hash:'new',producer:'11',decision:'ACCEPT'}}}}];
  const n=normalizeReviewDocuments(docs);
  assert.equal(n.current.get('auras-1').assetHash,'new');
  assert.equal(n.current.get('auras-1').decision,'ACCEPT');
});

test('corpus marks self review non-independent and summarizes collection',()=>{
  const docs=[{path:'x.json',data:{reviewer:'11',reviews:[{itemId:'auras-2',assetHash:'h',producer:'11',decision:'REWORK',reason:'flat ring'}]}}];
  const corpus=buildReviewCorpus({docs,items:[{id:'auras-2',collectionId:'auras',name:'Cloud Puffs',tier:1,theme:'Candy Core'}]});
  assert.equal(corpus.current[0].independent,false);
  assert.equal(corpus.summary.byCollection.auras.rework,1);
  assert.equal(corpus.summary.selfReviewObservationCount,1);
});

test('unknown rework remains explicit',()=>assert.deepEqual(classifyFailure({decision:'REWORK',reason:'needs work'}),['UNKNOWN_REWORK']));
