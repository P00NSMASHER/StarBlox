import { createHash } from 'node:crypto';
import { mkdir,readFile,readdir,lstat,writeFile } from 'node:fs/promises';
import { basename,dirname,extname,isAbsolute,relative,resolve } from 'node:path';

const SUPPORTED=new Set(['.rbxl','.rbxm','.rbxlx','.rbxmx']);
const VERSION='starblox-roblox-source-preflight-v1';
const HANDOFF_VERSION='starblox-roblox-catalog-handoff-v1';

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

async function collect(path,blockers){
  const info=await lstat(path);
  if(info.isSymbolicLink()){
    blockers.push('symbolic-link-source:' + path);
    return [];
  }
  if(info.isFile()){
    return SUPPORTED.has(extname(path).toLowerCase()) ? [path] : [];
  }
  if(!info.isDirectory()){
    blockers.push('unsupported-source-node:' + path);
    return [];
  }

  const out=[];
  for(const entry of await readdir(path,{withFileTypes:true})){
    const child=resolve(path,entry.name);
    if(entry.isSymbolicLink()){
      blockers.push('symbolic-link-source:' + child);
      continue;
    }
    if(entry.isDirectory()){
      out.push(...await collect(child,blockers));
    }else if(entry.isFile() && SUPPORTED.has(extname(entry.name).toLowerCase())){
      out.push(child);
    }
  }
  return out.sort();
}

async function fingerprint(path){
  const bytes=await readFile(path);
  return {
    bytes:bytes.length,
    sha256:createHash('sha256').update(bytes).digest('hex')
  };
}

const inputRaw=arg('--input',true);
const outRaw=arg('--out');
const handoffRaw=arg('--handoff');
const input=absolute(inputRaw);
const blockers=[];
const files=await collect(input,blockers);
const inputInfo=await lstat(input);
const base=inputInfo.isDirectory() ? input : dirname(input);
const rows=[];

for(const file of files){
  const digest=await fingerprint(file);
  const rel=inputInfo.isDirectory()
    ? relative(base,file).replaceAll('\\','/')
    : basename(file);
  const extension=extname(file).toLowerCase();
  rows.push({
    file:rel,
    extension,
    bytes:digest.bytes,
    sha256:digest.sha256
  });
  if(digest.bytes === 0) blockers.push('empty-source:' + rel);
}

if(rows.length === 0){
  blockers.push('no-supported-roblox-source-files');
}

const formats={rbxl:0,rbxm:0,rbxlx:0,rbxmx:0};
for(const row of rows){
  const key=row.extension.slice(1);
  formats[key]=(formats[key] || 0) + 1;
}

const duplicateGroups=[...rows.reduce((map,row) => {
  if(!map.has(row.sha256)) map.set(row.sha256,[]);
  map.get(row.sha256).push(row.file);
  return map;
},new Map()).entries()]
  .filter(([,paths]) => paths.length > 1)
  .map(([sha256,paths]) => ({sha256,files:[...paths].sort()}))
  .sort((a,b) => a.sha256.localeCompare(b.sha256));

const report={
  schemaVersion:1,
  version:VERSION,
  ready:blockers.length === 0,
  inputKind:inputInfo.isDirectory() ? 'directory' : 'file',
  fileCount:rows.length,
  totalBytes:rows.reduce((sum,row) => sum + row.bytes,0),
  formats,
  duplicateGroups,
  blockers:[...new Set(blockers)].sort(),
  files:rows.sort((a,b) => a.file.localeCompare(b.file))
};

const handoff={
  schemaVersion:1,
  version:HANDOFF_VERSION,
  ready:report.ready,
  sourceRoot:base,
  inputKind:report.inputKind,
  fileCount:report.fileCount,
  totalBytes:report.totalBytes,
  blockers:[...report.blockers],
  files:report.files.map(row => ({
    file:row.file,
    extension:row.extension,
    bytes:row.bytes,
    sha256:row.sha256
  }))
};

if(handoffRaw){
  const handoffPath=absolute(handoffRaw);
  await mkdir(dirname(handoffPath),{recursive:true});
  await writeFile(handoffPath,JSON.stringify(handoff,null,2) + '\n');
}

const json=JSON.stringify(report,null,2) + '\n';
if(outRaw){
  const out=absolute(outRaw);
  await mkdir(dirname(out),{recursive:true});
  await writeFile(out,json);
  console.log('StarBlox Roblox source preflight');
  console.log('ready: ' + report.ready);
  console.log('files: ' + report.fileCount);
  console.log('bytes: ' + report.totalBytes);
  console.log('blockers: ' + report.blockers.length);
  console.log('report: ' + out);
  if(handoffRaw) console.log('catalog handoff: ' + absolute(handoffRaw));
}else{
  process.stdout.write(json);
}

if(!report.ready){
  process.exitCode=2;
}
