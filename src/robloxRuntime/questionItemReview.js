function safeRate(numerator,denominator){
  return Number.isFinite(denominator)&&denominator>0 ? numerator/denominator : null;
}

function pointBiserial(row){
  const n=Number(row?.firstAttempts)||0;
  const sumX=Number(row?.firstCorrect)||0;
  const sumY=Number(row?.sumSessionAccuracy)||0;
  const sumY2=Number(row?.sumSessionAccuracySquared)||0;
  const sumXY=Number(row?.sumItemSessionProduct)||0;
  if(n<2) return null;
  const numerator=(n*sumXY)-(sumX*sumY);
  const xTerm=(n*sumX)-(sumX*sumX);
  const yTerm=(n*sumY2)-(sumY*sumY);
  const denominator=Math.sqrt(Math.max(0,xTerm*yTerm));
  if(!(denominator>0)) return null;
  return numerator/denominator;
}

function maxCounterShare(counter,total){
  if(!counter||typeof counter!=='object'||!(total>0)) return {key:null,share:null,count:0};
  let key=null,count=0;
  for(const [candidate,value] of Object.entries(counter)){
    const numeric=Number(value)||0;
    if(numeric>count){key=candidate;count=numeric;}
  }
  return {key,share:count/total,count};
}

function variantSummary(variants){
  const result={};
  for(const id of ['A','B']){
    const row=variants?.[id];
    if(!row) continue;
    const n=Number(row.firstAttempts)||0;
    result[id]={
      firstAttempts:n,
      accuracy:safeRate(Number(row.firstCorrect)||0,n),
      rubricRate:safeRate(Number(row.rubricPoints)||0,Number(row.rubricMaxPoints)||0)
    };
  }
  if(result.A?.accuracy!=null&&result.B?.accuracy!=null){
    result.accuracyDeltaBMinusA=result.B.accuracy-result.A.accuracy;
  }
  if(result.A?.rubricRate!=null&&result.B?.rubricRate!=null){
    result.rubricDeltaBMinusA=result.B.rubricRate-result.A.rubricRate;
  }
  return result;
}

export function reviewQuestionItem(questionId,row,{
  minFirstAttempts=20,
  tooEasy=0.90,
  tooHard=0.45,
  minDiscrimination=0.15,
  slowShare=0.35,
  dominantMisconceptionShare=0.35
}={}){
  const firstAttempts=Number(row?.firstAttempts)||0;
  const firstCorrect=Number(row?.firstCorrect)||0;
  const attempts=Number(row?.attempts)||0;
  const wrong=Number(row?.wrong)||0;
  const difficulty=safeRate(firstCorrect,firstAttempts);
  const discrimination=pointBiserial(row);
  const rubricRate=safeRate(Number(row?.rubricPoints)||0,Number(row?.rubricMaxPoints)||0);
  const slow=safeRate(Number(row?.responseTimeBands?.['30s-plus'])||0,attempts);
  const dominantMisconception=maxCounterShare(row?.misconceptionCounts,wrong);
  const flags=[];

  if(firstAttempts>=minFirstAttempts){
    if(difficulty!=null&&difficulty>tooEasy) flags.push('too-easy');
    if(difficulty!=null&&difficulty<tooHard) flags.push('too-hard');
    if(discrimination!=null&&discrimination<minDiscrimination) flags.push('low-discrimination');
    if(slow!=null&&slow>slowShare) flags.push('slow-response-load');
    if(dominantMisconception.share!=null&&dominantMisconception.share>dominantMisconceptionShare){
      flags.push('dominant-misconception');
    }
  }else{
    flags.push('insufficient-sample');
  }

  const severe=flags.includes('low-discrimination')||
    (flags.includes('too-hard')&&flags.includes('slow-response-load'));
  const action=firstAttempts<minFirstAttempts
    ? 'collect-more-data'
    : severe
      ? 'retire-or-rewrite'
      : flags.length
        ? 'review'
        : 'retain';

  return {
    questionId,
    firstAttempts,
    difficulty,
    discrimination,
    rubricRate,
    slowResponseShare:slow,
    dominantMisconception,
    supportRate:safeRate(Number(row?.supportAttempts)||0,Math.max(1,attempts+(Number(row?.supportAttempts)||0))),
    variants:variantSummary(row?.variants),
    flags,
    action
  };
}

export function reviewQuestionAggregate(aggregate,options={}){
  const rows=[];
  for(const [questionId,row] of Object.entries(aggregate?.items||{})){
    rows.push(reviewQuestionItem(questionId,row,options));
  }
  rows.sort((a,b)=>{
    const order={'retire-or-rewrite':0,review:1,'collect-more-data':2,retain:3};
    const actionDelta=(order[a.action]??9)-(order[b.action]??9);
    if(actionDelta) return actionDelta;
    return (b.firstAttempts||0)-(a.firstAttempts||0);
  });
  return {
    schemaVersion:1,
    reviewVersion:'starblox-item-review-v1',
    sourceMetricsVersion:aggregate?.metricsVersion||null,
    itemCount:rows.length,
    actions:rows.reduce((acc,row)=>{
      acc[row.action]=(acc[row.action]||0)+1;
      return acc;
    },{}),
    items:rows,
    privacy:{
      requiresUserIds:false,
      requiresRawAnswers:false,
      requiresSessionIds:false
    }
  };
}

export function itemReviewMarkdown(report){
  const lines=[
    '# StarBlox question item review',
    '',
    '- Items: **'+report.itemCount+'**',
    '- Retain: **'+(report.actions.retain||0)+'**',
    '- Review: **'+(report.actions.review||0)+'**',
    '- Retire/rewrite: **'+(report.actions['retire-or-rewrite']||0)+'**',
    '- More data: **'+(report.actions['collect-more-data']||0)+'**',
    '',
    '| Question | N | Difficulty | Discrimination | Action | Flags |',
    '|---|---:|---:|---:|---|---|'
  ];
  for(const row of report.items){
    const p=row.difficulty==null?'—':row.difficulty.toFixed(2);
    const r=row.discrimination==null?'—':row.discrimination.toFixed(2);
    lines.push('| '+row.questionId+' | '+row.firstAttempts+' | '+p+' | '+r+' | '+row.action+' | '+row.flags.join(', ')+' |');
  }
  return lines.join('\n')+'\n';
}
