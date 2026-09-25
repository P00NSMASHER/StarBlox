import { deflateSync } from 'node:zlib';

const MUTATION_TOOLS=new Set([
  'write_script','edit_script','create_instance','set_property','set_selection'
]);
const INSPECTION_TOOLS=new Set([
  'search_tree','inspect_instance','list_children','script_grep',
  'read_script','read_all_scripts','get_selection'
]);

function plain(value){
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function extractAgentJson(raw){
  const text=String(raw || '').trim();
  if(!text) throw new Error('Pi returned an empty response');

  const candidates=[
    text,
    text.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,'')
  ];
  const first=text.indexOf('{');
  const last=text.lastIndexOf('}');
  if(first >= 0 && last > first) candidates.push(text.slice(first,last+1));

  for(const candidate of candidates){
    try{
      const value=JSON.parse(candidate);
      if(plain(value)) return value;
    }catch{}
  }
  throw new Error('Pi response did not contain one valid JSON object');
}

export function validateFactoryAgentResult(role,value){
  if(!plain(value)) throw new Error(role + ' result must be an object');

  if(role === 'plan'){
    if(typeof value.summary !== 'string' || !value.summary.trim()){
      throw new Error('plan.summary is required');
    }
    if(value.inspectionCalls != null && !Array.isArray(value.inspectionCalls)){
      throw new Error('plan.inspectionCalls must be an array');
    }
    for(const call of value.inspectionCalls || []){
      if(!plain(call) || !INSPECTION_TOOLS.has(String(call.tool || ''))){
        throw new Error('plan requested unsupported inspection tool: ' + String(call?.tool || ''));
      }
    }
    if(value.acceptance != null && !Array.isArray(value.acceptance)){
      throw new Error('plan.acceptance must be an array');
    }
    return value;
  }

  if(role === 'code' || role === 'repair'){
    if(!Array.isArray(value.actions)) throw new Error(role + '.actions must be an array');
    if(value.actions.length > 50) throw new Error(role + '.actions exceeds 50-call batch limit');
    for(const action of value.actions){
      if(!plain(action) || !MUTATION_TOOLS.has(String(action.tool || ''))){
        throw new Error(role + ' requested unsupported mutation tool: ' + String(action?.tool || ''));
      }
      if(!plain(action.args)) throw new Error(role + ' action args must be an object');
    }
    return {
      summary:typeof value.summary === 'string' ? value.summary : '',
      actions:value.actions
    };
  }

  if(role === 'review'){
    if(!['pass','repair','fail'].includes(value.verdict)){
      throw new Error('review.verdict must be pass, repair, or fail');
    }
    return {
      verdict:value.verdict,
      findings:Array.isArray(value.findings) ? value.findings.map(String).slice(0,50) : [],
      summary:typeof value.summary === 'string' ? value.summary : ''
    };
  }

  if(role === 'visual-review'){
    if(typeof value.ok !== 'boolean') throw new Error('visual-review.ok must be boolean');
    return {
      ok:value.ok,
      findings:Array.isArray(value.findings) ? value.findings.map(String).slice(0,50) : [],
      summary:typeof value.summary === 'string' ? value.summary : ''
    };
  }

  throw new Error('unsupported factory agent role: ' + role);
}

export function factoryRolePrompt(role){
  const common=[
    'You are a bounded StarBlox AI Development Factory worker.',
    'The attached JSON file is the complete role context.',
    'Inspect repository files only when the context requires additional evidence.',
    'Do not publish, deploy, spend money, alter secrets, or execute donor repository scripts.',
    'Do not replace StarBlox ProfileStore, quest/mastery, economy, networking, or release authority unless the task explicitly says to edit an adapter around them.',
    'Return exactly one JSON object with no markdown fences and no prose outside the object.'
  ];

  if(role === 'plan'){
    return [...common,
      'Return: {"summary":string,"inspectionCalls":[{"tool":string,"args":object}],"tests":{"required":boolean,"path"?:string},"playtest":{"required":boolean,"episodeArgs":object,"inputActions":array,"assertions":array,"telemetryDomains":array},"visual":{"required":boolean},"acceptance":[string]}.',
      'Inspection tools may only be search_tree, inspect_instance, list_children, script_grep, read_script, read_all_scripts, or get_selection.',
      'If the task requests live verification, mobile proof, screenshots, or performance evidence, preserve those requirements in the plan.'
    ].join('\n');
  }

  if(role === 'code' || role === 'repair'){
    return [...common,
      'Return: {"summary":string,"actions":[{"tool":string,"args":object}]}.',
      'Mutation tools may only be write_script, edit_script, create_instance, set_property, or set_selection.',
      'Never return delete_instance, run_luau, publishing calls, datastore mutation, asset purchase, or external network actions.',
      'Prefer the fewest bounded actions that satisfy the verified plan. Preserve server authority and rollback safety.'
    ].join('\n');
  }

  if(role === 'review'){
    return [...common,
      'Return: {"verdict":"pass"|"repair"|"fail","findings":[string],"summary":string}.',
      'Choose pass only when the supplied verification evidence satisfies the plan and acceptance criteria. Never waive runtime, repository, security, visual, or progression-authority failures.'
    ].join('\n');
  }

  if(role === 'visual-review'){
    return [...common,
      'A screenshot image is attached separately. Review the actual image, not any base64 text.',
      'Return: {"ok":boolean,"findings":[string],"summary":string}.',
      'Reject obvious broken layout, missing world content, overlapping/cut-off UI, unreadable text, severe visual corruption, or acceptance criteria visibly not met.'
    ].join('\n');
  }

  throw new Error('unsupported factory role: ' + role);
}

let crcTable=null;
function table(){
  if(crcTable) return crcTable;
  crcTable=new Uint32Array(256);
  for(let n=0;n<256;n++){
    let c=n;
    for(let k=0;k<8;k++) c=(c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n]=c >>> 0;
  }
  return crcTable;
}
function crc32(buffer){
  let c=0xffffffff;
  const t=table();
  for(const byte of buffer) c=t[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type,data=Buffer.alloc(0)){
  const typeBytes=Buffer.from(type,'ascii');
  const length=Buffer.alloc(4);
  length.writeUInt32BE(data.length,0);
  const crc=Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes,data])),0);
  return Buffer.concat([length,typeBytes,data,crc]);
}

export function rgbaCaptureToPng(capture){
  const width=Number(capture?.width);
  const height=Number(capture?.height);
  if(!Number.isInteger(width) || width < 1 || width > 4096){
    throw new Error('capture width is invalid');
  }
  if(!Number.isInteger(height) || height < 1 || height > 4096){
    throw new Error('capture height is invalid');
  }
  if(capture?.format !== 'rgba8') throw new Error('capture format must be rgba8');
  const rgba=Buffer.from(String(capture?.dataB64 || ''),'base64');
  if(rgba.length !== width * height * 4){
    throw new Error('capture RGBA byte count does not match dimensions');
  }

  const stride=width*4;
  const scanlines=Buffer.alloc((stride+1)*height);
  for(let y=0;y<height;y++){
    const dest=y*(stride+1);
    scanlines[dest]=0;
    rgba.copy(scanlines,dest+1,y*stride,(y+1)*stride);
  }

  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);
  ihdr.writeUInt32BE(height,4);
  ihdr[8]=8;
  ihdr[9]=6;
  ihdr[10]=0;
  ihdr[11]=0;
  ihdr[12]=0;

  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),
    chunk('IDAT',deflateSync(scanlines)),
    chunk('IEND')
  ]);
}

export function contextWithoutRawImage(context){
  if(!plain(context)) return context;
  const copy=JSON.parse(JSON.stringify(context));
  if(copy.capture && plain(copy.capture) && 'dataB64' in copy.capture){
    copy.capture.dataB64='[attached-as-image]';
  }
  return copy;
}
