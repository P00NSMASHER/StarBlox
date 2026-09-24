import fs from 'node:fs';

const liveFiles = [
  'src/App.jsx',
  'src/main.jsx',
  'src/gameModel.js'
];

const forbidden = [
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

const findings = [];
for(const path of liveFiles){
  const content = fs.readFileSync(path,'utf8');
  const lines = content.split('\n');
  for(const token of forbidden){
    lines.forEach((line,index) => {
      if(line.includes(token)){
        findings.push({
          path,
          line:index + 1,
          token,
          text:line.trim()
        });
      }
    });
  }
}

const result = {
  schemaVersion:'starblox-live-selector-boundary-v2',
  liveSelector:'gameModel.pickQuest',
  liveSelectorV2Allowed:false,
  checkedFiles:liveFiles,
  forbiddenResearchSelectors:forbidden,
  violationCount:findings.length,
  findings
};

process.stdout.write(JSON.stringify(result,null,2) + '\n');
if(findings.length){
  process.exitCode = 1;
}
