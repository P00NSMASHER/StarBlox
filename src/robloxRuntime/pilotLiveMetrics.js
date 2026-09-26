import {runOpenCloudLuauTask} from './privatePublish.js';

export const PILOT_LIVE_METRICS_VERSION='starblox-pilot-live-metrics-v1';

function flattenStrings(value,out=[]){
  if(typeof value==='string') out.push(value);
  else if(Array.isArray(value)) for(const child of value) flattenStrings(child,out);
  else if(value&&typeof value==='object') for(const child of Object.values(value)) flattenStrings(child,out);
  return out;
}

export function buildPilotMetricsProbeScript(){
  return `local DataStoreService = game:GetService("DataStoreService")
local HttpService = game:GetService("HttpService")

local function readStore(name, key)
    local ok, value = pcall(function()
        return DataStoreService:GetDataStore(name):GetAsync(key)
    end)
    if not ok then
        return nil, tostring(value)
    end
    return value, nil
end

local metrics, metricsError = readStore("StarBloxQuestionItemMetrics_v2", "aggregate")
local retention, retentionError = readStore("StarBloxPrivateRetention_v1", "aggregate")

local pilotItems = {}
if type(metrics) == "table" and type(metrics.items) == "table" then
    for questionId, row in metrics.items do
        if type(questionId) == "string" and type(row) == "table"
            and (
                (tonumber(row.pilotAttempts) or 0) > 0
                or (tonumber(row.firstPilotAttempts) or 0) > 0
                or (tonumber(row.baselinePilotAttempts) or 0) > 0
                or (tonumber(row.baselineFirstAttempts) or 0) > 0
            )
        then
            pilotItems[questionId] = {
                pilotAttempts = tonumber(row.pilotAttempts) or 0,
                pilotCorrect = tonumber(row.pilotCorrect) or 0,
                pilotWrong = tonumber(row.pilotWrong) or 0,
                firstPilotAttempts = tonumber(row.firstPilotAttempts) or 0,
                firstPilotCorrect = tonumber(row.firstPilotCorrect) or 0,
                pilotRubricPoints = tonumber(row.pilotRubricPoints) or 0,
                pilotRubricMaxPoints = tonumber(row.pilotRubricMaxPoints) or 0,
                pilotBucketCounts = row.pilotBucketCounts or {},
                firstPilotBucketCounts = row.firstPilotBucketCounts or {},
                pilotResponseTimeBands = row.pilotResponseTimeBands or {},
                pilotMisconceptionCounts = row.pilotMisconceptionCounts or {},
                baselinePilotAttempts = tonumber(row.baselinePilotAttempts) or 0,
                baselinePilotCorrect = tonumber(row.baselinePilotCorrect) or 0,
                baselinePilotWrong = tonumber(row.baselinePilotWrong) or 0,
                baselineFirstAttempts = tonumber(row.baselineFirstAttempts) or 0,
                baselineFirstCorrect = tonumber(row.baselineFirstCorrect) or 0,
                baselineRubricPoints = tonumber(row.baselineRubricPoints) or 0,
                baselineRubricMaxPoints = tonumber(row.baselineRubricMaxPoints) or 0,
                baselineBucketCounts = row.baselineBucketCounts or {},
                baselineFirstBucketCounts = row.baselineFirstBucketCounts or {},
                baselineResponseTimeBands = row.baselineResponseTimeBands or {},
                baselineMisconceptionCounts = row.baselineMisconceptionCounts or {},
                sumPilotSessionAccuracy = tonumber(row.sumPilotSessionAccuracy) or 0,
                sumPilotSessionAccuracySquared = tonumber(row.sumPilotSessionAccuracySquared) or 0,
                sumPilotItemSessionProduct = tonumber(row.sumPilotItemSessionProduct) or 0,
                variants = row.variants or {},
                updatedAt = tonumber(row.updatedAt) or 0,
            }
        end
    end
end

local payload = {
    schemaVersion = 1,
    liveMetricsVersion = "starblox-pilot-live-metrics-v1",
    placeVersion = game.PlaceVersion,
    metricsVersion = if type(metrics) == "table" then metrics.metricsVersion else nil,
    metricsUpdatedAt = if type(metrics) == "table" then metrics.updatedAt else nil,
    metricsSessions = if type(metrics) == "table" then metrics.sessions else 0,
    itemMetrics = pilotItems,
    retention = {
        placeVersion = if type(retention) == "table" then retention.placeVersion else nil,
        sessions = if type(retention) == "table" then retention.sessions else 0,
        pilotSessionsStarted = if type(metrics) == "table"
            then metrics.pilotSessionsStarted
            elseif type(retention) == "table" then retention.pilotSessionsStarted else 0,
        pilotSessionsCompleted = if type(metrics) == "table"
            then metrics.pilotSessionsCompleted
            elseif type(retention) == "table" then retention.pilotSessionsCompleted else 0,
        baselinePilotSessionsStarted = if type(metrics) == "table"
            then metrics.baselinePilotSessionsStarted
            elseif type(retention) == "table" then retention.baselinePilotSessionsStarted else 0,
        baselinePilotSessionsCompleted = if type(metrics) == "table"
            then metrics.baselinePilotSessionsCompleted
            elseif type(retention) == "table" then retention.baselinePilotSessionsCompleted else 0,
        updatedAt = if type(metrics) == "table"
            then metrics.updatedAt
            elseif type(retention) == "table" then retention.updatedAt else nil,
    },
    metricsError = metricsError,
    retentionError = retentionError,
}

local encoded = HttpService:JSONEncode(payload)
local chunkSize = 2800
local total = math.max(1, math.ceil(#encoded / chunkSize))
for index = 1, total do
    local first = ((index - 1) * chunkSize) + 1
    local last = math.min(index * chunkSize, #encoded)
    print("STARBLOX_PILOT_METRICS_CHUNK " .. tostring(index) .. "/" .. tostring(total) .. " " .. string.sub(encoded, first, last))
end
return tostring(game.PlaceVersion), tostring(total)
`;
}

export function parsePilotMetricsLogs(logs){
  const parts=new Map();
  let expected=null;
  for(const text of flattenStrings(logs)){
    const match=text.match(/STARBLOX_PILOT_METRICS_CHUNK\s+(\d+)\/(\d+)\s+([\s\S]*)/);
    if(!match) continue;
    const index=Number(match[1]);
    const total=Number(match[2]);
    if(!Number.isInteger(index)||!Number.isInteger(total)||index<1||index>total) continue;
    if(expected==null) expected=total;
    if(expected!==total) throw new Error('pilot metrics log chunks disagree on total count');
    parts.set(index,match[3]);
  }
  if(expected==null) throw new Error('pilot metrics logs are missing the expected sentinel');
  if(parts.size!==expected) throw new Error('pilot metrics logs are missing one or more chunks');
  let encoded='';
  for(let index=1;index<=expected;index+=1){
    if(!parts.has(index)) throw new Error('pilot metrics log chunk '+index+' is missing');
    encoded+=parts.get(index);
  }
  const parsed=JSON.parse(encoded);
  if(parsed?.liveMetricsVersion!==PILOT_LIVE_METRICS_VERSION){
    throw new Error('unexpected pilot metrics version');
  }
  return parsed;
}

export async function fetchLivePilotMetrics({
  apiKey,
  universeId,
  placeId,
  fetchImpl=globalThis.fetch,
  pollIntervalMs=1000,
  timeoutMs=90_000
}){
  const task=await runOpenCloudLuauTask({
    apiKey,
    universeId,
    placeId,
    fetchImpl,
    pollIntervalMs,
    timeoutMs,
    script:buildPilotMetricsProbeScript()
  });
  const snapshot=parsePilotMetricsLogs(task.logs);
  if(snapshot.metricsError) throw new Error('pilot item metrics read failed: '+snapshot.metricsError);
  if(snapshot.retentionError) throw new Error('pilot retention metrics read failed: '+snapshot.retentionError);
  if(Number(snapshot.placeVersion)!==task.versionNumber){
    throw new Error('pilot metrics place version mismatch');
  }
  return {
    ...snapshot,
    taskPath:task.path,
    terminalState:task.state
  };
}
