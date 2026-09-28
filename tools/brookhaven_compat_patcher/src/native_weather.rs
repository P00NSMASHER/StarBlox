use rbx_dom_weak::{types::{Ref, Variant}, ustr, WeakDom};
type Error = Box<dyn std::error::Error>;

fn child(dom: &WeakDom, parent: Ref, name: &str) -> Result<Option<Ref>, Error> {
    let children: Vec<_> = dom.get_by_ref(parent).ok_or("missing parent")?
        .children().iter().copied().filter(|r| dom.get_by_ref(*r).unwrap().name == name).collect();
    if children.len() > 1 { return Err(format!("ambiguous child: {name}").into()); }
    Ok(children.first().copied())
}
fn typed(dom: &WeakDom, parent: Ref, name: &str, class: &str) -> Result<Ref, Error> {
    let r = child(dom, parent, name)?.ok_or_else(|| format!("missing {name}"))?;
    if dom.get_by_ref(r).unwrap().class.as_str() != class {
        return Err(format!("{name} must be {class}").into());
    }
    Ok(r)
}
fn root(dom: &WeakDom, class: &str) -> Result<Option<Ref>, Error> {
    let found: Vec<_> = dom.root().children().iter().copied().filter(|r| {
        let i = dom.get_by_ref(*r).unwrap(); i.name == "StarterPlayer" && i.class.as_str() == class
    }).collect();
    if found.len() > 1 { return Err(format!("ambiguous StarterPlayer {class}").into()); }
    Ok(found.first().copied())
}
fn destination(dom: &WeakDom) -> Result<Ref, Error> {
    let service = root(dom, "StarterPlayer")?.ok_or("real StarterPlayer service missing")?;
    typed(dom, service, "StarterPlayerScripts", "StarterPlayerScripts")
}
fn archived(dom: &WeakDom) -> Result<Option<Ref>, Error> {
    let Some(folder) = root(dom, "Folder")? else { return Ok(None) };
    let scripts = typed(dom, folder, "StarterPlayerScripts", "Folder")?;
    child(dom, scripts, "WeatherScript")
}
fn source(dom: &WeakDom, script: Ref) -> Result<&str, Error> {
    match dom.get_by_ref(script).and_then(|i| i.properties.get(&ustr("Source"))) {
        Some(Variant::String(s)) if !s.trim().is_empty() => Ok(s),
        _ => Err("native weather dependency has no Source".into()),
    }
}
fn validate(dom: &WeakDom, script: Ref) -> Result<(), Error> {
    let i = dom.get_by_ref(script).ok_or("WeatherScript missing")?;
    if i.class.as_str() != "LocalScript" { return Err("WeatherScript must be LocalScript".into()); }
    if matches!(i.properties.get(&ustr("Disabled")), Some(Variant::Bool(true))) {
        return Err("native WeatherScript is disabled".into());
    }
    source(dom, script)?;
    let rain = typed(dom, script, "Rain", "ModuleScript")?;
    source(dom, rain)?;
    typed(dom, script, "RainOnOff", "BoolValue")?;
    typed(dom, script, "thunderclap1600", "Sound")?;
    Ok(())
}
pub fn verify(dom: &WeakDom) -> Result<(), Error> {
    let weather = typed(dom, destination(dom)?, "WeatherScript", "LocalScript")?;
    validate(dom, weather)?;
    if archived(dom)?.is_some() { return Err("duplicate archived WeatherScript remains".into()); }
    Ok(())
}
pub fn restore(dom: &mut WeakDom) -> Result<serde_json::Value, Error> {
    let target = destination(dom)?;
    let existing = child(dom, target, "WeatherScript")?;
    let legacy = archived(dom)?;
    if existing.is_some() && legacy.is_some() {
        return Err("WeatherScript exists in both real and archived containers".into());
    }
    let weather = existing.or(legacy).ok_or("native WeatherScript missing from both containers")?;
    validate(dom, weather)?;
    let source_sha256 = super::sha256(source(dom, weather)?.as_bytes());
    let moved = existing.is_none();
    if moved { dom.transfer_within(weather, target); }
    verify(dom)?;
    Ok(serde_json::json!({
        "source": "Folder:StarterPlayer/Folder:StarterPlayerScripts/WeatherScript",
        "destination": "StarterPlayer/StarterPlayerScripts/WeatherScript",
        "moved": moved,
        "sourceSha256": source_sha256,
        "dependencies": ["Rain", "RainOnOff", "thunderclap1600"],
        "validation": "serialized-controller-placement-only",
        "nativeClientVerified": false
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use rbx_dom_weak::InstanceBuilder;
    fn fixture() -> (WeakDom, Ref, Ref, Ref) {
        let mut d = WeakDom::new(InstanceBuilder::new("DataModel"));
        let r = d.root_ref();
        let service = d.insert(r, InstanceBuilder::new("StarterPlayer"));
        let target = d.insert(service, InstanceBuilder::new("StarterPlayerScripts"));
        let archive = d.insert(r, InstanceBuilder::new("Folder").with_name("StarterPlayer"));
        let scripts = d.insert(archive, InstanceBuilder::new("Folder").with_name("StarterPlayerScripts"));
        let weather = d.insert(scripts, InstanceBuilder::new("LocalScript").with_name("WeatherScript")
            .with_property("Source", "-- original weather source").with_property("Disabled", false));
        let rain = d.insert(weather, InstanceBuilder::new("ModuleScript").with_name("Rain")
            .with_property("Source", "return { nested = true }"));
        d.insert(rain, InstanceBuilder::new("Folder").with_name("NestedDependency"));
        d.insert(weather, InstanceBuilder::new("BoolValue").with_name("RainOnOff").with_property("Value", false));
        d.insert(weather, InstanceBuilder::new("Sound").with_name("thunderclap1600"));
        (d, target, scripts, weather)
    }
    #[test]
    fn moves_original_subtree_without_cloning_or_rewriting() {
        let (mut d, target, scripts, weather) = fixture();
        let before = source(&d, weather).unwrap().to_string();
        let rain = typed(&d, weather, "Rain", "ModuleScript").unwrap();
        let receipt = restore(&mut d).unwrap();
        assert_eq!(child(&d, target, "WeatherScript").unwrap(), Some(weather));
        assert_eq!(child(&d, scripts, "WeatherScript").unwrap(), None);
        assert_eq!(source(&d, weather).unwrap(), before);
        assert!(child(&d, rain, "NestedDependency").unwrap().is_some());
        assert_eq!(receipt["nativeClientVerified"], false);
    }
    #[test]
    fn rejects_inert_folder_before_repair_and_is_idempotent_after() {
        let (mut d, _, _, _) = fixture();
        assert!(verify(&d).is_err());
        assert_eq!(restore(&mut d).unwrap()["moved"], true);
        assert_eq!(restore(&mut d).unwrap()["moved"], false);
    }
    #[test]
    fn rejects_missing_dependency_without_moving_controller() {
        let (mut d, target, scripts, weather) = fixture();
        let rain = child(&d, weather, "Rain").unwrap().unwrap();
        d.destroy(rain);
        assert!(restore(&mut d).is_err());
        assert_eq!(child(&d, target, "WeatherScript").unwrap(), None);
        assert_eq!(child(&d, scripts, "WeatherScript").unwrap(), Some(weather));
    }
    #[test]
    fn rejects_duplicate_controller_without_overwriting() {
        let (mut d, target, scripts, weather) = fixture();
        let duplicate = d.clone_within(weather);
        d.transfer_within(duplicate, target);
        assert!(restore(&mut d).is_err());
        assert_eq!(child(&d, scripts, "WeatherScript").unwrap(), Some(weather));
    }
    #[test]
    fn rejects_folder_impersonating_real_script_container() {
        let (mut d, target, _, _) = fixture();
        d.get_by_ref_mut(target).unwrap().class = ustr("Folder");
        assert!(restore(&mut d).is_err());
    }
    #[test]
    fn rejects_disabled_native_controller() {
        let (mut d, _, _, weather) = fixture();
        d.get_by_ref_mut(weather).unwrap().properties.insert(ustr("Disabled"), Variant::Bool(true));
        assert!(restore(&mut d).is_err());
    }
    #[test]
    fn rejects_absent_source_controller() {
        let (mut d, _, _, weather) = fixture();
        d.destroy(weather);
        assert!(restore(&mut d).is_err());
    }
    #[test]
    fn survives_actual_binary_serialization() {
        let (mut d, _, _, _) = fixture();
        restore(&mut d).unwrap();
        let mut bytes = Vec::new();
        rbx_binary::to_writer(&mut bytes, &d, d.root().children()).unwrap();
        let loaded = rbx_binary::from_reader(std::io::Cursor::new(bytes)).unwrap();
        verify(&loaded).unwrap();
    }
}
