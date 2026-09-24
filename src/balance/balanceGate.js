import { gameModel } from '../gameModel.js';
import { scoreQuestAttempt } from '../questRewardPolicy.js';
import { Mulberry32 } from '../sim/deterministicCore.js';
import { generateCertifiedQuestLevel,verifySolutionCertificate } from '../generation/solutionFirstLevel.js';
import {
  IDENTITY_BALANCE,
  balanceQuestReward,
  balanceQuestStructure,
  effectiveQuestionDifficulty,
  resolveBalanceDoc
} from './balanceConfig.js';

export const BALANCE_GATE_THRESHOLDS=Object.freeze({
  firstTryRateDelta:0.12,
  avgActionsRelativeDelta:0.35,
  avgCoinsRelativeDelta:0.30,
  avgXpRelativeDelta:0.30,
  requiredCertificateRate:1
});

const PROFILES=Object.freeze([
  Object.freeze({id:'emerging',ability:1.45}),
  Object.freeze({id:'on-track',ability:2.45}),
  Object.freeze({id:'advanced',ability:3.45})
]);

function clamp01(value){
  return Math.max(0,Math.min(1,value));
}

function round(value,digits=4){
  const factor=10 ** digits;
  return Math.round(value * factor) / factor;
}

function correctProbability(question,profile,balance){
  const difficulty=effectiveQuestionDifficulty(question.difficulty,{balance});
  // Deliberately simple, monotonic synthetic learner model. It exists to detect
  // balance regressions, not to estimate a real child's ability.
  return clamp01(0.70 + (profile.ability - difficulty) * 0.16);
}

function chooseQuestion(bank,rng,used){
  if(used.size >= bank.length) used.clear();
  let index=rng.nextInt(0,bank.length - 1);
  let guard=0;
  while(used.has(index) && guard++ < bank.length){
    index=(index + 1) % bank.length;
  }
  used.add(index);
  return bank[index];
}

function simulateProfile({
  profile,
  balance,
  sessionSeeds,
  baseStageCount,
  baseOptionalCount
}){
  const bank=gameModel.buildQuestions();
  const structure=balanceQuestStructure({
    stageCount:baseStageCount,
    optionalCount:baseOptionalCount,
    balance
  });
  const questionCount=structure.stageCount + 1; // required challenges + boss slot

  let totalFirstTry=0;
  let totalQuestions=0;
  let totalRetries=0;
  let totalActions=0;
  let totalCoins=0;
  let totalXp=0;

  for(let seed=1;seed<=sessionSeeds;seed++){
    const rng=new Mulberry32((seed * 2654435761 + profile.id.length * 97) >>> 0);
    const used=new Set();

    for(let ordinal=0;ordinal<questionCount;ordinal++){
      const question=chooseQuestion(bank,rng,used);
      const firstCorrect=rng.next() < correctProbability(question,profile,balance);
      totalQuestions++;
      totalActions++;

      if(firstCorrect){
        totalFirstTry++;
        const reward=scoreQuestAttempt({
          question,
          correct:true,
          wasRetry:false,
          becomesMastered:false
        });
        const balanced=balanceQuestReward(reward,{correct:true,wasRetry:false,balance});
        totalCoins+=balanced.coins;
        totalXp+=balanced.xp;
      }else{
        const wrong=scoreQuestAttempt({
          question,
          correct:false,
          wasRetry:false,
          becomesMastered:false
        });
        const balancedWrong=balanceQuestReward(wrong,{correct:false,wasRetry:false,balance});
        totalCoins+=balancedWrong.coins;
        totalXp+=balancedWrong.xp;

        // Current StarBlox retry is supportive/non-punitive. For gate purposes we
        // model the guided retry as eventual success on the next action.
        totalRetries++;
        totalActions++;
        const retry=scoreQuestAttempt({
          question,
          correct:true,
          wasRetry:true,
          becomesMastered:false
        });
        const balancedRetry=balanceQuestReward(retry,{correct:true,wasRetry:true,balance});
        totalCoins+=balancedRetry.coins;
        totalXp+=balancedRetry.xp;
      }
    }
  }

  return {
    profile:profile.id,
    firstTryRate:round(totalQuestions ? totalFirstTry / totalQuestions : 0),
    avgRetries:round(totalRetries / sessionSeeds,3),
    avgActions:round(totalActions / sessionSeeds,3),
    avgCoins:round(totalCoins / sessionSeeds,3),
    avgXp:round(totalXp / sessionSeeds,3),
    questionCount
  };
}

function certifyLevels({balance,levelSeeds,baseStageCount,baseOptionalCount}){
  const structure=balanceQuestStructure({
    stageCount:baseStageCount,
    optionalCount:baseOptionalCount,
    balance
  });
  let passed=0;
  const failures=[];

  for(let seed=1;seed<=levelSeeds;seed++){
    try{
      const level=generateCertifiedQuestLevel({
        seed,
        stageCount:structure.stageCount,
        optionalCount:structure.optionalCount
      });
      const verified=verifySolutionCertificate(level);
      if(verified.ok) passed++;
      else failures.push({seed,reason:verified.reason});
    }catch(error){
      failures.push({
        seed,
        reason:error instanceof Error ? error.message : 'generation failed'
      });
    }
  }

  return {
    attempted:levelSeeds,
    passed,
    certificateRate:round(levelSeeds ? passed / levelSeeds : 0),
    failures:failures.slice(0,10),
    structure
  };
}

export function buildBalanceReport(rawConfig,{
  sessionSeeds=64,
  levelSeeds=64,
  baseStageCount=5,
  baseOptionalCount=3
}={}){
  const {resolved,diagnostics}=resolveBalanceDoc(rawConfig);
  return {
    schemaVersion:1,
    configVersion:resolved.version || 'identity',
    config:resolved,
    diagnostics:[...diagnostics],
    levels:certifyLevels({
      balance:resolved,
      levelSeeds,
      baseStageCount,
      baseOptionalCount
    }),
    profiles:PROFILES.map(profile => simulateProfile({
      profile,
      balance:resolved,
      sessionSeeds,
      baseStageCount,
      baseOptionalCount
    }))
  };
}

function relativeDelta(before,after){
  if(before === 0) return after === 0 ? 0 : Number.POSITIVE_INFINITY;
  return (after - before) / Math.abs(before);
}

export function compareBalanceReports(baseline,current){
  const failures=[];
  const warnings=[];

  if(current.diagnostics.some(item => item.type === 'clamped')){
    for(const item of current.diagnostics.filter(entry => entry.type === 'clamped')){
      failures.push({
        type:'unsafe-request',
        metric:item.path,
        from:item.requested,
        to:item.resolved
      });
    }
  }

  if(current.levels.certificateRate < BALANCE_GATE_THRESHOLDS.requiredCertificateRate){
    failures.push({
      type:'solvability',
      metric:'certificateRate',
      from:baseline.levels.certificateRate,
      to:current.levels.certificateRate
    });
  }

  const baselineProfiles=new Map(baseline.profiles.map(row => [row.profile,row]));
  for(const row of current.profiles){
    const before=baselineProfiles.get(row.profile);
    if(!before) continue;

    const firstTryDelta=row.firstTryRate - before.firstTryRate;
    if(Math.abs(firstTryDelta) > BALANCE_GATE_THRESHOLDS.firstTryRateDelta){
      failures.push({
        type:'first-try-rate',
        metric:row.profile,
        from:before.firstTryRate,
        to:row.firstTryRate,
        delta:round(firstTryDelta)
      });
    }

    for(const [metric,threshold,type] of [
      ['avgActions',BALANCE_GATE_THRESHOLDS.avgActionsRelativeDelta,'action-load'],
      ['avgCoins',BALANCE_GATE_THRESHOLDS.avgCoinsRelativeDelta,'coin-economy'],
      ['avgXp',BALANCE_GATE_THRESHOLDS.avgXpRelativeDelta,'xp-economy']
    ]){
      const delta=relativeDelta(before[metric],row[metric]);
      if(Math.abs(delta) > threshold){
        failures.push({
          type,
          metric:row.profile + '.' + metric,
          from:before[metric],
          to:row[metric],
          delta:round(delta)
        });
      }
    }

    if(Math.abs(relativeDelta(before.avgCoins,row.avgCoins)) > 0.15){
      warnings.push({
        type:'coin-drift',
        metric:row.profile,
        from:before.avgCoins,
        to:row.avgCoins
      });
    }
    if(Math.abs(relativeDelta(before.avgXp,row.avgXp)) > 0.15){
      warnings.push({
        type:'xp-drift',
        metric:row.profile,
        from:before.avgXp,
        to:row.avgXp
      });
    }
  }

  const byProfile=new Map(current.profiles.map(row => [row.profile,row]));
  const emerging=byProfile.get('emerging')?.firstTryRate ?? 0;
  const onTrack=byProfile.get('on-track')?.firstTryRate ?? 0;
  const advanced=byProfile.get('advanced')?.firstTryRate ?? 0;
  if(!(emerging <= onTrack && onTrack <= advanced)){
    failures.push({
      type:'profile-ordering',
      metric:'firstTryRate',
      from:'emerging <= on-track <= advanced',
      to:[emerging,onTrack,advanced]
    });
  }

  return {
    ok:failures.length === 0,
    failures,
    warnings
  };
}

export function gateBalanceCandidate(rawConfig,options={}){
  const baseline=buildBalanceReport(IDENTITY_BALANCE,options);
  const current=buildBalanceReport(rawConfig,options);
  const comparison=compareBalanceReports(baseline,current);
  return {
    ok:comparison.ok,
    baseline,
    current,
    failures:comparison.failures,
    warnings:comparison.warnings
  };
}
