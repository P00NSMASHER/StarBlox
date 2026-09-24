import fs from 'node:fs';
import { buildRiffReviewCommands } from '../src/riffShadowAdapter.js';

function arg(name,defaultValue=''){
  const prefix='--' + name + '=';
  const found=process.argv.find(value => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultValue;
}

const input=arg('input');
const output=arg('out');
if(!input) throw new Error('--input is required');

const ledger=JSON.parse(fs.readFileSync(input,'utf8'));
const events=Array.isArray(ledger) ? ledger : ledger.events || [];
const commands=buildRiffReviewCommands(events);
const result={
  schemaVersion:'starblox-riff-review-export-v1',
  commandCount:commands.length,
  commands
};

const text=JSON.stringify(result,null,2) + '\n';
if(output) fs.writeFileSync(output,text,'utf8');
process.stdout.write(text);
