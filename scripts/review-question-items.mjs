import {readFileSync,writeFileSync} from 'node:fs';
import {itemReviewMarkdown,reviewQuestionAggregate} from '../src/robloxRuntime/questionItemReview.js';

const args=process.argv.slice(2);
const input=args[0];
if(!input) throw new Error('Usage: node scripts/review-question-items.mjs <aggregate.json> [--markdown out.md] [--json out.json]');
const aggregate=JSON.parse(readFileSync(input,'utf8'));
const report=reviewQuestionAggregate(aggregate);
const markdownIndex=args.indexOf('--markdown');
const jsonIndex=args.indexOf('--json');
if(markdownIndex>=0&&args[markdownIndex+1]) writeFileSync(args[markdownIndex+1],itemReviewMarkdown(report));
if(jsonIndex>=0&&args[jsonIndex+1]) writeFileSync(args[jsonIndex+1],JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify(report,null,2)+'\n');
