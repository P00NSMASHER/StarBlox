import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const EXPECTED_ROJO_VERSION='7.6.1';
const root=process.cwd();
const rojoBinary=process.platform === 'win32' ? 'rojo.exe' : 'rojo';

function run(args){
  const result=spawnSync(rojoBinary,args,{
    cwd:root,
    encoding:'utf8'
  });
  if(result.status !== 0){
    const detail=(result.stderr || result.stdout || '').trim();
    throw new Error('Rojo command failed: ' + args.join(' ') + (detail ? '\n' + detail : ''));
  }
  return (result.stdout || '').trim();
}

const version=run(['--version']);
if(!version.includes(EXPECTED_ROJO_VERSION)){
  throw new Error(
    'expected Rojo ' + EXPECTED_ROJO_VERSION + ' but found: ' + version
  );
}

const temp=await mkdtemp(join(tmpdir(),'starblox-rojo-build-'));
const output=join(temp,'StarBlox.rbxlx');

try{
  run([
    'build',
    resolve(root,'roblox/default.project.json'),
    '--output',
    output
  ]);

  const bytes=await readFile(output);
  const xml=bytes.toString('utf8');

  if(bytes.length < 256){
    throw new Error('Rojo build artifact is unexpectedly small');
  }
  if(!xml.includes('<roblox')){
    throw new Error('Rojo build artifact is not a Roblox XML place/model');
  }
  if(!xml.includes('StarBlox')){
    throw new Error('Rojo build artifact does not contain StarBlox instances');
  }

  console.log(JSON.stringify({
    status:'verified',
    rojoVersion:EXPECTED_ROJO_VERSION,
    project:'roblox/default.project.json',
    artifactFormat:'rbxlx',
    artifactBytes:bytes.length,
    publicationStarted:false
  }));
}finally{
  await rm(temp,{recursive:true,force:true});
}
