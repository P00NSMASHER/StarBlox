import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {calibratePilotItems,pilotCalibrationMarkdown} from '../src/robloxRuntime/pilotItemCalibration.js';

const args=process.argv.slice(2);
const baselinePath=args[0], livePath=args[1], bankPath=args[2];
if(!baselinePath||!livePath||!bankPath) throw new Error('Usage: node scripts/calibrate-pilot-items.mjs <baseline.json> <live.json> <bank.json> --json out.json --markdown out.md');
const report=calibratePilotItems({
  baseline:JSON.parse(readFileSync(baselinePath,'utf8')),
  liveMetrics:JSON.parse(readFileSync(livePath,'utf8')),
  bankSource:JSON.parse(readFileSync(bankPath,'utf8'))
});
const ji=args.indexOf('--json'), mi=args.indexOf('--markdown');
if(ji>=0&&args[ji+1]){mkdirSync(dirname(args[ji+1]),{recursive:true});writeFileSync(args[ji+1],JSON.stringify(report,null,2)+'\n');}
if(mi>=0&&args[mi+1]){mkdirSync(dirname(args[mi+1]),{recursive:true});writeFileSync(args[mi+1],pilotCalibrationMarkdown(report));}
process.stdout.write(JSON.stringify({status:report.status,firstAttempts:report.readiness.globalFirstAttempts,completedSessions:report.readiness.completedSessions,actions:report.actions,evidenceHash:report.evidenceHash})+'\n');
