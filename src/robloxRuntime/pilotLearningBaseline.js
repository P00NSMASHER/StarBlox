export const PILOT_BASELINE_VERSION='starblox-pilot-baseline-v1';

function safeRate(n,d){
  const denominator=Number(d)||0;
  return denominator>0 ? (Number(n)||0)/denominator : null;
}
function mergeCounter(target,source){
  for(const [key,value] of Object.entries(source||{})){
    target[key]=(target[key]||0)+(Number(value)||0);
  }
}
function emptySummary(){
  return {
    firstAttempts:0,firstCorrect:0,attempts:0,correct:0,wrong:0,
    rubricPoints:0,rubricMaxPoints:0,responseTimeBands:{},misconceptions:{}
  };
}
function addRow(summary,row){
  summary.firstAttempts+=Number(row.baselineFirstAttempts)||0;
  summary.firstCorrect+=Number(row.baselineFirstCorrect)||0;
  summary.attempts+=Number(row.baselinePilotAttempts)||0;
  summary.correct+=Number(row.baselinePilotCorrect)||0;
  summary.wrong+=Number(row.baselinePilotWrong)||0;
  summary.rubricPoints+=Number(row.baselineRubricPoints)||0;
  summary.rubricMaxPoints+=Number(row.baselineRubricMaxPoints)||0;
  mergeCounter(summary.responseTimeBands,row.baselineResponseTimeBands);
  mergeCounter(summary.misconceptions,row.baselineMisconceptionCounts);
}
function finalize(summary){
  const firstAttempts=summary.firstAttempts;
  const attempts=summary.attempts;
  const retryAttempts=Math.max(0,attempts-firstAttempts);
  return {
    ...summary,
    firstAttemptAccuracy:safeRate(summary.firstCorrect,firstAttempts),
    rubricRate:safeRate(summary.rubricPoints,summary.rubricMaxPoints),
    retryRate:safeRate(retryAttempts,attempts),
    slowResponseShare:safeRate(summary.responseTimeBands['30s-plus']||0,attempts)
  };
}
function groupRows(rows,keyFn){
  const groups={};
  for(const {row,meta} of rows){
    const key=String(keyFn(meta,row)||'unknown');
    groups[key]??=emptySummary();
    addRow(groups[key],row);
  }
  return Object.fromEntries(Object.entries(groups).map(([key,value])=>[key,finalize(value)]));
}

export function buildPilotBaseline({
  liveMetrics,
  bankSource,
  thresholds={}
}){
  const baselineMinFirstAttempts=Number(thresholds.baselineMinFirstAttempts)||54;
  const baselineMinCompletedSessions=Number(thresholds.baselineMinCompletedSessions)||3;
  const calibrationMinFirstAttempts=Number(thresholds.calibrationMinFirstAttempts)||100;
  const calibrationMinCompletedSessions=Number(thresholds.calibrationMinCompletedSessions)||6;
  const calibrationTargetFirstAttempts=Number(thresholds.calibrationTargetFirstAttempts)||200;

  const byId=new Map((bankSource?.questions||[]).map(question=>[question.id,question]));
  const rows=[];
  for(const [questionId,row] of Object.entries(liveMetrics?.itemMetrics||{})){
    rows.push({questionId,row,meta:byId.get(questionId)||{}});
  }

  const overallRaw=emptySummary();
  const firstPilotBucketCounts={};
  for(const {row} of rows){
    addRow(overallRaw,row);
    mergeCounter(firstPilotBucketCounts,row.baselineFirstBucketCounts);
  }
  const overall=finalize(overallRaw);
  const completedSessions=Number(liveMetrics?.retention?.baselinePilotSessionsCompleted)||0;
  const startedSessions=Number(liveMetrics?.retention?.baselinePilotSessionsStarted)||0;

  const baselineEstablished=
    overall.firstAttempts>=baselineMinFirstAttempts &&
    completedSessions>=baselineMinCompletedSessions;
  const calibrationReady=
    overall.firstAttempts>=calibrationMinFirstAttempts &&
    completedSessions>=calibrationMinCompletedSessions;

  const status=overall.firstAttempts===0
    ? 'awaiting-pilot-evidence'
    : baselineEstablished
      ? 'baseline-established'
      : 'collecting-baseline';

  return {
    schemaVersion:1,
    baselineVersion:PILOT_BASELINE_VERSION,
    status,
    source:{
      placeVersion:Number(liveMetrics?.placeVersion)||null,
      bankSnapshotId:bankSource?.generatedFrom?.bankSnapshotId||null,
      metricsVersion:liveMetrics?.metricsVersion||null,
      metricsUpdatedAt:liveMetrics?.metricsUpdatedAt||null,
      cohort:'first-'+baselineMinCompletedSessions+'-completed-pilot-sessions',
      frozen:true
    },
    readiness:{
      startedSessions,
      completedSessions,
      firstAttempts:overall.firstAttempts,
      baselineMinFirstAttempts,
      baselineMinCompletedSessions,
      baselineEstablished,
      calibrationMinFirstAttempts,
      calibrationMinCompletedSessions,
      calibrationTargetFirstAttempts,
      calibrationReady
    },
    overall,
    exposure:{
      firstPilotBucketCounts
    },
    bySkill:groupRows(rows,meta=>meta.skill),
    bySubject:groupRows(rows,meta=>meta.subject),
    byDomain:groupRows(rows,meta=>meta.domain),
    byDifficulty:groupRows(rows,meta=>String(meta.difficulty??'unknown')),
    governance:{
      adaptiveDifficultyFrozenDuringBaseline:true,
      postBaselinePilotDataExcluded:true,
      baselineCohortImmutableByDefinition:true
    },
    privacy:{
      containsUsernames:false,
      containsUserIds:false,
      containsRawAnswers:false,
      containsChat:false
    }
  };
}

export function pilotBaselineMarkdown(report){
  const pct=value=>value==null?'—':(value*100).toFixed(1)+'%';
  return [
    '# StarBlox pilot learning baseline',
    '',
    '- Status: **'+report.status+'**',
    '- Completed pilot sessions: **'+report.readiness.completedSessions+'**',
    '- Clean first attempts: **'+report.readiness.firstAttempts+'**',
    '- First-attempt accuracy: **'+pct(report.overall.firstAttemptAccuracy)+'**',
    '- Rubric rate: **'+pct(report.overall.rubricRate)+'**',
    '- Retry rate: **'+pct(report.overall.retryRate)+'**',
    '- 30s+ response share: **'+pct(report.overall.slowResponseShare)+'**',
    '- Baseline floor: **'+report.readiness.baselineMinFirstAttempts+' attempts / '+report.readiness.baselineMinCompletedSessions+' sessions**',
    '- Calibration floor: **'+report.readiness.calibrationMinFirstAttempts+' attempts / '+report.readiness.calibrationMinCompletedSessions+' sessions**',
    '- Baseline cohort: **first '+report.readiness.baselineMinCompletedSessions+' completed pilot sessions only**',
    '- Adaptive difficulty during baseline: **frozen**',
    '',
    'No usernames, user IDs, raw answers, or chat are included in this report.'
  ].join('\n')+'\n';
}
