import fs from 'node:fs';
import { convertScene } from './convertBrookhavenNeutralScene.mjs';

const inputPath='docs/preproduction/brookhaven-research/fixtures/vertical-slice-proxy-source-v1.json';
const input=JSON.parse(fs.readFileSync(inputPath,'utf8'));
const scene=convertScene(input);
const issues=[];

function expectReject(label,mutate,pattern){
  const copy=JSON.parse(JSON.stringify(input));
  mutate(copy);
  try{
    convertScene(copy);
    issues.push('converter-accepted-invalid:'+label);
  }catch(error){
    if(pattern && !pattern.test(String(error?.message||error))){
      issues.push('converter-wrong-rejection:'+label+':'+String(error?.message||error));
    }
  }
}

expectReject('executable-field',copy=>{
  copy.objects[0].code='print("not allowed")';
},/executable fields forbidden/);

expectReject('unknown-rights-status',copy=>{
  copy.source.rightsStatus='unknown-rights-state';
},/unsupported source\.rightsStatus/);

expectReject('unknown-payload-kind',copy=>{
  copy.source.payloadKind='unknown-payload';
},/unsupported source\.payloadKind/);

const requiredRoles=['house','vehicle','neighborhood-block','school','shop'];
for(const role of requiredRoles){
  if(!scene.objects.some(object => object.role === role)) issues.push('missing-role:'+role);
}
if(scene.objects.length < 12) issues.push('too-few-proxy-objects');
if(scene.productionEligibility !== 'candidate-after-QA') issues.push('proxy-eligibility');
if(scene.source.payloadKind !== 'original-starblox-proxy') issues.push('proxy-payload-kind');
if(scene.source.rightsStatus !== 'original-starblox') issues.push('proxy-rights');
if(scene.coordinateSystem.units !== 'meters') issues.push('target-units');
if(scene.coordinateSystem.handedness !== 'right') issues.push('target-handedness');

for(const object of scene.objects){
  const p=object.transform?.positionMeters;
  if(!Array.isArray(p)||p.length!==3||p.some(value=>!Number.isFinite(value))) issues.push('bad-position:'+object.id);
  if(object.collision?.enabled && (!Array.isArray(object.collision.sizeMeters)||object.collision.sizeMeters.some(v=>v<=0))){
    issues.push('bad-collision:'+object.id);
  }
}

const solid=scene.objects.filter(object => object.collision?.enabled);
const bounds=solid.reduce((acc,object)=>{
  const [x,y,z]=object.transform.positionMeters;
  const [sx,sy,sz]=object.collision.sizeMeters;
  return {
    min:[Math.min(acc.min[0],x-sx/2),Math.min(acc.min[1],y-sy/2),Math.min(acc.min[2],z-sz/2)],
    max:[Math.max(acc.max[0],x+sx/2),Math.max(acc.max[1],y+sy/2),Math.max(acc.max[2],z+sz/2)]
  };
},{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});

const span=bounds.max.map((value,index)=>value-bounds.min[index]);
if(span[0] > 60 || span[2] > 60) issues.push('proxy-slice-too-large');

const result={
  schemaVersion:'starblox-brookhaven-proxy-slice-validation-v1',
  inputPath,
  objectCount:scene.objects.length,
  requiredRoles,
  boundsMeters:bounds,
  spanMeters:span,
  sourceFingerprint:scene.source.sourceFingerprint,
  sceneFingerprint:scene.sceneFingerprint,
  productionEligibility:scene.productionEligibility,
  issueCount:issues.length,
  issues
};
process.stdout.write(JSON.stringify(result,null,2)+'\n');
if(issues.length) process.exitCode=1;
