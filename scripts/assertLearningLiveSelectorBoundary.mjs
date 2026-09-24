import fs from 'node:fs';

const targets=[
  'src/App.jsx',
  'src/main.jsx',
  'src/gameModel.js'
];

const forbidden=[
  'selectorV2Shadow',
  'pickQuestV2Shadow',
  'selectorBktFsrsRiskShadow',
  'pickQuestBktFsrsRiskShadow',
  'selectorBktFsrsNearTieShadow',
  'pickQuestBktFsrsNearTieShadow',
  'selectorHeuristicAnchoredShadow',
  'pickQuestHeuristicAnchoredShadow',
  'selectorHeuristicBktFsrsAnchorShadow',
  'pickQuestHeuristicBktFsrsAnchorShadow'
];

const violations=[];
for(const path of targets){
  const text=fs.readFileSync(path,'utf8');
  const lines=text.split('\n');
  for(const token of forbidden){
    lines.forEach((line,index)=>{
      if(line.includes(token)){
        violations.push({path,line:index+1,token,text:line.trim()});
      }
    });
  }
}

const result={
  schemaVersion:'starblox-learning-live-selector-boundary-v1',
  liveSelector:'gameModel.pickQuest',
  checkedFiles:targets,
  forbiddenResearchSelectors:forbidden,
  violationCount:violations.length,
  violations
};

process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(violations.length)process.exitCode=1;
