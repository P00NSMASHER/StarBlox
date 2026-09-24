import fs from 'node:fs';
import path from 'node:path';

const boundaryPath='docs/preproduction/brookhaven-research/reuse-boundary-v1.json';
const boundary=JSON.parse(fs.readFileSync(boundaryPath,'utf8'));
const tokens=boundary.staticForbiddenTokensInLiveSrc||[];

function walk(dir){
  if(!fs.existsSync(dir)) return [];
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...walk(full));
    else if(/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const findings=[];
for(const file of walk('src')){
  const content=fs.readFileSync(file,'utf8');
  const lines=content.split('\n');
  for(const token of tokens){
    lines.forEach((line,index)=>{
      if(line.includes(token)){
        findings.push({file,line:index+1,token,text:line.trim()});
      }
    });
  }
}

const result={
  schemaVersion:'starblox-brookhaven-reuse-boundary-check-v1',
  checkedRoot:'src',
  forbiddenTokenCount:tokens.length,
  violationCount:findings.length,
  findings,
  decision:boundary.boundaryDecision
};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(findings.length) process.exitCode=1;
