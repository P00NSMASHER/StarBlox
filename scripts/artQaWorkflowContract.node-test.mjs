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


test('regular generation preflights exact SDXL prompt before diffusion',()=>{
  const guard=regular.indexOf('Preflight exact SDXL prompt tokens and constraints');
  const generate=regular.indexOf('python scripts/artFactoryDiffusers.py generate');
  assert(guard>=0);
  assert(generate>=0);
  assert(guard<generate);
  assert.match(regular,/artPromptTokenPreflight\.py/);
  assert.match(regular,/"transformers==5\.17\.0"/);
  assert.match(regular,/"huggingface_hub==1\.33\.0"/);
});

test('sequential generation preflights every selected item before diffusion',()=>{
  const guard=sequential.indexOf('python scripts/artPromptTokenPreflight.py');
  const generate=sequential.indexOf('python scripts/artFactoryDiffusers.py generate');
  assert(guard>=0);
  assert(generate>=0);
  assert(guard<generate);
  assert.match(sequential,/PROMPT_PREFLIGHT_FAILED=\$ITEM/);
  assert.match(sequential,/"transformers==5\.17\.0"/);
  assert.match(sequential,/"huggingface_hub==1\.33\.0"/);
});
