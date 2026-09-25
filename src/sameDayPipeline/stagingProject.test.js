import { createHash } from 'node:crypto';
import { mkdir,readFile,rm,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';

import { stableHash } from '../domainSchemas.js';
import { buildMigrationBundleManifest } from '../robloxMigration/migrationBundle.js';
import { buildSameDayStagingProject } from './stagingProject.js';

function planPayload(plan){
  return {
    schemaVersion:plan.schemaVersion,
    migrationVersion:plan.migrationVersion,
    catalogHash:plan.catalogHash,
    rules:plan.rules,
    summary:plan.summary,
    units:plan.units
  };
}

function makePlan(sourceId){
  const units=[
    {
      unitId:sourceId+'-asset-11111111',
      sourceId,
      sourceFile:'source.rbxl',
      sourceSha256:'a'.repeat(64),
      sourceBytes:100,
      systemName:'Safe House',
      rootPath:'DataModel/Safe House',
      capabilities:['housing'],
      engineeringLeverageScore:8,
      migrationStrategy:'asset-only',
      exportDisposition:'staging',
      suggestedTarget:'ServerStorage/StarBloxMigration/Housing/safe-house',
      selected:true,
      selectionReason:'selected by migration rules',
      blockers:[],
      riskFlags:[],
      stats:{instances:10,scripts:0,remotes:0,assets:1},
      dependencies:{assetIds:[],edges:[],external:[]}
    },
    {
      unitId:sourceId+'-logic-22222222',
      sourceId,
      sourceFile:'source.rbxl',
      sourceSha256:'a'.repeat(64),
      sourceBytes:100,
      systemName:'House Logic',
      rootPath:'DataModel/House Logic',
      capabilities:['housing'],
      engineeringLeverageScore:7,
      migrationStrategy:'refactor',
      exportDisposition:'quarantine',
      suggestedTarget:'ServerStorage/StarBloxMigration/Quarantine/house-logic',
      selected:true,
      selectionReason:'selected by migration rules',
      blockers:['logic-refactor-required'],
      riskFlags:[],
      stats:{instances:2,scripts:1,remotes:1,assets:0},
      dependencies:{assetIds:[],edges:[],external:[]}
    }
  ];
  const base={
    schemaVersion:1,
    migrationVersion:'starblox-roblox-migration-v1',
    catalogHash:'fnv1a32:12345678',
    rules:{
      includeCapabilities:['housing'],
      excludeCapabilities:[],
      includeSystems:[],
      excludeSystems:[],
      minEngineeringLeverageScore:0,
      includeRisky:false
    },
    summary:{
      totalUnits:2,selectedUnits:2,stagingUnits:1,quarantineUnits:1,
      externalDependencyCount:0,blockerCount:1
    },
    units
  };
  const hash=stableHash(planPayload(base));
  return {...base,planId:'roblox-migration-'+hash.split(':')[1],planHash:hash};
}

describe('same-day staging Rojo project',()=>{
  it('mounts only verified script-free staging artifacts',async()=>{
    const root=resolve(tmpdir(),'starblox-staging-'+Date.now());
    const out=resolve(root,'artifacts');
    const sourceId='brookhaven';
    const sourceDir=resolve(out,'sources',sourceId);
    await mkdir(resolve(root,'roblox/src/shared'),{recursive:true});
    await mkdir(resolve(root,'roblox/src/server'),{recursive:true});
    await mkdir(resolve(root,'roblox/src/client'),{recursive:true});
    await mkdir(resolve(sourceDir,'planning'),{recursive:true});
    await mkdir(resolve(sourceDir,'export/staging'),{recursive:true});
    await mkdir(resolve(sourceDir,'export/quarantine'),{recursive:true});

    const plan=makePlan(sourceId);
    await writeFile(resolve(sourceDir,'planning/migration-plan.json'),JSON.stringify(plan));

    const safeBytes=Buffer.from('<roblox></roblox>');
    const logicBytes=Buffer.from('<roblox></roblox>');
    const sha=value=>createHash('sha256').update(value).digest('hex');
    await writeFile(resolve(sourceDir,'export/staging/'+plan.units[0].unitId+'.rbxmx'),safeBytes);
    await writeFile(resolve(sourceDir,'export/quarantine/'+plan.units[1].unitId+'.rbxmx'),logicBytes);

    const bundle=buildMigrationBundleManifest(plan,[
      {
        unitId:plan.units[0].unitId,
        disposition:'staging',
        file:'staging/'+plan.units[0].unitId+'.rbxmx',
        sha256:sha(safeBytes),
        bytes:safeBytes.length
      },
      {
        unitId:plan.units[1].unitId,
        disposition:'quarantine',
        file:'quarantine/'+plan.units[1].unitId+'.rbxmx',
        sha256:sha(logicBytes),
        bytes:logicBytes.length
      }
    ]);
    await writeFile(resolve(sourceDir,'export/migration-bundle.json'),JSON.stringify(bundle));

    const result=await buildSameDayStagingProject({
      repoRoot:root,
      outDir:out,
      sourceIds:[sourceId]
    });

    expect(result.report.included.map(row=>row.unitId)).toEqual([plan.units[0].unitId]);
    expect(result.report.skipped.map(row=>row.unitId)).toEqual([plan.units[1].unitId]);
    expect(result.report.scriptBearingUnitsMounted).toBe(0);
    expect(result.project.tree.Workspace.StarBloxImported['$className']).toBe('Folder');
    expect(result.project.tree.Workspace.StarBloxImported[sourceId]['$className']).toBe('Folder');
    expect(result.project.tree.Workspace.StarBloxImported[sourceId][plan.units[0].unitId]['$path'])
      .toMatch(/staging/);
    expect(JSON.parse(await readFile(result.projectPath,'utf8')).name).toBe('StarBloxSameDay');

    await rm(root,{recursive:true,force:true});
  });
});