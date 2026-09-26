import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {buildPilotBaseline,pilotBaselineMarkdown} from '../src/robloxRuntime/pilotLearningBaseline.js';

const args=process.argv.slice(2);
const live=args[0], bank=args[1];
if(!live||!bank) throw new Error('Usage: node scripts/build-pilot-baseline.mjs <live.json> <bank.json> --json out.json --markdown out.md');
const report=buildPilotBaseline({
  liveMetrics:JSON.parse(readFileSync(live,'utf8')),
  bankSource:JSON.parse(readFileSync(bank,'utf8'))
});
const ji=args.indexOf('--json'), mi=args.indexOf('--markdown');
if(ji>=0&&args[ji+1]){mkdirSync(dirname(args[ji+1]),{recursive:true});writeFileSync(args[ji+1],JSON.stringify(report,null,2)+'\n');}
if(mi>=0&&args[mi+1]){mkdirSync(dirname(args[mi+1]),{recursive:true});writeFileSync(args[mi+1],pilotBaselineMarkdown(report));}
process.stdout.write(JSON.stringify({status:report.status,firstAttempts:report.readiness.firstAttempts,completedSessions:report.readiness.completedSessions,calibrationReady:report.readiness.calibrationReady})+'\n');
