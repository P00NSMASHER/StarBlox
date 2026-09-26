export const BROOKHAVEN_INTERACTION_CANDIDATE_SCHEMA_VERSION=1;

const DOOR_MATERIALS=new Set(['SmoothPlastic','Plastic','Metal','Wood']);

function round(value,digits=4){
  const factor=10**digits;
  return Math.round(value*factor)/factor;
}

export function worldAxisExtents(entry){
  if(!entry || !Array.isArray(entry.size) || entry.size.length!==3 ||
    !Array.isArray(entry.cframe) || entry.cframe.length!==12){
    throw new TypeError('entry with size[3] and cframe[12] is required');
  }

  const [sx,sy,sz]=entry.size.map(Number);
  const [, , ,r00,r01,r02,r10,r11,r12,r20,r21,r22]=entry.cframe.map(Number);
  const values=[sx,sy,sz,r00,r01,r02,r10,r11,r12,r20,r21,r22];
  if(values.some(value=>!Number.isFinite(value))){
    throw new Error('entry geometry must be finite');
  }

  return Object.freeze([
    Math.abs(r00)*sx+Math.abs(r01)*sy+Math.abs(r02)*sz,
    Math.abs(r10)*sx+Math.abs(r11)*sy+Math.abs(r12)*sz,
    Math.abs(r20)*sx+Math.abs(r21)*sy+Math.abs(r22)*sz
  ]);
}

function candidate(entry,kind,extents){
  return Object.freeze({
    index:entry.index,
    kind,
    className:entry.className,
    shape:entry.shape,
    material:entry.material,
    size:Object.freeze(entry.size.map(value=>round(value))),
    worldExtents:Object.freeze(extents.map(value=>round(value))),
    position:Object.freeze(entry.position.map(value=>round(value,2))),
    canonicalHash:entry.canonicalHash,
    sourceSliceSha256:entry.sourceSliceSha256
  });
}

export function classifyBrookhavenInteractionCandidates(ir){
  if(!ir || !Array.isArray(ir.entries)) throw new TypeError('Brookhaven IR entries are required');

  const nativeSeats=[];
  const vehicleSeats=[];
  const doorCandidates=[];
  const garageCandidates=[];
  const lightCandidates=[];

  for(const entry of ir.entries){
    if(entry.className==='Seat'){
      nativeSeats.push(candidate(entry,'native-seat',worldAxisExtents(entry)));
      continue;
    }
    if(entry.className==='VehicleSeat'){
      vehicleSeats.push(candidate(entry,'native-vehicle-seat',worldAxisExtents(entry)));
      continue;
    }

    const extents=worldAxisExtents(entry);
    const [worldX,worldY,worldZ]=extents;
    const horizontalThin=Math.min(worldX,worldZ);
    const horizontalWide=Math.max(worldX,worldZ);
    const ordinaryPanel=
      entry.className==='Part' &&
      entry.partType==='Block' &&
      entry.anchored===true &&
      entry.canCollide===true &&
      !entry.decal &&
      DOOR_MATERIALS.has(entry.material);

    if(
      ordinaryPanel &&
      worldY>=5.5 && worldY<=10.5 &&
      horizontalThin<=1.05 &&
      horizontalWide>=2.2 && horizontalWide<=7.5
    ){
      doorCandidates.push(candidate(entry,'door-candidate',extents));
      continue;
    }

    if(
      ordinaryPanel &&
      worldY>=5.5 && worldY<=15 &&
      horizontalThin<=1.35 &&
      horizontalWide>=8 && horizontalWide<=30
    ){
      garageCandidates.push(candidate(entry,'garage-or-large-panel-candidate',extents));
      continue;
    }

    const volume=entry.size[0]*entry.size[1]*entry.size[2];
    if(
      entry.material==='Neon' &&
      entry.canCollide===false &&
      !entry.decal &&
      worldY<=3.5 &&
      horizontalWide<=5 &&
      volume<=8
    ){
      lightCandidates.push(candidate(entry,'light-fixture-candidate',extents));
    }
  }

  return Object.freeze({
    nativeSeats:Object.freeze(nativeSeats),
    vehicleSeats:Object.freeze(vehicleSeats),
    doorCandidates:Object.freeze(doorCandidates),
    garageCandidates:Object.freeze(garageCandidates),
    lightCandidates:Object.freeze(lightCandidates)
  });
}

export function buildBrookhavenInteractionCandidateManifest(ir,{irHash=null}={}){
  const classified=classifyBrookhavenInteractionCandidates(ir);
  const manifest={
    schemaVersion:BROOKHAVEN_INTERACTION_CANDIDATE_SCHEMA_VERSION,
    status:'candidate-review-only',
    source:{
      bytes:ir.source?.bytes ?? null,
      sha256:ir.source?.sha256 ?? null,
      step2FingerprintHash:ir.source?.step2FingerprintHash ?? null,
      irHash
    },
    safety:{
      geometryMutationStarted:false,
      doorActivationAllowed:false,
      garageActivationAllowed:false,
      lightActivationAllowed:false,
      nativeSeatClassesPreserved:true,
      automaticCandidateActivationForbidden:true
    },
    counts:{
      nativeSeats:classified.nativeSeats.length,
      vehicleSeats:classified.vehicleSeats.length,
      doorCandidates:classified.doorCandidates.length,
      garageCandidates:classified.garageCandidates.length,
      lightCandidates:classified.lightCandidates.length
    },
    candidates:{
      nativeSeats:classified.nativeSeats,
      vehicleSeats:classified.vehicleSeats,
      doors:classified.doorCandidates,
      garages:classified.garageCandidates,
      lights:classified.lightCandidates
    }
  };
  return Object.freeze(manifest);
}
