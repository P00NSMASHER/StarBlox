import fs from 'node:fs';
import {
  adaptEdGameClawCourseStructure,
  validateInteractionCandidate
} from '../src/edGameClawShadowAdapter.js';

function arg(name,defaultValue=''){
  const prefix='--' + name + '=';
  const found=process.argv.find(value => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultValue;
}

const input=arg('input');
const output=arg('out');
const contentVersion=arg('content-version','shadow-generated-v1');
const sourceIds=arg('source-ids','')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);

if(!input) throw new Error('--input is required');

const payload=JSON.parse(fs.readFileSync(input,'utf8'));
const candidates=adaptEdGameClawCourseStructure(payload,{contentVersion,sourceIds});
const issues=candidates.flatMap(candidate =>
  validateInteractionCandidate(candidate).map(type => ({id:candidate.id,type}))
);

const result={
  schemaVersion:'starblox-edgameclaw-adaptation-v1',
  candidateCount:candidates.length,
  issueCount:issues.length,
  issues,
  candidates
};

const text=JSON.stringify(result,null,2) + '\n';
if(output) fs.writeFileSync(output,text,'utf8');
process.stdout.write(text);
if(issues.length) process.exitCode=1;
