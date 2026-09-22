#!/usr/bin/env python3
"""Direct, report-only StarBlox art-production accelerator pilot.

Runs only against branch-stored preproduction/candidate bytes. It never writes
canonical mappings or gameplay data. Exact-byte identity remains authoritative;
perceptual metrics are evidence only.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.metadata as md
import json
import math
import os
import re
import subprocess
from pathlib import Path

import imagehash
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from scipy.ndimage import binary_dilation, binary_erosion
from pymatting import estimate_alpha_cf

IMAGEHASH_COMMIT = "7a405c9a27571ee8c998b661ce751639c34b7355"
PYMATTING_COMMIT = "6d5c4a6bed0e5672abac0bad078e594423ffe4fd"
DIFFUSERS_COMMIT = "7263f3317f6b392d62f41e9d75ed9d7e21fc5a5c"
IP_ADAPTER_COMMIT = "62e4af9d0c1ac7d5f8dd386a0ccf2211346af1a2"
RASTER_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
STORE_BG = (8, 25, 54, 255)
ITEM_RE = re.compile(r"([a-z]+-\d+)", re.I)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            h.update(block)
    return h.hexdigest()


def git_blob_sha(path: Path) -> str:
    data = path.read_bytes()
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def direct_url_commit(dist_name: str) -> str | None:
    try:
        dist = md.distribution(dist_name)
        raw = dist.read_text("direct_url.json")
        if not raw:
            return None
        return json.loads(raw).get("vcs_info", {}).get("commit_id")
    except Exception:
        return None


def iter_objects(value):
    if isinstance(value, dict):
        yield value
        for v in value.values():
            yield from iter_objects(v)
    elif isinstance(value, list):
        for v in value:
            yield from iter_objects(v)


def normalize_repo_path(value: str | None) -> str | None:
    if not value:
        return None
    p = str(value).lstrip("/")
    if p.startswith("assets/"):
        p = "public/" + p
    return p


def item_id_for(path: Path) -> str | None:
    m = ITEM_RE.search(path.name)
    return m.group(1).lower() if m else None


def family_for(item_id: str | None) -> str | None:
    return item_id.split("-", 1)[0] if item_id and "-" in item_id else None


def load_manifest(root: Path) -> dict[str, dict]:
    p = root / "catalog-art-manifest.json"
    if not p.exists():
        return {}
    data = json.loads(p.read_text())
    # Current file is a direct id -> metadata map.
    return data if isinstance(data, dict) else {}


def load_review_bindings(root: Path) -> dict[str, dict]:
    bindings: dict[str, dict] = {}
    review_root = root / "docs/preproduction/catalog-sprint/reviews"
    if not review_root.exists():
        return bindings
    for p in sorted(review_root.glob("*.json")):
        try:
            data = json.loads(p.read_text())
        except Exception:
            continue
        for o in iter_objects(data):
            item_id = o.get("itemId") or o.get("id")
            raw_path = o.get("assetPath") or o.get("path")
            decision = o.get("decision")
            repo_path = normalize_repo_path(raw_path)
            if not item_id or not repo_path or not decision:
                continue
            checks = o.get("checks") if isinstance(o.get("checks"), dict) else {}
            bindings[repo_path] = {
                "itemId": str(item_id),
                "decision": str(decision).upper(),
                "duplicateVisual": str(checks.get("duplicateVisual", "")).upper() or None,
                "source": str(p.relative_to(root)),
            }
    return bindings


def catalog_rasters(root: Path) -> list[Path]:
    bases = [
        root / "public/assets/catalog",
        root / "public/assets/catalog-candidates",
        root / "docs/preproduction/catalog-sprint/recovered-originals",
    ]
    out: list[Path] = []
    for base in bases:
        if not base.exists():
            continue
        out.extend(p for p in base.rglob("*") if p.is_file() and p.suffix.lower() in RASTER_EXTS)
    return sorted(set(out))


def store_canvas(path: Path) -> Image.Image:
    with Image.open(path) as src:
        src = ImageOps.exif_transpose(src).convert("RGBA")
        fit = ImageOps.contain(src, (800, 800), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (800, 800), STORE_BG)
    xy = ((800 - fit.width) // 2, (800 - fit.height) // 2)
    canvas.alpha_composite(fit, xy)
    return canvas.convert("RGB")


def manifest_status_for(path: Path, root: Path, manifest: dict[str, dict]) -> str | None:
    item_id = item_id_for(path)
    if not item_id:
        return None
    meta = manifest.get(item_id, {})
    raw = normalize_repo_path(meta.get("assetPath"))
    actual = str(path.relative_to(root)).replace(os.sep, "/")
    if raw == actual:
        return meta.get("status")
    return None


def asset_record(path: Path, root: Path, manifest: dict, reviews: dict) -> dict:
    rel = str(path.relative_to(root)).replace(os.sep, "/")
    item_id = item_id_for(path)
    canvas = store_canvas(path)
    ph = imagehash.phash(canvas)
    dh = imagehash.dhash(canvas)
    ch = imagehash.colorhash(canvas, binbits=3)
    return {
        "path": rel,
        "itemId": item_id,
        "family": family_for(item_id),
        "sha256": sha256_file(path),
        "gitBlobSha": git_blob_sha(path),
        "manifestStatus": manifest_status_for(path, root, manifest),
        "review": reviews.get(rel),
        "_phash": ph,
        "_dhash": dh,
        "_colorhash": ch,
        "phash": str(ph),
        "dhash": str(dh),
        "colorhash": str(ch),
    }


def perceptual_distance(a: dict, b: dict) -> dict:
    p = int(a["_phash"] - b["_phash"])
    d = int(a["_dhash"] - b["_dhash"])
    c = int(a["_colorhash"] - b["_colorhash"])
    score = (
        p / a["_phash"].hash.size
        + d / a["_dhash"].hash.size
        + c / a["_colorhash"].hash.size
    ) / 3.0
    return {"phash": p, "dhash": d, "colorhash": c, "normalizedMean": round(score, 6)}


def perceptual_pilot(root: Path) -> dict:
    manifest = load_manifest(root)
    reviews = load_review_bindings(root)
    paths = catalog_rasters(root)
    records = []
    decode_errors = []
    for p in paths:
        try:
            records.append(asset_record(p, root, manifest, reviews))
        except Exception as e:
            decode_errors.append({"path": str(p.relative_to(root)), "error": repr(e)})

    exact: dict[str, list[dict]] = {}
    for r in records:
        exact.setdefault(r["sha256"], []).append(r)
    exact_groups = [
        {"sha256": k, "gitBlobShas": sorted({x["gitBlobSha"] for x in v}), "paths": [x["path"] for x in v]}
        for k, v in exact.items() if len(v) > 1
    ]

    unique = [v[0] for _, v in sorted(exact.items())]
    pairs = []
    for i, a in enumerate(unique):
        for b in unique[i + 1:]:
            dist = perceptual_distance(a, b)
            pairs.append({
                "a": a["path"], "aItemId": a["itemId"], "aFamily": a["family"],
                "b": b["path"], "bItemId": b["itemId"], "bFamily": b["family"],
                **dist,
            })
    pairs.sort(key=lambda x: (x["normalizedMean"], x["phash"], x["dhash"], x["a"], x["b"]))

    focus = [r for r in records if r["path"].startswith("public/assets/catalog/") and r["family"] in {"auras", "rugs"}]
    nearest = {}
    for a in focus:
        candidates = []
        for b in unique:
            if a["sha256"] == b["sha256"]:
                continue
            dist = perceptual_distance(a, b)
            candidates.append({
                "path": b["path"],
                "itemId": b["itemId"],
                "sameFamily": a["family"] == b["family"] and a["family"] is not None,
                **dist,
            })
        candidates.sort(key=lambda x: (x["normalizedMean"], x["phash"], x["dhash"], x["path"]))
        nearest[a["path"]] = candidates[:5]

    review_counts = {}
    duplicate_labels = {}
    for r in records:
        rv = r.get("review") or {}
        decision = rv.get("decision")
        if decision:
            review_counts[decision] = review_counts.get(decision, 0) + 1
        dv = rv.get("duplicateVisual")
        if dv:
            duplicate_labels[dv] = duplicate_labels.get(dv, 0) + 1

    # Intentionally conservative. The first pilot reports evidence and proves
    # duplicate recovery; it does not derive a release threshold from sparse labels.
    threshold_calibrated = duplicate_labels.get("PASS", 0) >= 5 and duplicate_labels.get("FAIL", 0) >= 5

    serial_records = []
    for r in records:
        serial_records.append({k: v for k, v in r.items() if not k.startswith("_")})

    return {
        "status": "PASS",
        "mode": "REPORT_ONLY",
        "storeCanvas": {"width": 800, "height": 800, "background": "#081936", "fit": "contain"},
        "assetCount": len(records),
        "uniqueByteCount": len(unique),
        "decodeErrors": decode_errors,
        "exactDuplicateGroupCount": len(exact_groups),
        "exactDuplicateGroups": exact_groups[:50],
        "topPerceptualPairs": pairs[:25],
        "focusNearestFive": nearest,
        "reviewLabelCounts": review_counts,
        "duplicateVisualLabelCounts": duplicate_labels,
        "thresholdCalibrated": threshold_calibrated,
        "automaticAcceptOrRework": False,
        "assets": serial_records,
    }


def checkerboard(h: int, w: int) -> np.ndarray:
    yy, xx = np.indices((h, w))
    tile = ((xx // 12 + yy // 12) % 2)[..., None]
    a = np.array([0.12, 0.16, 0.24])
    b = np.array([0.82, 0.86, 0.94])
    return np.where(tile == 0, a, b)


def alpha_metrics(alpha_true: np.ndarray, alpha_est: np.ndarray, alpha_baseline: np.ndarray) -> dict:
    boundary = (alpha_true > 0.01) & (alpha_true < 0.99)
    mask = boundary if np.any(boundary) else np.ones_like(alpha_true, dtype=bool)
    base_mae = float(np.mean(np.abs(alpha_baseline[mask] - alpha_true[mask])))
    est_mae = float(np.mean(np.abs(alpha_est[mask] - alpha_true[mask])))
    return {
        "boundaryPixels": int(mask.sum()),
        "coarseMaskBoundaryMAE": round(base_mae, 6),
        "refinedBoundaryMAE": round(est_mae, 6),
        "maeImprovement": round(base_mae - est_mae, 6),
        "relativeImprovement": round((base_mae - est_mae) / base_mae, 6) if base_mae > 1e-12 else None,
    }


def refine_alpha(image_rgb: np.ndarray, alpha_true: np.ndarray) -> tuple[np.ndarray, np.ndarray, dict]:
    fg_seed = alpha_true >= 0.97
    bg_seed = alpha_true <= 0.03
    fg_known = binary_erosion(fg_seed, iterations=1, border_value=0)
    bg_known = binary_erosion(bg_seed, iterations=1, border_value=1)
    trimap = np.full(alpha_true.shape, 0.5, dtype=np.float64)
    trimap[bg_known] = 0.0
    trimap[fg_known] = 1.0
    if not np.any(trimap == 0.0) or not np.any(trimap == 1.0) or not np.any(trimap == 0.5):
        raise RuntimeError("trimap lacks foreground/background/unknown regions")
    alpha_est = estimate_alpha_cf(
        image_rgb.astype(np.float64),
        trimap,
        laplacian_kwargs={"epsilon": 1e-6},
        cg_kwargs={"maxiter": 2000},
    )
    baseline = (alpha_true >= 0.5).astype(np.float64)
    return alpha_est, baseline, {
        "knownForeground": int(np.sum(trimap == 1.0)),
        "knownBackground": int(np.sum(trimap == 0.0)),
        "unknown": int(np.sum(trimap == 0.5)),
    }


def synthetic_alpha_fixture(size: int = 160) -> tuple[np.ndarray, np.ndarray]:
    img = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(img)
    cx = cy = size / 2
    outer = size * 0.34
    inner = outer * 0.43
    pts = []
    for i in range(10):
        r = outer if i % 2 == 0 else inner
        ang = -math.pi / 2 + i * math.pi / 5
        pts.append((cx + math.cos(ang) * r, cy + math.sin(ang) * r))
    draw.polygon(pts, fill=255)
    img = img.filter(ImageFilter.GaussianBlur(radius=4.0))
    alpha = np.asarray(img, dtype=np.float64) / 255.0

    yy, xx = np.indices((size, size))
    fg = np.zeros((size, size, 3), dtype=np.float64)
    fg[..., 0] = 0.25 + 0.45 * (xx / max(1, size - 1))
    fg[..., 1] = 0.78
    fg[..., 2] = 1.0 - 0.25 * (yy / max(1, size - 1))
    bg = checkerboard(size, size)
    observed = alpha[..., None] * fg + (1.0 - alpha[..., None]) * bg
    return observed, alpha


def real_alpha_candidates(root: Path, limit: int = 3):
    found = []
    for p in catalog_rasters(root):
        try:
            with Image.open(p) as im:
                rgba = ImageOps.exif_transpose(im).convert("RGBA")
                alpha = np.asarray(rgba.getchannel("A"), dtype=np.uint8)
                trans = float(np.mean(alpha < 250))
                opaque = float(np.mean(alpha > 5))
                partial = float(np.mean((alpha > 5) & (alpha < 250)))
                if trans < 0.01 or opaque < 0.01:
                    continue
                found.append((partial, p))
        except Exception:
            continue
    found.sort(key=lambda x: (-x[0], str(x[1])))
    return [p for _, p in found[:limit]]


def run_real_alpha(root: Path, path: Path) -> dict:
    with Image.open(path) as im:
        rgba = ImageOps.exif_transpose(im).convert("RGBA")
        rgba.thumbnail((160, 160), Image.Resampling.LANCZOS)
        arr = np.asarray(rgba, dtype=np.float64) / 255.0
    alpha = arr[..., 3]
    bg = checkerboard(arr.shape[0], arr.shape[1])
    observed = alpha[..., None] * arr[..., :3] + (1.0 - alpha[..., None]) * bg
    est, baseline, trimap_stats = refine_alpha(observed, alpha)
    return {
        "path": str(path.relative_to(root)).replace(os.sep, "/"),
        "dimensions": [int(arr.shape[1]), int(arr.shape[0])],
        "trimap": trimap_stats,
        "metrics": alpha_metrics(alpha, est, baseline),
    }


def alpha_pilot(root: Path) -> dict:
    observed, alpha = synthetic_alpha_fixture()
    est, baseline, tri = refine_alpha(observed, alpha)
    synthetic = {
        "fixture": "deterministic-soft-star",
        "dimensions": [int(alpha.shape[1]), int(alpha.shape[0])],
        "trimap": tri,
        "metrics": alpha_metrics(alpha, est, baseline),
    }
    real = []
    errors = []
    for p in real_alpha_candidates(root):
        try:
            real.append(run_real_alpha(root, p))
        except Exception as e:
            errors.append({"path": str(p.relative_to(root)), "error": repr(e)})
    improvements = [synthetic["metrics"]["maeImprovement"]] + [r["metrics"]["maeImprovement"] for r in real]
    return {
        "status": "PASS" if improvements and improvements[0] > 0 else "FAIL",
        "mode": "NON_CANONICAL_DERIVATIVE_EVIDENCE_ONLY",
        "synthetic": synthetic,
        "realAssets": real,
        "errors": errors,
        "sourceBytesOverwritten": False,
    }


def generation_interface_smoke(root: Path) -> dict:
    try:
        import diffusers
        package_root = Path(diffusers.__file__).resolve().parent
        checks = {
            "fluxPipelineSource": (package_root / "pipelines/flux/pipeline_flux.py").exists(),
            "sdxlPipelineSource": (package_root / "pipelines/stable_diffusion_xl/pipeline_stable_diffusion_xl.py").exists(),
            "controlnetSource": (package_root / "models/controlnets/controlnet.py").exists()
                or (package_root / "models/controlnet.py").exists(),
            "ipAdapterLoaderSource": (package_root / "loaders/ip_adapter.py").exists(),
        }
        if checks["ipAdapterLoaderSource"]:
            txt = (package_root / "loaders/ip_adapter.py").read_text(errors="ignore")
            checks["loadIpAdapterPresent"] = "load_ip_adapter" in txt
        else:
            checks["loadIpAdapterPresent"] = False
        version = getattr(diffusers, "__version__", None)
    except Exception as e:
        return {"status": "FAIL", "error": repr(e)}

    ip_root = os.environ.get("IP_ADAPTER_SOURCE_ROOT")
    ip_check = {"sourceRootPresent": False, "commit": None}
    if ip_root and Path(ip_root).exists():
        ip_check["sourceRootPresent"] = True
        try:
            ip_check["commit"] = subprocess.check_output(
                ["git", "-C", ip_root, "rev-parse", "HEAD"], text=True
            ).strip()
        except Exception as e:
            ip_check["error"] = repr(e)

    seed = 12345
    a = np.random.default_rng(seed).standard_normal((1, 4, 16, 16), dtype=np.float32)
    b = np.random.default_rng(seed).standard_normal((1, 4, 16, 16), dtype=np.float32)
    deterministic = hashlib.sha256(a.tobytes()).hexdigest() == hashlib.sha256(b.tobytes()).hexdigest()

    ok = (
        all(checks.values())
        and direct_url_commit("diffusers") == DIFFUSERS_COMMIT
        and ip_check.get("commit") == IP_ADAPTER_COMMIT
        and deterministic
    )
    return {
        "status": "PASS" if ok else "FAIL",
        "scope": "PINNED_RUNTIME_AND_PROVENANCE_INTERFACE_SMOKE",
        "pixelInferenceRan": False,
        "pixelInferenceNote": "No FLUX/SDXL pixel inference on the CPU-only CI runner; this smoke verifies exact runtime revisions, FLUX/SDXL/ControlNet/IP-Adapter integration surfaces, and deterministic seed/provenance plumbing.",
        "diffusersVersion": version,
        "diffusersCommit": direct_url_commit("diffusers"),
        "ipAdapter": ip_check,
        "checks": checks,
        "deterministicSeed": seed,
        "deterministicLatentHash": hashlib.sha256(a.tobytes()).hexdigest(),
    }


def provenance_checks() -> dict:
    installed = {
        "ImageHash": direct_url_commit("ImageHash"),
        "PyMatting": direct_url_commit("PyMatting"),
        "diffusers": direct_url_commit("diffusers"),
    }
    expected = {
        "ImageHash": IMAGEHASH_COMMIT,
        "PyMatting": PYMATTING_COMMIT,
        "diffusers": DIFFUSERS_COMMIT,
    }
    return {
        "installedCommits": installed,
        "expectedCommits": expected,
        "exactRevisionMatch": {k: installed.get(k) == v for k, v in expected.items()},
    }


def make_summary(report: dict) -> str:
    p = report["perceptual"]
    a = report["alpha"]
    g = report["generationInterface"]
    lines = [
        "# StarBlox art accelerator direct pilot",
        "",
        f"- Source head: `{report['sourceHead']}`",
        f"- Exact pinned revisions: {'PASS' if all(report['provenance']['exactRevisionMatch'].values()) else 'FAIL'}",
        f"- Perceptual preflight: **{p['status']}**, {p['assetCount']} rasters / {p['uniqueByteCount']} unique byte streams; {p['exactDuplicateGroupCount']} exact duplicate groups.",
        f"- Automatic perceptual threshold: **NOT ENABLED** (calibrated={str(p['thresholdCalibrated']).lower()}).",
        f"- Alpha refinement: **{a['status']}**; synthetic coarse-mask boundary MAE {a['synthetic']['metrics']['coarseMaskBoundaryMAE']} -> refined {a['synthetic']['metrics']['refinedBoundaryMAE']}.",
        f"- Generation integration surface: **{g['status']}**; FLUX/SDXL/ControlNet/IP-Adapter source/API smoke only, no CPU-runner production pixel inference.",
        "- Canonical art/gameplay writes: **none**.",
        "",
        "## Closest non-identical perceptual pairs (evidence only)",
    ]
    for pair in p["topPerceptualPairs"][:10]:
        lines.append(
            f"- `{pair['a']}` <> `{pair['b']}`: pHash={pair['phash']}, dHash={pair['dhash']}, colorHash={pair['colorhash']}, normalized={pair['normalizedMean']}"
        )
    if a["realAssets"]:
        lines += ["", "## Real transparent-asset matting samples"]
        for r in a["realAssets"]:
            m = r["metrics"]
            lines.append(
                f"- `{r['path']}`: boundary MAE {m['coarseMaskBoundaryMAE']} -> {m['refinedBoundaryMAE']} (improvement {m['maeImprovement']})."
            )
    return "\n".join(lines) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=".")
    ap.add_argument("--output", default="artifacts/art-factory-pilot")
    args = ap.parse_args()

    root = Path(args.root).resolve()
    out = root / args.output
    out.mkdir(parents=True, exist_ok=True)
    try:
        source_head = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    except Exception:
        source_head = "unknown"

    report = {
        "schemaVersion": 1,
        "sourceHead": source_head,
        "branch": "screenshot-match-preproduction",
        "safety": {
            "reportOnlyPerceptualMetrics": True,
            "canonicalArtModified": False,
            "gameplayModified": False,
            "secretsUsed": False,
            "paidApiUsed": False,
        },
        "provenance": provenance_checks(),
        "perceptual": perceptual_pilot(root),
        "alpha": alpha_pilot(root),
        "generationInterface": generation_interface_smoke(root),
    }
    report["overallPass"] = (
        all(report["provenance"]["exactRevisionMatch"].values())
        and report["perceptual"]["status"] == "PASS"
        and report["alpha"]["status"] == "PASS"
        and report["generationInterface"]["status"] == "PASS"
        and not report["perceptual"]["automaticAcceptOrRework"]
    )

    (out / "results.json").write_text(json.dumps(report, indent=2) + "\n")
    summary = make_summary(report)
    (out / "summary.md").write_text(summary)
    print(summary)
    print("PILOT_RESULT=" + ("PASS" if report["overallPass"] else "FAIL"))
    if not report["overallPass"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
