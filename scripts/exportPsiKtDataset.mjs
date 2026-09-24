import fs from 'node:fs';
import {
  buildPsiKtInteractionTable,
  psiKtInteractionTableToTsv
} from '../src/psiKtShadowAdapter.js';

function arg(name,defaultValue=''){
  const prefix='--' + name + '=';
  const found=process.argv.find(value => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultValue;
}

const input=arg('input');
const output=arg('out');
const includeNonMastery=process.argv.includes('--include-non-mastery');
if(!input) throw new Error('--input is required');
if(!output) throw new Error('--out is required');

const ledger=JSON.parse(fs.readFileSync(input,'utf8'));
const events=Array.isArray(ledger) ? ledger : ledger.events || [];
const table=buildPsiKtInteractionTable(events,{includeNonMastery});
fs.writeFileSync(output,psiKtInteractionTableToTsv(table),'utf8');

process.stdout.write(JSON.stringify({
  schemaVersion:'starblox-psikt-export-receipt-v1',
  rowCount:table.rows.length,
  userCount:Object.keys(table.user_id_map).length,
  skillCount:Object.keys(table.skill_id_map).length,
  problemCount:Object.keys(table.problem_id_map).length,
  output
},null,2) + '\n');
