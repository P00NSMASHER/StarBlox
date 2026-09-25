import {
  createStarBloxLocalStudioAdapter
} from '../../src/devFactory/localStudioConnector.js';

const UNIT_ID=
  'slash-mayhem-shadow-cc6aed05-slash-meyhem-shadow-edition-rbxl-startergui-0982d021';
const SOURCE_ROOT='ServerStorage/StarBloxMigration/Quarantine/StarterGuiSource';
const ADAPTATION_ROOT=SOURCE_ROOT + '/StarBloxAdaptation';
const TEST_ROOT='ServerScriptService/Tests';
const TEST_PATH=TEST_ROOT + '/Milestone4MigrationSpec';

const baseUrl=
  process.env.STARBLOX_STUDIO_BRIDGE_URL ||
  'http://127.0.0.1:38473';
const instanceId=
  process.env.STARBLOX_STUDIO_INSTANCE_ID ||
  'default';
const token=
  process.env.STARBLOX_STUDIO_BRIDGE_TOKEN ||
  '';

const studio=createStarBloxLocalStudioAdapter({
  baseUrl,
  instanceId,
  token
});

function findInspection(inspection,tool,path){
  return (inspection || []).find(row =>
    row?.call?.tool === tool &&
    row?.call?.args?.path === path
  );
}

function migrationSpecSource(){
  return `local ServerStorage = game:GetService("ServerStorage")

local UNIT_ID = "${UNIT_ID}"
local errors = {}
local passed = 0

local migration = ServerStorage:FindFirstChild("StarBloxMigration")
local quarantine = migration and migration:FindFirstChild("Quarantine")
local source = quarantine and quarantine:FindFirstChild("StarterGuiSource")

if source and source:IsA("Folder") then
    passed += 1
else
    table.insert(errors, "quarantined StarterGuiSource folder is missing")
end

local scriptCount = 0
if source then
    for _, inst in source:GetDescendants() do
        if inst:IsA("LuaSourceContainer") then
            scriptCount += 1
        end
    end
end

if scriptCount >= 1 then
    passed += 1
else
    table.insert(errors, "quarantined source contains no script evidence")
end

if source and source:IsDescendantOf(ServerStorage) then
    passed += 1
else
    table.insert(errors, "quarantined source escaped ServerStorage")
end

local adaptation = source and source:FindFirstChild("StarBloxAdaptation")
local unit = adaptation and adaptation:FindFirstChild("UnitId")
local state = adaptation and adaptation:FindFirstChild("State")

if unit and unit:IsA("StringValue") and unit.Value == UNIT_ID then
    passed += 1
else
    table.insert(errors, "migration UnitId provenance marker is missing or incorrect")
end

if state and state:IsA("StringValue") and state.Value == "quarantine-validated" then
    passed += 1
else
    table.insert(errors, "quarantine adaptation state marker is missing or incorrect")
end

return {
    passed = passed,
    failed = #errors,
    errors = errors,
}
`;
}

const agents={
  async plan(){
    return {
      summary:
        'Verify the exact imported StarterGui migration unit remains inert in ServerStorage, ' +
        'add provenance/state markers, run a dedicated Studio test, then require a clean ' +
        'single-player playtest, error-log check, and viewport capture.',
      inspectionCalls:[
        {tool:'inspect_instance',args:{path:SOURCE_ROOT}},
        {tool:'inspect_instance',args:{path:ADAPTATION_ROOT}},
        {tool:'inspect_instance',args:{path:TEST_ROOT}},
        {tool:'read_all_scripts',args:{root:SOURCE_ROOT,maxBytes:80_000}}
      ],
      tests:{
        required:true,
        path:TEST_ROOT
      },
      playtest:{
        required:true,
        episodeArgs:{mode:'play'},
        inputActions:[
          {type:'wait',seconds:1}
        ],
        telemetryDomains:['runtime','players','world']
      },
      visual:{
        required:true
      },
      acceptance:[
        'quarantined StarterGuiSource exists under ServerStorage',
        'quarantined source retains at least one script as static evidence',
        'migration provenance markers match the exact approved unit',
        'Studio tests pass with zero failures',
        'single-player Studio playtest starts and stops cleanly',
        'runtime error log check is clean',
        'viewport evidence is captured',
        'repository tests, certification, balance, and build pass'
      ]
    };
  },

  async code({inspection}){
    const source=findInspection(inspection,'inspect_instance',SOURCE_ROOT);
    if(!source?.ok){
      throw new Error('Milestone 4 staging source is missing from Studio');
    }

    const scripts=(inspection || []).find(row =>
      row?.call?.tool === 'read_all_scripts' &&
      row?.call?.args?.root === SOURCE_ROOT
    );
    if(!scripts?.ok || Number(scripts?.result?.total || 0) < 1){
      throw new Error('Milestone 4 staging source has no imported script evidence');
    }

    const adaptation=findInspection(inspection,'inspect_instance',ADAPTATION_ROOT);
    const tests=findInspection(inspection,'inspect_instance',TEST_ROOT);
    const actions=[];

    if(!adaptation?.ok){
      actions.push({
        tool:'create_instance',
        args:{
          parent:SOURCE_ROOT,
          className:'Configuration',
          name:'StarBloxAdaptation'
        }
      });
      actions.push({
        tool:'create_instance',
        args:{
          parent:ADAPTATION_ROOT,
          className:'StringValue',
          name:'UnitId',
          properties:{Value:UNIT_ID}
        }
      });
      actions.push({
        tool:'create_instance',
        args:{
          parent:ADAPTATION_ROOT,
          className:'StringValue',
          name:'State',
          properties:{Value:'quarantine-validated'}
        }
      });
    }

    if(!tests?.ok){
      actions.push({
        tool:'create_instance',
        args:{
          parent:'ServerScriptService',
          className:'Folder',
          name:'Tests'
        }
      });
    }

    actions.push({
      tool:'write_script',
      args:{
        path:TEST_PATH,
        className:'ModuleScript',
        create:true,
        source:migrationSpecSource()
      }
    });

    return {
      summary:
        'Record exact migration provenance inside the inert quarantine container and install ' +
        'a deterministic isolation/provenance Studio test. Imported Luau is not executed.',
      actions
    };
  },

  async review({verification}){
    return {
      verdict:verification?.ok === true ? 'pass' : 'fail',
      findings:Array.isArray(verification?.errors)
        ? verification.errors
        : [],
      summary:verification?.ok === true
        ? 'Milestone 4 quarantine adaptation proof passed.'
        : 'Milestone 4 quarantine adaptation proof failed.'
    };
  },

  async visualReview({capture}){
    const width=Number(capture?.width || 0);
    const height=Number(capture?.height || 0);
    const pixels=String(capture?.dataB64 || '');
    const ok=width > 0 && height > 0 && pixels.length > 16;
    return {
      ok,
      findings:ok ? [] : ['viewport capture is missing bounded pixel evidence'],
      summary:ok
        ? 'Live Studio viewport produced non-empty bounded RGBA evidence.'
        : 'Viewport evidence was incomplete.'
    };
  }
};

export default {
  studio,
  agents,
  config:{
    maxRepairCycles:0,
    allowDestructive:false,
    allowExecuteLuau:false,
    allowUnrollbackable:false,
    maxTotalMutationCalls:12,
    maxToolCallsPerBatch:12
  }
};
