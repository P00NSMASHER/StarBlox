import fs from 'node:fs';

const targets=[
  'src/App.jsx',
  'src/main.jsx',
  'src/gameModel.js'
];

const forbidden=[
  'edGameClawShadowAdapter',
  'adaptEdGameClawCourseStructure',
  'sourceEvidenceRuntime',
  'bindInteractionCandidateEvidence',
  'generatedQuestionCompiler',
  'compileEvidenceBoundInteractionQuestion'
];

const violations=[];
for(const path of targets){
  const text=fs.readFileSync(path,'utf8');
  const lines=text.split('\n');
  for(const token of forbidden){
    lines.forEach((line,index)=>{
      if(line.includes(token)){
        violations.push({
          path,
          line:index+1,
          token,
          text:line.trim()
        });
      }
    });
  }
}

const receipt={
  schemaVersion:'starblox-generated-content-live-boundary-v1',
  liveGeneratedContentAllowed:false,
  checkedFiles:targets,
  forbiddenResearchContentTokens:forbidden,
  violationCount:violations.length,
  violations
};

process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
if(violations.length)process.exitCode=1;
