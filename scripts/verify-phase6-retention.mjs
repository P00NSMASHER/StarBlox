const key=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY || '').trim();
if(!key) throw new Error('ROBLOX_OPEN_CLOUD_API_KEY is required');

const url='https://apis.roblox.com/cloud/v2/universes/6027194615/data-stores/StarBloxPrivateRetention_v1/entries/aggregate';
const response=await fetch(url,{headers:{'x-api-key':key}});
const text=await response.text();

if(response.status === 404){
  process.stdout.write(JSON.stringify({
    schemaVersion:1,
    reportVersion:'starblox-phase6-retention-report-v1',
    status:'no-data',
    sessions:0,
    pilotTargetSessions:5,
    pilotTargetReached:false
  },null,2)+'\n');
  process.exit(0);
}
if(!response.ok){
  throw new Error('Roblox retention Data Store read HTTP '+response.status+': '+text);
}

let row;
try{
  row=text ? JSON.parse(text) : {};
}catch{
  throw new Error('Roblox retention Data Store read returned invalid JSON');
}

const aggregate=row?.value ?? row;
if(!aggregate || aggregate.retentionVersion!=='starblox-private-retention-v1'){
  throw new Error('retention aggregate version mismatch');
}
const privacy=aggregate.privacy || {};
if(
  privacy.storesUsername!==false ||
  privacy.storesUserId!==false ||
  privacy.storesRawAnswers!==false ||
  privacy.storesChat!==false ||
  privacy.storesSessionIds!==false
){
  throw new Error('retention privacy receipt mismatch');
}

const n=value=>Number(value || 0);
const ratio=(num,den)=>den > 0 ? num/den : null;
const average=(total,count)=>count > 0 ? total/count : null;
const sessions=n(aggregate.sessions);
const report={
  schemaVersion:1,
  reportVersion:'starblox-phase6-retention-report-v1',
  status:sessions > 0 ? 'measured' : 'no-data',
  releaseId:String(aggregate.releaseId || ''),
  placeVersion:n(aggregate.placeVersion),
  sessions,
  pilotTargetSessions:5,
  pilotTargetReached:sessions >= 5,
  touchSessionRate:ratio(n(aggregate.touchSessions),sessions),
  fullLoopCompletionRate:ratio(n(aggregate.fullLoopSessions),sessions),
  repeatLoopStartRate:ratio(n(aggregate.repeatLoopSessions),sessions),
  averageSessionSeconds:average(n(aggregate.totalDurationSeconds),sessions),
  averageTimeToFirstStationSeconds:average(
    n(aggregate.totalFirstStationSeconds),
    n(aggregate.sessionsWithFirstStation)
  ),
  sessionsWithFirstStation:n(aggregate.sessionsWithFirstStation),
  firstActivityCounts:aggregate.firstActivityCounts || {},
  updatedAt:n(aggregate.updatedAt),
  privacyVerified:true
};
process.stdout.write(JSON.stringify(report,null,2)+'\n');
