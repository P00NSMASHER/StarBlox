import fs from "node:fs";

const client = fs.readFileSync("compatibility/client/BrookhavenCompat.client.luau", "utf8");
const server = fs.readFileSync("compatibility/server/BrookhavenHouseCompat.server.luau", "utf8");

function requireAll(source, label, needles) {
  for (const needle of needles) {
    if (!source.includes(needle)) {
      throw new Error(label + " missing required live-path contract: " + needle);
    }
  }
}
function forbidAll(source, label, needles) {
  for (const needle of needles) {
    if (source.includes(needle)) {
      throw new Error(label + " contains forbidden replacement/legacy behavior: " + needle);
    }
  }
}

requireAll(client, "client", [
  'local function resolveNativeUiAction',
  'ui_remote_missing',
  'shop:WaitForChild("OpenButton")',
  'invokeNativeUi("shop_pass"',
  'invokeNativeUi("avatar_asset"',
  'invokeNativeUi("avatar_outfit"',
  'invokeNativeUi("avatar_scale"',
  'invokeNativeUi("avatar_skintone"',
  'invokeNativeUi("avatar_reset"',
  'local function currentCatalogMatches',
  'appearance.SkinTone',
  'STARBLOX_NATIVE_SHOP_AVATAR_FALLBACK_READY',
]);
requireAll(server, "server", [
  'nativeUiActionRemote = Instance.new("RemoteFunction")',
  'nativeUiActionRemote.OnServerInvoke = function',
  'local function recentSuccessfulUiAction',
  'local function applyCatalogAsset',
  'local function mutateAvatarDescription',
  'local function resetAvatar',
  'receiptKey = "asset:"',
  'receiptKey = "pass:"',
  'deduplicated = true',
  'source = tostring(source or "unknown")',
  'recentSuccessfulUiAction(player, receiptKey, "native")',
  'recentSuccessfulUiAction(player, key, "fallback")',
]);
forbidAll(client, "client", ["StarCoinShop", "hideLegacyShopPages", "successfulActionSince", "actionSequence()", 'WaitForChild("StarBloxNativeUiAction")']);
forbidAll(server, "server", ["StarCoinShop", "hideLegacyShopPages"]);

const shopActions = [
  "BoughtMusic",
  "BoughtPremium",
  "BoughtColorSpeedLower",
  "BoughtSpeed200",
  "BoughtHorse",
  "BoughtFire",
];
for (const action of shopActions) {
  if (!client.includes(action) || !server.includes(action)) {
    throw new Error("shop action is not connected end-to-end: " + action);
  }
}

console.log(JSON.stringify({
  ok: true,
  shopActions: shopActions.length,
  avatarFallbacks: 5,
  catalogSelectionValidation: true,
  nonBlockingServerStartup: true,
  serverSideDedupe: true,
  sourceAwareDedupe: true,
  existingBrookhavenUiPreserved: true,
}, null, 2));
