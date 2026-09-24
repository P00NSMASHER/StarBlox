
import { readFile,writeFile } from 'node:fs/promises';
import { resolve,isAbsolute } from 'node:path';
import { gameModel } from '../src/gameModel.js';
import { importLegacyQuestionBank } from '../src/questionBank/questionBankV2.js';
import {
  buildTelemetryRecalibrationProposal,
  verifyRecalibrationProposal
} from '../src/recalibration/telemetryRecalibration.js';

function arg(name,required=false){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (() => {
    const index=process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function fromRoot(value){
  return isAbsolute(value) ? value : resolve(process.cwd(),value);
}

const telemetryPath=fromRoot(arg('--telemetry',true));
const outputPath=fromRoot(arg('--out') || 'recalibration-proposal.json');
const config=JSON.parse(await readFile(telemetryPath,'utf8'));

const bank=importLegacyQuestionBank(gameModel.buildQuestions(),{
  bankId:'starblox-core',
  title:'StarBlox Core Question Bank'
});

const proposal=buildTelemetryRecalibrationProposal({
  bank,
  events:Array.isArray(config.events) ? config.events : [],
  itemCalibrations:config.itemCalibrations || {},
  policyWeights:config.policyWeights,
  currentBalance:config.currentBalance,
  balanceTargets:config.balanceTargets || null,
  createdAt:config.createdAt ?? null,
  options:config.options || {}
});

const validation=verifyRecalibrationProposal(proposal);
if(!validation.ok){
  throw new Error('generated invalid recalibration proposal: ' + validation.errors.join('; '));
}

await writeFile(outputPath,JSON.stringify(proposal,null,2) + '\n');

console.log('StarBlox telemetry recalibration');
console.log('proposal: ' + proposal.proposalId);
console.log('trusted events: ' + proposal.telemetryCounts.accepted + '/' + proposal.telemetryCounts.total);
console.log('item changes: ' + proposal.itemCalibrations.length);
console.log('policy: ' + proposal.policy.status);
console.log('balance: ' + proposal.balance.status);
console.log('ready for human review: ' + proposal.review.readyForHumanReview);
if(proposal.review.blockers.length){
  for(const blocker of proposal.review.blockers){
    console.log('BLOCKER ' + blocker);
  }
}
console.log('wrote ' + outputPath);
