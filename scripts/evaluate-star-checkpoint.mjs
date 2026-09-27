import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {evaluateStarCheckpoint} from '../src/robloxRuntime/starCheckpoint.js';

const args=process.argv.slice(2);
const baselinePath=args[0];
if(!baselinePath) throw new Error('Usage: node scripts/evaluate-star-checkpoint.mjs <baseline.json> --json out.json');
const raw=String(process.env.STARBLOX_STAR_CHECKPOINT_JSON||'').trim();
const externalResult=raw?JSON.parse(raw):null;
const report=evaluateStarCheckpoint({
  baseline:JSON.parse(readFileSync(baselinePath,'utf8')),
  externalResult
});
const outIndex=args.indexOf('--json');
if(outIndex>=0&&args[outIndex+1]){
  mkdirSync(dirname(args[outIndex+1]),{recursive:true});
  writeFileSync(args[outIndex+1],JSON.stringify(report,null,2)+'\n');
}
process.stdout.write(JSON.stringify({
  status:report.status,
  externalResultPresent:report.externalResultPresent,
  matchedDimensions:report.matchedDimensions||[],
  rankAgreement:report.rankAgreement??null,
  evidenceHash:report.evidenceHash
})+'\n');
