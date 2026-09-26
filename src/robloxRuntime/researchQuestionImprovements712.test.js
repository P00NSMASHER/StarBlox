import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';

function read(path){
  return readFileSync(new URL('../../'+path,import.meta.url),'utf8');
}

describe('Research improvements 7-12: alignment, analytics, experiments, rich items, rubrics, pool size',()=>{
  it('fails refreshed publication closed behind an independent alignment validator',()=>{
    const workflow=read('.github/workflows/sync-abvm-questions.yml');
    const validator=read('src/robloxRuntime/questionAlignmentValidator.js');
    expect(workflow).toContain('node scripts/validate-question-alignment.mjs');
    expect(workflow.indexOf('node scripts/validate-question-alignment.mjs')).toBeLessThan(workflow.indexOf('Commit only when the verified curriculum snapshot changed'));
    expect(validator).toContain('skill-domain-mismatch');
    expect(validator).toContain('skill-standard-mismatch');
    expect(validator).toContain('semantic-anchor-missing');
  });

  it('ships a refreshed 60 Reading + 60 Math STAR pool with 40 fallback items per station',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    expect(source.starAlignment.readingQuestionCount).toBeGreaterThanOrEqual(60);
    expect(source.starAlignment.mathQuestionCount).toBeGreaterThanOrEqual(60);
    expect(source.qualityPolicy.starFallbackQuestionsPerStation).toBe(40);
    expect(source.qualityPolicy.starReadingPoolTarget).toBe(60);
    expect(source.qualityPolicy.starMathPoolTarget).toBe(60);
    expect(config).toContain('StarFallbackPerStation = 40');
    expect(config).toContain('MinimumQuestionsPerStation = 40');
  });

  it('adds analytic rubrics to every certified question without awarding coins for partial credit',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    expect(source.questions.every(q=>q.rubric?.maxPoints===2)).toBe(true);
    expect(source.questions.every(q=>Array.isArray(q.rubric?.criteria)&&q.rubric.criteria.length>=2)).toBe(true);
    expect(server).toContain('local function rubricScore');
    expect(server).toContain('stats.Partial');
    expect(server).toContain('rubricScore = rubricPoints');
    expect(server).toContain('profileData.Economy.Coins += Config.QuestionReward.Coins');
    const wrongBlock=server.slice(server.indexOf('if not correct then'),server.indexOf('if session.supportMode == true then'));
    expect(wrongBlock).not.toContain('profileData.Economy.Coins +=');
  });

  it('renders structured rich math formats without exposing answer keys to the client',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const client=read('roblox/src/client/CoreGameLoop.client.luau');
    const richKinds=new Set(source.questions.filter(q=>q.richContent).map(q=>q.richContent.kind));
    for(const kind of ['bar-chart','clock-face','number-line','place-value','shape-fraction']){
      expect(richKinds.has(kind)).toBe(true);
    }
    for(const renderer of ['renderBarChart','renderClock','renderNumberLine','renderPlaceValue','renderFraction']){
      expect(client).toContain(renderer);
    }
    expect(client).not.toContain('activity.answer');
  });

  it('persists a small stable A/B cohort and exposes no experiment label to the child',()=>{
    const source=JSON.parse(read('docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json'));
    const profile=read('roblox/src/shared/ProfileTemplate.luau');
    const config=read('roblox/src/shared/CoreLoopConfig.luau');
    const server=read('roblox/src/server/CoreGameLoopService.luau');
    const experiments=source.questions.filter(q=>q.experiment);
    expect(experiments.length).toBeGreaterThan(0);
    expect(experiments.every(q=>q.experiment.treatmentPercent===10)).toBe(true);
    expect(profile).toContain('Experiments = {}');
    expect(config).toContain('TreatmentPercent = 10');
    expect(server).toContain('profileData.Learning.Experiments[experimentId]');
    expect(server).toContain('variantId = variantId');
  });

  it('collects anonymous item-quality aggregates and supports classical review',()=>{
    const telemetry=read('roblox/src/server/PrivatePlaytestTelemetryService.luau');
    const review=read('src/robloxRuntime/questionItemReview.js');
    expect(telemetry).toContain('StarBloxQuestionItemMetrics_v1');
    expect(telemetry).toContain('question_attempt = true');
    expect(telemetry).toContain('storesUsername = false');
    expect(telemetry).toContain('storesUserId = false');
    expect(telemetry).toContain('storesRawAnswers = false');
    expect(telemetry).toContain('storesSessionIds = false');
    expect(telemetry).toContain('storesChoiceIndexOnly = true');
    expect(telemetry).toContain('storesResponseTimeBandsOnly = true');
    expect(review).toContain('function pointBiserial');
    expect(review).toContain("'too-easy'");
    expect(review).toContain("'too-hard'");
    expect(review).toContain("'low-discrimination'");
  });
});
