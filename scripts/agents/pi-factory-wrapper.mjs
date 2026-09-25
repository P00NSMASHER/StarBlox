import { spawnSync } from 'node:child_process';
import { mkdir,mkdtemp,readFile,rm,writeFile } from 'node:fs/promises';
import { relative,resolve } from 'node:path';

import {
  contextWithoutRawImage,
  extractAgentJson,
  factoryRolePrompt,
  rgbaCaptureToPng,
  validateFactoryAgentResult
} from '../../src/devFactory/piFactoryAgent.js';

const role=String(process.argv.at(-1) || '').trim();
if(!['plan','code','review','repair','visual-review'].includes(role)){
  throw new Error('factory Pi wrapper requires role: plan, code, review, repair, or visual-review');
}

const stdin=await new Promise((resolveInput,reject)=>{
  let data='';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data',chunk=>{ data+=chunk; });
  process.stdin.on('end',()=>resolveInput(data));
  process.stdin.on('error',reject);
});

let payload;
try{
  payload=JSON.parse(stdin);
}catch{
  throw new Error('factory Pi wrapper stdin must be one JSON object');
}
if(payload?.protocol !== 'starblox-factory-agent-v1'){
  throw new Error('unsupported StarBlox factory agent protocol');
}
if(payload?.role !== role){
  throw new Error('factory role argument does not match payload role');
}

const root=process.cwd();
const scratchRoot=resolve(root,'artifacts','agent-context');
await mkdir(scratchRoot,{recursive:true});
const scratch=await mkdtemp(resolve(scratchRoot,'pi-'));
const contextPath=resolve(scratch,'context.json');
const imagePath=resolve(scratch,'viewport.png');

function atPath(path){
  return '@' + relative(root,path).replaceAll('\\','/');
}

try{
  const context=contextWithoutRawImage(payload.context);
  await writeFile(contextPath,JSON.stringify(context,null,2)+'\n');

  const files=[atPath(contextPath)];
  if(role === 'visual-review'){
    const capture=payload?.context?.capture;
    const png=rgbaCaptureToPng(capture);
    await writeFile(imagePath,png);
    files.push(atPath(imagePath));
  }

  const piCommand=String(process.env.STARBLOX_PI_COMMAND || 'pi').trim();
  const args=[
    '--no-session',
    '--no-extensions',
    '--no-skills',
    '--tools','read,grep,find,ls'
  ];
  const model=String(process.env.STARBLOX_PI_MODEL || '').trim();
  if(model) args.push('--model',model);
  const thinking=String(process.env.STARBLOX_PI_THINKING || '').trim();
  if(thinking) args.push('--thinking',thinking);
  args.push('-p',...files,factoryRolePrompt(role));

  const result=spawnSync(piCommand,args,{
    cwd:root,
    encoding:'utf8',
    maxBuffer:64 * 1024 * 1024,
    env:{
      ...process.env,
      PI_SKIP_VERSION_CHECK:process.env.PI_SKIP_VERSION_CHECK || '1'
    }
  });

  if(result.error){
    throw new Error('could not start Pi coding agent: ' + result.error.message);
  }
  if(result.status !== 0){
    throw new Error(
      'Pi coding agent failed for ' + role + ': ' +
      (result.stderr || result.stdout || ('exit ' + result.status)).trim()
    );
  }

  const parsed=extractAgentJson(result.stdout);
  const validated=validateFactoryAgentResult(role,parsed);
  process.stdout.write(JSON.stringify(validated));
}finally{
  await rm(scratch,{recursive:true,force:true});
}
