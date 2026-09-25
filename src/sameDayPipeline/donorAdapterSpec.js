import { stableHash } from '../domainSchemas.js';

export const DONOR_ADAPTER_SPEC_VERSION='starblox-donor-adapter-spec-v1';

function plain(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function req(value,label){
  if(typeof value !== 'string' || !value.trim()) throw new TypeError(label+' must be a non-empty string');
  return value.trim();
}
function sha40(value,label){
  const v=req(value,label).toLowerCase();
  if(!/^[a-f0-9]{40}$/.test(v)) throw new TypeError(label+' must be a 40-character Git SHA');
  return v;
}
export function normalizeDonorAdapterSpec(raw){
  if(!plain(raw)) throw new TypeError('adapter spec must be an object');
  if(raw.schemaVersion !== 1) throw new TypeError('adapter spec schemaVersion must be 1');
  const sourceFiles=(raw.sourceFiles || []).map((row,index)=>{
    if(!plain(row)) throw new TypeError('sourceFiles['+index+'] must be an object');
    return {
      path:req(row.path,'sourceFiles['+index+'].path'),
      blobSha:sha40(row.blobSha,'sourceFiles['+index+'].blobSha')
    };
  });
  if(!sourceFiles.length) throw new TypeError('adapter spec must include sourceFiles');
  const mappings=(raw.mappings || []).map((row,index)=>{
    if(!plain(row)) throw new TypeError('mappings['+index+'] must be an object');
    const sources=Array.isArray(row.sources) ? row.sources.map(String) : [];
    const targets=Array.isArray(row.targets) ? row.targets.map(String) : [];
    if(!sources.length || !targets.length) throw new TypeError('mapping sources/targets are required');
    return {
      id:req(row.id,'mappings['+index+'].id'),
      sources,
      targets,
      strategy:req(row.strategy,'mappings['+index+'].strategy'),
      authority:req(row.authority,'mappings['+index+'].authority')
    };
  });
  if(!mappings.length) throw new TypeError('adapter spec must include mappings');
  const payload={
    schemaVersion:1,
    version:DONOR_ADAPTER_SPEC_VERSION,
    donorId:req(raw.donorId,'donorId'),
    repository:req(raw.repository,'repository'),
    commit:sha40(raw.commit,'commit'),
    sourceFiles,
    mappings,
    preserveAuthority:Array.isArray(raw.preserveAuthority) ? raw.preserveAuthority.map(String) : [],
    forbidden:Array.isArray(raw.forbidden) ? raw.forbidden.map(String) : [],
    acceptance:Array.isArray(raw.acceptance) ? raw.acceptance.map(String) : []
  };
  return {...payload,specHash:stableHash(payload)};
}
export function verifyDonorAdapterSpec(raw,{donorId,repository,commit}={}){
  const errors=[];
  let spec;
  try{ spec=normalizeDonorAdapterSpec(raw); }
  catch(error){ return {ok:false,errors:[error instanceof Error?error.message:String(error)]}; }
  if(donorId && spec.donorId!==donorId) errors.push('donorId mismatch');
  if(repository && spec.repository.toLowerCase()!==String(repository).toLowerCase()) errors.push('repository mismatch');
  if(commit && spec.commit!==String(commit).toLowerCase()) errors.push('commit mismatch');
  const paths=new Set(spec.sourceFiles.map(row=>row.path));
  for(const mapping of spec.mappings){
    for(const source of mapping.sources){
      if(!paths.has(source)) errors.push('mapping '+mapping.id+' references unpinned source '+source);
    }
  }
  if(!spec.preserveAuthority.includes('ProfileSessionService')) errors.push('ProfileSessionService authority must be preserved');
  if(!spec.preserveAuthority.includes('ReplicaStateService')) errors.push('ReplicaStateService authority must be preserved');
  return {ok:errors.length===0,errors,spec};
}
