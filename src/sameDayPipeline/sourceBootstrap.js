import { createHash } from 'node:crypto';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

async function readExisting(path){
  try{
    return await readFile(path);
  }catch(error){
    if(error?.code === 'ENOENT') return null;
    throw error;
  }
}

export function verifyPinnedSourceBytes(sourceId,bytes,pin){
  const data=Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const sha256=createHash('sha256').update(data).digest('hex');
  const expectedSha=String(pin?.sha256 || '').toLowerCase();
  const expectedBytes=Number(pin?.bytes);

  if(data.length !== expectedBytes || sha256 !== expectedSha){
    throw new Error(
      'authorized source fingerprint mismatch for ' + sourceId +
      '; expected ' + expectedSha + '/' + expectedBytes +
      ' but found ' + sha256 + '/' + data.length
    );
  }

  return {
    sha256,
    bytes:data.length
  };
}

export async function ensurePinnedSource({
  source,
  input,
  fetchImpl=globalThis.fetch
}){
  const pin=source?.download;
  if(!pin) return {downloaded:false,verified:false};

  let data=await readExisting(input);
  let downloaded=false;

  if(data == null){
    if(typeof fetchImpl !== 'function'){
      throw new Error('fetch implementation is required to bootstrap ' + source.id);
    }
    const response=await fetchImpl(pin.url,{redirect:'follow'});
    if(!response?.ok){
      throw new Error(
        'could not download authorized source ' + source.id +
        ': HTTP ' + String(response?.status ?? 'unknown')
      );
    }
    data=Buffer.from(await response.arrayBuffer());
    downloaded=true;
  }

  const verified=verifyPinnedSourceBytes(source.id,data,pin);

  if(downloaded){
    await mkdir(dirname(input),{recursive:true});
    await writeFile(input,data);
  }

  return {
    downloaded,
    verified:true,
    sha256:verified.sha256,
    bytes:verified.bytes,
    input
  };
}
