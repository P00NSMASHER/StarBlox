use std::{
    collections::BTreeSet,
    env,
    fs::{self, File},
    io::{BufReader, BufWriter},
    path::Path,
};

use rbx_dom_weak::{
    types::{Ref, Variant},
    ustr, InstanceBuilder, WeakDom,
};
use sha2::{Digest, Sha256};

const CLIENT_SOURCE: &str = include_str!("../../../compatibility/client/BrookhavenCompat.client.luau");
const SERVER_SOURCE: &str = include_str!("../../../compatibility/server/BrookhavenHouseCompat.server.luau");
const RUNTIME_CORE_SOURCE: &str = include_str!("../../../compatibility/server/BrookhavenNativeRuntimeCore.luau");
const BOOT_SENTINEL_SOURCE: &str = r#"
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local proof = ReplicatedStorage:FindFirstChild("StarBloxServerBootProof")
if proof then proof:Destroy() end
proof = Instance.new("BoolValue")
proof.Name = "StarBloxServerBootProof"
proof.Value = true
proof.Parent = ReplicatedStorage
print("STARBLOX_SERVER_BOOT_SENTINEL_READY")
"#;

fn read_dom(path: &Path) -> Result<WeakDom, Box<dyn std::error::Error>> {
    let input = BufReader::new(File::open(path)?);
    Ok(rbx_binary::from_reader(input)?)
}

fn find_first(dom: &WeakDom, current: Ref, class: &str, name: Option<&str>) -> Option<Ref> {
    let instance = dom.get_by_ref(current)?;
    if instance.class.as_str() == class && name.map(|n| n == instance.name).unwrap_or(true) {
        return Some(current);
    }
    for child in instance.children() {
        if let Some(found) = find_first(dom, *child, class, name) {
            return Some(found);
        }
    }
    None
}

fn direct_child(dom: &WeakDom, parent: Ref, name: &str) -> Option<Ref> {
    let instance = dom.get_by_ref(parent)?;
    instance.children().iter().copied().find(|child| {
        dom.get_by_ref(*child)
            .map(|value| value.name == name)
            .unwrap_or(false)
    })
}


fn collect_tool_names(dom: &WeakDom, current: Ref, out: &mut BTreeSet<String>) {
    let Some(instance) = dom.get_by_ref(current) else {
        return;
    };
    if instance.class.as_str() == "Tool" {
        out.insert(instance.name.clone());
    }
    for child in instance.children() {
        collect_tool_names(dom, *child, out);
    }
}

fn collect_follow_candidates(dom: &WeakDom, current: Ref, out: &mut BTreeSet<String>) {
    let Some(instance) = dom.get_by_ref(current) else {
        return;
    };
    let lower = instance.name.to_ascii_lowercase();
    if lower.contains("babyboy")
        || lower.contains("babygirl")
        || lower.contains("followcharacter")
        || lower.contains("followname")
    {
        out.insert(format!("{}:{}", instance.name, instance.class.as_str()));
    }
    for child in instance.children() {
        collect_follow_candidates(dom, *child, out);
    }
}

fn collect_interaction_paths(
    dom: &WeakDom,
    current: Ref,
    prefix: &str,
    follow_out: &mut BTreeSet<String>,
    horse_clicks: &mut BTreeSet<String>,
) {
    let Some(instance) = dom.get_by_ref(current) else {
        return;
    };
    let path = if prefix.is_empty() {
        instance.name.clone()
    } else {
        format!("{prefix}/{}", instance.name)
    };
    let lower_name = instance.name.to_ascii_lowercase();
    let lower_path = path.to_ascii_lowercase();
    if lower_name.contains("babyboy")
        || lower_name.contains("babygirl")
        || lower_name.contains("followcharacter")
        || lower_name.contains("followname")
    {
        follow_out.insert(format!("{}:{}", path, instance.class.as_str()));
    }
    if instance.class.as_str() == "ClickDetector"
        && (lower_path.contains("horse")
            || lower_path.contains("stable")
            || lower_path.contains("stall"))
    {
        horse_clicks.insert(format!("{}:{}", path, instance.class.as_str()));
    }
    for child in instance.children() {
        collect_interaction_paths(dom, *child, &path, follow_out, horse_clicks);
    }
}

fn collect_subtree_labels(
    dom: &WeakDom,
    current: Ref,
    prefix: &str,
    out: &mut Vec<String>,
    limit: usize,
) {
    if out.len() >= limit {
        return;
    }
    let Some(instance) = dom.get_by_ref(current) else {
        return;
    };
    let path = if prefix.is_empty() {
        instance.name.clone()
    } else {
        format!("{prefix}/{}", instance.name)
    };
    out.push(format!("{}:{}", path, instance.class.as_str()));
    if out.len() >= limit {
        return;
    }
    for child in instance.children() {
        collect_subtree_labels(dom, *child, &path, out, limit);
        if out.len() >= limit {
            break;
        }
    }
}

fn build_native_source_inventory(dom: &WeakDom) -> serde_json::Value {
    let mut tool_names = BTreeSet::new();
    if let Some(replicated) = find_first(dom, dom.root_ref(), "ReplicatedStorage", None) {
        collect_tool_names(dom, replicated, &mut tool_names);
    }

    let mut follow_candidates = BTreeSet::new();
    collect_follow_candidates(dom, dom.root_ref(), &mut follow_candidates);
    let mut follow_paths = BTreeSet::new();
    let mut horse_click_paths = BTreeSet::new();
    collect_interaction_paths(
        dom,
        dom.root_ref(),
        "",
        &mut follow_paths,
        &mut horse_click_paths,
    );

    let workspace_ref = find_first(dom, dom.root_ref(), "Workspace", None);
    let common_ref = workspace_ref.and_then(|workspace| direct_child(dom, workspace, "WorkspaceCom"));
    let horse_ref = common_ref
        .and_then(|common| direct_child(dom, common, "003_CarBackup"))
        .and_then(|backup| direct_child(dom, backup, "Horse"));
    let horse_stall_ref = common_ref
        .and_then(|common| direct_child(dom, common, "000001HorseStall"));
    let horse_doors_ref = common_ref
        .and_then(|common| direct_child(dom, common, "001_HorseStableDoors"));

    let mut horse_subtree = Vec::new();
    if let Some(horse) = horse_ref {
        collect_subtree_labels(dom, horse, "", &mut horse_subtree, 220);
    }
    let mut horse_stall_subtree = Vec::new();
    if let Some(stall) = horse_stall_ref {
        collect_subtree_labels(dom, stall, "", &mut horse_stall_subtree, 220);
    }
    let mut horse_doors_subtree = Vec::new();
    if let Some(doors) = horse_doors_ref {
        collect_subtree_labels(dom, doors, "", &mut horse_doors_subtree, 220);
    }

    serde_json::json!({
        "replicatedStorageTools": tool_names.into_iter().collect::<Vec<_>>(),
        "followAssetCandidates": follow_candidates.into_iter().collect::<Vec<_>>(),
        "followAssetPaths": follow_paths.into_iter().collect::<Vec<_>>(),
        "horseClickDetectorPaths": horse_click_paths.into_iter().collect::<Vec<_>>(),
        "horseTemplateFound": horse_ref.is_some(),
        "horseTemplateSubtree": horse_subtree,
        "horseStallFound": horse_stall_ref.is_some(),
        "horseStallSubtree": horse_stall_subtree,
        "horseStableDoorsFound": horse_doors_ref.is_some(),
        "horseStableDoorsSubtree": horse_doors_subtree
    })
}

fn patch_player_handler(dom: &mut WeakDom) -> Result<usize, Box<dyn std::error::Error>> {
    let player_handler = find_first(dom, dom.root_ref(), "LocalScript", Some("PlayerHandler"))
        .ok_or("StarterGui PlayerHandler LocalScript not found")?;

    let original = {
        let instance = dom.get_by_ref(player_handler).ok_or("PlayerHandler disappeared")?;
        match instance.properties.get(&ustr("Source")) {
            Some(Variant::String(value)) => value.clone(),
            _ => return Err("PlayerHandler Source is not a String".into()),
        }
    };

    if original.len() < 10_000 || !original.contains("l__MainButtons__43.Buttons:GetChildren()") {
        return Err("PlayerHandler source is not the expected Brookhaven controller".into());
    }

    let replacements = [
        (
            "l__PlayerGui__4:SetTopbarTransparency(1);",
            "pcall(function() l__PlayerGui__4:SetTopbarTransparency(1); end);",
        ),
        (
            "game:GetService(\"StarterGui\"):SetCoreGuiEnabled(Enum.CoreGuiType.PlayerList, false);",
            "pcall(function() game:GetService(\"StarterGui\"):SetCoreGuiEnabled(Enum.CoreGuiType.PlayerList, false); end);",
        ),
        (
            "local v98 = l__Humanoid__3:LoadAnimation((script:WaitForChild(\"ScooterAnimation\")));",
            "local v98 = nil; pcall(function() v98 = l__Humanoid__3:LoadAnimation((script:WaitForChild(\"ScooterAnimation\"))) end);",
        ),
        (
            "local v99 = l__Humanoid__3:LoadAnimation((script:WaitForChild(\"SegwaySmallAnimation\")));",
            "local v99 = nil; pcall(function() v99 = l__Humanoid__3:LoadAnimation((script:WaitForChild(\"SegwaySmallAnimation\"))) end);",
        ),
        (
            "local v100 = l__Humanoid__3:LoadAnimation((script:WaitForChild(\"SkateBoardAnimation\")));",
            "local v100 = nil; pcall(function() v100 = l__Humanoid__3:LoadAnimation((script:WaitForChild(\"SkateBoardAnimation\"))) end);",
        ),
    ];

    let mut patched = original;
    let mut changed = 0usize;
    for (from, to) in replacements {
        if patched.contains(from) {
            patched = patched.replace(from, to);
            changed += 1;
        }
    }

    if changed < 2 {
        return Err(format!("PlayerHandler startup patch matched only {changed} expected statements").into());
    }

    let instance = dom
        .get_by_ref_mut(player_handler)
        .ok_or("PlayerHandler disappeared before mutation")?;
    instance
        .properties
        .insert(ustr("Source"), Variant::String(patched));

    Ok(changed)
}

fn ensure_script_container(
    dom: &mut WeakDom,
    service_class: &str,
    child_name: Option<&str>,
) -> Result<Ref, Box<dyn std::error::Error>> {
    let service = find_first(dom, dom.root_ref(), service_class, None)
        .ok_or_else(|| format!("{service_class} service missing"))?;

    if let Some(name) = child_name {
        if let Some(found) = direct_child(dom, service, name) {
            return Ok(found);
        }
        let created = dom.insert(service, InstanceBuilder::new("StarterPlayerScripts").with_name(name));
        return Ok(created);
    }

    Ok(service)
}

fn insert_compat_scripts(dom: &mut WeakDom) -> Result<Ref, Box<dyn std::error::Error>> {
    // This legacy Brookhaven snapshot reliably runs LocalScripts cloned from StarterGui.
    // StarterPlayerScripts exists in the file but did not execute the native AvatarEditor
    // in the recorded mobile client. Clone that whole controller subtree into StarterGui
    // so its Button module and CharacterSizeNumber child travel with it.
    let starter_gui = find_first(dom, dom.root_ref(), "StarterGui", None)
        .ok_or("StarterGui service missing")?;
    let server_scripts = ensure_script_container(dom, "ServerScriptService", None)?;

    let native_avatar = find_first(dom, dom.root_ref(), "LocalScript", Some("AvatarEditor"))
        .ok_or("native StarterPlayerScripts AvatarEditor missing")?;
    let avatar_clone = dom.clone_within(native_avatar);
    {
        let instance = dom
            .get_by_ref_mut(avatar_clone)
            .ok_or("cloned AvatarEditor disappeared")?;
        instance.name = "AvatarEditor".to_string();
        instance
            .properties
            .insert(ustr("Disabled"), Variant::Bool(false));
    }
    dom.transfer_within(avatar_clone, starter_gui);

    dom.insert(
        starter_gui,
        InstanceBuilder::new("LocalScript")
            .with_name("BrookhavenCompat")
            .with_property("Disabled", false)
            .with_property("Source", CLIENT_SOURCE.to_string()),
    );

    dom.insert(
        server_scripts,
        InstanceBuilder::new("ModuleScript")
            .with_name("BrookhavenNativeRuntimeCore")
            .with_property("Source", RUNTIME_CORE_SOURCE.to_string()),
    );

    dom.insert(
        server_scripts,
        InstanceBuilder::new("Script")
            .with_name("BrookhavenHouseCompat")
            .with_property("Disabled", false)
            .with_property("Source", SERVER_SOURCE.to_string()),
    );

    dom.insert(
        server_scripts,
        InstanceBuilder::new("Script")
            .with_name("StarBloxBootSentinel")
            .with_property("Disabled", false)
            .with_property("Source", BOOT_SENTINEL_SOURCE.to_string()),
    );

    Ok(avatar_clone)
}

fn sha256(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args = env::args().skip(1).collect::<Vec<_>>();
    if args.len() < 2 {
        return Err("usage: brookhaven-compat-patcher <input.rbxl> <output.rbxl> [receipt.json]".into());
    }
    let input_path = Path::new(&args[0]);
    let output_path = Path::new(&args[1]);
    let receipt_path = args.get(2).map(Path::new);

    let input_bytes = fs::read(input_path)?;
    let mut dom = read_dom(input_path)?;
    let native_source_inventory = build_native_source_inventory(&dom);

    let player_handler_patch_count = patch_player_handler(&mut dom)?;
    let avatar_clone_ref = insert_compat_scripts(&mut dom)?;

    let root_refs = dom.root().children().to_vec();
    let output = BufWriter::new(File::create(output_path)?);
    rbx_binary::to_writer(output, &dom, &root_refs)?;

    let output_bytes = fs::read(output_path)?;
    let verified = read_dom(output_path)?;

    let client = find_first(&verified, verified.root_ref(), "LocalScript", Some("BrookhavenCompat"))
        .ok_or("patched place missing BrookhavenCompat LocalScript")?;
    let server = find_first(&verified, verified.root_ref(), "Script", Some("BrookhavenHouseCompat"))
        .ok_or("patched place missing BrookhavenHouseCompat Script")?;
    let runtime_core = find_first(&verified, verified.root_ref(), "ModuleScript", Some("BrookhavenNativeRuntimeCore"))
        .ok_or("patched place missing BrookhavenNativeRuntimeCore ModuleScript")?;
    let starter_gui = find_first(&verified, verified.root_ref(), "StarterGui", None)
        .ok_or("patched place missing StarterGui")?;
    let avatar = direct_child(&verified, starter_gui, "AvatarEditor")
        .ok_or("patched place missing StarterGui AvatarEditor clone")?;
    let avatar_instance = verified.get_by_ref(avatar).ok_or("StarterGui AvatarEditor disappeared")?;
    if avatar_instance.class.as_str() != "LocalScript" {
        return Err("StarterGui AvatarEditor clone is not a LocalScript".into());
    }
    if avatar_instance.children().is_empty() {
        return Err("StarterGui AvatarEditor clone lost its controller children".into());
    }

    let client_source_len = match verified.get_by_ref(client).and_then(|i| i.properties.get(&ustr("Source"))) {
        Some(Variant::String(value)) => value.len(),
        _ => 0,
    };
    let server_source_len = match verified.get_by_ref(server).and_then(|i| i.properties.get(&ustr("Source"))) {
        Some(Variant::String(value)) => value.len(),
        _ => 0,
    };
    let runtime_core_source_len = match verified.get_by_ref(runtime_core).and_then(|i| i.properties.get(&ustr("Source"))) {
        Some(Variant::String(value)) => value.len(),
        _ => 0,
    };
    if client_source_len < 1_000 || server_source_len < 1_000 || runtime_core_source_len < 1_000 {
        return Err("compatibility script source did not survive binary serialization".into());
    }

    let receipt = serde_json::json!({
        "schemaVersion": 1,
        "status": "brookhaven-compat-patched",
        "input": {
            "bytes": input_bytes.len(),
            "sha256": sha256(&input_bytes)
        },
        "output": {
            "bytes": output_bytes.len(),
            "sha256": sha256(&output_bytes)
        },
        "playerHandlerStartupStatementsGuarded": player_handler_patch_count,
        "nativeAvatarEditorClonedToStarterGui": true,
        "nativeAvatarEditorCloneRef": format!("{:?}", avatar_clone_ref),
        "nativeAvatarEditorCloneChildren": avatar_instance.children().len(),
        "nativeSourceInventory": native_source_inventory,
        "injected": {
            "client": "StarterGui/BrookhavenCompat",
            "clientSourceBytes": client_source_len,
            "server": "ServerScriptService/BrookhavenHouseCompat",
            "serverSourceBytes": server_source_len,
            "runtimeCore": "ServerScriptService/BrookhavenNativeRuntimeCore",
            "runtimeCoreSourceBytes": runtime_core_source_len
        },
        "worldGeometryRebuilt": false,
        "existingGuiRestyled": false
    });

    if let Some(path) = receipt_path {
        fs::write(path, serde_json::to_vec_pretty(&receipt)?)?;
    }
    println!("{}", serde_json::to_string_pretty(&receipt)?);
    Ok(())
}
