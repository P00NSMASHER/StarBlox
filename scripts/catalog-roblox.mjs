
import { createHash } from 'node:crypto';
import { readdir,readFile,stat,writeFile } from 'node:fs/promises';
import { dirname,extname,isAbsolute,relative,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { buildRobloxCapabilityCatalog } from '../src/robloxCatalog/capabilityCatalog.js';
import { capabilityCatalogMarkdown } from '../src/robloxCatalog/catalogReport.js';

const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const readerManifest=resolve(root,'tools/roblox_catalog_reader/Cargo.toml');
const SUPPORTED=new Set(['.rbxl','.rbxm','.rbxlx','.rbxmx']);

function arg(name,required=false){
  const inline=process.argv.find(value => value.startsWith(name + '='));
  const value=inline ? inline.slice(name.length + 1) : (() => {
    const index=process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : null;
  })();
  if(required && !value) throw new Error(name + ' is required');
  return value;
}

function absolute(value){
  return isAbsolute(value) ? value : resolve(process.cwd(),value);
}

async function collect(path){
  const info=await stat(path);
  if(info.isFile()){
    return SUPPORTED.has(extname(path).toLowerCase()) ? [path] : [];
  }

  const out=[];
  for(const entry of await readdir(path,{withFileTypes:true})){
    const child=resolve(path,entry.name);
    if(entry.isDirectory()){
      out.push(...await collect(child));
    }else if(entry.isFile() && SUPPORTED.has(extname(entry.name).toLowerCase())){
      out.push(child);
    }
  }
  return out.sort();
}

function readRobloxDom(path){
  const result=spawnSync(
    'cargo',
    ['run','--quiet','--manifest-path',readerManifest,'--',path],
    {
      cwd:root,
      encoding:'utf8',
      maxBuffer:128 * 1024 * 1024
    }
  );

  if(result.error){
    throw new Error('could not start rbx-dom reader: ' + result.error.message);
  }
  if(result.status !== 0){
    throw new Error(
      'rbx-dom reader failed for ' + path + ': ' +
      (result.stderr || result.stdout || ('exit ' + result.status)).trim()
    );
  }

  try{
    return JSON.parse(result.stdout);
  }catch{
    throw new Error('rbx-dom reader returned invalid JSON for ' + path);
  }
}

const input=absolute(arg('--input',true));
const outPath=absolute(arg('--out') || 'roblox-capability-catalog.json');
const reportPath=absolute(arg('--report') || 'roblox-capability-catalog.md');
const sourcePrefix=arg('--source-id') || 'authorized-roblox';

const files=await collect(input);
if(files.length === 0){
  throw new Error('no .rbxl/.rbxm/.rbxlx/.rbxmx files found under ' + input);
}

const base=(await stat(input)).isDirectory() ? input : dirname(input);
const sources=[];

for(const file of files){
  const rel=relative(base,file).replaceAll('\\','/');
  process.stderr.write('catalog: reading ' + rel + '\n');
  const bytes=await readFile(file);
  sources.push({
    sourceId:sourcePrefix + ':' + rel,
    file:rel,
    sha256:createHash('sha256').update(bytes).digest('hex'),
    bytes:bytes.length,
    dom:readRobloxDom(file)
  });
}

const catalog=buildRobloxCapabilityCatalog(sources);
await writeFile(outPath,JSON.stringify(catalog,null,2) + '\n');
await writeFile(reportPath,capabilityCatalogMarkdown(catalog));

console.log('StarBlox Roblox/Brookhaven Capability Catalog');
console.log('sources: ' + catalog.summary.sourceCount);
console.log('source fingerprints: ' + catalog.summary.sourceFingerprintCount + '/' + catalog.summary.sourceCount);
console.log('instances: ' + catalog.summary.instanceCount);
console.log('scripts: ' + catalog.summary.scriptCount);
console.log('remotes: ' + catalog.summary.remoteCount);
console.log('assets: ' + catalog.summary.assetIdCount);
console.log('system candidates: ' + catalog.summary.systemCandidateCount);
console.log('catalog hash: ' + catalog.catalogHash);
console.log('json: ' + outPath);
console.log('report: ' + reportPath);
