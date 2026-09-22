import test from 'node:test';
import assert from 'node:assert/strict';
import {buildRegenerationQueue} from './artRegenerationQueue.mjs';

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
test('newer pending candidate suppresses stale regeneration',()=>{
  const row={itemId:'decor-3',collectionId:'decor',assetHash:'old',decision:'REWORK',independent:true,failureCodes:['FLAT_COMPOSITION'],reviewer:'14',producer:'09',tier:2};
  const lanes=[{path:'lane-09.json',data:{items:[{id:'decor-3',gitBlobSha:'new',status:'STAGED_READY_FOR_REVIEW_14'}]}}];
  const q=buildRegenerationQueue({corpus:{observations:[row],current:[row]},laneDocuments:lanes});
  assert.equal(q.selected.length,0); assert.equal(q.pending[0].pendingCandidates[0].hash,'new');
});
test('selects bounded highest-priority work per producer',()=>{
  const rows=Array.from({length:6},(_,i)=>({itemId:'wall-'+(i+5),collectionId:'wall',assetHash:'h'+i,decision:'REWORK',independent:true,failureCodes:['WEAK_DEPTH'],reviewer:'14',producer:'05',tier:i%5+1,name:'x',theme:'y'}));
  const q=buildRegenerationQueue({corpus:{observations:rows,current:rows}});
  assert.equal(q.selected.length,4); assert(q.selected[0].priority>=q.selected[1].priority);
});
