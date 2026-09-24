import fs from 'node:fs';

const liveFiles = [
  'src/App.jsx',
  'src/main.jsx',
  'src/gameModel.js'
];

const forbidden = [
  'selectorV2Shadow',
  'pickQuestV2Shadow'
];

const findings = [];
for(const path of liveFiles){
  const content = fs.readFileSync(path,'utf8');
  for(const token of forbidden){
    if(content.includes(token)){
      findings.push({path,token});
    }
  }
}

const result = {
  schemaVersion:'starblox-live-selector-boundary-v1',
  liveSelectorV2Allowed:false,
  checkedFiles:liveFiles,
  forbiddenTokens:forbidden,
  findings
};

process.stdout.write(JSON.stringify(result,null,2) + '\n');
if(findings.length){
  process.exitCode = 1;
}
