import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const WORKFLOW_DIR='.github/workflows';
const CANONICAL_MARKERS=['catalog-art-manifest.json','src/catalogArtRuntime.js'];
const PUSH='git push origin HEAD:refs/heads/screenshot-match-preproduction';
const AUDIT='artWorkflowAudit.mjs';
const LOOP='for attempt in 1 2 3; do';
const CANDIDATE='CANDIDATE_SHA="$(git rev-parse HEAD)"';
const REBASE='git rebase origin/screenshot-match-preproduction';
const WRITER_GROUP='starblox-workstream08-canonical-writer';

function allIndexes(text,needle){
  const out=[];
  let at=0;
  while(true){
    const i=text.indexOf(needle,at);
    if(i<0) return out;
    out.push(i);
    at=i+needle.length;
  }
}

function workflowFiles(){
  return fs.readdirSync(WORKFLOW_DIR)
    .filter(name=>/\.ya?ml$/i.test(name))
    .sort()
    .map(name=>path.join(WORKFLOW_DIR,name));
}

function canonicalPublishers(){
  return workflowFiles().map(file=>({file,text:fs.readFileSync(file,'utf8')}))
    .filter(({text})=>CANONICAL_MARKERS.some(marker=>text.includes(marker)) && text.includes(PUSH));
}

test('canonical publisher inventory is explicit and non-empty',()=>{
  const publishers=canonicalPublishers();
  assert(publishers.length>=2,'expected Workstream 08 canonical publishers');
  const names=publishers.map(x=>x.file);
  assert(names.includes('.github/workflows/workstream08-catalog-integrate.yml'));
  assert(names.includes('.github/workflows/workstream08-integrate-current-accepts.yml'));
});

test('every canonical push is audited on the exact candidate tree inside its retry loop',()=>{
  for(const {file,text} of canonicalPublishers()){
    assert(text.includes(WRITER_GROUP),file+' must use the single canonical-writer concurrency group');
    const pushes=allIndexes(text,PUSH);
    assert(pushes.length>0,file+' must contain at least one canonical push');
    for(const push of pushes){
      const loop=text.lastIndexOf(LOOP,push);
      const audit=text.lastIndexOf(AUDIT,push);
      const candidate=text.lastIndexOf(CANDIDATE,push);
      assert(loop>=0,file+' push must be inside retry loop');
      assert(candidate>loop && candidate<push,file+' must bind exact candidate SHA before push');
      assert(audit>candidate && audit<push,file+' must audit exact candidate tree before push');

      const done=text.indexOf('\n          done',push);
      assert(done>push,file+' retry loop must close after push');
      const rebase=text.indexOf(REBASE,push);
      assert(rebase>push && rebase<done,file+' failed push must rebase before retry');

      const nextAudit=text.indexOf(AUDIT,push+PUSH.length);
      const nextPush=text.indexOf(PUSH,push+PUSH.length);
      if(nextPush>=0 && nextPush<done){
        assert(nextAudit>=0 && nextAudit<nextPush,file+' rebase retry must re-audit before another push');
      }
    }
  }
});

test('canonical commit is local before audited publication',()=>{
  for(const {file,text} of canonicalPublishers()){
    const commit=text.indexOf('git commit -m');
    const audit=text.indexOf(AUDIT);
    const push=text.indexOf(PUSH);
    assert(commit>=0,file+' must create local canonical commit');
    assert(audit>commit,file+' audit must inspect committed candidate tree');
    assert(push>audit,file+' publication must occur only after audit');
  }
});

test('no canonical publisher uses force push',()=>{
  for(const {file,text} of canonicalPublishers()){
    assert.doesNotMatch(text,/git\s+push[^\n]*(?:--force|-f\b)/,file+' must never force-push canonical state');
  }
});
