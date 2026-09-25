import fs from 'node:fs';

const liveFiles=[
  'src/App.jsx',
  'src/main.jsx',
  'src/gameModel.js',
  'src/storage.js'
];

const brookhavenResearchModules=[
  'residentialFeatureRuntime',
  'vehicleSystemRuntime',
  'neutralVehicleDefinitionCatalog',
  'neutralVehicleRuntimePreview',
  'townSystemRuntime',
  'neutralTownLocationCatalog',
  'starBloxProxyTownTopology',
  'neutralTownRuntimePreview',
  'lifeSimProgressionShadowRuntime',
  'neutralProgressionRuleCatalog',
  'neutralProgressionRuntimePreview'
];

const brookhavenRuntimeFiles=[
  'src/residentialFeatureRuntime.js',
  'src/vehicleSystemRuntime.js',
  'src/neutralVehicleDefinitionCatalog.js',
  'src/neutralVehicleRuntimePreview.js',
  'src/townSystemRuntime.js',
  'src/neutralTownLocationCatalog.js',
  'src/starBloxProxyTownTopology.js',
  'src/neutralTownRuntimePreview.js',
  'src/lifeSimProgressionShadowRuntime.js',
  'src/neutralProgressionRuleCatalog.js',
  'src/neutralProgressionRuntimePreview.js'
];

const learningFactoryTokens=[
  'learningContracts',
  'learningEventLedger',
  'learningEventBridge',
  'learningSourceRegistry',
  'contentProvenanceRuntime',
  'sourceEvidenceRuntime',
  'edGameClawShadowAdapter',
  'generatedQuestionCompiler',
  'adversarialQuestionQa',
  'psiKtShadowAdapter',
  'riffShadowAdapter',
  'selectorV2Shadow',
  'selectorBktFsrsRiskShadow',
  'selectorBktFsrsNearTieShadow',
  'selectorHeuristicAnchoredShadow',
  'selectorHeuristicBktFsrsAnchorShadow'
];

const findings=[];

for(const path of liveFiles){
  const content=fs.readFileSync(path,'utf8');
  for(const token of brookhavenResearchModules){
    if(content.includes(token)){
      findings.push({kind:'brookhaven-wired-live',path,token});
    }
  }
}

for(const path of brookhavenRuntimeFiles){
  const content=fs.readFileSync(path,'utf8');
  for(const token of learningFactoryTokens){
    if(content.includes(token)){
      findings.push({kind:'learning-stack-imported-into-brookhaven-runtime',path,token});
    }
  }
}

const result={
  schemaVersion:'starblox-brookhaven-learning-separation-check-v1',
  liveFiles,
  brookhavenRuntimeFiles,
  learningFactoryTokenCount:learningFactoryTokens.length,
  violationCount:findings.length,
  findings,
  decision:{
    brookhavenLiveWiringAllowed:false,
    learningFactoryDependencyAllowedInsideBrookhavenRuntimes:false,
    controlledReplayRequired:true
  }
};

process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(findings.length) process.exitCode=1;
