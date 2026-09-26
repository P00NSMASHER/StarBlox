import {createHash} from 'node:crypto';

export const PILOT_CALIBRATION_VERSION='starblox-pilot-calibration-v1';

function safeRate(n,d){
  const denominator=Number(d)||0;
  return denominator>0 ? (Number(n)||0)/denominator : null;
}
function maxCounter(counter,total){
  let key=null,count=0;
  for(const [candidate,value] of Object.entries(counter||{})){
    const numeric=Number(value)||0;
    if(numeric>count){key=candidate;count=numeric;}
  }
  return {key,count,share:total>0?count/total:null};
}
function pilotDiscrimination(row){
  const n=Number(row?.firstPilotAttempts)||0;
  if(n<20) return null;
  const sumX=Number(row?.firstPilotCorrect)||0;
  const sumY=Number(row?.sumPilotSessionAccuracy)||0;
  const sumY2=Number(row?.sumPilotSessionAccuracySquared)||0;
  const sumXY=Number(row?.sumPilotItemSessionProduct)||0;
  const numerator=(n*sumXY)-(sumX*sumY);
  const xTerm=(n*sumX)-(sumX*sumX);
  const yTerm=(n*sumY2)-(sumY*sumY);
  const denominator=Math.sqrt(Math.max(0,xTerm*yTerm));
  return denominator>0 ? numerator/denominator : null;
}
function stableHash(value){
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function calibratePilotItems({
  baseline,
  liveMetrics,
  bankSource,
  thresholds={}
}){
  const minGlobalFirstAttempts=Number(thresholds.minGlobalFirstAttempts)||100;
  const minCompletedSessions=Number(thresholds.minCompletedSessions)||6;
  const minItemFirstAttempts=Number(thresholds.minItemFirstAttempts)||5;
  const minItemRetireAttempts=Number(thresholds.minItemRetireAttempts)||8;
  const tooEasy=Number(thresholds.tooEasy)||0.92;
  const tooHard=Number(thresholds.tooHard)||0.40;
  const slowShareFloor=Number(thresholds.slowShareFloor)||0.40;
  const retryShareFloor=Number(thresholds.retryShareFloor)||0.50;
  const misconceptionShareFloor=Number(thresholds.misconceptionShareFloor)||0.50;
  const minDiscrimination=Number(thresholds.minDiscrimination)||0.10;

  const globalFirstAttempts=
    Number(baseline?.readiness?.calibrationFirstAttempts)
    || Number(baseline?.readiness?.firstAttempts)
    || 0;
  const completedSessions=
    Number(baseline?.readiness?.calibrationCompletedSessions)
    || Number(baseline?.readiness?.completedSessions)
    || 0;
  const calibrationReady=
    globalFirstAttempts>=minGlobalFirstAttempts &&
    completedSessions>=minCompletedSessions;

  const byId=new Map((bankSource?.questions||[]).map(question=>[question.id,question]));
  const items=[];
  for(const [questionId,row] of Object.entries(liveMetrics?.itemMetrics||{})){
    const meta=byId.get(questionId)||{};
    const n=Number(row.firstPilotAttempts)||0;
    const accuracy=safeRate(row.firstPilotCorrect,n);
    const attempts=Number(row.pilotAttempts)||0;
    const retryRate=safeRate(Math.max(0,attempts-n),attempts);
    const slowShare=safeRate(row?.pilotResponseTimeBands?.['30s-plus']||0,attempts);
    const dominant=maxCounter(row.pilotMisconceptionCounts,Number(row.pilotWrong)||0);
    const discrimination=pilotDiscrimination(row);
    const flags=[];

    if(!calibrationReady || n<minItemFirstAttempts){
      flags.push('insufficient-sample');
    }else{
      if(accuracy!=null&&accuracy>tooEasy) flags.push('too-easy');
      if(accuracy!=null&&accuracy<tooHard) flags.push('too-hard');
      if(slowShare!=null&&slowShare>slowShareFloor) flags.push('slow-response-load');
      if(retryRate!=null&&retryRate>retryShareFloor) flags.push('high-retry-load');
      if(dominant.share!=null&&dominant.share>misconceptionShareFloor) flags.push('dominant-misconception');
      if(discrimination!=null&&discrimination<minDiscrimination) flags.push('low-discrimination');
    }

    let action='retain';
    if(!calibrationReady || n<minItemFirstAttempts) action='collect-more-data';
    else if(flags.includes('low-discrimination')||(flags.includes('too-hard')&&flags.includes('slow-response-load'))) action='rewrite-candidate';
    else if(flags.includes('too-easy')&&n>=minItemRetireAttempts) action='retire-candidate';
    else if(flags.length) action='review-candidate';

    items.push({
      questionId,
      subject:meta.subject||null,
      domain:meta.domain||null,
      skill:meta.skill||null,
      difficulty:meta.difficulty??null,
      firstAttempts:n,
      firstAttemptAccuracy:accuracy,
      retryRate,
      slowResponseShare:slowShare,
      dominantMisconception:dominant,
      discriminationProxy:discrimination,
      flags,
      action
    });
  }

  const skillRecommendations=[];
  for(const [skill,summary] of Object.entries(baseline?.bySkill||{})){
    const n=Number(summary.firstAttempts)||0;
    if(!calibrationReady || n<10){
      skillRecommendations.push({skill,firstAttempts:n,action:'collect-more-data'});
      continue;
    }
    const accuracy=summary.firstAttemptAccuracy;
    const retry=summary.retryRate;
    let action='maintain';
    if(accuracy!=null&&accuracy<0.55) action='increase-support-and-practice';
    else if(retry!=null&&retry>0.40) action='increase-scaffolding';
    else if(accuracy!=null&&accuracy>0.90) action='reduce-frequency-keep-spaced-retrieval';
    skillRecommendations.push({skill,firstAttempts:n,firstAttemptAccuracy:accuracy,retryRate:retry,action});
  }

  items.sort((a,b)=>{
    const order={'rewrite-candidate':0,'retire-candidate':1,'review-candidate':2,'collect-more-data':3,retain:4};
    const delta=(order[a.action]??9)-(order[b.action]??9);
    return delta || b.firstAttempts-a.firstAttempts || a.questionId.localeCompare(b.questionId);
  });

  const result={
    schemaVersion:1,
    calibrationVersion:PILOT_CALIBRATION_VERSION,
    status:calibrationReady?'calibration-ready':'collecting-evidence',
    readiness:{
      calibrationReady,
      globalFirstAttempts,
      completedSessions,
      minGlobalFirstAttempts,
      minCompletedSessions,
      targetFirstAttempts:200
    },
    actions:items.reduce((acc,item)=>{
      acc[item.action]=(acc[item.action]||0)+1;
      return acc;
    },{}),
    items,
    skillRecommendations,
    governance:{
      autoApply:false,
      questionBankMutationPerformed:false,
      requiresReviewBeforeRewrite:true,
      retireIsCandidateOnly:true,
      discriminationIsLongitudinalPilotProxy:true
    },
    source:{
      placeVersion:Number(liveMetrics?.placeVersion)||null,
      bankSnapshotId:bankSource?.generatedFrom?.bankSnapshotId||null,
      metricsVersion:liveMetrics?.metricsVersion||null
    }
  };
  return {...result,evidenceHash:'sha256:'+stableHash(result)};
}

export function pilotCalibrationMarkdown(report){
  return [
    '# StarBlox pilot calibration',
    '',
    '- Status: **'+report.status+'**',
    '- Clean first attempts: **'+report.readiness.globalFirstAttempts+'**',
    '- Completed pilot sessions: **'+report.readiness.completedSessions+'**',
    '- Calibration floor: **'+report.readiness.minGlobalFirstAttempts+' attempts / '+report.readiness.minCompletedSessions+' sessions**',
    '- Rewrite candidates: **'+(report.actions['rewrite-candidate']||0)+'**',
    '- Retire candidates: **'+(report.actions['retire-candidate']||0)+'**',
    '- Review candidates: **'+(report.actions['review-candidate']||0)+'**',
    '- Collect-more-data items: **'+(report.actions['collect-more-data']||0)+'**',
    '',
    '**No automatic item mutation is permitted.** Candidate actions require review before any generator or bank change.',
    '',
    'Evidence hash: `'+report.evidenceHash+'`'
  ].join('\n')+'\n';
}
