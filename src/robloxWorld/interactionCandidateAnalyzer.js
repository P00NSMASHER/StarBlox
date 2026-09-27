const ENTRY_PATTERN=/\[(\d+)\]=\{([\s\S]*?)\n\};(?=\n\[\d+\]=\{|\n\};?$)/g;

function number3(match){
  if(!match) return null;
  return [Number(match[1]),Number(match[2]),Number(match[3])];
}

function sortedSize(entry){
  return [...entry.size].sort((a,b)=>a-b);
}

export function parseBrookhavenSerializedWorld(source){
  if(typeof source!=='string' || !source.startsWith('-- Brookhaven Map')){
    throw new Error('Brookhaven serialized source marker is required');
  }

  const entries=[];
  let match;
  ENTRY_PATTERN.lastIndex=0;
  while((match=ENTRY_PATTERN.exec(source))){
    const body=match[2];
    const shapeMatch=body.match(/shape="([^"]+)"/);
    const sizeMatch=body.match(/size=\{\[1\]=([^;]+);\[2\]=([^;]+);\[3\]=([^;]+);\};/);
    const positionMatch=body.match(/position=\{\[1\]=([^;]+);\[2\]=([^;]+);\[3\]=([^;]+);\};/);
    const materialMatch=body.match(/texture="([^"]+)"/);
    const collisionMatch=body.match(/cancollide=(true|false)/);
    const anchoredMatch=body.match(/anchored=(true|false)/);
    const transparencyMatch=body.match(/transparency=([^;]+)/);

    entries.push({
      id:Number(match[1]),
      shape:shapeMatch?.[1] ?? '',
      size:number3(sizeMatch),
      position:number3(positionMatch),
      material:materialMatch?.[1] ?? '',
      canCollide:collisionMatch?.[1]==='true',
      anchored:anchoredMatch?.[1]==='true',
      transparency:Number(transparencyMatch?.[1] ?? 0),
    });
  }

  return entries;
}

export function analyzeInteractionCandidates(entries){
  if(!Array.isArray(entries) || entries.length===0){
    throw new Error('parsed Brookhaven entries are required');
  }

  const seats=entries.filter(entry=>entry.shape==='Seat');
  const vehicleSeats=entries.filter(entry=>entry.shape==='Vehicle Seat');

  const likelyDoors=entries.filter(entry=>{
    if(entry.shape!=='Block' || !entry.size || !entry.position || !entry.anchored || !entry.canCollide || entry.transparency>0.65){
      return false;
    }
    const size=sortedSize(entry);
    return size[0]<=0.8 && size[1]>=2.0 && size[1]<=6.5 && size[2]>=5.5 && size[2]<=11.5;
  });

  const likelyGarageDoors=entries.filter(entry=>{
    if(entry.shape!=='Block' || !entry.size || !entry.position || !entry.anchored || !entry.canCollide || entry.transparency>0.5){
      return false;
    }
    const size=sortedSize(entry);
    return size[0]<=1.2 && size[1]>=6 && size[1]<=15 && size[2]>=8 && size[2]<=24;
  });

  const neonParts=entries.filter(entry=>entry.material==='Neon' && entry.size && entry.position);
  const smallNeon=neonParts.filter(entry=>Math.max(...entry.size)<=5);

  return Object.freeze({
    parsedEntries:entries.length,
    seats,
    vehicleSeats,
    likelyDoors,
    likelyGarageDoors,
    neonParts,
    smallNeon,
  });
}

export function candidateReceipt(analysis){
  const ids=list=>list.map(entry=>entry.id);
  return Object.freeze({
    schemaVersion:'starblox-brookhaven-interaction-candidates-v1',
    activationAllowed:false,
    reviewRequired:true,
    parsedEntries:analysis.parsedEntries,
    counts:{
      seats:analysis.seats.length,
      vehicleSeats:analysis.vehicleSeats.length,
      likelyDoors:analysis.likelyDoors.length,
      likelyGarageDoors:analysis.likelyGarageDoors.length,
      neonParts:analysis.neonParts.length,
      smallNeon:analysis.smallNeon.length,
    },
    candidateIds:{
      seats:ids(analysis.seats),
      vehicleSeats:ids(analysis.vehicleSeats),
      likelyDoors:ids(analysis.likelyDoors),
      likelyGarageDoors:ids(analysis.likelyGarageDoors),
      smallNeon:ids(analysis.smallNeon),
    },
  });
}
