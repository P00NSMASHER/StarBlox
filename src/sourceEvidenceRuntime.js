import { canonicalJson, fnv1a32 } from './contentProvenanceRuntime.js';

export const EVIDENCE_BINDING_VERSION='starblox-evidence-binding-v1';

function normalize(value){
  return String(value||'').trim().replace(/\s+/g,' ');
}

function escapePointerToken(value){
  return String(value).replace(/~/g,'~0').replace(/\//g,'~1');
}

export function collectSnapshotTextFragments(value,path='$'){
  const rows=[];
  if(typeof value==='string'){
    const text=normalize(value);
    if(text)rows.push({path,text});
    return rows;
  }
  if(Array.isArray(value)){
    value.forEach((item,index)=>{
      rows.push(...collectSnapshotTextFragments(item,path+'/'+index));
    });
    return rows;
  }
  if(value&&typeof value==='object'){
    Object.keys(value).sort().forEach(key=>{
      rows.push(...collectSnapshotTextFragments(
        value[key],
        path+'/'+escapePointerToken(key)
      ));
    });
  }
  return rows;
}

function candidateSpans(candidate){
  return Array.isArray(candidate?.evidenceSpans)
    ?candidate.evidenceSpans
      .map(span=>({
        sourceId:String(span?.sourceId||''),
        text:normalize(span?.text)
      }))
      .filter(span=>span.sourceId||span.text)
    :[];
}

export function bindInteractionCandidateEvidence(
  candidate,
  sourceSnapshots,
  {requireEvidence=true}={}
){
  const issues=[];
  const spans=candidateSpans(candidate);
  const allowedSourceIds=new Set(
    Array.isArray(candidate?.sourceIds)
      ?candidate.sourceIds.map(String)
      :[]
  );

  if(requireEvidence&&!spans.length){
    issues.push({type:'missing-evidence-spans'});
  }

  const bindings=[];
  for(let index=0;index<spans.length;index++){
    const span=spans[index];
    if(!span.sourceId){
      issues.push({type:'missing-evidence-source-id',index});
      continue;
    }
    if(!span.text){
      issues.push({type:'missing-evidence-text',index,sourceId:span.sourceId});
      continue;
    }
    if(!allowedSourceIds.has(span.sourceId)){
      issues.push({
        type:'evidence-source-not-declared-on-candidate',
        index,
        sourceId:span.sourceId
      });
      continue;
    }

    const snapshot=sourceSnapshots?.[span.sourceId];
    if(!snapshot){
      issues.push({
        type:'missing-source-snapshot',
        index,
        sourceId:span.sourceId
      });
      continue;
    }

    const needle=normalize(span.text).toLowerCase();
    const matches=collectSnapshotTextFragments(snapshot.payload)
      .filter(fragment=>
        normalize(fragment.text).toLowerCase().includes(needle)
      )
      .sort((a,b)=>a.path.localeCompare(b.path));

    if(!matches.length){
      issues.push({
        type:'unsupported-evidence-span',
        index,
        sourceId:span.sourceId,
        text:span.text
      });
      continue;
    }

    const match=matches[0];
    const bindingBase={
      sourceId:span.sourceId,
      evidenceText:span.text,
      snapshotPath:match.path,
      snapshotFragment:match.text
    };
    bindings.push({
      ...bindingBase,
      fragmentFingerprint:'fnv1a32:'+fnv1a32(canonicalJson({
        sourceId:span.sourceId,
        snapshotPath:match.path,
        snapshotFragment:match.text
      })),
      evidenceFingerprint:'fnv1a32:'+fnv1a32(canonicalJson(bindingBase))
    });
  }

  const bound={
    ...(candidate||{}),
    evidenceBindingVersion:EVIDENCE_BINDING_VERSION,
    evidenceBindings:bindings,
    status:issues.length
      ?String(candidate?.status||'shadow-candidate')
      :'evidence-bound-shadow-candidate'
  };

  return {candidate:bound,issues};
}

export function validateEvidenceBoundInteractionCandidate(candidate){
  const issues=[];
  if(candidate?.evidenceBindingVersion!==EVIDENCE_BINDING_VERSION){
    issues.push('evidence-binding-version');
  }
  if(candidate?.status!=='evidence-bound-shadow-candidate'){
    issues.push('not-evidence-bound');
  }
  if(!Array.isArray(candidate?.evidenceBindings)||!candidate.evidenceBindings.length){
    issues.push('missing-evidence-bindings');
  }

  const sourceIds=new Set((candidate?.sourceIds||[]).map(String));
  for(const binding of candidate?.evidenceBindings||[]){
    if(!sourceIds.has(String(binding?.sourceId))){
      issues.push('binding-source-not-declared');
    }
    if(!binding?.snapshotPath)issues.push('binding-missing-snapshot-path');
    if(!binding?.evidenceText)issues.push('binding-missing-evidence-text');
    if(!String(binding?.fragmentFingerprint||'').startsWith('fnv1a32:')){
      issues.push('binding-missing-fragment-fingerprint');
    }
    if(!String(binding?.evidenceFingerprint||'').startsWith('fnv1a32:')){
      issues.push('binding-missing-evidence-fingerprint');
    }
  }
  return [...new Set(issues)];
}
