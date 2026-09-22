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
