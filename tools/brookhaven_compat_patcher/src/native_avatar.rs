use rbx_dom_weak::{types::{Ref, Variant}, ustr, WeakDom};
type Error = Box<dyn std::error::Error>;

const PATCH_SENTINEL: &str = "STARBLOX_AVATAR_NETWORK_INDEPENDENT_PATCH";

fn child(dom: &WeakDom, parent: Ref, name: &str) -> Result<Option<Ref>, Error> {
    let children: Vec<_> = dom.get_by_ref(parent).ok_or("missing parent")?
        .children().iter().copied()
        .filter(|r| dom.get_by_ref(*r).map(|i| i.name == name).unwrap_or(false))
        .collect();
    if children.len() > 1 { return Err(format!("ambiguous child: {name}").into()); }
    Ok(children.first().copied())
}

fn typed(dom: &WeakDom, parent: Ref, name: &str, class: &str) -> Result<Ref, Error> {
    let r = child(dom, parent, name)?.ok_or_else(|| format!("missing {name}"))?;
    if dom.get_by_ref(r).ok_or("missing instance")?.class.as_str() != class {
        return Err(format!("{name} must be {class}").into());
    }
    Ok(r)
}

fn starter_player_root(dom: &WeakDom, class: &str) -> Result<Option<Ref>, Error> {
    let found: Vec<_> = dom.root().children().iter().copied().filter(|r| {
        dom.get_by_ref(*r)
            .map(|i| i.name == "StarterPlayer" && i.class.as_str() == class)
            .unwrap_or(false)
    }).collect();
    if found.len() > 1 { return Err(format!("ambiguous StarterPlayer {class}").into()); }
    Ok(found.first().copied())
}

fn destination(dom: &WeakDom) -> Result<Ref, Error> {
    let service = starter_player_root(dom, "StarterPlayer")?.ok_or("real StarterPlayer service missing")?;
    typed(dom, service, "StarterPlayerScripts", "StarterPlayerScripts")
}

fn archived(dom: &WeakDom) -> Result<Option<Ref>, Error> {
    let Some(folder) = starter_player_root(dom, "Folder")? else { return Ok(None) };
    let scripts = typed(dom, folder, "StarterPlayerScripts", "Folder")?;
    child(dom, scripts, "AvatarEditor")
}

fn source(dom: &WeakDom, script: Ref) -> Result<&str, Error> {
    match dom.get_by_ref(script).and_then(|i| i.properties.get(&ustr("Source"))) {
        Some(Variant::String(s)) if !s.trim().is_empty() => Ok(s),
        _ => Err("AvatarEditor source missing".into()),
    }
}

fn validate_structure(dom: &WeakDom, script: Ref) -> Result<(), Error> {
    let i = dom.get_by_ref(script).ok_or("AvatarEditor missing")?;
    if i.class.as_str() != "LocalScript" { return Err("AvatarEditor must be LocalScript".into()); }
    if matches!(i.properties.get(&ustr("Disabled")), Some(Variant::Bool(true))) {
        return Err("AvatarEditor is disabled".into());
    }
    let src = source(dom, script)?;
    for marker in ["UpdateAvatar", "Clothes", "wearPremium", "CharacterSizeUp", "CharacterSizeDown", "script.Button"] {
        if !src.contains(marker) { return Err(format!("AvatarEditor callback missing: {marker}").into()); }
    }
    let button = typed(dom, script, "Button", "ModuleScript")?;
    if source(dom, button)?.len() < 100 { return Err("AvatarEditor Button module source too small".into()); }
    typed(dom, button, "ImageButton", "ImageButton")?;
    typed(dom, script, "CharacterSizeNumber", "NumberValue")?;
    Ok(())
}

fn replace_once(text: &mut String, from: &str, to: &str, label: &str, changed: &mut usize) -> Result<(), Error> {
    let count = text.matches(from).count();
    if count != 1 {
        return Err(format!("AvatarEditor patch expected exactly one {label}, found {count}").into());
    }
    *text = text.replacen(from, to, 1);
    *changed += 1;
    Ok(())
}

fn patch_source(original: &str) -> Result<(String, usize), Error> {
    if original.contains(PATCH_SENTINEL) {
        return Ok((original.to_string(), 0));
    }

    let mut text = original.to_string();
    let mut changed = 0usize;

    replace_once(
        &mut text,
        "local u8 = nil;",
        "local u8 = { assets = {} }; -- STARBLOX_AVATAR_NETWORK_INDEPENDENT_PATCH",
        "appearance state default",
        &mut changed,
    )?;

    replace_once(
        &mut text,
        "local u14 = \"Scale\";",
        r#"local u14 = "Scale";
local function StarBloxAvatarDirectField()
	if u13 == "Accessories" then
		return ({ Hair = "HairAccessory", Face = "FaceAccessory", Back = "BackAccessory", Hats = "HatAccessory", Waist = "WaistAccessory" })[u14];
	elseif u13 == "Clothes" then
		return ({ Shirts = "Shirt", ShirtsGirl = "Shirt", Pants = "Pants", PantsGirl = "Pants" })[u14];
	elseif u13 == "Body" and u14 == "Faces" then
		return "Face";
	end;
	return nil;
end;"#,
        "direct field mapper",
        &mut changed,
    )?;

    replace_once(
        &mut text,
        "l__UpdateAvatar__11:FireServer(\"wear\", p6.Id);",
        r#"local field = StarBloxAvatarDirectField();
		if field then
			l__UpdateAvatar__11:FireServer("wearDirect", p6.Id, field);
		else
			l__UpdateAvatar__11:FireServer("wear", p6.Id);
		end;"#,
        "standard wear callback",
        &mut changed,
    )?;

    replace_once(
        &mut text,
        "l__UpdateAvatar__11:FireServer(\"wearPremium\", p8.Id);",
        r#"local field = StarBloxAvatarDirectField();
		if field then
			l__UpdateAvatar__11:FireServer("wearDirect", p8.Id, field);
		else
			l__UpdateAvatar__11:FireServer("wearPremium", p8.Id);
		end;"#,
        "premium wear callback",
        &mut changed,
    )?;

    replace_once(
        &mut text,
        "l__UpdateAvatar__11:FireServer(\"wear\", p10.Id);",
        r#"local field = StarBloxAvatarDirectField();
		if field then
			l__UpdateAvatar__11:FireServer("wearDirect", p10.Id, field);
		else
			l__UpdateAvatar__11:FireServer("wear", p10.Id);
		end;"#,
        "empty/remove wear callback",
        &mut changed,
    )?;

    replace_once(
        &mut text,
        "v49.MouseButton1Click:connect(function()",
        "v49.Activated:Connect(function()",
        "outfit touch callback",
        &mut changed,
    )?;
    replace_once(
        &mut text,
        "l__CategoryTabs__11.RevertOriginalCharacter.MouseButton1Click:Connect(function()",
        "l__CategoryTabs__11.RevertOriginalCharacter.Activated:Connect(function()",
        "revert touch callback",
        &mut changed,
    )?;
    replace_once(
        &mut text,
        "l__ScaleFrame__5.Buttons.Smaller.MouseButton1Click:connect(function()",
        "l__ScaleFrame__5.Buttons.Smaller.Activated:Connect(function()",
        "smaller touch callback",
        &mut changed,
    )?;
    replace_once(
        &mut text,
        "l__ScaleFrame__5.Buttons.Bigger.MouseButton1Click:connect(function()",
        "l__ScaleFrame__5.Buttons.Bigger.Activated:Connect(function()",
        "bigger touch callback",
        &mut changed,
    )?;

    replace_once(
        &mut text,
        r#"pcall(function()
	u8 = l__Players__3:GetCharacterAppearanceInfoAsync(l__LocalPlayer__1.UserId) or {};
end);"#,
        r#"-- StarBlox deliberately avoids the legacy avatar.roblox.com lookup here.
-- The server pushes selected-state updates after each successful mutation.
u8 = u8 or { assets = {} };"#,
        "blocking appearance lookup",
        &mut changed,
    )?;

    replace_once(
        &mut text,
        r#"local v63, v64 = l__Players__3:GetUserThumbnailAsync(l__LocalPlayer__1.UserId, Enum.ThumbnailType.AvatarThumbnail, Enum.ThumbnailSize.Size100x100);"#,
        r#"local v63 = "";
pcall(function()
	v63 = select(1, l__Players__3:GetUserThumbnailAsync(l__LocalPlayer__1.UserId, Enum.ThumbnailType.AvatarThumbnail, Enum.ThumbnailSize.Size100x100)) or "";
end);"#,
        "thumbnail lookup",
        &mut changed,
    )?;

    replace_once(
        &mut text,
        r#"l__UpdateAvatar__11.OnClientEvent:Connect(function(p17)
	u8 = p17;
	u24();
end);"#,
        r#"l__UpdateAvatar__11.OnClientEvent:Connect(function(p17)
	u8 = p17 or { assets = {} };
	if type(u8.assets) ~= "table" then
		u8.assets = {};
	end;
	u24();
end);
print("STARBLOX_AVATAR_EDITOR_READY");"#,
        "avatar state update",
        &mut changed,
    )?;

    Ok((text, changed))
}

fn validate_patched(dom: &WeakDom, script: Ref) -> Result<(), Error> {
    validate_structure(dom, script)?;
    let src = source(dom, script)?;
    for marker in [
        PATCH_SENTINEL,
        "wearDirect",
        "StarBloxAvatarDirectField",
        "STARBLOX_AVATAR_EDITOR_READY",
        "v49.Activated:Connect",
        "Buttons.Smaller.Activated:Connect",
        "Buttons.Bigger.Activated:Connect",
    ] {
        if !src.contains(marker) {
            return Err(format!("patched AvatarEditor marker missing: {marker}").into());
        }
    }
    if src.contains("GetCharacterAppearanceInfoAsync(l__LocalPlayer__1.UserId)") {
        return Err("blocking avatar appearance lookup still present".into());
    }
    Ok(())
}

pub fn verify(dom: &WeakDom) -> Result<(), Error> {
    let avatar = typed(dom, destination(dom)?, "AvatarEditor", "LocalScript")?;
    validate_patched(dom, avatar)?;
    if archived(dom)?.is_some() { return Err("duplicate archived AvatarEditor remains".into()); }

    let starter_gui = dom.root().children().iter().copied().find(|r| {
        dom.get_by_ref(*r).map(|i| i.class.as_str() == "StarterGui").unwrap_or(false)
    }).ok_or("StarterGui missing")?;
    if child(dom, starter_gui, "AvatarEditor")?.is_some() {
        return Err("duplicate StarterGui AvatarEditor clone remains".into());
    }
    Ok(())
}

pub fn restore(dom: &mut WeakDom) -> Result<serde_json::Value, Error> {
    let target = destination(dom)?;
    let existing = child(dom, target, "AvatarEditor")?;
    let legacy = archived(dom)?;
    if existing.is_some() && legacy.is_some() {
        return Err("AvatarEditor exists in both real and archived player-script containers".into());
    }
    let avatar = existing.or(legacy).ok_or("native AvatarEditor missing from both containers")?;
    validate_structure(dom, avatar)?;

    let original_source = source(dom, avatar)?.to_string();
    let source_sha256 = super::sha256(original_source.as_bytes());
    let moved = existing.is_none();
    if moved { dom.transfer_within(avatar, target); }

    let (patched, patch_count) = patch_source(&original_source)?;
    if patch_count > 0 {
        dom.get_by_ref_mut(avatar)
            .ok_or("AvatarEditor disappeared during source patch")?
            .properties
            .insert(ustr("Source"), Variant::String(patched));
    }

    verify(dom)?;
    Ok(serde_json::json!({
        "source": "Folder:StarterPlayer/Folder:StarterPlayerScripts/AvatarEditor",
        "destination": "StarterPlayer/StarterPlayerScripts/AvatarEditor",
        "moved": moved,
        "sourceSha256": source_sha256,
        "networkIndependentPatchCount": patch_count,
        "dependencies": ["Button", "Button/ImageButton", "CharacterSizeNumber"],
        "callbacks": ["UpdateAvatar", "Clothes", "wearDirect", "skintone", "CharacterSizeUp", "CharacterSizeDown"],
        "appearanceApiRequiredForCatalogInteraction": false,
        "touchUsesActivatedForOutfitsAndScale": true,
        "duplicateStarterGuiClone": false,
        "validation": "serialized-controller-placement-network-independent-callback-contract",
        "nativeClientTapVerified": false
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use rbx_dom_weak::InstanceBuilder;

    fn legacy_source() -> String {
        r#"-- UpdateAvatar Clothes wearPremium CharacterSizeUp CharacterSizeDown script.Button
local u8 = nil;
local u13 = "Body";
local u14 = "Scale";
local function a(p6)
	l__UpdateAvatar__11:FireServer("wear", p6.Id);
end;
local function b(p8)
	l__UpdateAvatar__11:FireServer("wearPremium", p8.Id);
end;
local function c(p10)
	l__UpdateAvatar__11:FireServer("wear", p10.Id);
end;
v49.MouseButton1Click:connect(function()
end);
l__CategoryTabs__11.RevertOriginalCharacter.MouseButton1Click:Connect(function()
end);
l__ScaleFrame__5.Buttons.Smaller.MouseButton1Click:connect(function()
end);
l__ScaleFrame__5.Buttons.Bigger.MouseButton1Click:connect(function()
end);
pcall(function()
	u8 = l__Players__3:GetCharacterAppearanceInfoAsync(l__LocalPlayer__1.UserId) or {};
end);
local v63, v64 = l__Players__3:GetUserThumbnailAsync(l__LocalPlayer__1.UserId, Enum.ThumbnailType.AvatarThumbnail, Enum.ThumbnailSize.Size100x100);
l__UpdateAvatar__11.OnClientEvent:Connect(function(p17)
	u8 = p17;
	u24();
end);
"#.to_string()
    }

    fn fixture() -> (WeakDom, Ref, Ref, Ref) {
        let mut d = WeakDom::new(InstanceBuilder::new("DataModel"));
        let root = d.root_ref();
        let service = d.insert(root, InstanceBuilder::new("StarterPlayer"));
        let target = d.insert(service, InstanceBuilder::new("StarterPlayerScripts"));
        d.insert(root, InstanceBuilder::new("StarterGui"));
        let archive = d.insert(root, InstanceBuilder::new("Folder").with_name("StarterPlayer"));
        let scripts = d.insert(archive, InstanceBuilder::new("Folder").with_name("StarterPlayerScripts"));
        let avatar = d.insert(scripts, InstanceBuilder::new("LocalScript").with_name("AvatarEditor")
            .with_property("Source", legacy_source()).with_property("Disabled", false));
        let button = d.insert(avatar, InstanceBuilder::new("ModuleScript").with_name("Button")
            .with_property("Source", "return { callback = function() end } ".repeat(6)));
        d.insert(button, InstanceBuilder::new("ImageButton").with_name("ImageButton"));
        d.insert(avatar, InstanceBuilder::new("NumberValue").with_name("CharacterSizeNumber").with_property("Value", 1.0));
        (d, target, scripts, avatar)
    }

    #[test]
    fn moves_and_patches_avatar_controller_without_network_dependency() {
        let (mut d, target, archive_scripts, avatar) = fixture();
        let receipt = restore(&mut d).unwrap();
        assert_eq!(child(&d, target, "AvatarEditor").unwrap(), Some(avatar));
        assert_eq!(child(&d, archive_scripts, "AvatarEditor").unwrap(), None);
        let src = source(&d, avatar).unwrap();
        assert!(src.contains(PATCH_SENTINEL));
        assert!(src.contains("wearDirect"));
        assert!(!src.contains("GetCharacterAppearanceInfoAsync(l__LocalPlayer__1.UserId)"));
        assert_eq!(receipt["moved"], true);
        assert_eq!(receipt["networkIndependentPatchCount"], 12);
    }

    #[test]
    fn is_idempotent_after_correct_placement() {
        let (mut d, _, _, _) = fixture();
        assert_eq!(restore(&mut d).unwrap()["moved"], true);
        assert_eq!(restore(&mut d).unwrap()["networkIndependentPatchCount"], 0);
        verify(&d).unwrap();
    }

    #[test]
    fn rejects_missing_button_dependency() {
        let (mut d, target, archive_scripts, avatar) = fixture();
        let button = child(&d, avatar, "Button").unwrap().unwrap();
        d.destroy(button);
        assert!(restore(&mut d).is_err());
        assert_eq!(child(&d, target, "AvatarEditor").unwrap(), None);
        assert_eq!(child(&d, archive_scripts, "AvatarEditor").unwrap(), Some(avatar));
    }

    #[test]
    fn rejects_disabled_controller() {
        let (mut d, _, _, avatar) = fixture();
        d.get_by_ref_mut(avatar).unwrap().properties.insert(ustr("Disabled"), Variant::Bool(true));
        assert!(restore(&mut d).is_err());
    }

    #[test]
    fn rejects_duplicate_executable_controller() {
        let (mut d, target, _, avatar) = fixture();
        let duplicate = d.clone_within(avatar);
        d.transfer_within(duplicate, target);
        assert!(restore(&mut d).is_err());
    }

    #[test]
    fn survives_binary_serialization() {
        let (mut d, _, _, _) = fixture();
        restore(&mut d).unwrap();
        let mut bytes = Vec::new();
        rbx_binary::to_writer(&mut bytes, &d, d.root().children()).unwrap();
        let loaded = rbx_binary::from_reader(std::io::Cursor::new(bytes)).unwrap();
        verify(&loaded).unwrap();
    }
}
