import {readFileSync} from 'node:fs';
import {summarizeAlignment} from '../src/robloxRuntime/questionAlignmentValidator.js';

const path=process.argv[2]||'docs/phase6/ABVM_GRADE2_ROTATING_QUESTION_SOURCE.json';
const source=JSON.parse(readFileSync(path,'utf8'));
const report=summarizeAlignment(source);
process.stdout.write(JSON.stringify(report,null,2)+'\n');
if(report.status!=='pass') process.exit(1);
