
import { readFile,writeFile } from 'node:fs/promises';
import { isAbsolute,resolve } from 'node:path';

import {
  buildContentExpansionPlan,
  verifyContentExpansionPlan
} from '../src/contentExpansion/contentExpansionPipeline.js';

function arg(name,required=false){
  const inline=process.argv.find(value=>value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (()=>{
    const index=process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function absolute(value){
  return isAbsolute(value) ? value : resolve(process.cwd(),value);
}

async function json(path){
  return JSON.parse(await readFile(absolute(path),'utf8'));
}

const brief=await json(arg('--brief',true));
const catalog=await json(arg('--catalog',true));
const chunksPath=arg('--chunks');
const chunks=chunksPath ? await json(chunksPath) : [];
const rulesPath=arg('--migration-rules');
const migrationRules=rulesPath ? await json(rulesPath) : {};
const out=absolute(arg('--out') || 'content-expansion-plan.json');

const plan=buildContentExpansionPlan({
  brief,
  catalog,
  chunks:Array.isArray(chunks) ? chunks : chunks.chunks || [],
  migrationRules
});

const validation=verifyContentExpansionPlan(plan);
if(!validation.ok){
  throw new Error('invalid expansion plan: ' + validation.errors.join('; '));
}

await writeFile(out,JSON.stringify(plan,null,2) + '\n');

console.log('StarBlox automated content expansion plan');
console.log('expansion: ' + plan.expansionId);
console.log('district: ' + plan.brief.districtName);
console.log('selected systems: ' + plan.migration.selectedCount);
console.log('level: ' + plan.blueprint.levelHash);
console.log('question slots: ' + plan.blueprint.questionSlots.length);
console.log('planning gates: ' + plan.gates.length);
for(const gate of plan.gates){
  console.log('GATE ' + gate);
}
console.log('auto publish: false');
console.log('output: ' + out);
