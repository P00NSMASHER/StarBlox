import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runOpenCloudLuauTask} from '../src/robloxRuntime/privatePublish.js';

const universeId=String(process.env.ROBLOX_UNIVERSE_ID||'');
const placeId=String(process.env.ROBLOX_PLACE_ID||'');
if(universeId!=='6027194615') throw new Error('unexpected StarBlox universe');
if(placeId!=='17602626136') throw new Error('unexpected StarBlox place');

const probe=`local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local function report(label, value)
    print("STARBLOX_RUNTIME_DIAG " .. label .. "=" .. tostring(value))
end

report("version", game.PlaceVersion)

local baseline = ServerStorage:FindFirstChild("BrookhavenWorldBaseline")
report("baseline", baseline and baseline.ClassName or "missing")
report("baselineDescendants", baseline and #baseline:GetDescendants() or -1)

local runtimeWorld = Workspace:FindFirstChild("BrookhavenWorldRuntime")
report("runtimeWorld", runtimeWorld and runtimeWorld.ClassName or "missing")

local root = ServerScriptService:FindFirstChild("StarBlox")
report("serverRoot", root and root.ClassName or "missing")
local runtimeScript = root and root:FindFirstChild("Runtime")
report("runtimeScript", runtimeScript and runtimeScript.ClassName or "missing")
if runtimeScript then
    local okEnabled, enabled = pcall(function() return runtimeScript.Enabled end)
    report("runtimeEnabledReadable", okEnabled)
    report("runtimeEnabled", okEnabled and enabled or "unknown")
    local okDisabled, disabled = pcall(function() return runtimeScript.Disabled end)
    report("runtimeDisabledReadable", okDisabled)
    report("runtimeDisabled", okDisabled and disabled or "unknown")
end

local serverPackages = ServerScriptService:FindFirstChild("ServerPackages")
local profileStore = serverPackages and serverPackages:FindFirstChild("ProfileStore")
local replicaServer = ServerScriptService:FindFirstChild("ReplicaServer")
local packages = ReplicatedStorage:FindFirstChild("Packages")
local matter = packages and packages:FindFirstChild("Matter")
report("serverPackages", serverPackages and serverPackages.ClassName or "missing")
report("profileStore", profileStore and profileStore.ClassName or "missing")
report("replicaServer", replicaServer and replicaServer.ClassName or "missing")
report("packages", packages and packages.ClassName or "missing")
report("matter", matter and matter.ClassName or "missing")

if root then
    local moduleNames = {
        "Bootstrap",
        "WorldProjectionService",
        "WorldInteractionService",
        "CoreGameLoopService",
        "HomeEconomyService",
        "MirrorLifestyleService"
    }
    for _, moduleName in moduleNames do
        local module = root:FindFirstChild(moduleName)
        if not module then
            report("require_" .. moduleName, "missing")
        elseif not module:IsA("ModuleScript") then
            report("require_" .. moduleName, "not-module-" .. module.ClassName)
        else
            local ok, result = pcall(require, module)
            report("require_" .. moduleName, ok and "ok" or ("ERROR:" .. tostring(result)))
        end
    end

    local projectionModule = root:FindFirstChild("WorldProjectionService")
    if projectionModule and projectionModule:IsA("ModuleScript") and Workspace:FindFirstChild("BrookhavenWorldRuntime") == nil then
        local okRequire, projectionService = pcall(require, projectionModule)
        if okRequire and type(projectionService) == "table" then
            local okCreate, created = pcall(function()
                return projectionService.new()
            end)
            report("manualProjectionCreate", okCreate and "ok" or ("ERROR:" .. tostring(created)))
            local after = Workspace:FindFirstChild("BrookhavenWorldRuntime")
            report("runtimeAfterManualProjection", after and after.ClassName or "missing")
            if okCreate and type(created) == "table" and created.Destroy then
                pcall(function() created:Destroy() end)
            end
        else
            report("manualProjectionCreate", "require-failed")
        end
    end
end

return "diagnostic-complete"
`;

const task=await runOpenCloudLuauTask({
  apiKey:process.env.ROBLOX_OPEN_CLOUD_API_KEY,
  universeId,
  placeId,
  script:probe,
  timeoutMs:90_000,
  createRetryAttempts:12,
  createRetryBaseMs:2000,
  createRetryMaxMs:60_000
});

const out=process.env.STARBLOX_RUNTIME_DIAGNOSTIC_OUT
  ? resolve(process.env.STARBLOX_RUNTIME_DIAGNOSTIC_OUT)
  : null;
if(out) await writeFile(out,JSON.stringify(task,null,2)+'\n');
process.stdout.write(JSON.stringify(task,null,2)+'\n');
