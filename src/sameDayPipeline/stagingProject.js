import { createHash } from 'node:crypto';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { isAbsolute,relative,resolve } from 'node:path';

import { verifyMigrationBundleAgainstPlan } from '../robloxMigration/migrationBundle.js';
import { verifyRobloxMigrationPlan } from '../robloxMigration/migrationPlanner.js';

function posixRelative(from,to){
  return relative(from,to).replaceAll('\\','/');
}

async function digest(path){
  const bytes=await readFile(path);
  return {
    bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex')
  };
}

function safeSourceId(value){
  const id=String(value || '');
  if(!/^[a-z0-9][a-z0-9-]{1,62}$/.test(id)){
    throw new Error('unsafe same-day source id: ' + id);
  }
  return id;
}

export async function buildSameDayStagingProject({
  repoRoot,
  outDir,
  sourceIds,
  projectName='StarBloxSameDay'
}){
  const root=resolve(repoRoot);
  const output=resolve(outDir);
  await mkdir(output,{recursive:true});

  const imported={};
  const included=[];
  const skipped=[];

  for(const sourceIdRaw of sourceIds){
    const sourceId=safeSourceId(sourceIdRaw);
    const sourceDir=resolve(output,'sources',sourceId);
    const planPath=resolve(sourceDir,'planning','migration-plan.json');
    const bundlePath=resolve(sourceDir,'export','migration-bundle.json');
    const plan=JSON.parse(await readFile(planPath,'utf8'));
    const bundle=JSON.parse(await readFile(bundlePath,'utf8'));

    const planValidation=verifyRobloxMigrationPlan(plan);
    if(!planValidation.ok){
      throw new Error(sourceId + ' migration plan invalid: ' + planValidation.errors.join('; '));
    }
    const binding=verifyMigrationBundleAgainstPlan(bundle,plan);
    if(!binding.ok){
      throw new Error(sourceId + ' migration bundle invalid: ' + binding.errors.join('; '));
    }

    const units=new Map(plan.units.map(unit=>[unit.unitId,unit]));
    imported[sourceId]={};

    for(const artifact of bundle.artifacts || []){
      const unit=units.get(artifact.unitId);
      if(!unit) throw new Error(sourceId + ' bundle references unknown unit ' + artifact.unitId);

      const safeAsset=
        artifact.disposition === 'staging' &&
        ['extract','asset-only'].includes(unit.migrationStrategy) &&
        Number(unit.stats?.scripts || 0) === 0 &&
        Number(unit.stats?.remotes || 0) === 0 &&
        Array.isArray(unit.riskFlags) &&
        unit.riskFlags.length === 0;

      if(!safeAsset){
        skipped.push({
          sourceId,
          unitId:artifact.unitId,
          strategy:unit.migrationStrategy,
          disposition:artifact.disposition,
          scripts:Number(unit.stats?.scripts || 0),
          remotes:Number(unit.stats?.remotes || 0),
          riskFlags:[...(unit.riskFlags || [])]
        });
        continue;
      }

      const artifactPath=resolve(sourceDir,'export',artifact.file);
      const actual=await digest(artifactPath);
      if(actual.sha256 !== artifact.sha256 || actual.bytes !== artifact.bytes){
        throw new Error(
          sourceId + '/' + artifact.unitId + ' staging artifact fingerprint mismatch'
        );
      }

      imported[sourceId][artifact.unitId]={
        '$path':posixRelative(output,artifactPath)
      };
      included.push({
        sourceId,
        unitId:artifact.unitId,
        systemName:artifact.systemName,
        sha256:artifact.sha256,
        bytes:artifact.bytes,
        path:artifact.file
      });
    }

    if(Object.keys(imported[sourceId]).length === 0){
      delete imported[sourceId];
    }
  }

  const project={
    name:projectName,
    tree:{
      '$className':'DataModel',
      ReplicatedStorage:{
        StarBlox:{
          '$path':posixRelative(output,resolve(root,'roblox/src/shared'))
        }
      },
      ServerScriptService:{
        StarBlox:{
          '$path':posixRelative(output,resolve(root,'roblox/src/server'))
        }
      },
      StarterPlayer:{
        StarterPlayerScripts:{
          StarBlox:{
            '$path':posixRelative(output,resolve(root,'roblox/src/client'))
          }
        }
      },
      Workspace:{
        StarBloxImported:imported
      }
    }
  };

  const projectPath=resolve(output,'same-day.project.json');
  const reportPath=resolve(output,'same-day-staging-report.json');
  const report={
    schemaVersion:1,
    version:'starblox-same-day-staging-v1',
    projectFile:'same-day.project.json',
    sourceIds:[...sourceIds],
    included,
    skipped,
    scriptBearingUnitsMounted:0,
    remoteBearingUnitsMounted:0,
    publicationAllowed:false
  };

  await writeFile(projectPath,JSON.stringify(project,null,2) + '\n');
  await writeFile(reportPath,JSON.stringify(report,null,2) + '\n');

  return {
    project,
    report,
    projectPath,
    reportPath
  };
}
