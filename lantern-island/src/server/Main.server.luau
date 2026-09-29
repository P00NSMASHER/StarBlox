--!nonstrict
-- Roblox server entrypoint. Keep logic in Bootstrap so the exact same code can
-- be verified in Open Cloud's no-auto-script execution environment.
local Bootstrap=require(script.Parent:WaitForChild("Bootstrap",15))
Bootstrap.start()