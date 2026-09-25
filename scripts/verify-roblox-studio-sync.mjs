import net from 'node:net';
import { spawn,spawnSync } from 'node:child_process';
import { mkdtemp,readFile,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';

const root=process.cwd();
const rojo=process.platform === 'win32' ? 'rojo.exe' : 'rojo';
const port=34875;
const host='127.0.0.1';

function run(args){
  const result=spawnSync(rojo,args,{cwd:root,encoding:'utf8'});
  if(result.status !== 0){
    throw new Error(
      'Rojo command failed: ' + args.join(' ') + '\n' +
      (result.stderr || result.stdout || '')
    );
  }
}

async function waitForPort(timeoutMs=10000){
  const started=Date.now();
  while(Date.now()-started < timeoutMs){
    const ok=await new Promise(resolve => {
      const socket=net.createConnection({host,port});
      socket.once('connect',() => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error',() => resolve(false));
      socket.setTimeout(300,() => {
        socket.destroy();
        resolve(false);
      });
    });
    if(ok) return;
    await new Promise(resolve => setTimeout(resolve,100));
  }
  throw new Error('Rojo serve endpoint did not become reachable');
}

const temp=await mkdtemp(join(tmpdir(),'starblox-studio-sync-'));
const placeOut=join(temp,'StarBlox.rbxlx');
const connectorOut=join(temp,'StarBloxDevFactoryConnector.rbxmx');

let server=null;
try{
  run([
    'build',
    resolve(root,'roblox/default.project.json'),
    '--output',
    placeOut
  ]);
  run([
    'build',
    resolve(root,'roblox/devFactoryPlugin/default.project.json'),
    '--output',
    connectorOut
  ]);

  const place=await readFile(placeOut,'utf8');
  const connector=await readFile(connectorOut,'utf8');

  if(!place.includes('StarBlox')){
    throw new Error('native place baseline is missing StarBlox instances');
  }
  if(!connector.includes('starblox-studio-connector-v1')){
    throw new Error('Studio connector build is missing the expected protocol');
  }
  if(/publish_place|PublishAsync|SavePlaceAsync/.test(connector)){
    throw new Error('Studio connector unexpectedly exposes publication behavior');
  }

  server=spawn(
    rojo,
    [
      'serve',
      resolve(root,'roblox/default.project.json'),
      '--address',
      host,
      '--port',
      String(port)
    ],
    {
      cwd:root,
      stdio:['ignore','pipe','pipe']
    }
  );

  let stderr='';
  server.stderr?.on('data',chunk => {
    stderr+=chunk.toString();
  });

  await waitForPort();

  if(server.exitCode !== null){
    throw new Error('Rojo serve exited before sync verification: ' + stderr);
  }

  console.log(JSON.stringify({
    status:'verified',
    baseline:'roblox/native-place-baseline.json',
    placeArtifact:'rbxlx',
    connectorArtifact:'rbxmx',
    rojoServe:{
      host,
      port,
      reachable:true
    },
    liveStudioPeerAttested:false,
    publicationStarted:false,
    liveActivationAllowed:false
  }));
}finally{
  if(server && server.exitCode === null){
    server.kill('SIGTERM');
  }
  await rm(temp,{recursive:true,force:true});
}
