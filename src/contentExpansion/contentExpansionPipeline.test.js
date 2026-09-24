
import { describe,expect,it } from 'vitest';
import { gameModel } from '../gameModel.js';
import { importLegacyQuestionBank } from '../questionBank/questionBankV2.js';
import { buildRobloxCapabilityCatalog } from '../robloxCatalog/capabilityCatalog.js';
import { buildMigrationBundleManifest } from '../robloxMigration/migrationBundle.js';
import {
  assertContentExpansionReviewable,
  buildContentExpansionPlan,
  runContentExpansionPipeline,
  verifyContentExpansionArtifact,
  verifyContentExpansionPlan
} from './contentExpansionPipeline.js';

function catalog(){
  return buildRobloxCapabilityCatalog([
    {
      sourceId:'licensed-brookhaven:district-kit',
      file:'authorized-district.rbxmx',
      dom:{
        referent:'root',
        name:'DataModel',
        class:'DataModel',
        properties:{},
        children:[
          {
            referent:'house',
            name:'Learning House',
            class:'Model',
            properties:{},
            children:[
              {
                referent:'part',
                name:'Study Room',
                class:'Part',
                properties:{},
                children:[]
              }
            ]
          },
          {
            referent:'unsafe',
            name:'Admin Loader',
            class:'Script',
            properties:{
              Source:{String:'return loadstring("return true")()'}
            },
            children:[]
          }
        ]
      }
    }
  ]);
}

function brief(){
  return {
    districtId:'fraction-falls',
    districtName:'Fraction Falls',
    subject:'Math',
    skills:['fractions'],
    targetCapabilities:['housing'],
    request:'Build an explorable Fraction Falls district with a learning house.',
    stageCount:2,
    optionalCount:1,
    questionsPerChunk:10,
    minQuestionScore:80,
    seed:77
  };
}

function chunks(){
  return [{
    id:'fractions-1',
    text:[
      'A fraction represents part of a whole.',
      'The numerator tells how many equal parts are selected.',
      'The denominator tells how many equal parts make the whole.',
      'Two fourths is equivalent to one half.',
      'Fractions with the same denominator can be compared by their numerators.'
    ].join(' '),
    header:'Fraction Foundations',
    source:'licensed-curriculum',
    subject:'Math',
    district:'Fraction Falls',
    skill:'fractions',
    conceptIds:['fractions']
  }];
}

function provider(){
  return {
    metadata:{provider:'fixture',model:'fixture-v1'},
    async generate(request){
      const evidence='The numerator tells how many equal parts are selected.';
      const prompts=[
        'What does the numerator tell you in a fraction?',
        'Which fraction number counts the equal parts that were selected?',
        'When reading a fraction, what information is carried by the top number?',
        'A learner shades some equal pieces. Which number records how many were shaded?',
        'What job does the numerator perform when describing part of a whole?',
        'Which value in fraction notation reports the selected equal pieces?',
        'How can you identify the number that counts chosen parts of a fraction?',
        'In a fraction model, which number tracks the equal sections being used?',
        'What does the upper number communicate about selected portions?',
        'Which statement best describes the numerator in fraction notation?'
      ];
      return {
        questions:Array.from({length:request.questionsPerChunk},(_,index)=>({
          prompt:prompts[index % prompts.length] + ' Example ' + (index + 1) + '.',
          choices:[
            'It tells how many equal parts are selected.',
            'It always tells the size of the whole.',
            'It is always larger than the denominator.'
          ],
          answer:'It tells how many equal parts are selected.',
          explanation:'The numerator counts the equal parts selected from the whole.',
          hint:'Think about the top number in a fraction.',
          subject:'Math',
          district:'Fraction Falls',
          skill:'fractions',
          role:index % 2 ? 'review' : 'practice',
          difficulty:2,
          reward:5,
          atomicFacts:['The numerator counts selected equal parts.'],
          evidence:[evidence]
        }))
      };
    }
  };
}

function reviewer(){
  return {
    async review({candidates}){
      return {
        results:candidates.map(candidate=>({
          candidateId:candidate.candidateId,
          decision:'keep',
          score:100,
          reasons:['fixture evidence verified']
        }))
      };
    }
  };
}

function migrationStage(){
  return {
    async stage({plan}){
      const artifacts=plan.units
        .filter(unit=>unit.selected)
        .map((unit,index)=>({
          unitId:unit.unitId,
          file:'staging/unit-' + index + '.rbxmx',
          sha256:String(index + 1).padStart(64,'a').slice(-64),
          bytes:1024 + index,
          disposition:unit.exportDisposition
        }));
      return buildMigrationBundleManifest(plan,artifacts);
    }
  };
}

function studio(){
  const instances=new Map();
  return {
    has(){ return true; },
    async call(tool,args={}){
      if(tool === 'search_tree') return {count:0,results:[]};
      if(tool === 'read_all_scripts') return {count:0,scripts:[]};
      if(tool === 'inspect_instance'){
        const row=instances.get(args.path);
        if(!row) throw new Error('instance not found');
        return {path:args.path,className:row.className,properties:{},children:[]};
      }
      if(tool === 'create_instance'){
        const path=(args.parent || 'Workspace') + '/' + (args.name || 'Generated');
        instances.set(path,{className:args.className});
        return {path,className:args.className};
      }
      if(tool === 'delete_instance'){
        instances.delete(args.path);
        return {deleted:args.path};
      }
      if(tool === 'run_tests'){
        return {passed:3,failed:0,total:3,results:[]};
      }
      if(tool === 'get_logs') return {count:0,logs:[]};
      throw new Error('unsupported fixture Studio tool: ' + tool);
    }
  };
}

function agents(){
  return {
    async plan(){
      return {
        summary:'Create the staged district shell and run Studio tests.',
        tests:{required:true,path:'ServerScriptService/Tests'},
        playtest:{required:false},
        visual:{required:false},
        acceptance:['Studio tests pass']
      };
    },
    async code(){
      return {
        summary:'Create district container',
        actions:[
          {
            tool:'create_instance',
            args:{
              parent:'Workspace',
              className:'Folder',
              name:'FractionFalls'
            }
          }
        ]
      };
    },
    async review({verification}){
      return verification.ok
        ? {verdict:'pass',findings:[],summary:'Expansion evidence passed.'}
        : {verdict:'fail',findings:verification.errors || []};
    }
  };
}

function bank(){
  return importLegacyQuestionBank(gameModel.buildQuestions(),{
    bankId:'expansion-test-bank',
    title:'Expansion Test Bank'
  });
}

describe('Step 10: deterministic content expansion planning', () => {
  it('selects requested licensed systems, quarantines risky systems, and certifies a solution-first level', () => {
    const first=buildContentExpansionPlan({
      brief:brief(),
      catalog:catalog(),
      chunks:chunks(),
      migrationRules:{minEngineeringLeverageScore:0}
    });
    const second=buildContentExpansionPlan({
      brief:brief(),
      catalog:catalog(),
      chunks:chunks(),
      migrationRules:{minEngineeringLeverageScore:0}
    });

    expect(second).toEqual(first);
    expect(verifyContentExpansionPlan(first)).toEqual({ok:true,errors:[]});
    expect(first.blueprint.level.certificateVerified).toBe(true);
    expect(first.blueprint.levelHash).toMatch(/^fnv1a32:/);
    expect(first.blueprint.selectedSystems.some(row=>row.systemName === 'Learning House')).toBe(true);
    expect(first.migrationPlan.units.find(row=>row.systemName === 'Admin Loader').selected).toBe(false);
    expect(first.migrationPlan.units.find(row=>row.systemName === 'Admin Loader').migrationStrategy).toBe('quarantine');
  });

  it('remains blocked in plan-only mode and can never claim live activation', async () => {
    const result=await runContentExpansionPipeline({
      brief:brief(),
      catalog:catalog(),
      bank:bank(),
      chunks:chunks(),
      migrationRules:{minEngineeringLeverageScore:0},
      config:{executeStudio:false}
    });

    expect(result.artifact.review.readyForHumanReview).toBe(false);
    expect(result.artifact.review.autoPublish).toBe(false);
    expect(result.artifact.review.liveActivationAllowed).toBe(false);
    expect(result.artifact.review.blockers.join(' ')).toMatch(/migration|question|Studio/i);
    expect(verifyContentExpansionArtifact(result.artifact)).toEqual({ok:true,errors:[]});
  });
});

describe('Step 10: complete automated expansion evidence loop', () => {
  it('runs migration staging, strict question QA, pending-only ingestion and verified Studio development', async () => {
    const originalBank=bank();
    const result=await runContentExpansionPipeline({
      brief:brief(),
      catalog:catalog(),
      bank:originalBank,
      chunks:chunks(),
      questionProvider:provider(),
      questionReviewer:reviewer(),
      migrationStage:migrationStage(),
      studio:studio(),
      agents:agents(),
      repositoryGate:{run:async () => ({ok:true,gates:{tests:true,balance:true,build:true}})},
      startedAt:'2026-09-24T18:15:00Z',
      migrationRules:{minEngineeringLeverageScore:0},
      config:{
        executeStudio:true,
        maxRepairCycles:1
      }
    });

    expect(result.artifact.migration.status).toBe('staged');
    expect(result.artifact.migration.liveActivationAllowed).toBe(false);
    expect(result.artifact.questions.status).toBe('validated');
    expect(result.artifact.questions.inserted.length).toBe(result.artifact.questions.required);
    expect(result.artifact.questions.inserted.every(item=>item.lifecycle === 'pending')).toBe(true);
    expect(result.nextBank.bankHash).not.toBe(originalBank.bankHash);
    for(const ref of result.artifact.questions.inserted){
      expect(result.nextBank.questions[ref.questionId].lifecycle).toBe('pending');
    }

    expect(result.artifact.development.status).toBe('verified');
    expect(result.artifact.review.blockers).toEqual([]);
    expect(result.artifact.review.readyForHumanReview).toBe(true);
    expect(result.artifact.review.autoPublish).toBe(false);
    expect(assertContentExpansionReviewable(result.artifact)).toBe(true);
    expect(verifyContentExpansionArtifact(result.artifact)).toEqual({ok:true,errors:[]});
  });

  it('blocks release review when strict question evidence is insufficient', async () => {
    const badProvider={
      metadata:{provider:'fixture',model:'bad'},
      async generate(){
        return {
          questions:[{
            prompt:'This question has no verifiable source evidence at all?',
            choices:['A','B','C'],
            answer:'A',
            explanation:'This explanation is long enough but unsupported.',
            hint:'Try again.',
            subject:'Math',
            district:'Fraction Falls',
            skill:'fractions',
            role:'practice',
            difficulty:2,
            reward:5,
            atomicFacts:['Unsupported candidate fact.'],
            evidence:['This quote does not occur in the source.']
          }]
        };
      }
    };

    const result=await runContentExpansionPipeline({
      brief:brief(),
      catalog:catalog(),
      bank:bank(),
      chunks:chunks(),
      questionProvider:badProvider,
      questionReviewer:reviewer(),
      migrationStage:migrationStage(),
      studio:studio(),
      agents:agents(),
      repositoryGate:{run:async () => ({ok:true})},
      startedAt:'2026-09-24T18:16:00Z',
      migrationRules:{minEngineeringLeverageScore:0},
      config:{executeStudio:true}
    });

    expect(result.artifact.review.readyForHumanReview).toBe(false);
    expect(result.artifact.review.blockers.join(' ')).toMatch(/question/);
    expect(result.artifact.questions.inserted).toEqual([]);
  });

  it('blocks review when Studio verification fails and does not auto-publish the failed changes', async () => {
    const failingStudio=studio();
    const originalCall=failingStudio.call.bind(failingStudio);
    failingStudio.call=async (tool,args={})=>{
      if(tool === 'run_tests'){
        return {passed:1,failed:1,total:2,results:[{name:'district',passed:false}]};
      }
      return originalCall(tool,args);
    };

    const result=await runContentExpansionPipeline({
      brief:brief(),
      catalog:catalog(),
      bank:bank(),
      chunks:chunks(),
      questionProvider:provider(),
      questionReviewer:reviewer(),
      migrationStage:migrationStage(),
      studio:failingStudio,
      agents:agents(),
      repositoryGate:{run:async () => ({ok:true})},
      startedAt:'2026-09-24T18:17:00Z',
      migrationRules:{minEngineeringLeverageScore:0},
      config:{executeStudio:true,maxRepairCycles:0}
    });

    expect(result.artifact.development.status).not.toBe('verified');
    expect(result.artifact.review.readyForHumanReview).toBe(false);
    expect(result.artifact.review.autoPublish).toBe(false);
    expect(result.artifact.review.blockers.join(' ')).toMatch(/Studio/);
  });

  it('detects review-artifact tampering and forbids publication flags', async () => {
    const result=await runContentExpansionPipeline({
      brief:brief(),
      catalog:catalog(),
      bank:bank(),
      chunks:chunks(),
      config:{executeStudio:false},
      migrationRules:{minEngineeringLeverageScore:0}
    });
    const tampered=JSON.parse(JSON.stringify(result.artifact));
    tampered.review.autoPublish=true;

    const validation=verifyContentExpansionArtifact(tampered);
    expect(validation.ok).toBe(false);
    expect(validation.errors.join(' ')).toMatch(/auto-publish|hash/);
  });
});
