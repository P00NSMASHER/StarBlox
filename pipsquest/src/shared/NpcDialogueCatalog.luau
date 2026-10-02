--!strict

export type Role = "STUDENT" | "TEACHER"
export type RelationshipTier = "NEW" | "KNOWN" | "FRIENDLY" | "TRUSTED"
export type LineSet = {[string]: string}
export type DialogueEntry = {
	role: Role,
	lines: LineSet,
	companionLines: LineSet?,
}
export type Config = {[string]: DialogueEntry}
export type ResolveContext = {
	relationshipTier: RelationshipTier,
	companionPresent: boolean,
}
export type Resolution = {
	found: boolean,
	reason: string,
	role: Role?,
	text: string?,
	variant: string?,
}

local MAX_LINE_LENGTH = 160
local VALID_ROLES: {[string]: boolean} = {STUDENT=true, TEACHER=true}
local VALID_TIERS: {[string]: boolean} = {NEW=true, KNOWN=true, FRIENDLY=true, TRUSTED=true}
local VALID_LINE_KEYS: {[string]: boolean} = {DEFAULT=true, NEW=true, KNOWN=true, FRIENDLY=true, TRUSTED=true}
local ALLOWED_ENTRY_KEYS: {[string]: boolean} = {role=true, lines=true, companionLines=true}
local FORBIDDEN_TOKENS = {"{PLAYER", "{USERNAME", "%s", "%q"}

local NpcDialogueCatalog = {}
local Catalog = {}
Catalog.__index = Catalog

local function unavailable(reason: string): Resolution
	return table.freeze({found=false, reason=reason, role=nil, text=nil, variant=nil})
end

local function assertOnlyKeys(value: {[any]: any}, allowed: {[string]: boolean}, label: string)
	for key in pairs(value) do
		assert(type(key) == "string" and allowed[key] == true, label .. " contains unsupported field")
	end
end

local function validateLine(text: string, label: string)
	assert(type(text) == "string" and text:match("%S") ~= nil, label .. " must be non-empty")
	assert(#text <= MAX_LINE_LENGTH, label .. " exceeds 160 characters")
	assert(text:find("\n", 1, true) == nil and text:find("\r", 1, true) == nil, label .. " must be single-line")
	for _, token in ipairs(FORBIDDEN_TOKENS) do
		assert(text:find(token, 1, true) == nil, label .. " cannot interpolate player-authored text")
	end
end

local function copyLineSet(lines: LineSet, label: string, requireDefault: boolean): LineSet
	assertOnlyKeys(lines :: any, VALID_LINE_KEYS, label)
	local copy: LineSet = {}
	for key, text in pairs(lines) do
		validateLine(text, label .. "." .. key)
		copy[key] = text
	end
	if requireDefault then
		assert(copy.DEFAULT ~= nil, label .. " requires DEFAULT")
	end
	return table.freeze(copy)
end

function NpcDialogueCatalog.new(config: Config)
	local entries: {[string]: any} = {}
	for hookId, entry in pairs(config) do
		assert(type(hookId) == "string" and hookId:match("%S") ~= nil, "dialogue hook id must be non-empty")
		assertOnlyKeys(entry :: any, ALLOWED_ENTRY_KEYS, "dialogue entry " .. hookId)
		assert(VALID_ROLES[entry.role] == true, "invalid dialogue role")
		local companionLines = if entry.companionLines then copyLineSet(entry.companionLines, hookId .. ".companionLines", false) else nil
		entries[hookId] = table.freeze({
			role=entry.role,
			lines=copyLineSet(entry.lines, hookId .. ".lines", true),
			companionLines=companionLines,
		})
	end
	return setmetatable({_entries=table.freeze(entries)}, Catalog)
end

function Catalog.resolve(self, hookId: string, context: ResolveContext): Resolution
	local entry = self._entries[hookId]
	if not entry then
		return unavailable("UNKNOWN_HOOK")
	end
	if VALID_TIERS[context.relationshipTier] ~= true or type(context.companionPresent) ~= "boolean" then
		return unavailable("INVALID_CONTEXT")
	end

	local tier = context.relationshipTier
	local text: string? = nil
	local variant: string? = nil
	if context.companionPresent and entry.companionLines then
		text = entry.companionLines[tier]
		if text then
			variant = "COMPANION_" .. tier
		else
			text = entry.companionLines.DEFAULT
			if text then variant = "COMPANION_DEFAULT" end
		end
	end
	if not text then
		text = entry.lines[tier]
		if text then
			variant = tier
		else
			text = entry.lines.DEFAULT
			variant = "DEFAULT"
		end
	end

	return table.freeze({found=true, reason="FOUND", role=entry.role, text=text, variant=variant})
end

return table.freeze(NpcDialogueCatalog)
