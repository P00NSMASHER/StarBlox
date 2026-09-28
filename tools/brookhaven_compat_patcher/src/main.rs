use std::{
    env,
    fs::{self, File},
    io::{BufReader, BufWriter},
    path::Path,
};

use rbx_dom_weak::{types::Ref, InstanceBuilder, WeakDom};
use serde_json::json;
use sha2::{Digest, Sha256};

const SERVER_SOURCE: &str = include_str!("../../../runtime/BrookhavenCompatibility.server.luau");
const CLIENT_SOURCE: &str = include_str!("../../../runtime/BrookhavenCompatibility.client.luau");

fn read_dom(path: &Path) -> Result<WeakDom, Box<dyn std::error::Error>> {
    let input = BufReader::new(File::open(path)?);
    Ok(rbx_binary::from_reader(input)?)
}

fn find_first_class(dom: &WeakDom, current: Ref, class_name: &str) -> Option<Ref> {
    let instance = dom.get_by_ref(current)?;
    if instance.class.as_str() == class_name {
        return Some(current);
    }
    for child in instance.children() {
        if let Some(found) = find_first_class(dom, *child, class_name) {
            return Some(found);
        }
    }
    None
}

fn find_child_named(dom: &WeakDom, parent: Ref, name: &str) -> Option<Ref> {
    let instance = dom.get_by_ref(parent)?;
    instance.children().iter().copied().find(|child| {
        dom.get_by_ref(*child)
            .map(|item| item.name == name)
            .unwrap_or(false)
    })
}

fn count_descendants(dom: &WeakDom, root: Ref) -> usize {
    fn walk(dom: &WeakDom, current: Ref, count: &mut usize) {
        let Some(instance) = dom.get_by_ref(current) else {
            return;
        };
        for child in instance.children() {
            *count += 1;
            walk(dom, *child, count);
        }
    }
    let mut count = 0;
    walk(dom, root, &mut count);
    count
}

fn is_geometry(class_name: &str) -> bool {
    matches!(
        class_name,
        "Part"
            | "MeshPart"
            | "WedgePart"
            | "CornerWedgePart"
            | "UnionOperation"
            | "TrussPart"
            | "Seat"
            | "VehicleSeat"
    )
}

fn count_geometry(dom: &WeakDom, root: Ref) -> usize {
    fn walk(dom: &WeakDom, current: Ref, count: &mut usize) {
        let Some(instance) = dom.get_by_ref(current) else {
            return;
        };
        if is_geometry(instance.class.as_str()) {
            *count += 1;
        }
        for child in instance.children() {
            walk(dom, *child, count);
        }
    }
    let mut count = 0;
    walk(dom, root, &mut count);
    count
}

fn count_class(dom: &WeakDom, root: Ref, class_name: &str) -> usize {
    fn walk(dom: &WeakDom, current: Ref, class_name: &str, count: &mut usize) {
        let Some(instance) = dom.get_by_ref(current) else {
            return;
        };
        if instance.class.as_str() == class_name {
            *count += 1;
        }
        for child in instance.children() {
            walk(dom, *child, class_name, count);
        }
    }
    let mut count = 0;
    walk(dom, root, class_name, &mut count);
    count
}

fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = env::args().skip(1);
    let input_path = args
        .next()
        .ok_or("usage: brookhaven-compat-patcher <input.rbxl> <output.rbxl> <report.json>")?;
    let output_path = args.next().ok_or("output path is required")?;
    let report_path = args.next().ok_or("report path is required")?;

    let input_bytes = fs::read(&input_path)?;
    let input_sha256 = sha256_hex(&input_bytes);
    let mut dom = read_dom(Path::new(&input_path))?;

    let workspace = find_first_class(&dom, dom.root_ref(), "Workspace")
        .ok_or("input place has no Workspace")?;
    let starter_gui = find_first_class(&dom, dom.root_ref(), "StarterGui")
        .ok_or("input place has no StarterGui")?;
    let server_scripts = find_first_class(&dom, dom.root_ref(), "ServerScriptService")
        .ok_or("input place has no ServerScriptService")?;

    let before = json!({
        "workspaceDescendants": count_descendants(&dom, workspace),
        "workspaceGeometry": count_geometry(&dom, workspace),
        "starterGuiDescendants": count_descendants(&dom, starter_gui),
        "serverScriptServiceDescendants": count_descendants(&dom, server_scripts),
        "scripts": count_class(&dom, dom.root_ref(), "Script"),
        "localScripts": count_class(&dom, dom.root_ref(), "LocalScript")
    });

    if find_child_named(&dom, server_scripts, "StarBloxCompatibilityServer").is_none() {
        let server = InstanceBuilder::new("Script")
            .with_name("StarBloxCompatibilityServer")
            .with_property("Disabled", false)
            .with_property("Source", SERVER_SOURCE.to_owned());
        dom.insert(server_scripts, server);
    }

    if find_child_named(&dom, starter_gui, "StarBloxCompatibilityClient").is_none() {
        let client = InstanceBuilder::new("LocalScript")
            .with_name("StarBloxCompatibilityClient")
            .with_property("Disabled", false)
            .with_property("Source", CLIENT_SOURCE.to_owned());
        dom.insert(starter_gui, client);
    }

    let roots = dom.root().children().to_vec();
    if let Some(parent) = Path::new(&output_path).parent() {
        fs::create_dir_all(parent)?;
    }
    rbx_binary::to_writer(
        BufWriter::new(File::create(&output_path)?),
        &dom,
        &roots,
    )?;

    let output_bytes = fs::read(&output_path)?;
    let output_sha256 = sha256_hex(&output_bytes);
    let verify = read_dom(Path::new(&output_path))?;

    let verify_workspace = find_first_class(&verify, verify.root_ref(), "Workspace")
        .ok_or("patched place lost Workspace")?;
    let verify_starter_gui = find_first_class(&verify, verify.root_ref(), "StarterGui")
        .ok_or("patched place lost StarterGui")?;
    let verify_server_scripts = find_first_class(&verify, verify.root_ref(), "ServerScriptService")
        .ok_or("patched place lost ServerScriptService")?;

    let after = json!({
        "workspaceDescendants": count_descendants(&verify, verify_workspace),
        "workspaceGeometry": count_geometry(&verify, verify_workspace),
        "starterGuiDescendants": count_descendants(&verify, verify_starter_gui),
        "serverScriptServiceDescendants": count_descendants(&verify, verify_server_scripts),
        "scripts": count_class(&verify, verify.root_ref(), "Script"),
        "localScripts": count_class(&verify, verify.root_ref(), "LocalScript")
    });

    let before_workspace_desc = before["workspaceDescendants"].as_u64().unwrap();
    let after_workspace_desc = after["workspaceDescendants"].as_u64().unwrap();
    let before_geometry = before["workspaceGeometry"].as_u64().unwrap();
    let after_geometry = after["workspaceGeometry"].as_u64().unwrap();
    let before_starter = before["starterGuiDescendants"].as_u64().unwrap();
    let after_starter = after["starterGuiDescendants"].as_u64().unwrap();
    let before_server = before["serverScriptServiceDescendants"].as_u64().unwrap();
    let after_server = after["serverScriptServiceDescendants"].as_u64().unwrap();
    let before_scripts = before["scripts"].as_u64().unwrap();
    let after_scripts = after["scripts"].as_u64().unwrap();
    let before_locals = before["localScripts"].as_u64().unwrap();
    let after_locals = after["localScripts"].as_u64().unwrap();

    if before_workspace_desc != after_workspace_desc {
        return Err(format!(
            "workspace descendant count changed: {before_workspace_desc} -> {after_workspace_desc}"
        )
        .into());
    }
    if before_geometry != after_geometry {
        return Err(format!("workspace geometry changed: {before_geometry} -> {after_geometry}").into());
    }
    if after_starter != before_starter + 1 {
        return Err(format!(
            "expected exactly one StarterGui descendant addition: {before_starter} -> {after_starter}"
        )
        .into());
    }
    if after_server != before_server + 1 {
        return Err(format!(
            "expected exactly one ServerScriptService descendant addition: {before_server} -> {after_server}"
        )
        .into());
    }
    if after_scripts != before_scripts + 1 {
        return Err(format!("expected one added Script: {before_scripts} -> {after_scripts}").into());
    }
    if after_locals != before_locals + 1 {
        return Err(format!("expected one added LocalScript: {before_locals} -> {after_locals}").into());
    }
    if find_child_named(&verify, verify_server_scripts, "StarBloxCompatibilityServer").is_none() {
        return Err("patched place missing compatibility server script".into());
    }
    if find_child_named(&verify, verify_starter_gui, "StarBloxCompatibilityClient").is_none() {
        return Err("patched place missing compatibility client script".into());
    }

    let report = json!({
        "schemaVersion": 1,
        "status": "brookhaven-compatibility-patch-verified",
        "input": {
            "path": input_path,
            "bytes": input_bytes.len(),
            "sha256": input_sha256
        },
        "output": {
            "path": output_path,
            "bytes": output_bytes.len(),
            "sha256": output_sha256
        },
        "before": before,
        "after": after,
        "invariants": {
            "workspaceDescendantsUnchanged": true,
            "workspaceGeometryUnchanged": true,
            "addedServerScripts": 1,
            "addedClientScripts": 1,
            "visualWorldMutation": false
        }
    });

    if let Some(parent) = Path::new(&report_path).parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&report_path, serde_json::to_string_pretty(&report)? + "\n")?;
    println!("{}", serde_json::to_string_pretty(&report)?);
    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("Brookhaven compatibility patcher error: {error}");
        std::process::exit(1);
    }
}
