import { createHash } from 'node:crypto';

export const BROOKHAVEN_WORLD_IR_SCHEMA_VERSION=1;
export const BROOKHAVEN_WORLD_IR_VERSION='starblox-brookhaven-world-ir-v1';

const SHAPES=new Set(['Block','Seat','Wedge','Cylinder','Corner','Ball','Vehicle Seat']);
const MATERIALS=new Set(['SmoothPlastic','Neon','Plastic','Brick','Glass','Metal','DiamondPlate','Wood']);
const SURFACES=new Set(['Smooth','SmoothNoOutlines','Weld','Inlet','Studs','Universal','Hinge','Glue']);
const NORMAL_IDS=new Set(['Top','Front','Bottom','Right','Left','Back']);
const MESH_TYPES=new Set(['FileMesh','Brick','Sphere','Head']);

function sha256(data){
  return createHash('sha256').update(data).digest('hex');
}

class Tokenizer{
  constructor(source){
    this.source=source;
    this.index=0;
    this.cached=null;
  }

  error(message,at=this.index){
    const start=Math.max(0,at-40);
    const end=Math.min(this.source.length,at+80);
    throw new Error(message + ' at offset ' + at + ': ' + JSON.stringify(this.source.slice(start,end)));
  }

  skip(){
    while(this.index < this.source.length){
      const ch=this.source[this.index];
      if(/\s/.test(ch)){
        this.index+=1;
        continue;
      }
      if(ch === '-' && this.source[this.index+1] === '-'){
        this.index+=2;
        while(this.index < this.source.length && this.source[this.index] !== '\n'){
          this.index+=1;
        }
        continue;
      }
      break;
    }
  }

  readString(){
    const start=this.index;
    this.index+=1;
    let value='';
    while(this.index < this.source.length){
      const ch=this.source[this.index++];
      if(ch === '"'){
        return {type:'string',value,start,end:this.index};
      }
      if(ch === '\\'){
        if(this.index >= this.source.length) this.error('unterminated string escape',start);
        const escaped=this.source[this.index++];
        if(escaped === '"' || escaped === '\\') value+=escaped;
        else if(escaped === 'n') value+='\n';
        else if(escaped === 'r') value+='\r';
        else if(escaped === 't') value+='\t';
        else this.error('unsupported string escape \\' + escaped,this.index-2);
        continue;
      }
      if(ch === '\n' || ch === '\r') this.error('raw newline in quoted string',this.index-1);
      value+=ch;
    }
    this.error('unterminated quoted string',start);
  }

  nextRaw(){
    this.skip();
    const start=this.index;
    if(start >= this.source.length) return {type:'eof',value:null,start,end:start};

    const rest=this.source.slice(start);
    const number=rest.match(/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if(number){
      this.index+=number[0].length;
      const value=Number(number[0]);
      if(!Number.isFinite(value)) this.error('non-finite number',start);
      return {type:'number',value,raw:number[0],start,end:this.index};
    }

    const ch=this.source[start];
    if(ch === '"') return this.readString();

    const identifier=rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if(identifier){
      this.index+=identifier[0].length;
      return {type:'identifier',value:identifier[0],start,end:this.index};
    }

    if('{}[]=;,.'.includes(ch)){
      this.index+=1;
      return {type:'punctuation',value:ch,start,end:this.index};
    }

    this.error('unsupported token',start);
  }

  peek(){
    if(this.cached === null) this.cached=this.nextRaw();
    return this.cached;
  }

  next(){
    const token=this.peek();
    this.cached=null;
    return token;
  }
}

class RestrictedLuaDataParser{
  constructor(source){
    this.tokens=new Tokenizer(source);
  }

  expect(type,value=null){
    const token=this.tokens.next();
    if(token.type !== type || (value !== null && token.value !== value)){
      throw new Error('expected ' + type + (value === null ? '' : ' ' + value) +
        ' but found ' + token.type + ' ' + String(token.value) + ' at offset ' + token.start);
    }
    return token;
  }

  parseProgram(){
    const keyword=this.expect('identifier');
    if(keyword.value !== 'return') throw new Error('serialized world must begin with return');
    const value=this.parseValue();
    if(value?.kind !== 'table') throw new Error('serialized world root must be a table');
    this.expect('eof');
    return value;
  }

  parseValue(){
    const token=this.tokens.peek();
    if(token.type === 'number') return this.tokens.next().value;
    if(token.type === 'string') return this.tokens.next().value;
    if(token.type === 'punctuation' && token.value === '{') return this.parseTable();
    if(token.type === 'identifier'){
      const first=this.tokens.next();
      if(first.value === 'true') return true;
      if(first.value === 'false') return false;
      if(first.value === 'nil') throw new Error('nil is not allowed in serialized world data');

      const parts=[first.value];
      while(this.tokens.peek().type === 'punctuation' && this.tokens.peek().value === '.'){
        this.tokens.next();
        parts.push(this.expect('identifier').value);
      }
      if(parts.length !== 3 || parts[0] !== 'Enum'){
        throw new Error('only bounded Enum references are allowed; found ' + parts.join('.'));
      }
      return Object.freeze({kind:'enum',value:parts.join('.')});
    }
    throw new Error('unsupported value token ' + token.type + ' ' + String(token.value) +
      ' at offset ' + token.start);
  }

  parseTable(){
    this.expect('punctuation','{');
    const fields=[];
    const seen=new Set();

    while(!(this.tokens.peek().type === 'punctuation' && this.tokens.peek().value === '}')){
      let key;
      let keyType;
      if(this.tokens.peek().type === 'punctuation' && this.tokens.peek().value === '['){
        this.tokens.next();
        const keyToken=this.tokens.next();
        if(keyToken.type !== 'number' || !Number.isInteger(keyToken.value) || keyToken.value < 1){
          throw new Error('bracket table keys must be positive integers');
        }
        key=keyToken.value;
        keyType='number';
        this.expect('punctuation',']');
      }else{
        const keyToken=this.expect('identifier');
        key=keyToken.value;
        keyType='string';
      }

      const identity=keyType + ':' + String(key);
      if(seen.has(identity)) throw new Error('duplicate table key ' + String(key));
      seen.add(identity);

      this.expect('punctuation','=');
      const value=this.parseValue();
      fields.push(Object.freeze({key,keyType,value}));

      const separator=this.tokens.peek();
      if(separator.type === 'punctuation' && (separator.value === ';' || separator.value === ',')){
        this.tokens.next();
      }else if(!(separator.type === 'punctuation' && separator.value === '}')){
        throw new Error('expected table separator or closing brace at offset ' + separator.start);
      }
    }

    this.expect('punctuation','}');
    return Object.freeze({kind:'table',fields:Object.freeze(fields)});
  }
}

function fieldsMap(table,label,{required=[],optional=[]}={}){
  if(table?.kind !== 'table') throw new Error(label + ' must be a table');
  const allowed=new Set([...required,...optional]);
  const map=new Map();
  for(const field of table.fields){
    if(field.keyType !== 'string') throw new Error(label + ' must use named keys only');
    if(!allowed.has(field.key)) throw new Error(label + ' contains unsupported key ' + field.key);
    map.set(field.key,field.value);
  }
  for(const key of required){
    if(!map.has(key)) throw new Error(label + ' is missing required key ' + key);
  }
  return map;
}

function numericVector(table,length,label,{positive=false,min=null,max=null}={}){
  if(table?.kind !== 'table') throw new Error(label + ' must be a numeric table');
  if(table.fields.length !== length) throw new Error(label + ' must contain exactly ' + length + ' values');
  const values=new Array(length);
  for(const field of table.fields){
    if(field.keyType !== 'number' || field.key < 1 || field.key > length){
      throw new Error(label + ' contains invalid numeric key ' + String(field.key));
    }
    if(typeof field.value !== 'number' || !Number.isFinite(field.value)){
      throw new Error(label + '[' + field.key + '] must be finite');
    }
    if(positive && field.value <= 0) throw new Error(label + '[' + field.key + '] must be positive');
    if(min !== null && field.value < min) throw new Error(label + '[' + field.key + '] is below minimum');
    if(max !== null && field.value > max) throw new Error(label + '[' + field.key + '] is above maximum');
    if(values[field.key-1] !== undefined) throw new Error(label + ' contains duplicate numeric key');
    values[field.key-1]=field.value;
  }
  if(values.some(value => value === undefined)) throw new Error(label + ' has missing numeric values');
  return Object.freeze(values);
}

function numberField(value,label,{min=null,max=null}={}){
  if(typeof value !== 'number' || !Number.isFinite(value)) throw new Error(label + ' must be finite');
  if(min !== null && value < min) throw new Error(label + ' is below minimum');
  if(max !== null && value > max) throw new Error(label + ' is above maximum');
  return value;
}

function booleanField(value,label){
  if(typeof value !== 'boolean') throw new Error(label + ' must be boolean');
  return value;
}

function stringField(value,label,{allowEmpty=false}={}){
  if(typeof value !== 'string') throw new Error(label + ' must be a string');
  if(!allowEmpty && !value.length) throw new Error(label + ' may not be empty');
  return value;
}

function enumField(value,prefix,allowed,label){
  if(value?.kind !== 'enum') throw new Error(label + ' must be a bounded Enum reference');
  const expected='Enum.' + prefix + '.';
  if(!value.value.startsWith(expected)) throw new Error(label + ' has unexpected enum namespace ' + value.value);
  const member=value.value.slice(expected.length);
  if(!allowed.has(member)) throw new Error(label + ' has unsupported enum member ' + member);
  return value.value;
}

function assetIdsFromStrings(values){
  const ids=new Set();
  for(const value of values){
    if(typeof value !== 'string') continue;
    for(const pattern of [
      /rbxassetid:\/\/(\d+)/gi,
      /(?:asset\/\?id=|asset\?id=|library\/)(\d+)/gi
    ]){
      let match;
      while((match=pattern.exec(value))) ids.add(match[1]);
    }
  }
  return [...ids].sort((a,b) => a.length-b.length || a.localeCompare(b));
}

function classForShape(shape){
  if(shape === 'Seat') return {className:'Seat',partType:null};
  if(shape === 'Vehicle Seat') return {className:'VehicleSeat',partType:null};
  if(shape === 'Wedge') return {className:'WedgePart',partType:null};
  if(shape === 'Corner') return {className:'CornerWedgePart',partType:null};
  return {className:'Part',partType:shape};
}

function parseSurface(value,label){
  const fields=fieldsMap(value,label,{
    required:['Top','Front','Bottom','Right','Left','Back']
  });
  const result={};
  for(const key of ['Top','Front','Bottom','Right','Left','Back']){
    const surface=stringField(fields.get(key),label + '.' + key);
    if(!SURFACES.has(surface)) throw new Error(label + '.' + key + ' has unsupported surface ' + surface);
    result[key]=surface;
  }
  return Object.freeze(result);
}

function parseDecal(value,label){
  const fields=fieldsMap(value,label,{required:['transparency','face','texture']});
  const texture=stringField(fields.get('texture'),label + '.texture');
  return Object.freeze({
    transparency:numberField(fields.get('transparency'),label + '.transparency',{min:0,max:1}),
    face:enumField(fields.get('face'),'NormalId',NORMAL_IDS,label + '.face'),
    texture,
    assetIds:Object.freeze(assetIdsFromStrings([texture]))
  });
}

function parseMesh(value,label){
  const fields=fieldsMap(value,label,{
    required:['offset','meshtype','vertexcolor','scale','texture'],
    optional:['meshid']
  });
  const meshType=enumField(fields.get('meshtype'),'MeshType',MESH_TYPES,label + '.meshtype');
  const meshId=fields.has('meshid')
    ? stringField(fields.get('meshid'),label + '.meshid')
    : null;
  if(meshType === 'Enum.MeshType.FileMesh' && !meshId){
    throw new Error(label + '.meshid is required for FileMesh');
  }
  if(meshType !== 'Enum.MeshType.FileMesh' && meshId !== null){
    throw new Error(label + '.meshid is only allowed for FileMesh');
  }
  const texture=stringField(fields.get('texture'),label + '.texture',{allowEmpty:true});
  return Object.freeze({
    offset:numericVector(fields.get('offset'),3,label + '.offset'),
    meshType,
    vertexColor:numericVector(fields.get('vertexcolor'),3,label + '.vertexcolor',{min:0,max:1}),
    scale:numericVector(fields.get('scale'),3,label + '.scale',{positive:true}),
    meshId,
    texture,
    assetIds:Object.freeze(assetIdsFromStrings([meshId,texture]))
  });
}

function sourceEntrySlices(source){
  const markers=[...source.matchAll(/(?:^|\n)(?:return \{)?\[(\d+)\]=\{/g)];
  const slices=[];
  for(let i=0;i<markers.length;i++){
    const match=markers[i];
    const markerText='[' + match[1] + ']={';
    const markerOffset=match[0].lastIndexOf(markerText);
    const start=match.index + markerOffset;
    const end=i+1 < markers.length
      ? markers[i+1].index + markers[i+1][0].lastIndexOf('[' + markers[i+1][1] + ']={')
      : source.lastIndexOf('\n}');
    if(end <= start) throw new Error('invalid source slice boundary for entry ' + match[1]);
    slices.push(Object.freeze({
      index:Number(match[1]),
      text:source.slice(start,end).trimEnd()
    }));
  }
  return slices;
}

function validateEntry(table,index,sourceSlice){
  const label='entry[' + index + ']';
  const fields=fieldsMap(table,label,{
    required:[
      'surface','reflectance','color','anchored','cancollide','transparency',
      'texture','position','locked','cframe','shape','size'
    ],
    optional:['decal','mesh']
  });

  const shape=stringField(fields.get('shape'),label + '.shape');
  if(!SHAPES.has(shape)) throw new Error(label + ' has unsupported shape ' + shape);
  const material=stringField(fields.get('texture'),label + '.texture');
  if(!MATERIALS.has(material)) throw new Error(label + ' has unsupported primary material ' + material);

  const decal=fields.has('decal') ? parseDecal(fields.get('decal'),label + '.decal') : null;
  const mesh=fields.has('mesh') ? parseMesh(fields.get('mesh'),label + '.mesh') : null;
  const classInfo=classForShape(shape);
  const assetIds=assetIdsFromStrings([
    ...(decal ? [decal.texture] : []),
    ...(mesh ? [mesh.meshId,mesh.texture] : [])
  ]);

  const base={
    index,
    className:classInfo.className,
    partType:classInfo.partType,
    shape,
    surface:parseSurface(fields.get('surface'),label + '.surface'),
    reflectance:numberField(fields.get('reflectance'),label + '.reflectance',{min:0,max:1}),
    color:numericVector(fields.get('color'),3,label + '.color',{min:0,max:255}),
    anchored:booleanField(fields.get('anchored'),label + '.anchored'),
    mesh,
    canCollide:booleanField(fields.get('cancollide'),label + '.cancollide'),
    transparency:numberField(fields.get('transparency'),label + '.transparency',{min:0,max:1}),
    material,
    position:numericVector(fields.get('position'),3,label + '.position'),
    locked:booleanField(fields.get('locked'),label + '.locked'),
    cframe:numericVector(fields.get('cframe'),12,label + '.cframe'),
    size:numericVector(fields.get('size'),3,label + '.size',{positive:true}),
    decal,
    assetIds:Object.freeze(assetIds),
    sourceSliceSha256:sha256(Buffer.from(sourceSlice,'utf8'))
  };
  return Object.freeze({
    ...base,
    canonicalHash:'sha256:' + sha256(Buffer.from(JSON.stringify(base),'utf8'))
  });
}

function sortedCounts(values){
  const map=new Map();
  for(const value of values) map.set(value,(map.get(value)||0)+1);
  return Object.fromEntries([...map.entries()].sort((a,b)=>b[1]-a[1] || a[0].localeCompare(b[0])));
}

export function deserializeBrookhavenWorldSource(source,{
  sourceSha256,
  step2FingerprintHash
}={}){
  if(typeof source !== 'string' || !source.length) throw new TypeError('serialized world source is required');
  if(!/^[a-f0-9]{64}$/.test(String(sourceSha256 || ''))) throw new Error('sourceSha256 is required');
  if(!/^sha256:[a-f0-9]{64}$/.test(String(step2FingerprintHash || ''))){
    throw new Error('step2FingerprintHash is required');
  }

  const parser=new RestrictedLuaDataParser(source);
  const root=parser.parseProgram();
  const slices=sourceEntrySlices(source);

  if(root.fields.length !== 4936) throw new Error('expected 4936 root entries but parsed ' + root.fields.length);
  if(slices.length !== 4936) throw new Error('expected 4936 source entry slices but found ' + slices.length);

  const entries=[];
  const rootKeys=new Set();
  for(let i=0;i<root.fields.length;i++){
    const field=root.fields[i];
    const expectedIndex=i+1;
    if(field.keyType !== 'number' || field.key !== expectedIndex){
      throw new Error('root entry sequence must be exactly 1..4936; found key ' + String(field.key) +
        ' at position ' + expectedIndex);
    }
    if(rootKeys.has(field.key)) throw new Error('duplicate root entry ' + field.key);
    rootKeys.add(field.key);
    if(slices[i].index !== field.key) throw new Error('source slice index mismatch for entry ' + field.key);
    entries.push(validateEntry(field.value,field.key,slices[i].text));
  }

  const uniqueAssets=[...new Set(entries.flatMap(entry => entry.assetIds))]
    .sort((a,b)=>a.length-b.length || a.localeCompare(b));

  const payload={
    schemaVersion:BROOKHAVEN_WORLD_IR_SCHEMA_VERSION,
    version:BROOKHAVEN_WORLD_IR_VERSION,
    status:'validated-safe-deserialization',
    source:Object.freeze({
      bytes:Buffer.byteLength(source,'utf8'),
      sha256:sourceSha256,
      step2FingerprintHash
    }),
    parser:Object.freeze({
      mode:'restricted-data-only',
      luaExecution:false,
      evalUsed:false,
      arbitraryIdentifiersAllowed:false,
      allowedSymbolicNamespaces:Object.freeze(['Enum.NormalId','Enum.MeshType'])
    }),
    entryCount:entries.length,
    entries:Object.freeze(entries)
  };

  const irHash='sha256:' + sha256(Buffer.from(JSON.stringify(payload),'utf8'));
  const entryCanonicalSequenceSha256=sha256(Buffer.from(
    entries.map(entry => entry.canonicalHash).join('\n'),'utf8'
  ));
  const sourceSliceSequenceSha256=sha256(Buffer.from(
    entries.map(entry => entry.sourceSliceSha256).join('\n'),'utf8'
  ));

  const receipt=Object.freeze({
    schemaVersion:1,
    version:'starblox-brookhaven-world-deserialization-receipt-v1',
    status:'verified-safe-deserialization',
    source:Object.freeze({
      bytes:payload.source.bytes,
      sha256:sourceSha256,
      step2FingerprintHash
    }),
    ir:Object.freeze({
      version:BROOKHAVEN_WORLD_IR_VERSION,
      entryCount:entries.length,
      irHash,
      entryCanonicalSequenceSha256,
      sourceSliceSequenceSha256
    }),
    structure:Object.freeze({
      classCounts:Object.freeze(sortedCounts(entries.map(entry => entry.className))),
      shapeCounts:Object.freeze(sortedCounts(entries.map(entry => entry.shape))),
      primaryMaterialCounts:Object.freeze(sortedCounts(entries.map(entry => entry.material))),
      decalCount:entries.filter(entry => entry.decal !== null).length,
      meshCount:entries.filter(entry => entry.mesh !== null).length,
      fileMeshCount:entries.filter(entry => entry.mesh?.meshType === 'Enum.MeshType.FileMesh').length,
      uniqueAssetIdCount:uniqueAssets.length,
      sortedAssetIdsSha256:sha256(Buffer.from(uniqueAssets.join(','),'utf8'))
    }),
    validation:Object.freeze({
      rootEntriesContiguous:true,
      allEntriesTyped:true,
      allRequiredFieldsPresent:true,
      noUnknownEntryFields:true,
      noUnknownNestedFields:true,
      enumNamespacesBounded:true,
      sourceExecuted:false,
      sourceEvaluatedAsLua:false
    }),
    boundaries:Object.freeze({
      sourceInsertedIntoStudio:false,
      robloxObjectsGenerated:false,
      robloxPlaceMutated:false,
      publicationStarted:false,
      liveActivationAllowed:false
    }),
    nextStep:'target-architecture-4-isolated-world-generation'
  });

  return Object.freeze({
    ir:Object.freeze({...payload,irHash}),
    receipt
  });
}

export function parseRestrictedSerializedWorldForTest(source){
  return new RestrictedLuaDataParser(source).parseProgram();
}
