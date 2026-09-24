--!strict

local LogService = game:GetService("LogService")

local Logs = {}
local MAX_LOGS = 1000
local entries = {}
local dropped = 0

LogService.MessageOut:Connect(function(message, messageType)
	table.insert(entries, {
		message = string.sub(tostring(message), 1, 4000),
		type = tostring(messageType),
		at = os.clock(),
	})
	if #entries > MAX_LOGS then
		table.remove(entries, 1)
		dropped += 1
	end
end)

function Logs.get(args: any): any
	local filter = tostring(args.filter or "all")
	local limit = math.clamp(tonumber(args.limit) or 100, 1, 500)
	local selected = {}
	for index = #entries, 1, -1 do
		local row = entries[index]
		local lower = string.lower(row.type .. " " .. row.message)
		local include = filter == "all"
			or (filter == "errors" and (string.find(lower, "error") or string.find(lower, "messageerror")))
			or (filter == "warnings" and (string.find(lower, "warning") or string.find(lower, "messagewarning")))
		if include then
			table.insert(selected, 1, row)
			if #selected >= limit then break end
		end
	end
	return {
		logs = selected,
		count = #selected,
		totalBuffered = #entries,
		dropped = dropped,
	}
end

return Logs
