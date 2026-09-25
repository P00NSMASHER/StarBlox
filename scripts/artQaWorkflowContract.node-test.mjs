import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const qa=fs.readFileSync('.github/workflows/catalog-staged-art-qa.yml','utf8');
const regular=fs.readFileSync('.github/workflows/art-factory-cpu-generation.yml','utf8');
const sequential=fs.readFileSync('.github/workflows/art-factory-cpu-sequential-generation.yml','utf8');

test('QA exposes reusable immutable-handoff contract',()=>{
  assert.match(qa,/workflow_call:/);
  assert.match(qa,/staged_commit_sha:/);
  assert.match(qa,/handoff_artifact_name:/);
  assert.doesNotMatch(qa,/workflow_run:/);
});

test('QA checks out immutable staged SHA and verifies handoff before rendering',()=>{
  assert.match(qa,/ref:\s*\$\{\{ inputs\.staged_commit_sha \|\| github\.sha \}\}/);
  assert.match(qa,/artFactoryStagedHandoff\.mjs verify/);
  assert.match(qa,/STARBLOX_QA_HANDOFF:/);
  assert.match(qa,/STARBLOX_QA_FACTORY_ONLY:/);
});

for(const [name,text,artifact] of [
  ['regular',regular,'cpu-staged-handoff-'],
  ['sequential',sequential,'cpu-sequential-staged-handoff-']
]){
  test(name+' generation calls exact staged QA directly',()=>{
    assert.match(text,/qa-exact-staged:/);
    assert.match(text,/uses: \.\/\.github\/workflows\/catalog-staged-art-qa\.yml/);
    assert.match(text,/staged_commit_sha:\s*\$\{\{ needs\.[^}]+\.outputs\.staged_commit_sha \}\}/);
    assert(text.includes(artifact));
  });
}
