import { createHash } from 'node:crypto';

export const BROOKHAVEN_WORLD_GENERATOR_VERSION='starblox-brookhaven-world-generator-v1';

const MATERIAL_TOKEN=Object.freeze({
  Plastic:256,
  SmoothPlastic:272,
  Neon:288,
  Wood:512,
  Brick:848,
  DiamondPlate:1056,
  Metal:1088,
  Glass:1568
});
const SURFACE_TOKEN=Object.freeze({
  Smooth:0,Glue:1,Weld:2,Studs:3,Inlet:4,Universal:5,Hinge:6,SmoothNoOutlines:10
});
const PART_SHAPE_TOKEN=Object.freeze({Ball:0,Block:1,Cylinder:2});
const NORMAL_ID_TOKEN=Object.freeze({Right:0,Top:1,Back:2,Left:3,Bottom:4,Front:5});
const MESH_TYPE_TOKEN=Object.freeze({Head:0,Sphere:3,FileMesh:5,Brick:6});

function sha256(data){
  return createHash('sha256').update(data).digest('hex');
}
function esc(value){
  return String(value)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&apos;');
}
function num(value){
  if(!Number.isFinite(value)) throw new Error('generated Roblox numeric property must be finite');
  return Object.is(value,-0) ? '-0' : String(value);
}
function bool(value){ return value ? 'true' : 'false'; }
function clamp(value,min,max){ return Math.min(max,Math.max(min,value)); }
function vector3(name,values){
  return '<Vector3 name="'+name+'"><X>'+num(values[0])+'</X><Y>'+num(values[1])+
    '</Y><Z>'+num(values[2])+'</Z></Vector3>';
}
function color3(name,values){
  const normalized=values.map(value => value/255);
  return '<Color3 name="'+name+'"><R>'+num(normalized[0])+'</R><G>'+num(normalized[1])+
    '</G><B>'+num(normalized[2])+'</B></Color3>';
}
function cframe(values){
  return '<CoordinateFrame name="CFrame">'+
    '<X>'+num(values[0])+'</X><Y>'+num(values[1])+'</Y><Z>'+num(values[2])+'</Z>'+
    '<R00>'+num(values[3])+'</R00><R01>'+num(values[4])+'</R01><R02>'+num(values[5])+'</R02>'+
    '<R10>'+num(values[6])+'</R10><R11>'+num(values[7])+'</R11><R12>'+num(values[8])+'</R12>'+
    '<R20>'+num(values[9])+'</R20><R21>'+num(values[10])+'</R21><R22>'+num(values[11])+'</R22>'+
    '</CoordinateFrame>';
}
function content(name,value){
  if(!value) return '<Content name="'+name+'"><null></null></Content>';
  return '<Content name="'+name+'"><url>'+esc(value)+'</url></Content>';
}
function generatedClass(entry){
  if(!['Part','Seat','WedgePart','CornerWedgePart','VehicleSeat'].includes(entry.className)){
    throw new Error('unsupported generated Roblox class '+entry.className+' for entry '+entry.index);
  }
  return entry.className;
}
function adaptedReflectance(entry,adaptations){
  if(entry.reflectance <= 1) return entry.reflectance;
  const generated=clamp(entry.reflectance,0,1);
  adaptations.push(Object.freeze({
    entryIndex:entry.index,
    property:'Reflectance',
    reason:'source value exceeds Roblox nominal unit range',
    sourceValue:entry.reflectance,
    generatedValue:generated
  }));
  return generated;
}
function adaptedVertexColor(entry,adaptations){
  if(!entry.mesh) return null;
  const source=[...entry.mesh.vertexColor];
  const generated=source.map(value => clamp(value,0,1));
  if(source.some((value,index)=>value !== generated[index])){
    adaptations.push(Object.freeze({
      entryIndex:entry.index,
      property:'SpecialMesh.VertexColor',
      reason:'source value exceeds Roblox nominal unit range',
      sourceValue:Object.freeze(source),
      generatedValue:Object.freeze(generated)
    }));
  }
  return generated;
}
function partProperties(entry,reflectance){
  const surfaces=['Top','Front','Bottom','Right','Left','Back']
    .map(face => {
      const token=SURFACE_TOKEN[entry.surface[face]];
      if(token === undefined) throw new Error('unsupported surface '+entry.surface[face]);
      return '<token name="'+face+'Surface">'+token+'</token>';
    }).join('');
  const material=MATERIAL_TOKEN[entry.material];
  if(material === undefined) throw new Error('unsupported material '+entry.material);
  const shape=entry.className === 'Part'
    ? (() => {
        const token=PART_SHAPE_TOKEN[entry.shape];
        if(token === undefined) throw new Error('unsupported Part shape '+entry.shape);
        return '<token name="shape">'+token+'</token>';
      })()
    : '';

  return '<Properties>'+
    '<bool name="Anchored">'+bool(entry.anchored)+'</bool>'+
    surfaces+
    color3('Color',entry.color)+
    cframe(entry.cframe)+
    '<bool name="CanCollide">'+bool(entry.canCollide)+'</bool>'+
    '<bool name="Locked">'+bool(entry.locked)+'</bool>'+
    '<token name="Material">'+material+'</token>'+
    '<string name="Name">BHW_'+String(entry.index).padStart(4,'0')+'</string>'+
    '<float name="Reflectance">'+num(reflectance)+'</float>'+
    '<float name="Transparency">'+num(entry.transparency)+'</float>'+
    shape+
    vector3('size',entry.size)+
    '</Properties>';
}
function meshXml(entry,vertexColor){
  if(!entry.mesh) return '';
  const mesh=entry.mesh;
  const typeName=mesh.meshType.replace('Enum.MeshType.','');
  const token=MESH_TYPE_TOKEN[typeName];
  if(token === undefined) throw new Error('unsupported MeshType '+mesh.meshType);
  return '<Item class="SpecialMesh" referent="RBX_STEP4_M'+String(entry.index).padStart(4,'0')+'">'+
    '<Properties>'+
    (mesh.meshId ? content('MeshId',mesh.meshId) : '')+
    '<token name="MeshType">'+token+'</token>'+
    '<string name="Name">Mesh</string>'+
    vector3('Offset',mesh.offset)+
    vector3('Scale',mesh.scale)+
    content('TextureId',mesh.texture)+
    vector3('VertexColor',vertexColor)+
    '</Properties></Item>';
}
function decalXml(entry){
  if(!entry.decal) return '';
  const faceName=entry.decal.face.replace('Enum.NormalId.','');
  const token=NORMAL_ID_TOKEN[faceName];
  if(token === undefined) throw new Error('unsupported NormalId '+entry.decal.face);
  return '<Item class="Decal" referent="RBX_STEP4_D'+String(entry.index).padStart(4,'0')+'">'+
    '<Properties>'+
    '<token name="Face">'+token+'</token>'+
    '<string name="Name">Decal</string>'+
    content('Texture',entry.decal.texture)+
    '<float name="Transparency">'+num(entry.decal.transparency)+'</float>'+
    '</Properties></Item>';
}

export function generateIsolatedBrookhavenWorld(ir,{
  step3Receipt
}={}){
  if(ir?.version !== 'starblox-brookhaven-world-ir-v1' || ir?.entryCount !== 4936 ||
     !Array.isArray(ir?.entries) || ir.entries.length !== 4936){
    throw new Error('Step 4 requires the complete verified Step 3 IR');
  }
  if(step3Receipt?.ir?.irHash !== ir.irHash){
    throw new Error('Step 4 IR does not match the verified Step 3 receipt');
  }
  if(step3Receipt?.boundaries?.robloxObjectsGenerated !== false){
    throw new Error('unexpected Step 3 generation boundary state');
  }

  const adaptations=[];
  const objectSpecs=[];
  const items=[];

  for(let i=0;i<ir.entries.length;i++){
    const entry=ir.entries[i];
    if(entry.index !== i+1) throw new Error('Step 4 requires contiguous IR entry order');
    for(let axis=0;axis<3;axis++){
      if(entry.position[axis] !== entry.cframe[axis]){
        throw new Error('entry '+entry.index+' position/CFrame translation mismatch');
      }
    }

    const className=generatedClass(entry);
    const reflectance=adaptedReflectance(entry,adaptations);
    const vertexColor=adaptedVertexColor(entry,adaptations);
    const children=decalXml(entry)+meshXml(entry,vertexColor);

    const spec={
      entryIndex:entry.index,
      className,
      name:'BHW_'+String(entry.index).padStart(4,'0'),
      sourceCanonicalHash:entry.canonicalHash,
      sourceSliceSha256:entry.sourceSliceSha256,
      generatedProperties:{
        anchored:entry.anchored,
        surfaces:entry.surface,
        color:entry.color,
        cframe:entry.cframe,
        canCollide:entry.canCollide,
        locked:entry.locked,
        material:entry.material,
        reflectance,
        transparency:entry.transparency,
        shape:entry.shape,
        size:entry.size,
        decal:entry.decal,
        mesh:entry.mesh ? {
          ...entry.mesh,
          vertexColor
        } : null
      }
    };
    objectSpecs.push(Object.freeze({
      ...spec,
      generatedSpecHash:'sha256:'+sha256(Buffer.from(JSON.stringify(spec),'utf8'))
    }));

    items.push(
      '<Item class="'+className+'" referent="RBX_STEP4_P'+String(entry.index).padStart(4,'0')+'">'+
      partProperties(entry,reflectance)+children+'</Item>'
    );
  }

  if(adaptations.length !== 2 ||
     adaptations[0]?.entryIndex !== 832 ||
     adaptations[1]?.entryIndex !== 844){
    throw new Error('Step 4 generation policy expected exactly the two verified legacy adaptations');
  }

  const xml='<?xml version="1.0" encoding="utf-8"?>\n'+
    '<roblox xmlns:xmime="http://www.w3.org/2005/05/xmlmime" '+
    'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '+
    'xsi:noNamespaceSchemaLocation="http://www.roblox.com/roblox.xsd" version="4">'+
    '<External>null</External><External>nil</External>'+
    '<Item class="Model" referent="RBX_STEP4_ROOT"><Properties>'+
    '<string name="Name">BrookhavenWorldBaseline</string>'+
    '</Properties>'+items.join('')+'</Item></roblox>\n';

  const decalCount=ir.entries.filter(entry => entry.decal !== null).length;
  const specialMeshCount=ir.entries.filter(entry => entry.mesh !== null).length;
  if(decalCount !== step3Receipt.structure?.decalCount ||
     specialMeshCount !== step3Receipt.structure?.meshCount){
    throw new Error('Step 4 nested object counts do not match the verified Step 3 receipt');
  }

  const generatedEntrySequenceSha256=sha256(Buffer.from(
    objectSpecs.map(row=>row.generatedSpecHash).join('\n'),'utf8'
  ));
  const sourceCanonicalSequenceSha256=sha256(Buffer.from(
    objectSpecs.map(row=>row.sourceCanonicalHash).join('\n'),'utf8'
  ));
  const sourceSliceSequenceSha256=sha256(Buffer.from(
    objectSpecs.map(row=>row.sourceSliceSha256).join('\n'),'utf8'
  ));
  const modelSha256=sha256(Buffer.from(xml,'utf8'));

  const receipt=Object.freeze({
    schemaVersion:1,
    version:BROOKHAVEN_WORLD_GENERATOR_VERSION,
    status:'generated-isolated-world-model',
    input:Object.freeze({
      step3IrHash:ir.irHash,
      step3EntryCount:ir.entryCount,
      step3EntryCanonicalSequenceSha256:step3Receipt.ir.entryCanonicalSequenceSha256,
      step3SourceSliceSequenceSha256:step3Receipt.ir.sourceSliceSequenceSha256
    }),
    output:Object.freeze({
      rootClass:'Model',
      rootName:'BrookhavenWorldBaseline',
      format:'rbxmx',
      bytes:Buffer.byteLength(xml,'utf8'),
      sha256:modelSha256,
      partCount:4936,
      decalCount,
      specialMeshCount,
      generatedObjectCount:1+4936+decalCount+specialMeshCount,
      generatedEntrySequenceSha256,
      sourceCanonicalSequenceSha256,
      sourceSliceSequenceSha256
    }),
    adaptationPolicy:Object.freeze({
      policy:'preserve-source-in-step3-adapt-only-engine-invalid-properties',
      adaptationCount:adaptations.length,
      adaptations:Object.freeze(adaptations),
      allOtherEntriesGeneratedWithoutPolicyAdaptation:true
    }),
    isolation:Object.freeze({
      containsStarBloxGameplayCode:false,
      containsScripts:false,
      containsRemotes:false,
      standaloneModelOnly:true,
      mountedIntoProductionPlace:false
    }),
    boundaries:Object.freeze({
      studioMutationStarted:false,
      robloxPlaceMutated:false,
      publicationStarted:false,
      liveActivationAllowed:false
    }),
    nextStep:'target-architecture-5-world-exactness-and-starblox-mount'
  });

  return Object.freeze({xml,receipt,objectSpecs:Object.freeze(objectSpecs)});
}
