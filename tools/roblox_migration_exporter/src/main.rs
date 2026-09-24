use std::{
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

fn arg_value(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|arg| arg == name)
        .and_then(|index| args.get(index + 1))
        .cloned()
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let args = env::args().skip(1).collect::<Vec<_>>();
    let source = arg_value(&args, "--input")
        .ok_or("usage: exporter --input Place.rbxl --path DataModel/System --out output.rbxmx")?;
    let instance_path = arg_value(&args, "--path").ok_or("--path is required")?;
    let out = arg_value(&args, "--out").ok_or("--out is required")?;

    let source_path = PathBuf::from(source);
    let out_path = PathBuf::from(out);

    let dom = read_dom(&source_path)?;
    let referent = resolve_path(&dom, &instance_path)?;
    write_subtree(&dom, referent, &out_path)?;

    let instance = dom
        .get_by_ref(referent)
        .ok_or("resolved referent disappeared before export")?;

    println!(
        "{{\"ok\":true,\"name\":{},\"className\":{},\"path\":{},\"out\":{}}}",
        serde_json_escape(&instance.name),
        serde_json_escape(instance.class.as_str()),
        serde_json_escape(&instance_path),
        serde_json_escape(out_path.to_string_lossy().as_ref()),
    );

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
