import {mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';

import {runOpenCloudLuauTask} from '../src/robloxRuntime/privatePublish.js';

const EXPECTED_UNIVERSE_ID='6027194615';
const EXPECTED_PLACE_ID='17602626136';

const universeId=String(process.env.ROBLOX_UNIVERSE_ID||'');
const placeId=String(process.env.ROBLOX_PLACE_ID||'');
const out=resolve(process.env.STARBLOX_BOOT_DIAGNOSTIC_OUT||'artifacts/legacy-boot-diagnostic.json');

if(universeId!==EXPECTED_UNIVERSE_ID){
  throw new Error('ROBLOX_UNIVERSE_ID must target StarBlox universe '+EXPECTED_UNIVERSE_ID);
}
if(placeId!==EXPECTED_PLACE_ID){
  throw new Error('ROBLOX_PLACE_ID must target StarBlox place '+EXPECTED_PLACE_ID);
}

const diagnosticScript=`local Workspace = game:GetService("Workspace")
local ServerStorage = game:GetService("ServerStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local function emit(label, value)
    print("STARBLOX_LEGACY_BOOT_DIAG " .. label .. "=" .. tostring(value))
end

emit("placeVersion", game.PlaceVersion)

local baseline = ServerStorage:FindFirstChild("BrookhavenWorldBaseline")
emit("baselinePresent", baseline ~= nil)
emit("baselineClass", baseline and baseline.ClassName or "nil")
emit("baselineDescendants", baseline and #baseline:GetDescendants() or -1)

local runtime = Workspace:FindFirstChild("BrookhavenWorldRuntime")
emit("runtimePresentBefore", runtime ~= nil)

local serverRoot = ServerScriptService:FindFirstChild("StarBlox")
emit("serverRootPresent", serverRoot ~= nil)
local runtimeScript = serverRoot and serverRoot:FindFirstChild("Runtime")
emit("runtimeScriptPresent", runtimeScript ~= nil)
emit("runtimeScriptClass", runtimeScript and runtimeScript.ClassName or "nil")
if runtimeScript and runtimeScript:IsA("BaseScript") then
    emit("runtimeScriptEnabled", runtimeScript.Enabled)
end

local sharedRoot = ReplicatedStorage:FindFirstChild("StarBlox")
emit("sharedRootPresent", sharedRoot ~= nil)

local moduleNames = {
    "BrookhavenMirrorConfig",
    "LegacyWorldActivityBindings",
    "LegacyWorldInteractionBindings",
    "LegacyWorldPlotBindings",
    "LegacyMirrorCatalog",
    "LegacyStoreCatalog",
}
if sharedRoot then
    for _, moduleName in moduleNames do
        local module = sharedRoot:FindFirstChild(moduleName)
        emit(moduleName .. "Present", module ~= nil)
        if module and module:IsA("ModuleScript") then
            local ok, value = pcall(require, module)
            emit(moduleName .. "RequireOk", ok)
            if not ok then
                emit(moduleName .. "RequireError", value)
            elseif moduleName == "BrookhavenMirrorConfig" then
                emit("worldMode", value.World and value.World.Mode or "nil")
            end
        end
    end
end

local serverPackages = ServerScriptService:FindFirstChild("ServerPackages")
local profileStoreModule = serverPackages and serverPackages:FindFirstChild("ProfileStore")
local matterFolder = ReplicatedStorage:FindFirstChild("Packages")
local matterModule = matterFolder and matterFolder:FindFirstChild("Matter")
local replicaServerModule = ServerScriptService:FindFirstChild("ReplicaServer")
emit("profileStorePresent", profileStoreModule ~= nil)
emit("matterPresent", matterModule ~= nil)
emit("replicaServerPresent", replicaServerModule ~= nil)

task.wait(2)
runtime = Workspace:FindFirstChild("BrookhavenWorldRuntime")
emit("runtimePresentAfter2s", runtime ~= nil)

if runtime == nil and serverRoot then
    local bootstrapModule = serverRoot:FindFirstChild("Bootstrap")
    emit("bootstrapPresent", bootstrapModule ~= nil)
    if bootstrapModule and bootstrapModule:IsA("ModuleScript")
        and profileStoreModule and matterModule and replicaServerModule
    then
        local okBootstrapRequire, bootstrapOrError = pcall(require, bootstrapModule)
        emit("bootstrapRequireOk", okBootstrapRequire)
        if not okBootstrapRequire then
            emit("bootstrapRequireError", bootstrapOrError)
        else
            local okStart, startResult = xpcall(function()
                return bootstrapOrError.start({
                    ProfileStore = require(profileStoreModule),
                    Replica = require(replicaServerModule),
                    Matter = require(matterModule),
                })
            end, function(err)
                return debug.traceback(tostring(err), 2)
            end)
            emit("manualBootstrapStartOk", okStart)
            if not okStart then
                emit("manualBootstrapStartError", startResult)
            else
                emit("manualBootstrapReturned", type(startResult))
            end
        end
    end
end

task.wait(1)
runtime = Workspace:FindFirstChild("BrookhavenWorldRuntime")
emit("runtimePresentFinal", runtime ~= nil)
if runtime then
    emit("runtimeProjectionMarker", runtime:GetAttribute("StarBloxRuntimeProjection"))
    emit("runtimeDescendants", #runtime:GetDescendants())
end

print("STARBLOX_LEGACY_BOOT_DIAG_DONE version=" .. tostring(game.PlaceVersion))
return tostring(game.PlaceVersion)
`;

const task=await runOpenCloudLuauTask({
  apiKey:process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  universeId,
  placeId,
  script:diagnosticScript,
  timeoutMs:90_000,
  createRetryAttempts:12,
  createRetryBaseMs:2000,
  createRetryMaxMs:60_000
});

const receipt={
  schemaVersion:1,
  status:'legacy-boot-diagnostic-complete',
  target:{universeId,placeId},
  versionNumber:task.versionNumber,
  taskPath:task.path,
  terminalState:task.state,
  logs:task.logs
};
await mkdir(dirname(out),{recursive:true});
await writeFile(out,JSON.stringify(receipt,null,2)+'\n');
process.stdout.write(JSON.stringify(receipt,null,2)+'\n');
