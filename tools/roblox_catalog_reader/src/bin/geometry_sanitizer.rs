use std::{
    env,
    fs,
    fs::File,
    io::{BufReader, BufWriter},
    path::Path,
};

use rbx_dom_weak::{types::Ref, InstanceBuilder, WeakDom};
use sha2::{Digest, Sha256};

const EXPECTED_LEGACY_GEOMETRY: usize = 14_459;

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
        _ => Err(format!("unsupported Roblox file extension: .{ext}").into()),
    }
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

fn is_safe_visual(class_name: &str) -> bool {
    matches!(
        class_name,
        "Decal"
            | "Texture"
            | "SpecialMesh"
            | "BlockMesh"
            | "CylinderMesh"
            | "SurfaceAppearance"
            | "PointLight"
            | "SpotLight"
            | "SurfaceLight"
            | "ParticleEmitter"
            | "Smoke"
            | "Fire"
            | "Sparkles"
    )
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

fn clone_safe_visual(
    dom: &WeakDom,
    referent: Ref,
    visual_count: &mut usize,
) -> Option<InstanceBuilder> {
    let instance = dom.get_by_ref(referent)?;
    if !is_safe_visual(instance.class.as_str()) {
        return None;
    }
    let mut builder =
        InstanceBuilder::with_property_capacity(instance.class, instance.properties.len())
            .with_name(instance.name.clone());
    for (key, value) in instance.properties.iter() {
        builder.add_property(*key, value.clone());
    }
    *visual_count += 1;
    Some(builder)
}

fn clone_geometry(
    dom: &WeakDom,
    referent: Ref,
    generated_name: &str,
    visual_count: &mut usize,
) -> Option<InstanceBuilder> {
    let instance = dom.get_by_ref(referent)?;
    if !is_geometry(instance.class.as_str()) {
        return None;
    }

    let mut builder =
        InstanceBuilder::with_property_capacity(instance.class, instance.properties.len() + 1)
            .with_name(generated_name);

    for (key, value) in instance.properties.iter() {
        if key.as_str() != "Anchored" {
            builder.add_property(*key, value.clone());
        }
    }
    builder.add_property("Anchored", true);

    for child in instance.children() {
        if let Some(visual) = clone_safe_visual(dom, *child, visual_count) {
            builder.add_child(visual);
        }
    }
    Some(builder)
}

fn collect_geometry(
    source: &WeakDom,
    referent: Ref,
    output: &mut WeakDom,
    output_parent: Ref,
    geometry_count: &mut usize,
    visual_count: &mut usize,
) {
    let Some(instance) = source.get_by_ref(referent) else {
        return;
    };

    if is_geometry(instance.class.as_str()) {
        let generated_name = format!("LBH_{:05}", *geometry_count + 1);
        let builder = clone_geometry(source, referent, &generated_name, visual_count)
            .expect("geometry classifier and cloner must agree");
        output.insert(output_parent, builder);
        *geometry_count += 1;
    }

    for child in instance.children() {
        collect_geometry(
            source,
            *child,
            output,
            output_parent,
            geometry_count,
            visual_count,
        );
    }
}

fn count_forbidden(dom: &WeakDom, referent: Ref) -> usize {
    let Some(instance) = dom.get_by_ref(referent) else {
        return 0;
    };
    let mut count = usize::from(matches!(
        instance.class.as_str(),
        "Script"
            | "LocalScript"
            | "ModuleScript"
            | "RemoteEvent"
            | "RemoteFunction"
            | "UnreliableRemoteEvent"
            | "ClickDetector"
            | "ProximityPrompt"
    ));
    for child in instance.children() {
        count += count_forbidden(dom, *child);
    }
    count
}

fn count_geometry(dom: &WeakDom, referent: Ref) -> usize {
    let Some(instance) = dom.get_by_ref(referent) else {
        return 0;
    };
    let mut count = usize::from(is_geometry(instance.class.as_str()));
    for child in instance.children() {
        count += count_geometry(dom, *child);
    }
    count
}

fn sha256_hex(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = env::args().skip(1);
    let input_path = args
        .next()
        .ok_or("usage: geometry_sanitizer <input.rbxl> <output.rbxmx> <report.json>")?;
    let output_path = args.next().ok_or("output.rbxmx is required")?;
    let report_path = args.next().ok_or("report.json is required")?;

    let source = read_dom(Path::new(&input_path))?;
    let workspace = find_first_class(&source, source.root_ref(), "Workspace")
        .ok_or("legacy source contains no Workspace")?;

    let mut output = WeakDom::new(InstanceBuilder::new("DataModel"));
    let output_root = output.root_ref();
    let model = output.insert(
        output_root,
        InstanceBuilder::new("Model").with_name("LegacyBrookhavenGeometryBaseline"),
    );

    let mut geometry_count = 0usize;
    let mut visual_count = 0usize;
    collect_geometry(
        &source,
        workspace,
        &mut output,
        model,
        &mut geometry_count,
        &mut visual_count,
    );

    if geometry_count != EXPECTED_LEGACY_GEOMETRY {
        return Err(format!(
            "legacy geometry count drift: expected {EXPECTED_LEGACY_GEOMETRY}, got {geometry_count}"
        )
        .into());
    }

    if count_forbidden(&output, output.root_ref()) != 0 {
        return Err("sanitized geometry unexpectedly contains gameplay/script classes".into());
    }
    if count_geometry(&output, output.root_ref()) != EXPECTED_LEGACY_GEOMETRY {
        return Err("sanitized geometry verification count drift".into());
    }

    let mut bytes = Vec::new();
    rbx_xml::to_writer_default(&mut bytes, &output, &[model])?;
    let digest = sha256_hex(&bytes);

    if let Some(parent) = Path::new(&output_path).parent() {
        fs::create_dir_all(parent)?;
    }
    fs::write(&output_path, &bytes)?;

    let report = serde_json::json!({
        "schemaVersion": 1,
        "status": "legacy-brookhaven-geometry-sanitized",
        "source": {
            "input": input_path,
            "expectedGeometryCount": EXPECTED_LEGACY_GEOMETRY
        },
        "output": {
            "path": output_path,
            "rootName": "LegacyBrookhavenGeometryBaseline",
            "format": "rbxmx",
            "bytes": bytes.len(),
            "sha256": digest,
            "geometryCount": geometry_count,
            "generatedNamePattern": "LBH_00001..LBH_14459",
            "safeVisualChildCount": visual_count,
            "forbiddenGameplayClassCount": 0,
            "allGeometryAnchored": true
        },
        "policy": {
            "geometryClassesOnly": true,
            "safeVisualChildrenOnly": true,
            "scriptsRemoved": true,
            "remotesRemoved": true,
            "clickDetectorsRemoved": true,
            "proximityPromptsRemoved": true,
            "sourceCodeExecuted": false,
            "sourceCodeEvaluated": false
        },
        "boundary": {
            "developmentReferenceOnly": true,
            "currentLiveCertificationSatisfied": false,
            "exactParityClaimAllowed": false
        }
    });

    if let Some(parent) = Path::new(&report_path).parent() {
        fs::create_dir_all(parent)?;
    }
    let file = File::create(&report_path)?;
    serde_json::to_writer_pretty(BufWriter::new(file), &report)?;
    fs::write(
        &report_path,
        [fs::read_to_string(&report_path)?, "\n".to_string()].concat(),
    )?;
    println!("{}", serde_json::to_string_pretty(&report)?);
    Ok(())
}
