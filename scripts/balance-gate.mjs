import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gateBalanceCandidate } from '../src/balance/balanceGate.js';

function argValue(name){
  const inline=process.argv.find(arg => arg.startsWith(name + '='));
  if(inline) return inline.slice(name.length + 1);
  const index=process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

const configPath=resolve(process.cwd(),argValue('--config') || 'config/balance.candidate.json');
let config;
try{
  config=JSON.parse(await readFile(configPath,'utf8'));
}catch(error){
  console.error('Balance gate could not read ' + configPath + ': ' + error.message);
  process.exit(1);
}

const result=gateBalanceCandidate(config,{sessionSeeds:64,levelSeeds:64});

console.log('StarBlox balance gate');
console.log('candidate: ' + result.current.configVersion);
console.log('certified levels: ' + result.current.levels.passed + '/' + result.current.levels.attempted);

for(const row of result.current.profiles){
  console.log(
    row.profile.padEnd(10) +
    ' firstTry=' + Math.round(row.firstTryRate * 100) + '%' +
    ' actions=' + row.avgActions +
    ' coins=' + row.avgCoins +
    ' xp=' + row.avgXp
  );
}

for(const warning of result.warnings){
  console.warn('WARN ' + warning.type + ' ' + warning.metric);
}
for(const failure of result.failures){
  console.error('FAIL ' + failure.type + ' ' + failure.metric);
}

if(!result.ok){
  console.error('Balance gate failed.');
  process.exit(1);
}
console.log('Balance gate passed.');
