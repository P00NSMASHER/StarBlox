use std::{
    env,
    fs::{self, File},
    io::{BufReader, BufWriter},
    path::{Path, PathBuf},
    process,
};

use rbx_dom_weak::{InstanceBuilder, WeakDom};

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
            "unsupported Roblox input extension: .{} (expected rbxl/rbxm/rbxlx/rbxmx)",
            ext
        )
        .into()),
    }
}

fn arg_value(args: &[String], name: &str) -> Option<String> {
    args.iter()
        .position(|arg| arg == name)
        .and_then(|index| args.get(index + 1))
        .cloned()
}

fn containerize(
    source: &WeakDom,
    source_root: rbx_dom_weak::types::Ref,
    container_name: &str,
) -> Result<WeakDom, Box<dyn std::error::Error>> {
    let source_instance = source
        .get_by_ref(source_root)
        .ok_or("source root disappeared before containerization")?;
    let children = source_instance.children().to_vec();

    if children.is_empty() {
        return Err("source root has no children to stage".into());
    }

    let mut dest = WeakDom::new(
        InstanceBuilder::new("Folder").with_name(container_name.to_owned()),
    );
    let cloned = source.clone_multiple_into_external(&children, &mut dest);
    let dest_root = dest.root_ref();
    for referent in cloned {
        dest.transfer_within(referent, dest_root);
    }

    Ok(dest)
}

fn write_model(dom: &WeakDom, out_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(parent) = out_path.parent() {
        fs::create_dir_all(parent)?;
    }
    if out_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase()
        != "rbxmx"
    {
        return Err("quarantine container output must use .rbxmx".into());
    }

    let output = BufWriter::new(File::create(out_path)?);
    rbx_xml::to_writer_default(output, dom, &[dom.root_ref()])?;
    Ok(())
}

fn json_escape(value: &str) -> String {
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

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let args = env::args().skip(1).collect::<Vec<_>>();
    let input = arg_value(&args, "--input")
        .ok_or("usage: containerize --input exported.rbxmx --out staged.rbxmx --name Container")?;
    let out = arg_value(&args, "--out").ok_or("--out is required")?;
    let name = arg_value(&args, "--name").unwrap_or_else(|| "ImportedSource".to_owned());

    if name.trim().is_empty() {
        return Err("--name must be non-empty".into());
    }

    let input_path = PathBuf::from(input);
    let out_path = PathBuf::from(out);
    let source = read_dom(&input_path)?;

    let roots = source.root().children().to_vec();
    if roots.len() != 1 {
        return Err(format!(
            "migration artifact must contain exactly one exported root, found {}",
            roots.len()
        )
        .into());
    }

    let source_root = roots[0];
    let source_instance = source
        .get_by_ref(source_root)
        .ok_or("migration artifact root is missing")?;
    let source_name = source_instance.name.to_string();
    let source_class = source_instance.class.to_string();
    let source_child_count = source_instance.children().len();

    let staged = containerize(&source, source_root, &name)?;
    let staged_child_count = staged.root().children().len();
    if staged_child_count != source_child_count {
        return Err("containerized child count does not match source root child count".into());
    }

    write_model(&staged, &out_path)?;

    println!(
        "{{\"ok\":true,\"sourceName\":{},\"sourceClass\":{},\"sourceChildCount\":{},\"containerName\":{},\"containerClass\":\"Folder\",\"stagedChildCount\":{},\"out\":{}}}",
        json_escape(&source_name),
        json_escape(&source_class),
        source_child_count,
        json_escape(&name),
        staged_child_count,
        json_escape(out_path.to_string_lossy().as_ref())
    );

    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("starblox quarantine containerizer error: {error}");
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
        env::temp_dir().join(format!("starblox-containerize-{unique}-{name}"))
    }

    #[test]
    fn wraps_service_children_in_neutral_folder() {
        let input = temp_path("service.rbxmx");
        let output = temp_path("staged.rbxmx");

        fs::write(
            &input,
            r#"
<roblox version="4">
  <Item class="StarterGui" referent="RBX1">
    <Properties>
      <string name="Name">StarterGui</string>
    </Properties>
    <Item class="ScreenGui" referent="RBX2">
      <Properties><string name="Name">ImportedUi</string></Properties>
      <Item class="LocalScript" referent="RBX3">
        <Properties>
          <string name="Name">Controller</string>
          <ProtectedString name="Source">return nil</ProtectedString>
        </Properties>
      </Item>
    </Item>
    <Item class="Folder" referent="RBX4">
      <Properties><string name="Name">Shared</string></Properties>
    </Item>
  </Item>
</roblox>
"#,
        )
        .unwrap();

        let source = read_dom(&input).unwrap();
        let source_root = source.root().children()[0];
        let staged = containerize(&source, source_root, "StarterGuiSource").unwrap();

        assert_eq!(staged.root().class.as_str(), "Folder");
        assert_eq!(staged.root().name, "StarterGuiSource");
        assert_eq!(staged.root().children().len(), 2);

        write_model(&staged, &output).unwrap();
        let round_trip = read_dom(&output).unwrap();
        let roots = round_trip.root().children();
        assert_eq!(roots.len(), 1);
        let container = round_trip.get_by_ref(roots[0]).unwrap();
        assert_eq!(container.class.as_str(), "Folder");
        assert_eq!(container.name, "StarterGuiSource");
        assert_eq!(container.children().len(), 2);

        let _ = fs::remove_file(input);
        let _ = fs::remove_file(output);
    }
}
