// StarBlox is retired. Guard against any accidental revival of Roblox publishers.
// Historical publisher workflows remain available in Git at 74224d497b50be60c0530035b83ab7bd42b3d92d.
import {strict as assert} from 'node:assert';
import {readdirSync,readFileSync,existsSync,lstatSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const workflowDir=join(root,'.github','workflows');
const allowed=new Set(['retired-roblox-quarantine.yml','school-day-foundation-ci.yml']);
const oldPublishers=new Set([
  'build-brookhaven-compat.yml',
  'build-publish-full-maze-world.yml',
  'inspect-maze-world-live.yml',
  'publish-clean-brookhaven.yml',
  'publish-pip-high.yml',
  'publish-pips-quest.yml',
  'publish-pristine-maze-world.yml',
  'publish-rhs-exact.yml',
  'restart-pips-quest.yml',
  'verify-clean-brookhaven.yml',
  'verify-maze-v133.yml',
  'verify-pips-quest.yml',
  'verify-restart-pips-quest.yml',
  'verify-rhs-exact-live-v5.yml'
]);

function verify(files) {
  assert.deepEqual([...Object.keys(files)].sort(),[...allowed].sort(),
    'Retired StarBlox may retain only its retirement quarantine and read-only source CI.');
  for(const [filename,actual] of Object.entries(files)){
    assert.match(actual,/^permissions:\s*\n\s{2}contents:\s*read\s*$/m,filename+': require read-only GitHub token');
    assert.doesNotMatch(actual,/\b(contents|actions|deployments|packages|id-token|pull-requests):\s*write\b/i,
      filename+': write capability prohibited');
    assert.doesNotMatch(actual,/^\s{2}schedule\s*:/m,filename+': schedule prohibited');
    assert.doesNotMatch(actual,/\bsecrets\s*\.\s*[A-Za-z_]|ROBLOX_OPEN_CLOUD_API_KEY|apis\.roblox\.com|restartServers|uploadPlace|publishPlace/i,
      filename+': Roblox publisher/credential path prohibited');
    assert.doesNotMatch(actual,/(?:curl|wget)\s+.{0,100}(?:POST|PUT|PATCH|DELETE)\b/i,
      filename+': external mutation prohibited');
  }
  assert.match(files['retired-roblox-quarantine.yml'],/node scripts\/assert-retired-roblox-workflows\.mjs/,
    'retirement guard must execute this checker');
  assert.match(files['retired-roblox-quarantine.yml'],/github\.event\.pull_request\.head\.sha/,
    'retirement guard must inspect exact PR-head source');
  assert.match(files['school-day-foundation-ci.yml'],/persist-credentials:\s*false/,
    'historical read-only School Day CI cannot persist credentials');
}

const sourceFiles={};
for(const filename of readdirSync(workflowDir)){
  const file=join(workflowDir,filename);
  assert(lstatSync(file).isFile()&&!lstatSync(file).isSymbolicLink(),
    'Workflow symlink or non-file is forbidden');
  sourceFiles[filename]=readFileSync(file,'utf8');
}
for(const old of oldPublishers)assert(!existsSync(join(workflowDir,old)),
  'Retired publisher file reappeared: '+old);
verify(sourceFiles);
let negative=0;
const reject=(modified)=>{
  assert.throws(()=>verify(modified));
  negative++;
};
for(const old of oldPublishers){
  reject({...sourceFiles,[old]:'name: reactivated\non:\n  workflow_dispatch:\n'});
}
for(const name of allowed){
  reject({...sourceFiles,[name]:sourceFiles[name].replace('contents: read','contents: write')});
  reject({...sourceFiles,[name]:sourceFiles[name]+'\non:\n  schedule:\n    - cron: "* * * * *"\n'});
  reject({...sourceFiles,[name]:sourceFiles[name]+'\nrun: curl -X POST https://apis.roblox.com\n'});
}
assert.equal(negative,20);
console.log('PASS: 14 retired workflow definitions absent; 2 read-only guards retained; 20 adversarial reactivation attempts rejected.');
