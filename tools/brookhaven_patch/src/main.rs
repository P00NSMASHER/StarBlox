use std::{
    env,
    fs::{self, File},
    io::{BufReader, BufWriter},
    path::Path,
};

use rbx_dom_weak::{
    types::{Ref, Variant},
    ustr,
    InstanceBuilder, WeakDom,
};
use serde_json::json;
use sha2::{Digest, Sha256};

fn read_dom(path: &Path) -> Result<WeakDom, Box<dyn std::error::Error>> {
    Ok(rbx_binary::from_reader(BufReader::new(File::open(path)?))?)
}

fn walk(dom: &WeakDom, start: Ref, out: &mut Vec<Ref>) {
    out.push(start);
    if let Some(instance) = dom.get_by_ref(start) {
        for child in instance.children() {
            walk(dom, *child, out);
        }
    }
}

fn find_by_class(dom: &WeakDom, class_name: &str) -> Option<Ref> {
    let mut refs = Vec::new();
    walk(dom, dom.root_ref(), &mut refs);
    refs.into_iter().find(|r| {
        dom.get_by_ref(*r)
            .map(|i| i.class.as_str() == class_name)
            .unwrap_or(false)
    })
}

fn find_player_handler(dom: &WeakDom) -> Option<Ref> {
    let mut refs = Vec::new();
    walk(dom, dom.root_ref(), &mut refs);
    refs.into_iter().find(|r| {
        dom.get_by_ref(*r)
            .map(|i| i.class.as_str() == "LocalScript" && i.name == "PlayerHandler")
            .unwrap_or(false)
    })
}

fn string_property(instance: &rbx_dom_weak::Instance, name: &str) -> Option<String> {
    match instance.properties.get(&ustr(name)) {
        Some(Variant::String(value)) => Some(value.clone()),
        _ => None,
    }
}

fn count_name(dom: &WeakDom, name: &str) -> usize {
    let mut refs = Vec::new();
    walk(dom, dom.root_ref(), &mut refs);
    refs.into_iter()
        .filter(|r| dom.get_by_ref(*r).map(|i| i.name == name).unwrap_or(false))
        .count()
}

fn patch_player_handler(source: &str) -> Result<String, Box<dyn std::error::Error>> {
    let mut out = source.to_string();

    let old_loads = r#"local v98 = l__Humanoid__3:LoadAnimation((script:WaitForChild("ScooterAnimation")));
local v99 = l__Humanoid__3:LoadAnimation((script:WaitForChild("SegwaySmallAnimation")));
local v100 = l__Humanoid__3:LoadAnimation((script:WaitForChild("SkateBoardAnimation")));"#;

    let new_loads = r#"local function StarBloxSafeLoadAnimation(animation)
	local animator = l__Humanoid__3:FindFirstChildOfClass("Animator") or l__Humanoid__3:WaitForChild("Animator", 5);
	if animator == nil then
		return nil;
	end;
	local ok, track = pcall(function()
		return animator:LoadAnimation(animation);
	end);
	if ok then
		return track;
	end;
	return nil;
end;
local v98 = StarBloxSafeLoadAnimation(script:WaitForChild("ScooterAnimation"));
local v99 = StarBloxSafeLoadAnimation(script:WaitForChild("SegwaySmallAnimation"));
local v100 = StarBloxSafeLoadAnimation(script:WaitForChild("SkateBoardAnimation"));"#;

    if !out.contains(old_loads) {
        return Err("PlayerHandler animation preload block was not found".into());
    }
    out = out.replacen(old_loads, new_loads, 1);

    for name in ["v98", "v99", "v100"] {
        out = out.replace(
            &format!("{name}:Stop();"),
            &format!("if {name} then {name}:Stop(); end;"),
        );
    }

    let old_bag = r#"local l__PlayerHouseStructure__111 = l__LocalPlayer__1.PlayersBag:FindFirstChild("PlayerHouseStructure");"#;
    let new_bag = r#"local l__PlayersBagCompat__111 = l__LocalPlayer__1:FindFirstChild("PlayersBag") or l__LocalPlayer__1:WaitForChild("PlayersBag", 10);
				local l__PlayerHouseStructure__111 = l__PlayersBagCompat__111 and l__PlayersBagCompat__111:FindFirstChild("PlayerHouseStructure");
				if l__PlayerHouseStructure__111 == nil then
					u7 = false;
					return;
				end;"#;
    if !out.contains(old_bag) {
        return Err("PlayerHandler PlayersBag dereference was not found".into());
    }
    out = out.replacen(old_bag, new_bag, 1);

    let backpack = r#"elseif v110.Name == "BackPack" then"#;
    let avatar = r#"elseif v110.Name == "AvatarEditor" then
					local l__CompatNoReset__1 = l__PlayerGui__4:FindFirstChild("NoResetGUIHandler");
					local l__CompatEditor__1 = l__CompatNoReset__1 and l__CompatNoReset__1:FindFirstChild("MainEditor");
					if l__CompatEditor__1 then
						l__CompatEditor__1.Visible = not l__CompatEditor__1.Visible;
						l__MainVehicleMenu__32.Visible = false;
						l__MainToolMenu__33.Visible = false;
						l__MainAvatarMenu__35.Visible = false;
						l__MainHouseMenu__36.Visible = false;
						l__MainNoHouseMenu__37.Visible = false;
						l__MainAnimationsMenu__34.Visible = false;
						l__MainMotelMenu__38.Visible = false;
						l__WhiteCircle__46.Visible = false;
					end;
				elseif v110.Name == "BackPack" then"#;
    if !out.contains(backpack) {
        return Err("PlayerHandler BackPack branch was not found".into());
    }
    out = out.replacen(backpack, avatar, 1);

    Ok(out)
}

fn sha256(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();
    if args.len() != 5 {
        return Err("usage: brookhaven-v41-patch <input.rbxl> <output.rbxl> <server.luau> <receipt.json>".into());
    }
    let input = Path::new(&args[1]);
    let output = Path::new(&args[2]);
    let server_path = Path::new(&args[3]);
    let receipt_path = Path::new(&args[4]);

    let input_bytes = fs::read(input)?;
    let mut dom = read_dom(input)?;

    let handler_ref = find_player_handler(&dom).ok_or("StarterGui PlayerHandler not found")?;
    let original_source = {
        let handler = dom.get_by_ref(handler_ref).ok_or("PlayerHandler ref missing")?;
        string_property(handler, "Source").ok_or("PlayerHandler Source missing")?
    };
    let patched_source = patch_player_handler(&original_source)?;
    {
        let handler = dom.get_by_ref_mut(handler_ref).ok_or("PlayerHandler mutable ref missing")?;
        handler
            .properties
            .insert(ustr("Source"), Variant::String(patched_source.clone()));
    }

    let server_script_source = fs::read_to_string(server_path)?;
    if !server_script_source.contains("STARBLOX_BROOKHAVEN_COMPAT_READY") {
        return Err("compatibility script sentinel missing".into());
    }
    let server_service = find_by_class(&dom, "ServerScriptService")
        .ok_or("ServerScriptService not found")?;
    dom.insert(
        server_service,
        InstanceBuilder::new("Script")
            .with_name("StarBloxBrookhavenCompatibility")
            .with_property("Source", server_script_source.clone())
            .with_property("Disabled", false),
    );

    let top_refs = dom.root().children().to_vec();
    rbx_binary::to_writer(BufWriter::new(File::create(output)?), &dom, &top_refs)?;

    let output_bytes = fs::read(output)?;
    let verify = read_dom(output)?;
    let handler_verify = find_player_handler(&verify).ok_or("patched PlayerHandler missing")?;
    let source_verify = string_property(
        verify.get_by_ref(handler_verify).ok_or("patched handler ref missing")?,
        "Source",
    ).ok_or("patched PlayerHandler Source missing")?;

    let server_count = count_name(&verify, "StarBloxBrookhavenCompatibility");
    let lot_count = count_name(&verify, "BuyHouse");
    let main_button_names = ["Character", "AvatarEditor", "BackPack", "Animation", "Car", "House"];
    let button_count: usize = main_button_names.iter().map(|name| count_name(&verify, name)).sum();

    if server_count != 1 {
        return Err(format!("expected one compatibility server script, got {server_count}").into());
    }
    for sentinel in [
        "StarBloxSafeLoadAnimation",
        "WaitForChild(\"PlayersBag\", 10)",
        "v110.Name == \"AvatarEditor\"",
    ] {
        if !source_verify.contains(sentinel) {
            return Err(format!("patched PlayerHandler missing sentinel: {sentinel}").into());
        }
    }
    if lot_count < 19 {
        return Err(format!("expected Brookhaven BuyHouse parts, got {lot_count}").into());
    }
    if button_count < 6 {
        return Err(format!("expected right-rail button names, aggregate count {button_count}").into());
    }

    let receipt = json!({
        "schemaVersion": 1,
        "status": "brookhaven-v41-controls-houses-patched",
        "input": {
            "bytes": input_bytes.len(),
            "sha256": sha256(&input_bytes)
        },
        "output": {
            "bytes": output_bytes.len(),
            "sha256": sha256(&output_bytes)
        },
        "patch": {
            "compatibilityServerScripts": server_count,
            "playerHandlerSafeAnimationLoad": true,
            "playerHandlerPlayersBagGuard": true,
            "playerHandlerAvatarEditorBranch": true,
            "buyHouseParts": lot_count,
            "rightRailButtonNameAggregate": button_count
        }
    });
    fs::write(receipt_path, serde_json::to_vec_pretty(&receipt)?)?;
    println!("{}", serde_json::to_string_pretty(&receipt)?);
    Ok(())
}
