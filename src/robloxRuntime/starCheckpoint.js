import {createHash} from 'node:crypto';

export const STAR_CHECKPOINT_VERSION='starblox-star-checkpoint-v1';

function stableHash(value){
  return 'sha256:'+createHash('sha256').update(JSON.stringify(value)).digest('hex');
}
function finite(value){
  const n=Number(value);
  return Number.isFinite(n)?n:null;
}
function rank(values){
  return [...values].sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key))
    .map((row,index)=>({...row,rank:index+1}));
}
function spearman(pairs){
  if(pairs.length<2) return null;
  const externalRanks=new Map(rank(pairs.map(x=>({key:x.key,value:x.external}))).map(x=>[x.key,x.rank]));
  const internalRanks=new Map(rank(pairs.map(x=>({key:x.key,value:x.internal}))).map(x=>[x.key,x.rank]));
  let sum=0;
  for(const pair of pairs){
    const d=externalRanks.get(pair.key)-internalRanks.get(pair.key);
    sum+=d*d;
  }
  const n=pairs.length;
  return 1-(6*sum)/(n*(n*n-1));
}

export function evaluateStarCheckpoint({baseline,externalResult}){
  if(!externalResult){
    return {
      schemaVersion:1,
      checkpointVersion:STAR_CHECKPOINT_VERSION,
      status:'awaiting-external-star-result',
      externalResultPresent:false,
      evidenceHash:null,
      privacy:{rawScoresPersisted:false}
    };
  }
  const scores=Array.isArray(externalResult.scores)?externalResult.scores:[];
  if(typeof externalResult.assessmentDate!=='string'||!externalResult.assessmentDate||
    typeof externalResult.assessmentName!=='string'||!externalResult.assessmentName||
    scores.length===0){
    throw new Error('STAR checkpoint payload is missing assessmentName, assessmentDate, or scores');
  }

  const internal={...(baseline?.bySubject||{}),...(baseline?.byDomain||{})};
  const pairs=[];
  const matched=[];
  for(const row of scores){
    const dimension=String(row?.dimension||'').trim();
    const value=finite(row?.value);
    if(!dimension||value==null) continue;
    const summary=internal[dimension];
    const internalValue=finite(summary?.firstAttemptAccuracy);
    if(internalValue==null) continue;
    pairs.push({key:dimension,external:value,internal:internalValue});
    matched.push(dimension);
  }

  const agreement=spearman(pairs);
  const externalRanks=new Map(rank(pairs.map(x=>({key:x.key,value:x.external}))).map(x=>[x.key,x.rank]));
  const internalRanks=new Map(rank(pairs.map(x=>({key:x.key,value:x.internal}))).map(x=>[x.key,x.rank]));
  const divergences=pairs.map(pair=>({
    dimension:pair.key,
    externalRank:externalRanks.get(pair.key),
    internalRank:internalRanks.get(pair.key),
    rankGap:Math.abs(externalRanks.get(pair.key)-internalRanks.get(pair.key))
  })).sort((a,b)=>b.rankGap-a.rankGap||a.dimension.localeCompare(b.dimension));

  const evidenceMaterial={
    assessmentName:externalResult.assessmentName,
    assessmentDate:externalResult.assessmentDate,
    metric:String(externalResult.metric||'unspecified'),
    dimensions:scores.map(row=>String(row?.dimension||'')).filter(Boolean),
    rawPayloadHash:stableHash(externalResult)
  };

  return {
    schemaVersion:1,
    checkpointVersion:STAR_CHECKPOINT_VERSION,
    status:matched.length>=2?'checkpoint-evaluated':'insufficient-domain-overlap',
    externalResultPresent:true,
    assessment:{
      name:externalResult.assessmentName,
      date:externalResult.assessmentDate,
      metric:String(externalResult.metric||'unspecified')
    },
    matchedDimensions:matched,
    rankAgreement:agreement,
    divergences,
    interpretation:{
      absoluteScorePrediction:false,
      relativeOrderingOnly:true,
      causalClaim:false
    },
    privacy:{
      rawScoresPersisted:false,
      rawPayloadLogged:false
    },
    evidenceHash:stableHash(evidenceMaterial)
  };
}
