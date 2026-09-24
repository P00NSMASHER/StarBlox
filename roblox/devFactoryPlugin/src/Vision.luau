--!strict

local AssetService = game:GetService("AssetService")
local CaptureService = game:GetService("CaptureService")

local Vision = {}

local B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local MAX_WIDTH = 960
local MAX_HEIGHT = 540

local function base64Encode(raw: string): string
	local out = {}
	local index = 1
	local length = #raw
	while index <= length do
		local b1 = string.byte(raw, index) or 0
		local b2 = string.byte(raw, index + 1)
		local b3 = string.byte(raw, index + 2)
		local value = b1 * 65536 + (b2 or 0) * 256 + (b3 or 0)
		local c1 = math.floor(value / 262144) % 64
		local c2 = math.floor(value / 4096) % 64
		local c3 = math.floor(value / 64) % 64
		local c4 = value % 64
		out[#out + 1] = string.sub(B64, c1 + 1, c1 + 1)
			.. string.sub(B64, c2 + 1, c2 + 1)
			.. (b2 and string.sub(B64, c3 + 1, c3 + 1) or "=")
			.. (b3 and string.sub(B64, c4 + 1, c4 + 1) or "=")
		index += 3
		if index % 60000 == 1 then task.wait() end
	end
	return table.concat(out)
end

local function downsample(pixels: buffer, width: number, height: number): (buffer, number, number)
	local scale = math.min(1, MAX_WIDTH / width, MAX_HEIGHT / height)
	if scale >= 1 then
		return pixels, width, height
	end

	local outWidth = math.max(1, math.floor(width * scale))
	local outHeight = math.max(1, math.floor(height * scale))
	local output = buffer.create(outWidth * outHeight * 4)

	for y = 0, outHeight - 1 do
		local sourceY = math.min(height - 1, math.floor(y / scale))
		for x = 0, outWidth - 1 do
			local sourceX = math.min(width - 1, math.floor(x / scale))
			local sourceOffset = (sourceY * width + sourceX) * 4
			local destOffset = (y * outWidth + x) * 4
			for channel = 0, 3 do
				buffer.writeu8(output, destOffset + channel, buffer.readu8(pixels, sourceOffset + channel))
			end
		end
		if y % 24 == 0 then task.wait() end
	end

	return output, outWidth, outHeight
end

function Vision.capture(_args: any): any
	local completed = false
	local contentId: string? = nil
	local started = pcall(function()
		CaptureService:CaptureScreenshot(function(id: string)
			contentId = id
			completed = true
		end)
	end)
	if not started then
		error("CaptureScreenshot is unavailable in this Studio context")
	end

	local elapsed = 0
	while not completed and elapsed < 8 do
		task.wait(0.1)
		elapsed += 0.1
	end
	if not contentId then
		error("viewport capture timed out")
	end

	local image
	local ok, err = pcall(function()
		image = AssetService:CreateEditableImageAsync(Content.fromUri(contentId :: string))
	end)
	if not ok or not image then
		error("could not read viewport capture: " .. tostring(err))
	end

	local size = image.Size
	local width = math.max(1, math.floor(size.X))
	local height = math.max(1, math.floor(size.Y))
	local pixels = image:ReadPixelsBuffer(Vector2.zero, size)
	local sampled, outWidth, outHeight = downsample(pixels, width, height)
	local raw = buffer.tostring(sampled)

	return {
		format = "rgba8",
		width = outWidth,
		height = outHeight,
		dataB64 = base64Encode(raw),
		originalWidth = width,
		originalHeight = height,
	}
end

return Vision
