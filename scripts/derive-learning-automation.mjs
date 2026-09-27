import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {automationSummary,deriveLearningAutomationState} from '../src/robloxRuntime/learningAutomationController.js';

const args=process.argv.slice(2);
const baselinePath=args[0], calibrationPath=args[1], checkpointPath=args[2];
if(!baselinePath||!calibrationPath||!checkpointPath){
  throw new Error('Usage: node scripts/derive-learning-automation.mjs <baseline.json> <calibration.json> <checkpoint.json> --json out.json');
}
const state=deriveLearningAutomationState({
  baseline:JSON.parse(readFileSync(baselinePath,'utf8')),
  calibration:JSON.parse(readFileSync(calibrationPath,'utf8')),
  starCheckpoint:JSON.parse(readFileSync(checkpointPath,'utf8'))
});
const outIndex=args.indexOf('--json');
if(outIndex>=0&&args[outIndex+1]){
  mkdirSync(dirname(args[outIndex+1]),{recursive:true});
  writeFileSync(args[outIndex+1],JSON.stringify(automationSummary(state),null,2)+'\n');
}
process.stdout.write('STARBLOX_LEARNING_AUTOMATION '+JSON.stringify(automationSummary(state))+'\n');
