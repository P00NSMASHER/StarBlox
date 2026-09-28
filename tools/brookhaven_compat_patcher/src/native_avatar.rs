use rbx_dom_weak::{types::{Ref, Variant}, ustr, WeakDom};
type Error = Box<dyn std::error::Error>;

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

fn validate(dom: &WeakDom, script: Ref) -> Result<(), Error> {
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

pub fn verify(dom: &WeakDom) -> Result<(), Error> {
    let avatar = typed(dom, destination(dom)?, "AvatarEditor", "LocalScript")?;
    validate(dom, avatar)?;
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
    validate(dom, avatar)?;

    let source_sha256 = super::sha256(source(dom, avatar)?.as_bytes());
    let moved = existing.is_none();
    if moved { dom.transfer_within(avatar, target); }

    verify(dom)?;
    Ok(serde_json::json!({
        "source": "Folder:StarterPlayer/Folder:StarterPlayerScripts/AvatarEditor",
        "destination": "StarterPlayer/StarterPlayerScripts/AvatarEditor",
        "moved": moved,
        "sourceSha256": source_sha256,
        "dependencies": ["Button", "Button/ImageButton", "CharacterSizeNumber"],
        "callbacks": ["UpdateAvatar", "Clothes", "wearPremium", "CharacterSizeUp", "CharacterSizeDown"],
        "duplicateStarterGuiClone": false,
        "validation": "serialized-controller-placement-and-callback-contract",
        "nativeClientTapVerified": false
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use rbx_dom_weak::InstanceBuilder;

    fn fixture() -> (WeakDom, Ref, Ref, Ref) {
        let mut d = WeakDom::new(InstanceBuilder::new("DataModel"));
        let root = d.root_ref();
        let service = d.insert(root, InstanceBuilder::new("StarterPlayer"));
        let target = d.insert(service, InstanceBuilder::new("StarterPlayerScripts"));
        d.insert(root, InstanceBuilder::new("StarterGui"));
        let archive = d.insert(root, InstanceBuilder::new("Folder").with_name("StarterPlayer"));
        let scripts = d.insert(archive, InstanceBuilder::new("Folder").with_name("StarterPlayerScripts"));
        let src = "-- UpdateAvatar Clothes wearPremium CharacterSizeUp CharacterSizeDown script.Button ".repeat(3);
        let avatar = d.insert(scripts, InstanceBuilder::new("LocalScript").with_name("AvatarEditor")
            .with_property("Source", src).with_property("Disabled", false));
        let button = d.insert(avatar, InstanceBuilder::new("ModuleScript").with_name("Button")
            .with_property("Source", "return { callback = function() end } ".repeat(6)));
        d.insert(button, InstanceBuilder::new("ImageButton").with_name("ImageButton"));
        d.insert(avatar, InstanceBuilder::new("NumberValue").with_name("CharacterSizeNumber").with_property("Value", 1.0));
        (d, target, scripts, avatar)
    }

    #[test]
    fn moves_original_avatar_controller_subtree_into_real_player_scripts() {
        let (mut d, target, archive_scripts, avatar) = fixture();
        let before = source(&d, avatar).unwrap().to_string();
        let receipt = restore(&mut d).unwrap();
        assert_eq!(child(&d, target, "AvatarEditor").unwrap(), Some(avatar));
        assert_eq!(child(&d, archive_scripts, "AvatarEditor").unwrap(), None);
        assert_eq!(source(&d, avatar).unwrap(), before);
        assert!(child(&d, avatar, "Button").unwrap().is_some());
        assert!(child(&d, avatar, "CharacterSizeNumber").unwrap().is_some());
        assert_eq!(receipt["moved"], true);
    }

    #[test]
    fn is_idempotent_after_correct_placement() {
        let (mut d, _, _, _) = fixture();
        assert_eq!(restore(&mut d).unwrap()["moved"], true);
        assert_eq!(restore(&mut d).unwrap()["moved"], false);
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
