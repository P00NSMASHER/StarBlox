import { createHash } from 'node:crypto';
import { existsSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function fail(message){
  throw new Error('Roblox backbone verification failed: ' + message);
}

function read(path){
  return readFileSync(resolve(process.cwd(),'roblox',path));
}

function text(path){
  return read(path).toString('utf8');
}

function gitBlobSha1(bytes){
  return createHash('sha1')
    .update(Buffer.from('blob ' + bytes.length + '\0'))
    .update(bytes)
    .digest('hex');
}

const lock=JSON.parse(text('toolchain.lock.json'));
if(lock.schemaVersion !== 1) fail('unsupported toolchain lock schema');

const manifest=text('wally.toml');
const exactPackages=[
  ['Matter','matter-ecs/matter@=0.8.4'],
  ['ProfileStore','lm-loleris/profilestore@=1.0.3']
];
for(const [alias,pkg] of exactPackages){
  const needle=alias + ' = "' + pkg + '"';
  if(!manifest.includes(needle)) fail('missing exact Wally pin: ' + needle);
}

for(const [name,pkg] of Object.entries(lock.runtimePackages || {})){
  if(pkg.manager !== 'vendored') continue;
  for(const file of pkg.files || []){
    if(!/^[a-f0-9]{40}$/.test(file.gitBlobSha1 || '')){
      fail(name + ' has invalid git blob SHA for ' + file.path);
    }
    const bytes=read(file.path);
    const actual=gitBlobSha1(bytes);
    if(actual !== file.gitBlobSha1){
      fail(name + ' vendor drift at ' + file.path + ': expected ' + file.gitBlobSha1 + ', found ' + actual);
    }
  }
}

const zap=lock.generators?.Zap;
if(!zap || zap.version !== '0.6.29' || zap.upstreamRevision !== '8cd17ab78192217600eec6f688ed8f8aab18d707'){
  fail('Zap generator pin is missing or unexpected');
}
if(!existsSync(resolve(process.cwd(),'roblox',zap.schema))) fail('Zap schema is missing');
for(const [platform,asset] of Object.entries(zap.assets || {})){
  if(!asset.file || !/^[a-f0-9]{64}$/.test(asset.sha256 || '')){
    fail('invalid Zap release asset pin for ' + platform);
  }
}

const project=JSON.parse(text('default.project.json'));
const replicated=project.tree?.ReplicatedStorage || {};
const server=project.tree?.ServerScriptService || {};
if(replicated.ReplicaClient?.$path !== 'vendor/Replica/ReplicatedStorage/ReplicaClient.luau'){
  fail('Rojo ReplicaClient path is not pinned');
}
if(replicated.ReplicaShared?.$path !== 'vendor/Replica/ReplicatedStorage/ReplicaShared'){
  fail('Rojo ReplicaShared path is not pinned');
}
if(server.ReplicaServer?.$path !== 'vendor/Replica/ServerScriptService/ReplicaServer.luau'){
  fail('Rojo ReplicaServer path is not pinned');
}
if(replicated.Packages?.$path?.optional !== 'Packages'){
  fail('Rojo shared Wally package mount is missing');
}
if(server.ServerPackages?.$path?.optional !== 'ServerPackages'){
  fail('Rojo server Wally package mount is missing');
}

const serverRuntime=text('src/server/Runtime.server.luau');
const clientRuntime=text('src/client/Runtime.client.luau');
for(const needle of ['ProfileStore = require(profileStoreModule)','Replica = require(replicaServerModule)','Matter = require(matterModule)']){
  if(!serverRuntime.includes(needle)) fail('server runtime missing ' + needle);
}
if(!clientRuntime.includes('Bootstrap.start(require(replicaClientModule))')){
  fail('client runtime is not wired to pinned ReplicaClient');
}

console.log(JSON.stringify({
  ok:true,
  wallyPackages:exactPackages.length,
  replicaVendorFiles:lock.runtimePackages.Replica.files.length,
  zapVersion:zap.version
}));
