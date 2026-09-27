import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

function arg(name,def=null){
  const inline=process.argv.find(value=>value.startsWith(name+'='));
  if(inline) return inline.slice(name.length+1);
  const i=process.argv.indexOf(name);
  return i>=0 ? process.argv[i+1] : def;
}

const manifestPath=resolve(arg('--manifest','research-inputs/brookhaven/legacy-reference/SOURCE.json'));
const outPath=resolve(arg('--out','.legacy-brookhaven/Brookhaven-2024-github.rbxl'));
const receiptPath=resolve(arg('--receipt','.legacy-brookhaven/LEGACY_SOURCE_ACQUISITION.json'));

const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
if(manifest.classification!=='legacy_reference_source'){
  throw new Error('legacy Brookhaven source classification mismatch');
}
const source=manifest.source||{};
if(!source.pinnedRawUrl || !source.sourceCommit || !source.gitBlobSha1){
  throw new Error('legacy source manifest is incomplete');
}

const response=await fetch(source.pinnedRawUrl,{redirect:'follow'});
if(!response.ok){
  throw new Error('legacy Brookhaven source download failed: HTTP '+response.status);
}
const bytes=Buffer.from(await response.arrayBuffer());
if(bytes.length!==Number(source.bytes)){
  throw new Error('legacy Brookhaven source byte count mismatch');
}
const sha256=createHash('sha256').update(bytes).digest('hex');

await mkdir(dirname(outPath),{recursive:true});
await mkdir(dirname(receiptPath),{recursive:true});
await writeFile(outPath,bytes);

const receipt={
  schemaVersion:1,
  status:'legacy-reference-acquired',
  classification:manifest.classification,
  source:{
    repository:source.repository,
    path:source.path,
    sourceCommit:source.sourceCommit,
    gitBlobSha1:source.gitBlobSha1,
    bytes:bytes.length,
    sha256
  },
  output:{
    path:outPath,
    bytes:bytes.length,
    sha256
  },
  boundaries:{
    currentLiveParityVerified:false,
    exactParityClaimAllowed:false,
    productionActivationAllowed:false
  }
};
await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
