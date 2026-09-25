import { createHash } from 'node:crypto';
import { lstat,mkdir,readFile,writeFile } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';

import { buildBrookhavenStarBloxProject } from '../src/robloxWorld/placeComposer.js';

function arg(name){
  const inline=process.argv.find(value => value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const index=process.argv.indexOf(name);
  if(index >= 0 && process.argv[index+1] && !process.argv[index+1].startsWith('--')){
    return process.argv[index+1];
  }
  return null;
}

function sha256(bytes){
  return createHash('sha256').update(bytes).digest('hex');
}

const root=process.cwd();
const worldRaw=arg('--world');
const projectRaw=arg('--project');
const receiptRaw=arg('--receipt');
if(!worldRaw || !projectRaw || !receiptRaw){
  throw new Error('--world, --project and --receipt are required');
}

const worldPath=resolve(worldRaw);
const projectPath=resolve(projectRaw);
const receiptPath=resolve(receiptRaw);
const info=await lstat(worldPath);
if(!info.isFile() || info.isSymbolicLink()){
  throw new Error('generated Brookhaven world must be a regular non-symlink file');
}

const worldBytes=await readFile(worldPath);
const defaultProjectPath=resolve(root,'roblox/default.project.json');
const defaultProjectBytes=await readFile(defaultProjectPath);
const defaultProject=JSON.parse(defaultProjectBytes.toString('utf8'));
const step4=JSON.parse(
  await readFile(resolve(root,'docs/roblox-world/STEP_4_ISOLATED_GENERATION.json'),'utf8')
);
const step4Receipt=step4.receipt;

const {project,receipt}=buildBrookhavenStarBloxProject({
  defaultProject,
  defaultProjectDir:dirname(defaultProjectPath),
  outputProjectDir:dirname(projectPath),
  worldPath,
  worldBytes,
  step4Receipt
});

const projectBytes=Buffer.from(JSON.stringify(project,null,2)+'\n','utf8');
const finalReceipt={
  ...receipt,
  inputs:{
    step4Status:step4.status,
    step4VerifiedHead:step4.verifiedBy?.verifiedHead || null,
    defaultProject:{
      path:'roblox/default.project.json',
      sha256:sha256(defaultProjectBytes)
    }
  },
  output:{
    projectPath:projectPath,
    projectSha256:sha256(projectBytes)
  }
};

await mkdir(dirname(projectPath),{recursive:true});
await mkdir(dirname(receiptPath),{recursive:true});
await writeFile(projectPath,projectBytes);
await writeFile(receiptPath,JSON.stringify(finalReceipt,null,2)+'\n');
process.stdout.write(JSON.stringify(finalReceipt,null,2)+'\n');
