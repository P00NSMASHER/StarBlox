use std::{
    env,
    fs::File,
    io::BufReader,
    path::{Path, PathBuf},
    process,
};

use rbx_dom_weak::{types::{Ref, Variant}, ustr, WeakDom};
use serde_json::json;

fn read_dom(path: &Path) -> Result<WeakDom, Box<dyn std::error::Error>> {
    let ext = path.extension().and_then(|v| v.to_str()).unwrap_or("").to_ascii_lowercase();
    let input = BufReader::new(File::open(path)?);
    match ext.as_str() {
        "rbxl" | "rbxm" => Ok(rbx_binary::from_reader(input)?),
        "rbxlx" | "rbxmx" => Ok(rbx_xml::from_reader_default(input)?),
        _ => Err(format!("unsupported Roblox extension: .{ext}").into()),
    }
}

fn child_named(dom: &WeakDom, parent: Ref, name: &str) -> Result<Ref, Box<dyn std::error::Error>> {
    let instance = dom.get_by_ref(parent).ok_or("missing parent referent")?;
    let matches = instance.children().iter().copied().filter(|child_ref| {
        dom.get_by_ref(*child_ref).map(|child| child.name == name).unwrap_or(false)
    }).collect::<Vec<_>>();
    match matches.as_slice() {
        [only] => Ok(*only),
        [] => Err(format!("missing child named {name}").into()),
        _ => Err(format!("ambiguous child named {name}").into()),
    }
}

fn resolve_path(dom: &WeakDom, segments: &[&str]) -> Result<Ref, Box<dyn std::error::Error>> {
    let mut current = dom.root_ref();
    for segment in segments {
        current = child_named(dom, current, segment)?;
    }
    Ok(current)
}

#[derive(Default)]
struct CompareStats {
    instance_count: usize,
    script_count: usize,
    remote_count: usize,
}

fn compare_subtrees(
    expected_dom: &WeakDom,
    expected_ref: Ref,
    actual_dom: &WeakDom,
    actual_ref: Ref,
    path: &str,
    stats: &mut CompareStats,
    allow_rojo_mount_root_normalization: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let expected = expected_dom.get_by_ref(expected_ref).ok_or("expected referent missing")?;
    let actual = actual_dom.get_by_ref(actual_ref).ok_or("actual referent missing")?;

    if expected.name != actual.name {
        return Err(format!("{path}: name drift: expected {:?}, found {:?}", expected.name, actual.name).into());
    }
    if expected.class != actual.class {
        return Err(format!("{path}: class drift: expected {}, found {}", expected.class, actual.class).into());
    }
    if expected.properties != actual.properties {
        let known_root_normalization = allow_rojo_mount_root_normalization
            && expected.properties.is_empty()
            && actual.properties.len() == 1
            && matches!(
                actual.properties.get(&ustr("NeedsPivotMigration")),
                Some(Variant::Bool(false))
            );
        if !known_root_normalization {
            return Err(format!("{path}: property drift for {} {} expected={:?} actual={:?}", expected.class, expected.name, expected.properties, actual.properties).into());
        }
    }

    stats.instance_count += 1;
    if matches!(expected.class.as_str(), "Script" | "LocalScript" | "ModuleScript") {
        stats.script_count += 1;
    }
    if matches!(expected.class.as_str(), "RemoteEvent" | "RemoteFunction" | "UnreliableRemoteEvent") {
        stats.remote_count += 1;
    }

    if expected.children().len() != actual.children().len() {
        return Err(format!(
            "{path}: child-count drift for {}: expected {}, found {}",
            expected.name,
            expected.children().len(),
            actual.children().len()
        ).into());
    }

    let mut used = vec![false; actual.children().len()];
    for expected_child_ref in expected.children().iter().copied() {
        let expected_child = expected_dom.get_by_ref(expected_child_ref).ok_or("expected child missing")?;
        let candidates = actual.children().iter().enumerate().filter_map(|(index, child_ref)| {
            if used[index] {
                return None;
            }
            actual_dom.get_by_ref(*child_ref).and_then(|child| {
                if child.name == expected_child.name && child.class == expected_child.class {
                    Some((index, *child_ref))
                } else {
                    None
                }
            })
        }).collect::<Vec<_>>();

        if candidates.len() != 1 {
            return Err(format!(
                "{path}: expected exactly one child {} {} but found {}",
                expected_child.class,
                expected_child.name,
                candidates.len()
            ).into());
        }

        let (index, actual_child_ref) = candidates[0];
        used[index] = true;
        let child_path = format!("{path}/{}", expected_child.name);
        compare_subtrees(
            expected_dom,
            expected_child_ref,
            actual_dom,
            actual_child_ref,
            &child_path,
            stats,
            false,
        )?;
    }

    Ok(())
}

fn verify(baseline_path: &Path, mounted_path: &Path) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let baseline = read_dom(baseline_path)?;
    let mounted = read_dom(mounted_path)?;

    let baseline_children = baseline.root().children();
    if baseline_children.len() != 1 {
        return Err(format!("baseline must have exactly one root model, found {}", baseline_children.len()).into());
    }
    let baseline_world_ref = baseline_children[0];
    let baseline_world = baseline.get_by_ref(baseline_world_ref).ok_or("baseline world missing")?;
    if baseline_world.name != "BrookhavenWorldBaseline" || baseline_world.class.as_str() != "Model" {
        return Err("baseline root must be Model BrookhavenWorldBaseline".into());
    }

    let workspace_ref = resolve_path(&mounted, &["Workspace"])?;
    let mounted_world_ref = child_named(&mounted, workspace_ref, "BrookhavenWorldBaseline")?;

    let mut stats = CompareStats::default();
    compare_subtrees(
        &baseline,
        baseline_world_ref,
        &mounted,
        mounted_world_ref,
        "Workspace/BrookhavenWorldBaseline",
        &mut stats,
        true,
    )?;

    for path in [
        ["ReplicatedStorage", "StarBlox"].as_slice(),
        ["ServerScriptService", "StarBlox"].as_slice(),
        ["StarterPlayer", "StarterPlayerScripts", "StarBlox"].as_slice(),
    ] {
        resolve_path(&mounted, path)?;
    }

    if stats.script_count != 0 || stats.remote_count != 0 {
        return Err(format!(
            "locked Brookhaven world gained executable/network objects: scripts={}, remotes={}",
            stats.script_count, stats.remote_count
        ).into());
    }

    Ok(json!({
        "ok": true,
        "world": {
            "path": "Workspace/BrookhavenWorldBaseline",
            "descendantPropertiesExact": true,
            "rawRootPropertyExact": false,
            "knownRojoRootNormalization": {"NeedsPivotMigration": false},
            "propertyExactAfterKnownRojoNormalization": true,
            "instanceCount": stats.instance_count,
            "scriptCount": stats.script_count,
            "remoteCount": stats.remote_count
        },
        "starBlox": {
            "replicatedStorageRoot": true,
            "serverScriptServiceRoot": true,
            "starterPlayerScriptsRoot": true
        }
    }))
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let args = env::args().skip(1).collect::<Vec<_>>();
    if args.len() != 2 {
        return Err("usage: verifier <baseline.rbxmx> <mounted.rbxlx>".into());
    }
    let baseline = PathBuf::from(&args[0]);
    let mounted = PathBuf::from(&args[1]);
    let result = verify(&baseline, &mounted)?;
    println!("{}", serde_json::to_string(&result)?);
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("StarBlox Step 5 world mount verifier error: {error}");
        process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{fs, time::{SystemTime, UNIX_EPOCH}};

    fn temp(ext: &str) -> PathBuf {
        let id = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();
        env::temp_dir().join(format!("starblox-step5-{id}.{ext}"))
    }

    fn baseline_xml(color: &str) -> String {
        format!(r#"<roblox version="4">
<Item class="Model" referent="B0"><Properties><string name="Name">BrookhavenWorldBaseline</string><bool name="NeedsPivotMigration">false</bool></Properties>
<Item class="Part" referent="B1"><Properties><string name="Name">BHW_0001</string><Color3 name="Color"><R>{color}</R><G>0</G><B>0</B></Color3></Properties></Item>
</Item></roblox>"#)
    }

    fn mounted_xml(color: &str) -> String {
        format!(r#"<roblox version="4">
<Item class="Workspace" referent="W"><Properties><string name="Name">Workspace</string></Properties>
<Item class="Model" referent="B0"><Properties><string name="Name">BrookhavenWorldBaseline</string></Properties>
<Item class="Part" referent="B1"><Properties><string name="Name">BHW_0001</string><Color3 name="Color"><R>{color}</R><G>0</G><B>0</B></Color3></Properties></Item>
</Item></Item>
<Item class="ReplicatedStorage" referent="R"><Properties><string name="Name">ReplicatedStorage</string></Properties><Item class="Folder" referent="RS"><Properties><string name="Name">StarBlox</string></Properties></Item></Item>
<Item class="ServerScriptService" referent="S"><Properties><string name="Name">ServerScriptService</string></Properties><Item class="Folder" referent="SS"><Properties><string name="Name">StarBlox</string></Properties></Item></Item>
<Item class="StarterPlayer" referent="P"><Properties><string name="Name">StarterPlayer</string></Properties><Item class="StarterPlayerScripts" referent="PS"><Properties><string name="Name">StarterPlayerScripts</string></Properties><Item class="Folder" referent="PSB"><Properties><string name="Name">StarBlox</string></Properties></Item></Item></Item>
</roblox>"#)
    }

    #[test]
    fn accepts_property_exact_world_with_starblox_roots() {
        let baseline = temp("rbxmx");
        let mounted = temp("rbxlx");
        fs::write(&baseline, baseline_xml("1")).unwrap();
        fs::write(&mounted, mounted_xml("1")).unwrap();
        let result = verify(&baseline, &mounted).unwrap();
        assert_eq!(result["world"]["propertyExactAfterKnownRojoNormalization"], true);
        assert_eq!(result["world"]["knownRojoRootNormalization"]["NeedsPivotMigration"], false);
        assert_eq!(result["world"]["instanceCount"], 2);
        let _ = fs::remove_file(baseline);
        let _ = fs::remove_file(mounted);
    }

    #[test]
    fn rejects_property_drift() {
        let baseline = temp("rbxmx");
        let mounted = temp("rbxlx");
        fs::write(&baseline, baseline_xml("1")).unwrap();
        fs::write(&mounted, mounted_xml("0.5")).unwrap();
        let error = verify(&baseline, &mounted).unwrap_err().to_string();
        assert!(error.contains("property drift"));
        let _ = fs::remove_file(baseline);
        let _ = fs::remove_file(mounted);
    }
}
