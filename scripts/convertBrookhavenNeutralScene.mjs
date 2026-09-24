import crypto from 'node:crypto';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

export const INPUT_SCHEMA = 'starblox-neutral-conversion-input-v1';
export const OUTPUT_SCHEMA = 'starblox-neutral-scene-v1';

const FORBIDDEN_KEYS = new Set([
  'code','script','sourceCode','remoteCall','httpGet','loadstring','executor'
]);

function stableValue(value){
  if(Array.isArray(value)) return value.map(stableValue);
  if(value && typeof value === 'object'){
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key,stableValue(value[key])])
    );
  }
  return value;
}

export function canonicalJson(value){
  return JSON.stringify(stableValue(value));
}

export function sha256(value){
  return crypto.createHash('sha256').update(
    typeof value === 'string' ? value : canonicalJson(value)
  ).digest('hex');
}

function assertFiniteVector(value,label,length=3){
  if(!Array.isArray(value) || value.length !== length || value.some(v => !Number.isFinite(Number(v)))){
    throw new Error(label + ' must be a finite ' + length + '-value vector');
  }
  return value.map(Number);
}

function scanForbidden(value,path='root'){
  if(!value || typeof value !== 'object') return [];
  const findings=[];
  for(const [key,child] of Object.entries(value)){
    if(FORBIDDEN_KEYS.has(key)) findings.push(path + '.' + key);
    if(child && typeof child === 'object') findings.push(...scanForbidden(child,path + '.' + key));
  }
  return findings;
}

function normalizePosition(position,metersPerUnit){
  const [x,y,z] = assertFiniteVector(position,'position');
  return [x*metersPerUnit,y*metersPerUnit,-z*metersPerUnit];
}

function normalizeSize(size,metersPerUnit){
  return assertFiniteVector(size,'size').map(v => Math.abs(v*metersPerUnit));
}

function productionEligibility(rightsStatus){
  if(rightsStatus === 'original-starblox') return 'candidate-after-QA';
  if(rightsStatus === 'explicit-public-license') return 'candidate-after-license-and-content-QA';
  return 'research-only-until-rights-evidence-recorded';
}

export function convertScene(input){
  if(input?.schemaVersion !== INPUT_SCHEMA) throw new Error('unsupported input schema');
  if(!input?.source?.id) throw new Error('source.id required');
  if(!input?.source?.payloadKind) throw new Error('source.payloadKind required');
  if(!input?.source?.rightsStatus) throw new Error('source.rightsStatus required');
  if(!input?.source?.provenanceRef) throw new Error('source.provenanceRef required');
  if(!Array.isArray(input?.objects) || !input.objects.length) throw new Error('objects required');

  const forbidden=scanForbidden(input);
  if(forbidden.length) throw new Error('executable fields forbidden: ' + forbidden.join(','));

  const metersPerUnit=Number(input?.coordinateSystem?.metersPerUnit ?? 0.28);
  if(!Number.isFinite(metersPerUnit) || metersPerUnit <= 0) throw new Error('invalid metersPerUnit');

  const ids=new Set();
  const objects=input.objects.map(object => {
    if(!object?.id) throw new Error('object.id required');
    if(ids.has(object.id)) throw new Error('duplicate object id: ' + object.id);
    ids.add(object.id);
    const position=normalizePosition(object?.transform?.position || [0,0,0],metersPerUnit);
    const rotationEulerDeg=assertFiniteVector(object?.transform?.rotationEulerDeg || [0,0,0],'rotationEulerDeg');
    const scale=assertFiniteVector(object?.transform?.scale || [1,1,1],'scale');
    const geometry={...(object.geometry || {})};
    if(geometry.type === 'box'){
      geometry.sizeMeters=normalizeSize(geometry.size || [1,1,1],metersPerUnit);
      delete geometry.size;
    }
    const collision=object?.collision?.enabled === false
      ? {enabled:false}
      : {
          enabled:true,
          kind:String(object?.collision?.kind || 'box'),
          sizeMeters:normalizeSize(
            object?.collision?.size || object?.geometry?.size || [1,1,1],
            metersPerUnit
          )
        };

    return {
      id:String(object.id),
      name:String(object.name || object.id),
      role:String(object.role || 'environment'),
      parentId:object.parentId ? String(object.parentId) : null,
      geometry,
      material:{...(object.material || {})},
      transform:{
        positionMeters:position,
        rotationEulerDeg:[rotationEulerDeg[0],rotationEulerDeg[1],-rotationEulerDeg[2]],
        scale
      },
      collision,
      metadata:{...(object.metadata || {})}
    };
  }).sort((a,b)=>a.id.localeCompare(b.id));

  for(const object of objects){
    if(object.parentId && !ids.has(object.parentId)){
      throw new Error('missing parent ' + object.parentId + ' for ' + object.id);
    }
  }

  const base={
    schemaVersion:OUTPUT_SCHEMA,
    source:{
      id:String(input.source.id),
      payloadKind:String(input.source.payloadKind),
      rightsStatus:String(input.source.rightsStatus),
      provenanceRef:String(input.source.provenanceRef),
      sourceFingerprint:'sha256:' + sha256(input)
    },
    productionEligibility:productionEligibility(input.source.rightsStatus),
    coordinateSystem:{
      units:'meters',
      upAxis:'Y',
      handedness:'right',
      sourceMetersPerUnit:metersPerUnit,
      mapping:'[x,y,z] -> [x,y,-z]'
    },
    objects
  };
  return {
    ...base,
    sceneFingerprint:'sha256:' + sha256(base)
  };
}

function arg(name,defaultValue=''){
  const prefix='--' + name + '=';
  const found=process.argv.find(value => value.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultValue;
}

if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href){
  const inputPath=arg('input');
  const outputPath=arg('out');
  if(!inputPath) throw new Error('--input is required');
  if(!outputPath) throw new Error('--out is required');
  const input=JSON.parse(fs.readFileSync(inputPath,'utf8'));
  const output=convertScene(input);
  fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n','utf8');
  process.stdout.write(JSON.stringify({
    schemaVersion:'starblox-neutral-conversion-receipt-v1',
    input:inputPath,
    output:outputPath,
    objectCount:output.objects.length,
    productionEligibility:output.productionEligibility,
    sourceFingerprint:output.source.sourceFingerprint,
    sceneFingerprint:output.sceneFingerprint
  },null,2)+'\n');
}
