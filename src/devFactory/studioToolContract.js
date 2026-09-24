
export const DEV_FACTORY_VERSION='starblox-ai-dev-factory-v1';

export const STUDIO_TOOL_SPECS=Object.freeze({
  search_tree:{effect:'read',stage:['inspect','review','repair']},
  inspect_instance:{effect:'read',stage:['inspect','review','repair']},
  list_children:{effect:'read',stage:['inspect','review','repair']},
  script_grep:{effect:'read',stage:['inspect','review','repair']},
  read_script:{effect:'read',stage:['inspect','code','review','repair']},
  read_all_scripts:{effect:'read',stage:['inspect','review']},
  get_selection:{effect:'read',stage:['inspect']},
  set_selection:{effect:'cosmetic',stage:['code','review']},
  write_script:{effect:'write',stage:['code','repair']},
  edit_script:{effect:'write',stage:['code','repair']},
  create_instance:{effect:'write',stage:['code','repair']},
  set_property:{effect:'write',stage:['code','repair']},
  delete_instance:{effect:'destructive',stage:['code','repair']},
  run_luau:{effect:'execute',stage:['inspect','code','review','repair','test']},
  run_tests:{effect:'test',stage:['test','repair']},
  get_logs:{effect:'runtime-read',stage:['test','review','repair']},
  get_run_state:{effect:'runtime-read',stage:['test','review','repair']},
  simulate_input:{effect:'runtime-write',stage:['test','repair']},
  capture_viewport:{effect:'capture',stage:['test','review']},
  start_playtest:{effect:'runtime-write',stage:['test','repair']},
  stop_playtest:{effect:'runtime-write',stage:['test','repair']},
  playtest_sample_state:{effect:'runtime-read',stage:['test','review','repair']},
  run_gameplay_assertions:{effect:'test',stage:['test','repair']},
  run_playtest_episode:{effect:'runtime-write',stage:['test','repair']},
  summarize_episode:{effect:'runtime-read',stage:['review','repair']}
});

const PROTECTED_PATHS=Object.freeze([
  'Workspace',
  'ServerScriptService',
  'ServerStorage',
  'ReplicatedStorage',
  'ReplicatedFirst',
  'StarterGui',
  'StarterPack',
  'StarterPlayer',
  'Lighting',
  'SoundService',
  'Players',
  'Teams'
]);

const SAFE_TEST_ROOTS=Object.freeze([
  'ServerScriptService/Tests',
  'ReplicatedStorage/Tests',
  'ServerStorage/Tests'
]);

const BLOCKED_GENERIC_PROPERTIES=new Set([
  'Source',
  'Parent',
  'Name',
  'ClassName',
  'ScriptGuid',
  'UniqueId',
  'HistoryId'
]);

const SCRIPT_CLASS_NAMES=new Set(['Script','LocalScript','ModuleScript']);

const DANGEROUS_LUAU=[
  /ClearAllChildren\s*\(/,
  /:Destroy\s*\(/,
  /:Remove\s*\(/,
  /:SetAsync\s*\(/,
  /:RemoveAsync\s*\(/,
  /\bloadstring\s*\(/,
  /\bgetfenv\b/,
  /\bsetfenv\b/,
  /\bdebug\./
];

function dangerousLuauMatches(source){
  const executable=stripLuauStringsAndComments(String(source || ''));
  return DANGEROUS_LUAU.filter(pattern => pattern.test(executable));
}

function cleanPath(value){
  return typeof value === 'string' ? value.trim().replace(/^game[./]/,'') : '';
}

function isProtectedPath(path){
  const clean=cleanPath(path);
  return PROTECTED_PATHS.some(root => clean === root);
}

export function stripLuauStringsAndComments(source){
  const input=String(source || '');
  let out='';
  let i=0;

  function longLevel(at){
    if(input[at] !== '[') return -1;
    let level=0;
    let j=at + 1;
    while(input[j] === '='){
      level++;
      j++;
    }
    return input[j] === '[' ? level : -1;
  }

  function skipLong(at,level){
    const close=']' + '='.repeat(level) + ']';
    const end=input.indexOf(close,at);
    return end < 0 ? -1 : end + close.length;
  }

  while(i<input.length){
    const ch=input[i];

    if(ch === '-' && input[i + 1] === '-'){
      const level=longLevel(i + 2);
      if(level >= 0){
        const end=skipLong(i + 2,level);
        if(end < 0) return input;
        i=end;
      }else{
        while(i<input.length && input[i] !== '\n') i++;
      }
      out+=' ';
      continue;
    }

    if(ch === '"' || ch === "'"){
      const quote=ch;
      i++;
      while(i<input.length && input[i] !== quote){
        if(input[i] === '\\') i+=2;
        else if(input[i] === '\n') return input;
        else i++;
      }
      if(i>=input.length) return input;
      i++;
      out+=' ';
      continue;
    }

    const level=longLevel(i);
    if(level >= 0){
      const end=skipLong(i,level);
      if(end < 0) return input;
      i=end;
      out+=' ';
      continue;
    }

    out+=ch;
    i++;
  }

  return out;
}

export function assessStudioToolCall(call,{
  stage,
  allowDestructive=false,
  allowExecuteLuau=false,
  confirmed=false,
  maxScriptSize=200_000,
  maxInputActions=200
}={}){
  const errors=[];
  const warnings=[];

  if(!call || typeof call !== 'object' || Array.isArray(call)){
    return {ok:false,errors:['tool call must be an object'],warnings:[],requiresConfirmation:false};
  }

  const tool=call.tool;
  const args=call.args && typeof call.args === 'object' && !Array.isArray(call.args)
    ? call.args
    : {};
  const spec=STUDIO_TOOL_SPECS[tool];

  if(!spec){
    errors.push('unknown Studio tool: ' + String(tool));
    return {ok:false,errors,warnings,requiresConfirmation:false};
  }

  if(stage && !spec.stage.includes(stage)){
    errors.push('tool ' + tool + ' is not allowed during stage ' + stage);
  }

  let requiresConfirmation=false;

  if(tool === 'write_script' && typeof args.source === 'string'){
    if(args.source.length > maxScriptSize){
      errors.push('script source exceeds ' + maxScriptSize + ' characters');
    }
    if(dangerousLuauMatches(args.source).length){
      requiresConfirmation=true;
      warnings.push('generated script source matches potentially destructive/high-risk Luau patterns');
    }
  }
  if(tool === 'edit_script' && typeof args.new === 'string'){
    if(args.new.length > maxScriptSize){
      errors.push('replacement source exceeds ' + maxScriptSize + ' characters');
    }
    if(dangerousLuauMatches(args.new).length){
      requiresConfirmation=true;
      warnings.push('script replacement matches potentially destructive/high-risk Luau patterns');
    }
  }

  if(tool === 'delete_instance'){
    if(!allowDestructive){
      errors.push('delete_instance is disabled for automated development runs');
    }else{
      requiresConfirmation=true;
      if(isProtectedPath(args.path)){
        warnings.push('delete targets a protected Roblox service/root');
      }
    }
  }

  if(tool === 'run_luau'){
    if(!allowExecuteLuau){
      errors.push('run_luau is disabled for automated development runs');
    }else{
      const matches=dangerousLuauMatches(args.code);
      if(matches.length){
        requiresConfirmation=true;
        warnings.push('Luau matches potentially destructive patterns');
      }
    }
  }

  if(tool === 'simulate_input'){
    const actions=Array.isArray(args.actions) ? args.actions : [];
    if(actions.length > maxInputActions){
      errors.push('simulate_input exceeds ' + maxInputActions + ' actions');
    }
  }

  if(tool === 'create_instance'){
    if(typeof args.parent !== 'string' || !args.parent.trim()){
      errors.push('create_instance parent is required');
    }
    if(typeof args.className !== 'string' || !args.className.trim()){
      errors.push('create_instance className is required');
    }else if(SCRIPT_CLASS_NAMES.has(args.className.trim())){
      errors.push('script instances must be created through write_script with create=true');
    }
    if(args.properties && typeof args.properties === 'object' && !Array.isArray(args.properties)){
      for(const property of Object.keys(args.properties)){
        if(BLOCKED_GENERIC_PROPERTIES.has(property)){
          errors.push('create_instance may not set protected property ' + property);
        }
      }
    }
  }

  if(tool === 'set_property'){
    if(typeof args.path !== 'string' || !args.path.trim()){
      errors.push('set_property path is required');
    }
    if(typeof args.property !== 'string' || !args.property.trim()){
      errors.push('set_property property is required');
    }else if(BLOCKED_GENERIC_PROPERTIES.has(args.property.trim())){
      errors.push('set_property may not mutate protected property ' + args.property.trim());
    }
  }

  if(tool === 'run_tests' && typeof args.path === 'string' && args.path.trim()){
    const clean=cleanPath(args.path);
    const allowed=SAFE_TEST_ROOTS.some(root => clean === root || clean.startsWith(root + '/'));
    if(!allowed){
      errors.push(
        'run_tests path must be inside an approved test root: ' + SAFE_TEST_ROOTS.join(', ')
      );
    }
  }

  if((tool === 'write_script' || tool === 'edit_script' || tool === 'read_script' || tool === 'inspect_instance') &&
     (typeof args.path !== 'string' || !args.path.trim())){
    errors.push(tool + ' path is required');
  }

  if(requiresConfirmation && !confirmed){
    errors.push('tool call requires explicit confirmation');
  }

  return {
    ok:errors.length === 0,
    errors,
    warnings,
    requiresConfirmation,
    effect:spec.effect
  };
}

export function studioToolEffect(tool){
  return STUDIO_TOOL_SPECS[tool]?.effect ?? null;
}

export function studioToolNames(){
  return Object.keys(STUDIO_TOOL_SPECS);
}
