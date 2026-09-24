import { RESIDENTIAL_FEATURES } from './residentialFeatureRuntime.js';
import { VEHICLE_CATALOG } from './vehicleSystemRuntime.js';
import { TOWN_LOCATION_CATALOG } from './townSystemRuntime.js';

export const LIFE_SIM_PROGRESSION_SCHEMA = 'starblox-life-sim-progression-shadow-v1';

const RULES = Object.freeze([
  ['residential','front-door',[]],
  ['residential','mailbox',[]],
  ['residential','garage-door',[['questsCompleted',1]]],
  ['residential','safe',[['stars',1]]],
  ['residential','sliding-door',[['starWorth',40]]],
  ['residential','dresser-storage',[['starWorth',60]]],
  ['residential','fridge',[['questsCompleted',2]]],
  ['residential','oven',[['questsCompleted',2]]],
  ['residential','dishwasher',[['questsCompleted',3]]],
  ['residential','room-change',[['masteredCount',2]]],
  ['residential','house-controls',[['questsCompleted',3]]],
  ['residential','hot-tub',[['starWorth',120]]],
  ['residential','fire-disaster-control',[['stars',3]]],

  ['vehicle','school-bus',[['masteredCount',1]]],
  ['vehicle','smart-car',[['questsCompleted',2]]],
  ['vehicle','jeep',[['stars',2]]],
  ['vehicle','farm-truck',[['questsCompleted',3]]],
  ['vehicle','tow-truck',[['masteredCount',3]]],
  ['vehicle','fire-truck',[['stars',4]]],
  ['vehicle','snowplow',[['starWorth',120]]],
  ['vehicle','cadillac',[['starWorth',160]]],
  ['vehicle','nascar-truck',[['masteredCount',5]]],
  ['vehicle','limo',[['starWorth',250]]],
  ['vehicle','excavator',[['questsCompleted',6]]],
  ['vehicle','military-truck',[['starWorth',300]]],
  ['vehicle','tank',[['starWorth',400]]],

  ['town','town-hall',[]],
  ['town','school',[]],
  ['town','commercial-stores',[]],
  ['town','daycare',[['questsCompleted',1]]],
  ['town','hospital',[['masteredCount',1]]],
  ['town','bank',[['questsCompleted',2]]],
  ['town','burger-barn',[['questsCompleted',2]]],
  ['town','fire-department',[['stars',2]]],
  ['town','church',[['masteredCount',2]]],
  ['town','auto-shop',[['starWorth',50]]],
  ['town','auto-mall',[['starWorth',100]]],
  ['town','horse-stables',[['stars',3]]],
  ['town','subway',[['questsCompleted',4]]],
  ['town','airport',[['masteredCount',4]]],
  ['town','yacht',[['starWorth',250]]]
].map(([targetType,targetId,criteria]) => Object.freeze({
  targetType,
  targetId,
  criteria:Object.freeze(criteria.map(([metric,gte]) => Object.freeze({metric,gte})))
})));

export const LIFE_SIM_PROGRESSION_RULES = Object.freeze(RULES);

function finiteNonNegative(value){
  return Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
}

export function progressionMetrics(save={}){
  return {
    questsCompleted:finiteNonNegative(save.questsCompleted),
    stars:finiteNonNegative(save.stars),
    starWorth:finiteNonNegative(save.starWorth),
    masteredCount:Array.isArray(save.mastered) ? new Set(save.mastered.map(String)).size : 0
  };
}

function targetExists(rule){
  if(rule.targetType === 'residential') return Boolean(RESIDENTIAL_FEATURES[rule.targetId]);
  if(rule.targetType === 'vehicle') return Boolean(VEHICLE_CATALOG[rule.targetId]);
  if(rule.targetType === 'town'){
    const location=TOWN_LOCATION_CATALOG[rule.targetId];
    return Boolean(location?.playerFacingEligible);
  }
  return false;
}

function criterionProgress(metrics,criterion){
  const current=finiteNonNegative(metrics[criterion.metric]);
  const target=Math.max(0,finiteNonNegative(criterion.gte));
  return {
    metric:criterion.metric,
    current,
    target,
    remaining:Math.max(0,target-current),
    met:current >= target,
    pct:target === 0 ? 100 : Math.max(0,Math.min(100,current/target*100))
  };
}

export function deriveLifeSimProgressionShadow(save={}){
  const metrics=progressionMetrics(save);
  const rows=LIFE_SIM_PROGRESSION_RULES.map(rule => {
    if(!targetExists(rule)) throw new Error('progression rule target missing: ' + rule.targetType + ':' + rule.targetId);
    const criteria=rule.criteria.map(criterion => criterionProgress(metrics,criterion));
    const unlocked=criteria.every(row => row.met);
    const progressPct=criteria.length
      ? Math.min(...criteria.map(row => row.pct))
      : 100;
    return {
      targetType:rule.targetType,
      targetId:rule.targetId,
      unlocked,
      progressPct:Number(progressPct.toFixed(2)),
      criteria
    };
  });

  const byType={residential:[],vehicle:[],town:[]};
  for(const row of rows) byType[row.targetType].push(row);

  const locked=rows.filter(row => !row.unlocked);
  const next=[...locked]
    .sort((a,b) => b.progressPct-a.progressPct || a.targetType.localeCompare(b.targetType) || a.targetId.localeCompare(b.targetId))
    .slice(0,5);

  return {
    schemaVersion:LIFE_SIM_PROGRESSION_SCHEMA,
    mode:'shadow-read-only',
    metrics,
    byType,
    unlockedCounts:Object.fromEntries(
      Object.entries(byType).map(([type,typeRows]) => [
        type,
        typeRows.filter(row => row.unlocked).length
      ])
    ),
    nextUnlocks:next,
    economyMutation:{
      coins:0,
      stars:0,
      starWorth:0,
      xp:0
    }
  };
}

export function unlockedLifeSimIds(save={},targetType){
  const model=deriveLifeSimProgressionShadow(save);
  const rows=model.byType[String(targetType)] || [];
  return rows.filter(row => row.unlocked).map(row => row.targetId);
}
