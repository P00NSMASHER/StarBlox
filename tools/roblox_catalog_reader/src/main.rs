use std::{
    env,
    fs::File,
    io::{self, BufReader},
    path::Path,
    process,
};

use rbx_dom_weak::DomViewer;

fn read_dom(path: &Path) -> Result<rbx_dom_weak::WeakDom, Box<dyn std::error::Error>> {
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
            "unsupported Roblox file extension: .{} (expected rbxl/rbxm/rbxlx/rbxmx)",
            ext
        )
        .into()),
    }
}

fn run() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = env::args().skip(1);
    let raw_path = args
        .next()
        .ok_or("usage: starblox-roblox-catalog-reader <file.rbxl|rbxm|rbxlx|rbxmx> [--pretty]")?;
    let pretty = args.any(|arg| arg == "--pretty");
    let path = Path::new(&raw_path);

    let dom = read_dom(path)?;
    let view = DomViewer::new().view(&dom);

    let stdout = io::stdout();
    let mut out = stdout.lock();
    if pretty {
        serde_json::to_writer_pretty(&mut out, &view)?;
    } else {
        serde_json::to_writer(&mut out, &view)?;
    }
    println!();

    Ok(())
}

fn main() {
    if let Err(error) = run() {
        eprintln!("starblox Roblox reader error: {error}");
        process::exit(1);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::{
        fs,
        time::{SystemTime, UNIX_EPOCH},
    };

    fn temp_path(ext: &str) -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        env::temp_dir().join(format!("starblox-rbx-reader-{unique}.{ext}"))
    }

    #[test]
    fn reads_xml_models_into_a_serializable_dom() {
        let path = temp_path("rbxmx");
        let source = r#"
<roblox version="4">
  <Item class="Model" referent="RBX1">
    <Properties>
      <string name="Name">Brookhaven House</string>
    </Properties>
    <Item class="RemoteEvent" referent="RBX2">
      <Properties>
        <string name="Name">OpenGarage</string>
      </Properties>
    </Item>
  </Item>
</roblox>
"#;
        fs::write(&path, source).unwrap();

        let dom = read_dom(&path).unwrap();
        let view = DomViewer::new().view(&dom);
        let json = serde_json::to_string(&view).unwrap();

        assert!(json.contains("Brookhaven House"));
        assert!(json.contains("RemoteEvent"));
        assert!(json.contains("OpenGarage"));

        let _ = fs::remove_file(path);
    }

    #[test]
    fn rejects_unknown_extensions() {
        let path = temp_path("txt");
        fs::write(&path, "not a Roblox file").unwrap();
        let error = read_dom(&path).unwrap_err().to_string();
        assert!(error.contains("unsupported Roblox file extension"));
        let _ = fs::remove_file(path);
    }
}
