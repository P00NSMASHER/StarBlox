// rerun against staging v32
import {runOpenCloudLuauTask} from '../src/robloxRuntime/privatePublish.js';

const apiKey=String(process.env.ROBLOX_OPEN_CLOUD_API_KEY||'');
const universeId=String(process.env.ROBLOX_UNIVERSE_ID||'6027194615');
const placeId=String(process.env.ROBLOX_PLACE_ID||'17602626136');

const luau=String.raw`
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local packages = ReplicatedStorage:FindFirstChild("Packages")
local serverPackages = ServerScriptService:FindFirstChild("ServerPackages")
assert(packages ~= nil and serverPackages ~= nil, "runtime packages missing")
local matterModule = packages:FindFirstChild("Matter")
local profileStoreModule = serverPackages:FindFirstChild("ProfileStore")
local replicaServerModule = ServerScriptService:FindFirstChild("ReplicaServer")
assert(matterModule and profileStoreModule and replicaServerModule, "required runtime package missing")

local okMatter, Matter = pcall(require, matterModule)
local okProfile, ProfileStore = pcall(require, profileStoreModule)
local okReplica, Replica = pcall(require, replicaServerModule)
assert(okMatter and okProfile and okReplica, "failed to require runtime package")

local serverRoot = ServerScriptService:WaitForChild("StarBlox")
local Bootstrap = require(serverRoot:WaitForChild("Bootstrap"))
local okBootstrap, services = pcall(function()
    return Bootstrap.start({ProfileStore = ProfileStore, Replica = Replica, Matter = Matter})
end)
assert(okBootstrap and type(services) == "table", "Bootstrap.start failed")

local runtimeWorld = Workspace:WaitForChild("BrookhavenWorldRuntime")
local spawn = runtimeWorld:FindFirstChild("LBH_14370", true)
assert(spawn and spawn:IsA("BasePart"), "LBH_14370 spawn geometry missing")

local spawnTop = spawn.Position.Y + spawn.Size.Y / 2
print(string.format("DIAG_ATTR ground=%s hidden=%s neon=%s lights=%s",
    tostring(runtimeWorld:GetAttribute("TownCenterGroundTilesRecolored")),
    tostring(runtimeWorld:GetAttribute("TownCenterHolidayMeshesHidden")),
    tostring(runtimeWorld:GetAttribute("TownCenterNeonPartsSoftened")),
    tostring(runtimeWorld:GetAttribute("TownCenterLightsSoftened"))))
for index = 10677, 10683 do
    local exact = runtimeWorld:FindFirstChild(string.format("LBH_%05d", index), true)
    if exact and exact:IsA("BasePart") then
        print(string.format("DIAG_HOLIDAY name=%s trans=%.2f collide=%s query=%s touch=%s",
            exact.Name, exact.Transparency, tostring(exact.CanCollide), tostring(exact.CanQuery), tostring(exact.CanTouch)))
    else
        print("DIAG_HOLIDAY missing=" .. string.format("LBH_%05d", index))
    end
end
print(string.format("DIAG_SPAWN name=%s class=%s pos=%.3f,%.3f,%.3f size=%.3f,%.3f,%.3f top=%.3f",
    spawn.Name, spawn.ClassName, spawn.Position.X, spawn.Position.Y, spawn.Position.Z,
    spawn.Size.X, spawn.Size.Y, spawn.Size.Z, spawnTop))

local rows = {}
for _, instance in runtimeWorld:GetDescendants() do
    if instance:IsA("BasePart") then
        local delta = instance.Position - spawn.Position
        local horizontal = Vector3.new(delta.X, 0, delta.Z).Magnitude
        if horizontal <= 260 then
            local top = instance.Position.Y + instance.Size.Y / 2
            local topDelta = top - spawnTop
            local h, s, v = instance.Color:ToHSV()
            local area = instance.Size.X * instance.Size.Z
            if math.abs(topDelta) <= 7 or (s >= 0.30 and horizontal <= 260) then
                table.insert(rows, {
                    instance = instance,
                    horizontal = horizontal,
                    topDelta = topDelta,
                    saturation = s,
                    value = v,
                    hue = h,
                    area = area,
                })
            end
        end
    end
end

table.sort(rows, function(a,b)
    local ag = math.abs(a.topDelta) <= 3 and a.area >= 12
    local bg = math.abs(b.topDelta) <= 3 and b.area >= 12
    if ag ~= bg then return ag end
    if a.saturation ~= b.saturation then return a.saturation > b.saturation end
    return a.horizontal < b.horizontal
end)

print("DIAG_COUNT " .. tostring(#rows))
for index, row in ipairs(rows) do
    if index > 500 then break end
    local p = row.instance
    local c = p.Color
    print(string.format(
        "DIAG_PART i=%d name=%s class=%s dist=%.2f topDelta=%.2f area=%.2f size=%.2f,%.2f,%.2f pos=%.2f,%.2f,%.2f rgb=%d,%d,%d hsv=%.3f,%.3f,%.3f material=%s trans=%.2f refl=%.2f collide=%s",
        index, p.Name, p.ClassName, row.horizontal, row.topDelta, row.area,
        p.Size.X,p.Size.Y,p.Size.Z,p.Position.X,p.Position.Y,p.Position.Z,
        math.floor(c.R*255+0.5),math.floor(c.G*255+0.5),math.floor(c.B*255+0.5),
        row.hue,row.saturation,row.value,tostring(p.Material),p.Transparency,p.Reflectance,tostring(p.CanCollide)
    ))
end

for _, effect in game:GetService("Lighting"):GetChildren() do
    if effect:IsA("BloomEffect") then
        print(string.format("DIAG_BLOOM intensity=%.3f size=%.3f threshold=%.3f enabled=%s",
            effect.Intensity,effect.Size,effect.Threshold,tostring(effect.Enabled)))
    elseif effect:IsA("ColorCorrectionEffect") then
        print(string.format("DIAG_COLOR brightness=%.3f contrast=%.3f saturation=%.3f enabled=%s",
            effect.Brightness,effect.Contrast,effect.Saturation,tostring(effect.Enabled)))
    end
end

pcall(function() services.Family:Destroy() end)
pcall(function() services.Roleplay:Destroy() end)
pcall(function() services.MirrorLifestyle:Destroy() end)
pcall(function() services.HomeEconomy:Destroy() end)
pcall(function() services.CoreLoop:Destroy() end)
pcall(function() services.PrivatePlaytestTelemetry:Destroy() end)
pcall(function() services.WorldInteractions:Destroy() end)
pcall(function() services.WorldProjection:Destroy() end)
pcall(function() services.Action:Stop() end)
pcall(function() services.Replicas:Shutdown() end)
pcall(function() services.Profiles:ReleaseAll() end)

print("DIAG_DONE version=" .. tostring(game.PlaceVersion))
return tostring(game.PlaceVersion)
`;

const task=await runOpenCloudLuauTask({
  apiKey, universeId, placeId, script:luau,
  createRetryAttempts:12, createRetryBaseMs:2000, createRetryMaxMs:60000,
  timeoutMs:120000
});
console.log(JSON.stringify(task.logs,null,2));
