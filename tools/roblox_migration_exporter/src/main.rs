use std::{
    collections::HashSet,
    env,
    fs::{self, File},
    io::{BufReader, BufWriter},
    path::{Path, PathBuf},
    process,
};

use rbx_dom_weak::{types::Ref, WeakDom};

fn read_dom(path: &Path) -> Result<WeakDom, Box<dyn std::error::Error>> {
    let ext = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    let input = BufReader::new(File::open(path)?);

    match ext.as_str() {
        "rbxl" | "rbxm" => Ok(rbx_binary::from_reader(input)?),
        "rbxlx" | "rbxmx" => Ok(rbx_xml::from_reader_default(input)?),
        _ => Err(format!(
            "unsupported Roblox source extension: .{} (expected rbxl/rbxm/rbxlx/rbxmx)",
            ext
        )
        .into()),
    }
}

fn split_path(raw: &str) -> Vec<&str> {
    raw.split('/')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
}

fn resolve_path(dom: &WeakDom, raw: &str) -> Result<Ref, Box<dyn std::error::Error>> {
    let mut segments = split_path(raw);
    if segments.is_empty() {
        return Err("instance path must be non-empty".into());
    }

    let root = dom.root();
    if segments.first().copied() == Some(root.name.as_str())
        || segments.first().copied() == Some(root.class.as_str())
    {
        segments.remove(0);
    }

    let mut current = dom.root_ref();

    for segment in segments {
        let instance = dom
            .get_by_ref(current)
            .ok_or_else(|| format!("missing instance for referent while resolving {raw}"))?;

        let mut matches = instance
            .children()
            .iter()
            .copied()
            .filter(|child_ref| {
                dom.get_by_ref(*child_ref)
                    .map(|child| child.name == segment)
                    .unwrap_or(false)
            });

        let next = matches
            .next()
            .ok_or_else(|| format!("path segment not found: {segment} in {raw}"))?;

        if matches.next().is_some() {
            return Err(format!(
                "ambiguous path segment: {segment} in {raw}; rename duplicate siblings before migration"
            )
            .into());
        }

        current = next;
    }

    Ok(current)
}

fn write_subtree(
    dom: &WeakDom,
    referent: Ref,
    out_path: &Path,
) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(parent) = out_path.parent() {
        fs::create_dir_all(parent)?;
    }

    let ext = out_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    let output = BufWriter::new(File::create(out_path)?);

    match ext.as_str() {
        "rbxmx" => rbx_xml::to_writer_default(output, dom, &[referent])?,
        "rbxm" => rbx_binary::to_writer(output, dom, &[referent])?,
        _ => {
            return Err(format!(
                "unsupported migration output extension: .{} (expected rbxmx or rbxm)",
                ext
            )
            .into())
        }
    }

    Ok(())
}

const FORBIDDEN_PROJECTION_CLASSES: &[&str] = &[
    "Script",
    "LocalScript",
    "ModuleScript",
    "RemoteEvent",
    "RemoteFunction",
    "UnreliableRemoteEvent",
    "BindableEvent",
    "BindableFunction",
];

#[derive(Debug, Clone, Copy)]
struct ProjectionStats {
    stripped_instances: usize,
    stripped_forbidden_instances: usize,
    forbidden_remaining: usize,
}

fn is_projection_forbidden(class_name: &str) -> bool {
    FORBIDDEN_PROJECTION_CLASSES
        .iter()
        .any(|forbidden| *forbidden == class_name)
}

fn sanitize_projection_subtree(
    dom: &mut WeakDom,
    referent: Ref,
) -> Result<ProjectionStats, Box<dyn std::error::Error>> {
    let root = dom
        .get_by_ref(referent)
        .ok_or("projection root disappeared before sanitization")?;
    if is_projection_forbidden(root.class.as_str()) {
        return Err("asset projection root cannot itself be executable/networking".into());
    }

    let forbidden = dom
        .descendants_of(referent)
        .filter(|instance| is_projection_forbidden(instance.class.as_str()))
        .map(|instance| instance.referent())
        .collect::<HashSet<_>>();

    let roots = forbidden
        .iter()
        .copied()
        .filter(|candidate| {
            dom.ancestors_of(*candidate)
                .skip(1)
                .all(|ancestor| !forbidden.contains(&ancestor.referent()))
        })
        .collect::<Vec<_>>();

    let stripped_instances = roots
        .iter()
        .map(|root_ref| dom.descendants_of(*root_ref).count())
        .sum();

    for root_ref in roots {
        dom.destroy(root_ref);
    }

    let forbidden_remaining = dom
        .descendants_of(referent)
        .filter(|instance| is_projection_forbidden(instance.class.as_str()))
        .count();

    Ok(ProjectionStats {
        stripped_instances,
        stripped_forbidden_instances: forbidden.len(),
        forbidden_remaining,
    })
}

fn write_asset_projection(
    dom: &mut WeakDom,
    referent: Ref,
    out_path: &Path,
) -> Result<ProjectionStats, Box<dyn std::error::Error>> {
    let stats = sanitize_projection_subtree(dom, referent)?;
    if stats.forbidden_remaining != 0 {
        return Err("asset projection still contains forbidden executable/network instances".into());
    }

    let source = dom
        .get_by_ref(referent)
        .ok_or("projection root disappeared before wrapping")?;
    let projection_name = format!("{} Assets", source.name);
    let children = source.children().to_vec();

    let mut projected = WeakDom::new(
        rbx_dom_weak::InstanceBuilder::new("Folder").with_name(projection_name),
    );
    let projected_root = projected.root_ref();
    for child in children {
        dom.transfer(child, &mut projected, projected_root);
    }

    write_subtree(&projected, projected.root_ref(), out_path)?;
    Ok(stats)
}

fn arg_value(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|arg| arg == name)
        .and_then(|index| args.get(index + 1))
        .cloned()
}

fn export_pairs(args: &[String]) -> Result<Vec<(String, PathBuf)>, Box<dyn std::error::Error>> {
    let mut paths = Vec::new();
    let mut outs = Vec::new();

    for (index, arg) in args.iter().enumerate() {
        if arg == "--path" {
            paths.push(
                args.get(index + 1)
                    .ok_or("--path requires a value")?
                    .clone(),
            );
        }
        if arg == "--out" {
            outs.push(PathBuf::from(
                args.get(index + 1)
                    .ok_or("--out requires a value")?,
            ));
        }
    }

    if paths.is_empty() {
        return Err("--path is required".into());
    }
    if paths.len() != outs.len() {
        return Err("every --path must have one corresponding --out".into());
    }

    Ok(paths.into_iter().zip(outs).collect())
}

fn export_result_json(
    name: &str,
    class_name: &str,
    instance_path: &str,
    out_path: &Path,
    projection: Option<ProjectionStats>,
) -> String {
    let (sanitized, stripped_instances, stripped_forbidden_instances, forbidden_remaining) =
        match projection {
            Some(stats) => (
                true,
                stats.stripped_instances,
                stats.stripped_forbidden_instances,
                stats.forbidden_remaining,
            ),
            None => (false, 0, 0, 0),
        };

    format!(
        "{{\"ok\":true,\"name\":{},\"className\":{},\"path\":{},\"out\":{},\"assetProjection\":{},\"strippedInstances\":{},\"strippedForbiddenInstances\":{},\"forbiddenRemaining\":{}}}",
        serde_json_escape(name),
        serde_json_escape(class_name),
        serde_json_escape(instance_path),
        serde_json_escape(out_path.to_string_lossy().as_ref()),
        sanitized,
        stripped_instances,
        stripped_forbidden_instances,
        forbidden_remaining,
    )
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let args = env::args().skip(1).collect::<Vec<_>>();
    let source = arg_value(&args, "--input")
        .ok_or("usage: exporter --input Place.rbxl --path DataModel/System --out output.rbxmx")?;
    let pairs = export_pairs(&args)?;
    let asset_projection = args.iter().any(|arg| arg == "--asset-projection");

    if asset_projection && pairs.len() != 1 {
        return Err("asset projection exports must run one subtree per fresh DOM".into());
    }

    let source_path = PathBuf::from(source);
    let mut dom = read_dom(&source_path)?;
    let mut results = Vec::with_capacity(pairs.len());

    for (instance_path, out_path) in &pairs {
        let referent = resolve_path(&dom, instance_path)?;
        let instance = dom
            .get_by_ref(referent)
            .ok_or("resolved referent disappeared before export")?;
        let instance_name = instance.name.clone();
        let instance_class = instance.class.to_string();

        let projection = if asset_projection {
            Some(write_asset_projection(&mut dom, referent, out_path)?)
        } else {
            write_subtree(&dom, referent, out_path)?;
            None
        };

        results.push(export_result_json(
            &instance_name,
            &instance_class,
            instance_path,
            out_path,
            projection,
        ));
    }

    if results.len() == 1 {
        println!("{}", results[0]);
    } else {
        println!(
            "{{\"ok\":true,\"batch\":true,\"count\":{},\"exports\":[{}]}}",
            results.len(),
            results.join(",")
        );
    }

    Ok(())
}

fn serde_json_escape(value: &str) -> String {
    let mut out = String::with_capacity(value.len() + 2);
    out.push('"');
    for ch in value.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if c.is_control() => {
                use std::fmt::Write;
                let _ = write!(&mut out, "\\u{:04x}", c as u32);
            }
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn main() {
    if let Err(error) = run() {
        eprintln!("starblox migration exporter error: {error}");
        process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_path(name: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        env::temp_dir().join(format!("starblox-migrate-{unique}-{name}"))
    }

    fn fixture_xml() -> String {
        r#"
<roblox version="4">
  <Item class="Folder" referent="RBX1">
    <Properties><string name="Name">Systems</string></Properties>
    <Item class="Model" referent="RBX2">
      <Properties><string name="Name">House</string></Properties>
      <Item class="Part" referent="RBX3">
        <Properties><string name="Name">Door</string></Properties>
      </Item>
    </Item>
    <Item class="Model" referent="RBX4">
      <Properties><string name="Name">Vehicle</string></Properties>
    </Item>
  </Item>
</roblox>
"#
        .to_owned()
    }

    #[test]
    fn exports_exact_subtree_to_xml_model() {
        let input = temp_path("fixture.rbxlx");
        let output = temp_path("house.rbxmx");
        fs::write(&input, fixture_xml()).unwrap();

        let dom = read_dom(&input).unwrap();
        let house = resolve_path(&dom, "DataModel/Systems/House").unwrap();
        write_subtree(&dom, house, &output).unwrap();

        let exported = read_dom(&output).unwrap();
        let root = exported.root();
        assert_eq!(root.children().len(), 1);
        let house = exported.get_by_ref(root.children()[0]).unwrap();
        assert_eq!(house.name, "House");
        assert_eq!(house.children().len(), 1);
        let door = exported.get_by_ref(house.children()[0]).unwrap();
        assert_eq!(door.name, "Door");

        let _ = fs::remove_file(input);
        let _ = fs::remove_file(output);
    }

    #[test]
    fn batch_export_reuses_one_dom_for_multiple_subtrees() {
        let input = temp_path("batch-fixture.rbxlx");
        let house_output = temp_path("batch-house.rbxmx");
        let vehicle_output = temp_path("batch-vehicle.rbxmx");
        fs::write(&input, fixture_xml()).unwrap();

        let dom = read_dom(&input).unwrap();
        let house = resolve_path(&dom, "DataModel/Systems/House").unwrap();
        let vehicle = resolve_path(&dom, "DataModel/Systems/Vehicle").unwrap();
        write_subtree(&dom, house, &house_output).unwrap();
        write_subtree(&dom, vehicle, &vehicle_output).unwrap();

        let house_dom = read_dom(&house_output).unwrap();
        let vehicle_dom = read_dom(&vehicle_output).unwrap();
        assert_eq!(house_dom.root().children().len(), 1);
        assert_eq!(vehicle_dom.root().children().len(), 1);
        assert_eq!(
            house_dom.get_by_ref(house_dom.root().children()[0]).unwrap().name,
            "House"
        );
        assert_eq!(
            vehicle_dom.get_by_ref(vehicle_dom.root().children()[0]).unwrap().name,
            "Vehicle"
        );

        let _ = fs::remove_file(input);
        let _ = fs::remove_file(house_output);
        let _ = fs::remove_file(vehicle_output);
    }

    #[test]
    fn sanitized_projection_strips_scripts_and_channels_but_keeps_world_assets() {
        let input = temp_path("projection.rbxlx");
        let output = temp_path("projection.rbxmx");
        fs::write(
            &input,
            r#"
<roblox version="4">
  <Item class="Workspace" referent="RBX1">
    <Properties><string name="Name">Workspace</string></Properties>
    <Item class="Model" referent="RBX2">
      <Properties><string name="Name">Town</string></Properties>
      <Item class="Part" referent="RBX3">
        <Properties><string name="Name">House</string></Properties>
      </Item>
      <Item class="Script" referent="RBX4">
        <Properties><string name="Name">LegacyServer</string><ProtectedString name="Source">print("no")</ProtectedString></Properties>
        <Item class="StringValue" referent="RBX5">
          <Properties><string name="Name">ScriptChild</string></Properties>
        </Item>
      </Item>
      <Item class="RemoteEvent" referent="RBX6">
        <Properties><string name="Name">LegacyRemote</string></Properties>
      </Item>
      <Item class="BindableEvent" referent="RBX7">
        <Properties><string name="Name">LegacyBindable</string></Properties>
      </Item>
    </Item>
  </Item>
</roblox>
"#,
        )
        .unwrap();

        let mut dom = read_dom(&input).unwrap();
        let workspace = resolve_path(&dom, "DataModel/Workspace").unwrap();
        let stats = write_asset_projection(&mut dom, workspace, &output).unwrap();
        assert_eq!(stats.stripped_forbidden_instances, 3);
        assert_eq!(stats.stripped_instances, 4);
        assert_eq!(stats.forbidden_remaining, 0);

        let exported = read_dom(&output).unwrap();
        let root = exported.root();
        assert_eq!(root.children().len(), 1);
        let folder = exported.get_by_ref(root.children()[0]).unwrap();
        assert_eq!(folder.class.as_str(), "Folder");
        let descendants = exported
            .descendants_of(folder.referent())
            .map(|instance| (instance.class.to_string(), instance.name.clone()))
            .collect::<Vec<_>>();
        assert!(descendants.iter().any(|(class, name)| class == "Part" && name == "House"));
        assert!(!descendants.iter().any(|(class, _)| is_projection_forbidden(class)));

        let _ = fs::remove_file(input);
        let _ = fs::remove_file(output);
    }

    #[test]
    fn rejects_ambiguous_duplicate_sibling_names() {
        let input = temp_path("duplicate.rbxlx");
        fs::write(
            &input,
            r#"
<roblox version="4">
  <Item class="Folder" referent="RBX1">
    <Properties><string name="Name">Systems</string></Properties>
    <Item class="Model" referent="RBX2">
      <Properties><string name="Name">House</string></Properties>
    </Item>
    <Item class="Model" referent="RBX3">
      <Properties><string name="Name">House</string></Properties>
    </Item>
  </Item>
</roblox>
"#,
        )
        .unwrap();

        let dom = read_dom(&input).unwrap();
        let error = resolve_path(&dom, "DataModel/Systems/House")
            .unwrap_err()
            .to_string();
        assert!(error.contains("ambiguous path segment"));

        let _ = fs::remove_file(input);
    }
}