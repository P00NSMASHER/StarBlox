
import { createHash } from 'node:crypto';
import { readFile,writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { basename,dirname,isAbsolute,resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  runDevelopmentFactory,
  verifyDevelopmentRun
} from '../src/devFactory/developmentFactory.js';
import { loadFactoryMigrationEvidence } from '../src/devFactory/migrationInput.js';
import {
  buildMigrationAdaptationReceipt,
  verifyMigrationAdaptationReceipt
} from '../src/devFactory/adaptationReceipt.js';

function arg(name,required=false){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (() => {
    const index=process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function hasFlag(name){
  return process.argv.includes(name);
}

function fromRoot(value){
  return isAbsolute(value) ? value : resolve(process.cwd(),value);
}

function runCommand(command,args){
  const result=spawnSync(command,args,{
    cwd:process.cwd(),
    encoding:'utf8',
    maxBuffer:16 * 1024 * 1024
  });

  return {
    ok:result.status === 0,
    command:[command,...args].join(' '),
    status:result.status,
    stdout:(result.stdout || '').slice(-20_000),
    stderr:(result.stderr || '').slice(-20_000)
  };
}

function repositoryGate(){
  return {
    async run(){
      const tests=runCommand('npm',['test']);
      if(!tests.ok) return {ok:false,gates:{tests,balance:null,build:null}};

      const certification=runCommand('npm',['run','certification:gate']);
      if(!certification.ok){
        return {ok:false,gates:{tests,certification,balance:null,build:null}};
      }

      const balance=runCommand('npm',['run','balance:gate']);
      if(!balance.ok){
        return {ok:false,gates:{tests,certification,balance,build:null}};
      }

      const build=runCommand('npm',['run','build']);
      return {
        ok:build.ok,
        gates:{tests,certification,balance,build}
      };
    }
  };
}

const taskPath=fromRoot(arg('--task',true));
const verifyMigrationOnly=hasFlag('--verify-migration-only');
const adapterRaw=arg('--adapter',!verifyMigrationOnly);
const adapterPath=adapterRaw ? fromRoot(adapterRaw) : null;
const outPath=fromRoot(
  arg('--out') ||
  (verifyMigrationOnly ? 'factory-migration-evidence.json' : 'ai-development-run.json')
);

const task=JSON.parse(await readFile(taskPath,'utf8'));
if(task.migrationEvidence != null){
  throw new Error(
    'task JSON may not supply migrationEvidence directly; provide task.migration export receipt inputs'
  );
}

if(task.migration != null){
  if(!task.migration || typeof task.migration !== 'object' || Array.isArray(task.migration)){
    throw new Error('task.migration must be an object');
  }
  const receiptValue=String(task.migration.exportReceipt || '').trim();
  if(!receiptValue){
    throw new Error('task.migration.exportReceipt is required');
  }
  const exportReceiptPath=isAbsolute(receiptValue)
    ? receiptValue
    : resolve(dirname(taskPath),receiptValue);

  task.migrationEvidence=await loadFactoryMigrationEvidence({
    exportReceiptPath,
    unitIds:task.migration.unitIds
  });
  delete task.migration;
}

if(verifyMigrationOnly){
  if(!task.migrationEvidence){
    throw new Error('--verify-migration-only requires task.migration inputs');
  }
  await writeFile(outPath,JSON.stringify(task.migrationEvidence,null,2) + '\n');
  console.log('StarBlox AI Development Factory migration input');
  console.log('status: verified');
  console.log('units: ' + task.migrationEvidence.units.length);
  console.log('hash: ' + task.migrationEvidence.evidenceHash);
  console.log('artifact: ' + outPath);
  process.exit(0);
}

const adapterModule=await import(pathToFileURL(adapterPath).href);
const adapter=adapterModule.default || adapterModule;

if(!adapter?.studio || typeof adapter.studio.call !== 'function'){
  throw new Error('adapter must export studio.call(tool,args)');
}
if(
  !adapter?.agents ||
  typeof adapter.agents.plan !== 'function' ||
  typeof adapter.agents.code !== 'function' ||
  typeof adapter.agents.review !== 'function'
){
  throw new Error('adapter must export agents.plan, agents.code and agents.review');
}

const run=await runDevelopmentFactory({
  task,
  studio:adapter.studio,
  agents:adapter.agents,
  repositoryGate:repositoryGate(),
  startedAt:task.startedAt || new Date().toISOString(),
  config:{
    ...(adapter.config || {}),
    ...(task.config || {}),
    requiredRepositoryGates:['tests','certification','balance','build']
  }
});

const validation=verifyDevelopmentRun(run);
if(!validation.ok){
  throw new Error('development run artifact is invalid: ' + validation.errors.join('; '));
}

const runJson=JSON.stringify(run,null,2) + '\n';
await writeFile(outPath,runJson);

let adaptationReceiptPath=null;
if(run.status === 'verified' && task.migrationEvidence){
  adaptationReceiptPath=fromRoot(
    arg('--adaptation-receipt') ||
    resolve(dirname(outPath),'migration-adaptation-receipt.json')
  );
  if(dirname(adaptationReceiptPath) !== dirname(outPath)){
    throw new Error(
      'migration adaptation receipt must be written beside the development run artifact'
    );
  }

  const runBytes=Buffer.from(runJson,'utf8');
  const runSha256=createHash('sha256').update(runBytes).digest('hex');
  const adaptationReceipt=buildMigrationAdaptationReceipt({
    run,
    runArtifactFile:basename(outPath),
    runArtifactSha256:runSha256,
    runArtifactBytes:runBytes.length
  });
  const adaptationValidation=verifyMigrationAdaptationReceipt(adaptationReceipt);
  if(!adaptationValidation.ok){
    throw new Error(
      'migration adaptation receipt is invalid: ' +
      adaptationValidation.errors.join('; ')
    );
  }
  await writeFile(
    adaptationReceiptPath,
    JSON.stringify(adaptationReceipt,null,2) + '\n'
  );
}

console.log('StarBlox AI Development Factory');
console.log('run: ' + run.runId);
console.log('status: ' + run.status);
console.log('hash: ' + run.runHash);
console.log('artifact: ' + outPath);
if(adaptationReceiptPath){
  console.log('adaptation receipt: ' + adaptationReceiptPath);
  console.log('quarantine exit approved: false');
  console.log('next: quarantine-exit-certification');
}

if(run.status !== 'verified'){
  process.exitCode=2;
}
