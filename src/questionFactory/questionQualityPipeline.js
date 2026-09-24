
import { stableHash } from '../domainSchemas.js';
import {
  addQuestionToBank,
  getQuestionVersion
} from '../questionBank/questionBankV2.js';

export const QUESTION_QUALITY_PIPELINE_VERSION='question-quality-v1';

function isObject(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value){
  return JSON.parse(JSON.stringify(value));
}

function normalizeText(value){
  return String(value || '').replace(/\s+/g,' ').trim();
}

function normalizedForCompare(value){
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function wordSet(value){
  return new Set(normalizedForCompare(value).split(' ').filter(Boolean));
}

function jaccard(a,b){
  const left=wordSet(a);
  const right=wordSet(b);
  if(left.size === 0 || right.size === 0) return 0;
  let common=0;
  for(const token of left) if(right.has(token)) common++;
  return common / (left.size + right.size - common);
}

function sourceMap(chunks){
  return new Map((chunks || []).map(chunk => [
    chunk.id,
    {
      ...clone(chunk),
      comparisonText:normalizedForCompare(chunk.text),
      evidenceText:normalizeText(chunk.text),
      chunkHash:stableHash({
        id:chunk.id,
        text:normalizeText(chunk.text),
        header:normalizeText(chunk.header),
        source:normalizeText(chunk.source)
      })
    }
  ]));
}

export function validateCandidateStructure(candidate){
  const errors=[];
  const warnings=[];

  if(!isObject(candidate)) return {ok:false,score:0,errors:['candidate must be an object'],warnings:[]};

  if(!normalizeText(candidate.candidateId)) errors.push('missing candidateId');
  if(normalizeText(candidate.prompt).length < 10) errors.push('prompt too short');
  if(normalizeText(candidate.prompt).length > 400) errors.push('prompt too long');

  if(!Array.isArray(candidate.choices) || candidate.choices.length !== 3){
    errors.push('choices must contain exactly 3 items');
  }else{
    const clean=candidate.choices.map(normalizeText);
    if(clean.some(choice => !choice)) errors.push('choices must be non-empty');
    if(new Set(clean).size !== clean.length) errors.push('choices must be unique');
    if(clean.filter(choice => choice === normalizeText(candidate.answer)).length !== 1){
      errors.push('answer must occur exactly once in choices');
    }
  }

  if(normalizeText(candidate.explanation).length < 15) errors.push('explanation too short');
  if(normalizeText(candidate.hint).length < 5) errors.push('hint too short');

  const hint=normalizedForCompare(candidate.hint);
  const answer=normalizedForCompare(candidate.answer);
  if(answer.length > 2 && hint.includes(answer)){
    warnings.push('hint may reveal the answer');
  }

  for(const field of ['subject','district','skill','role','sourceChunkId','source']){
    if(!normalizeText(candidate[field])) errors.push('missing ' + field);
  }

  if(!Number.isInteger(candidate.difficulty) || candidate.difficulty < 1 || candidate.difficulty > 5){
    errors.push('difficulty must be an integer 1..5');
  }
  if(!Number.isInteger(candidate.reward) || candidate.reward < 1 || candidate.reward > 25){
    errors.push('reward must be an integer 1..25');
  }
  if(!Array.isArray(candidate.atomicFacts) || candidate.atomicFacts.length < 1){
    errors.push('atomicFacts must be non-empty');
  }else if(candidate.atomicFacts.some(fact => normalizeText(fact).length < 5)){
    errors.push('atomicFacts contain an underspecified fact');
  }

  let score=100;
  score-=errors.length * 18;
  score-=warnings.length * 6;
  if(normalizeText(candidate.prompt).length > 220) score-=4;
  if(normalizeText(candidate.explanation).length > 600) score-=4;
  score=Math.max(0,Math.min(100,score));

  return {
    ok:errors.length === 0,
    score,
    errors,
    warnings
  };
}

export function verifyCandidateEvidence(candidate,chunks){
  const byId=sourceMap(chunks);
  const errors=[];
  const verified=[];

  const source=byId.get(candidate.sourceChunkId);
  if(!source){
    errors.push('source chunk is missing');
  }

  const evidence=Array.isArray(candidate.evidence) ? candidate.evidence : [];
  if(evidence.length === 0){
    errors.push('no source evidence supplied');
  }

  for(const item of evidence){
    const chunk=byId.get(item.chunkId);
    if(!chunk){
      errors.push('evidence chunk missing: ' + item.chunkId);
      continue;
    }
    const quote=normalizeText(item.quote);
    if(!quote || quote.length < 8){
      errors.push('evidence quote too short');
      continue;
    }
    if(!chunk.evidenceText.includes(quote)){
      errors.push('evidence quote not found exactly in chunk ' + item.chunkId);
      continue;
    }
    verified.push({
      chunkId:item.chunkId,
      quote,
      chunkHash:chunk.chunkHash
    });
  }

  if(source && !verified.some(item => item.chunkId === candidate.sourceChunkId)){
    errors.push('source chunk lacks verified evidence');
  }

  return {
    ok:errors.length === 0,
    errors,
    verified
  };
}

function chunkRelevance(candidate,chunk){
  const query=normalizeText(candidate.prompt + ' ' + candidate.answer + ' ' + (candidate.atomicFacts || []).join(' '));
  return jaccard(query,chunk.text);
}

export function autoLinkSupportingChunks(candidate,chunks,{topK=3}={}){
  const scored=(chunks || [])
    .map(chunk => ({id:chunk.id,score:chunkRelevance(candidate,chunk)}))
    .sort((a,b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));

  const ids=[];
  if(candidate.sourceChunkId) ids.push(candidate.sourceChunkId);
  for(const row of scored){
    if(ids.length >= topK) break;
    if(row.score <= 0 || ids.includes(row.id)) continue;
    ids.push(row.id);
  }
  return ids.slice(0,topK);
}

function normalizeReviewResult(raw){
  if(!isObject(raw)) return null;
  const decision=String(raw.decision || '').toLowerCase();
  if(!['keep','rewrite','reject'].includes(decision)) return null;
  const score=Number(raw.score);
  return {
    candidateId:normalizeText(raw.candidateId),
    decision,
    score:Number.isFinite(score) ? Math.max(0,Math.min(100,Math.round(score))) : 0,
    reasons:Array.isArray(raw.reasons) ? raw.reasons.map(normalizeText).filter(Boolean) : [],
    revised:isObject(raw.revised) ? clone(raw.revised) : null
  };
}

function applyReview(candidate,review,{allowRewrite=true}={}){
  if(!review) return {
    candidate:clone(candidate),
    decision:'reject',
    reviewScore:0,
    reasons:['missing reviewer result']
  };

  let working=clone(candidate);
  let decision=review.decision;
  const reasons=[...review.reasons];

  if(decision === 'rewrite'){
    if(!allowRewrite || !review.revised){
      decision='reject';
      reasons.push('rewrite requested without an allowed revised payload');
    }else{
      const safeFields=[
        'prompt','choices','answer','explanation','hint','subject','district','skill',
        'role','difficulty','reward','masteryEligible','atomicFacts','evidence'
      ];
      for(const field of safeFields){
        if(field in review.revised) working[field]=clone(review.revised[field]);
      }
    }
  }

  return {
    candidate:working,
    decision,
    reviewScore:review.score,
    reasons
  };
}

function existingPrompts(bank){
  if(!bank?.questions) return [];
  return Object.values(bank.questions).flatMap(entry =>
    Object.values(entry.versions || {}).map(version => ({
      id:entry.id,
      prompt:version.prompt
    }))
  );
}

export function deduplicateCandidates(candidates,{
  bank=null,
  similarityThreshold=0.82
}={}){
  const kept=[];
  const duplicates=[];
  const prior=existingPrompts(bank);

  for(const candidate of candidates){
    const normalized=normalizedForCompare(candidate.prompt);
    let match=prior.find(item => normalizedForCompare(item.prompt) === normalized) || null;
    let similarity=match ? 1 : 0;

    if(!match){
      for(const item of [...prior,...kept.map(value => ({id:value.candidateId,prompt:value.prompt}))]){
        const current=jaccard(candidate.prompt,item.prompt);
        if(current > similarity){
          similarity=current;
          match=item;
        }
      }
    }

    if(match && similarity >= similarityThreshold){
      duplicates.push({
        candidate:clone(candidate),
        duplicateOf:match.id,
        similarity
      });
    }else{
      kept.push(candidate);
      prior.push({id:candidate.candidateId,prompt:candidate.prompt});
    }
  }

  return {kept,duplicates};
}

export async function validateGeneratedCandidates({
  candidates,
  chunks,
  reviewer=null,
  bank=null,
  mode='strict',
  minScore=80,
  allowRewrite=true,
  similarityThreshold=0.82
}){
  if(!Array.isArray(candidates)) throw new TypeError('candidates must be an array.');
  if(!['strict','hybrid','deterministic'].includes(mode)) throw new TypeError('invalid quality mode.');

  let reviews=new Map();
  let reviewerFailed=false;

  if(mode !== 'deterministic'){
    if(!reviewer || typeof reviewer.review !== 'function'){
      reviewerFailed=true;
    }else{
      try{
        const response=await reviewer.review({
          pipelineVersion:QUESTION_QUALITY_PIPELINE_VERSION,
          candidates:clone(candidates),
          chunks:clone(chunks)
        });
        const rows=Array.isArray(response?.results) ? response.results : [];
        reviews=new Map(rows
          .map(normalizeReviewResult)
          .filter(Boolean)
          .map(row => [row.candidateId,row])
        );
      }catch{
        reviewerFailed=true;
      }
    }
  }

  const accepted=[];
  const rejected=[];

  for(const original of candidates){
    const review=mode === 'deterministic'
      ? {candidate:clone(original),decision:'keep',reviewScore:null,reasons:[]}
      : applyReview(original,reviews.get(original.candidateId),{allowRewrite});

    const structure=validateCandidateStructure(review.candidate);
    const evidence=verifyCandidateEvidence(review.candidate,chunks);
    const linked=autoLinkSupportingChunks(review.candidate,chunks);

    const reviewScore=review.reviewScore == null ? null : review.reviewScore;
    const effectiveScore=reviewScore == null
      ? structure.score
      : Math.round(0.4 * structure.score + 0.6 * reviewScore);

    const reviewOk=review.decision === 'keep' || review.decision === 'rewrite';
    const reviewerAvailable=!reviewerFailed && reviewScore != null;
    let keep=false;

    if(mode === 'strict'){
      keep=reviewerAvailable && reviewOk && reviewScore >= minScore && effectiveScore >= minScore;
    }else if(mode === 'hybrid'){
      keep=reviewOk && effectiveScore >= minScore && (reviewerAvailable || structure.score >= Math.min(100,minScore + 10));
    }else{
      keep=structure.score >= minScore;
    }

    keep=keep && structure.ok && evidence.ok;

    const record={
      ...clone(review.candidate),
      supportingChunkIds:linked,
      quality:{
        pipelineVersion:QUESTION_QUALITY_PIPELINE_VERSION,
        mode,
        minScore,
        structuralScore:structure.score,
        reviewerScore:reviewScore,
        effectiveScore,
        reviewerDecision:review.decision,
        reviewerReasons:review.reasons,
        structuralErrors:structure.errors,
        structuralWarnings:structure.warnings,
        evidenceErrors:evidence.errors,
        verifiedEvidence:evidence.verified
      }
    };

    if(keep) accepted.push(record);
    else rejected.push(record);
  }

  const deduped=deduplicateCandidates(accepted,{bank,similarityThreshold});
  return {
    accepted:deduped.kept,
    duplicates:deduped.duplicates,
    rejected,
    reviewerFailed
  };
}

function strictIngestionReceipt(candidate){
  const quality=candidate?.quality;
  if(!quality || quality.mode !== 'strict'){
    throw new Error('generated candidate ingestion requires a strict review receipt.');
  }
  if(!['keep','rewrite'].includes(quality.reviewerDecision)){
    throw new Error('generated candidate ingestion requires a keep/rewrite reviewer decision.');
  }
  if(!Number.isFinite(quality.minScore) || !Number.isFinite(quality.reviewerScore) || !Number.isFinite(quality.effectiveScore)){
    throw new Error('generated candidate ingestion requires complete strict review scores.');
  }
  if(quality.reviewerScore < quality.minScore || quality.effectiveScore < quality.minScore){
    throw new Error('generated candidate ingestion requires review scores at or above the strict threshold.');
  }
  if((quality.structuralErrors || []).length || (quality.evidenceErrors || []).length){
    throw new Error('generated candidate ingestion requires clean structural and evidence gates.');
  }
  if(!Array.isArray(quality.verifiedEvidence) || quality.verifiedEvidence.length === 0){
    throw new Error('generated candidate ingestion requires verified source evidence.');
  }
  return quality;
}

function generatedQuestionShape(candidate){
  const quality=strictIngestionReceipt(candidate);
  const id='gen-' + stableHash({
    sourceChunkId:candidate.sourceChunkId,
    prompt:normalizedForCompare(candidate.prompt)
  }).split(':')[1];
  const sourceEvidence=quality.verifiedEvidence.find(item => item.chunkId === candidate.sourceChunkId) || null;
  const reviewReceipt={
    pipelineVersion:quality.pipelineVersion,
    mode:quality.mode,
    minScore:quality.minScore,
    reviewerDecision:quality.reviewerDecision,
    reviewerScore:quality.reviewerScore,
    effectiveScore:quality.effectiveScore,
    reviewerReasons:quality.reviewerReasons || []
  };
  const evidenceProvenance=quality.verifiedEvidence.map((item,index) => ({
    kind:'verified-evidence',
    sourceId:item.chunkId,
    label:item.quote,
    reference:item.chunkHash ? 'chunk-hash:' + item.chunkHash : 'evidence-index:' + index
  }));

  return {
    id,
    subject:candidate.subject,
    district:candidate.district,
    skill:candidate.skill,
    role:candidate.role,
    prompt:candidate.prompt,
    choices:clone(candidate.choices),
    answer:candidate.answer,
    explanation:candidate.explanation,
    hint:candidate.hint,
    difficulty:candidate.difficulty,
    reward:candidate.reward,
    masteryEligible:candidate.masteryEligible !== false,
    source:candidate.source,
    provenance:[
      {
        kind:'generated-source',
        sourceId:candidate.sourceChunkId,
        label:candidate.sourceHeader || candidate.sourceChunkId,
        reference:sourceEvidence?.chunkHash ? 'chunk-hash:' + sourceEvidence.chunkHash : null
      },
      {
        kind:'generation-run',
        sourceId:candidate.generation?.runId || 'unknown',
        label:(candidate.generation?.provider || 'unknown') + (candidate.generation?.model ? ':' + candidate.generation.model : ''),
        reference:'candidate:' + candidate.candidateId
      },
      {
        kind:'quality-review',
        sourceId:quality.pipelineVersion,
        label:quality.mode + ':' + quality.reviewerDecision +
          ':review=' + quality.reviewerScore +
          ':effective=' + quality.effectiveScore +
          ':threshold=' + quality.minScore,
        reference:'review-receipt:' + stableHash(reviewReceipt)
      },
      ...evidenceProvenance
    ]
  };
}

export function ingestValidatedCandidates(bank,candidates,options={}){
  if(Object.prototype.hasOwnProperty.call(options,'lifecycle') && options.lifecycle !== 'pending'){
    throw new Error('generated candidates may only be ingested with pending lifecycle.');
  }
  const {tags=['generated']}=options;
  let next=bank;
  const inserted=[];

  for(const candidate of candidates){
    const question=generatedQuestionShape(candidate);
    next=addQuestionToBank(next,question,{
      lifecycle:'pending',
      conceptIds:Array.isArray(candidate.conceptIds) && candidate.conceptIds.length
        ? candidate.conceptIds
        : [candidate.skill],
      tags,
      policy:{maxAttempts:2,gradingMethod:'latest',explanationRelease:'after_attempt'}
    });
    const version=getQuestionVersion(next,question.id);
    inserted.push({
      questionId:question.id,
      version:version.contentVersion,
      contentHash:version.contentHash,
      lifecycle:'pending'
    });
  }

  return {bank:next,inserted};
}
