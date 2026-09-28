local fs = require('@lune/fs')
local luau = require('@lune/luau')
local process = require('@lune/process')
local paths = process.args
if #paths == 0 then
    paths = {
        'compatibility/server/BrookhavenNativeRuntimeCore.luau',
        'compatibility/server/BrookhavenHouseCompat.server.luau',
        'compatibility/client/BrookhavenCompat.client.luau',
    }
end
for _, path in paths do
    local ok, result = pcall(function() return luau.load(fs.readFile(path)) end)
    assert(ok, 'LUAU_COMPILE_FAILED ' .. path .. ': ' .. tostring(result))
    print('LUAU_COMPILE_OK ' .. path)
end
