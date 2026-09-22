#!/usr/bin/env python3
"""Report-only visual preflight for StarBlox catalog rasters.

This tool never ACCEPTs or REWORKs art. It records objective image metrics,
perceptual-neighbor evidence, and (when supplied) calibrated warning signals.
Calibrated signals remain warnings only; independent exact-hash human review is
always authoritative.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import tempfile
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageFilter, ImageOps, ImageStat

ALLOWED = {".png", ".jpg", ".jpeg", ".webp"}

CALIBRATION_METRICS = {
    "sourceLuminanceContrastRange": ("source", "luminanceContrastRange"),
    "sourceEntropyBits": ("source", "entropyBits"),
    "sourceEdgeDensity": ("source", "edgeDensity"),
    "thumbnailLuminanceContrastRange": ("thumbnail", "luminanceContrastRange"),
    "thumbnailEntropyBits": ("thumbnail", "entropyBits"),
    "thumbnailEdgeDensity": ("thumbnail", "edgeDensity"),
    "nonTransparentRatio": ("source", "nonTransparentRatio"),
    "contentBoundsRatio": ("source", "contentBoundsRatio"),
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def bit_hash_hex(bits: list[int]) -> str:
    value = 0
    for bit in bits:
        value = (value << 1) | (1 if bit else 0)
    width = max(1, math.ceil(len(bits) / 4))
    return f"{value:0{width}x}"


def ahash(image: Image.Image, size: int = 8) -> str:
    gray = ImageOps.grayscale(image).resize((size, size), Image.Resampling.LANCZOS)
    values = list(gray.tobytes())
    mean = sum(values) / len(values)
    return bit_hash_hex([v >= mean for v in values])


def dhash(image: Image.Image, size: int = 8) -> str:
    gray = ImageOps.grayscale(image).resize((size + 1, size), Image.Resampling.LANCZOS)
    px = gray.load()
    bits = []
    for y in range(size):
        for x in range(size):
            bits.append(px[x, y] > px[x + 1, y])
    return bit_hash_hex(bits)


def hamming_hex(a: str, b: str) -> int:
    return (int(a, 16) ^ int(b, 16)).bit_count()


def entropy(gray: Image.Image) -> float:
    hist = gray.histogram()
    total = sum(hist)
    if not total:
        return 0.0
    out = 0.0
    for count in hist:
        if not count:
            continue
        p = count / total
        out -= p * math.log2(p)
    return out


def percentile_from_hist(hist: list[int], pct: float) -> int:
    total = sum(hist)
    target = total * pct
    cumulative = 0
    for i, count in enumerate(hist):
        cumulative += count
        if cumulative >= target:
            return i
    return len(hist) - 1


def edge_density(gray: Image.Image) -> float:
    edges = gray.filter(ImageFilter.FIND_EDGES)
    hist = edges.histogram()
    total = sum(hist)
    if total == 0:
        return 0.0
    strong = sum(hist[28:])
    return strong / total


def alpha_metrics(image: Image.Image) -> dict:
    if "A" not in image.getbands():
        return {"hasAlpha": False, "nonTransparentRatio": 1.0, "contentBoundsRatio": 1.0}
    alpha = image.getchannel("A")
    hist = alpha.histogram()
    total = sum(hist)
    nonzero = total - hist[0]
    bbox = alpha.getbbox()
    if not bbox:
        bounds_ratio = 0.0
    else:
        x0, y0, x1, y1 = bbox
        bounds_ratio = ((x1 - x0) * (y1 - y0)) / max(1, image.width * image.height)
    return {
        "hasAlpha": True,
        "nonTransparentRatio": nonzero / max(1, total),
        "contentBoundsRatio": bounds_ratio,
    }


def image_metrics(image: Image.Image) -> dict:
    rgb = image.convert("RGB")
    gray = ImageOps.grayscale(rgb)
    hist = gray.histogram()
    p05 = percentile_from_hist(hist, 0.05)
    p95 = percentile_from_hist(hist, 0.95)
    stat = ImageStat.Stat(rgb)
    return {
        "width": image.width,
        "height": image.height,
        "mode": image.mode,
        "aspectRatio": round(image.width / max(1, image.height), 6),
        "luminanceP05": p05,
        "luminanceP95": p95,
        "luminanceContrastRange": p95 - p05,
        "entropyBits": round(entropy(gray), 5),
        "edgeDensity": round(edge_density(gray), 6),
        "meanRgb": [round(x, 3) for x in stat.mean],
        "aHash": ahash(rgb),
        "dHash": dhash(rgb),
        **alpha_metrics(image),
    }


def load_image(path: Path) -> Image.Image:
    with Image.open(path) as probe:
        probe.verify()
    with Image.open(path) as source:
        return ImageOps.exif_transpose(source).copy()


def scan_one(path: Path, thumbnail_size: int = 160) -> dict:
    data = path.read_bytes()
    image = load_image(path)
    thumb = image.copy()
    thumb.thumbnail((thumbnail_size, thumbnail_size), Image.Resampling.LANCZOS)
    return {
        "path": path.as_posix(),
        "bytes": len(data),
        "sha256": sha256_bytes(data),
        "gitBlobSha": git_blob_sha(data),
        "source": image_metrics(image),
        "thumbnail": {"targetMax": thumbnail_size, **image_metrics(thumb)},
    }


def item_id_from_path(path: Path) -> str | None:
    match = re.match(r"^([a-z]+-\d+)(?:-|\.|$)", path.name, re.I)
    return match.group(1).lower() if match else None


def collection_from_item_id(item_id: str | None) -> str | None:
    if not item_id or "-" not in item_id:
        return None
    return item_id.split("-", 1)[0].lower()


def neighbor_files(directory: Path, exclude: Path | None = None) -> Iterable[Path]:
    if not directory.exists():
        return []
    items = []
    for path in directory.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in ALLOWED:
            continue
        if exclude is not None and path.resolve() == exclude.resolve():
            continue
        items.append(path)
    return sorted(items)


def build_neighbor_cache(directory: Path, thumbnail_size: int = 160) -> dict:
    entries = []
    errors = []
    for path in neighbor_files(directory):
        try:
            row = scan_one(path, thumbnail_size=thumbnail_size)
        except Exception as exc:
            errors.append({"path": path.as_posix(), "error": type(exc).__name__ + ": " + str(exc)})
            continue
        item_id = item_id_from_path(path)
        entries.append({
            "path": path.as_posix(),
            "itemId": item_id,
            "collectionId": collection_from_item_id(item_id),
            "sha256": row["sha256"],
            "aHash": row["source"]["aHash"],
            "dHash": row["source"]["dHash"],
        })
    return {
        "schemaVersion": 1,
        "kind": "STARBLOX_VISUAL_NEIGHBOR_CACHE",
        "sourceDirectory": directory.as_posix(),
        "thumbnailSize": thumbnail_size,
        "entries": entries,
        "errors": errors,
    }


def compare_neighbor_cache(target: dict, target_path: Path, cache: dict, limit: int = 12) -> list[dict]:
    rows = []
    ta = target["source"]["aHash"]
    td = target["source"]["dHash"]
    target_item_id = item_id_from_path(target_path)
    target_resolved = target_path.resolve()
    for entry in cache.get("entries", []):
        path_text = str(entry.get("path") or "")
        if not path_text:
            continue
        try:
            same_path = Path(path_text).resolve() == target_resolved
        except Exception:
            same_path = False
        if same_path:
            continue
        other_item_id = entry.get("itemId")
        if target_item_id and other_item_id == target_item_id:
            continue
        try:
            ah = str(entry["aHash"])
            dh = str(entry["dHash"])
            distance_a = hamming_hex(ta, ah)
            distance_d = hamming_hex(td, dh)
        except Exception as exc:
            rows.append({"path": path_text, "error": type(exc).__name__ + ": " + str(exc)})
            continue
        rows.append({
            "path": path_text,
            "itemId": other_item_id,
            "collectionId": entry.get("collectionId"),
            "sha256": entry.get("sha256"),
            "exactByteDuplicate": entry.get("sha256") == target["sha256"],
            "aHashDistance": distance_a,
            "dHashDistance": distance_d,
            "combinedDistance": distance_a + distance_d,
        })
    rows.extend(cache.get("errors", []))
    good = [x for x in rows if "error" not in x]
    bad = [x for x in rows if "error" in x]
    good.sort(key=lambda x: (not x["exactByteDuplicate"], x["combinedDistance"], x["path"]))
    return good[:limit] + bad[: max(0, limit - len(good[:limit]))]


def compare_neighbors(target: dict, target_path: Path, paths: Iterable[Path], limit: int = 12) -> list[dict]:
    rows = []
    ta = target["source"]["aHash"]
    td = target["source"]["dHash"]
    target_item_id = item_id_from_path(target_path)
    for path in paths:
        other_item_id = item_id_from_path(path)
        if target_item_id and other_item_id == target_item_id:
            continue
        try:
            row = scan_one(path)
        except Exception as exc:
            rows.append({"path": path.as_posix(), "error": type(exc).__name__ + ": " + str(exc)})
            continue
        rows.append(
            {
                "path": path.as_posix(),
                "itemId": other_item_id,
                "collectionId": collection_from_item_id(other_item_id),
                "sha256": row["sha256"],
                "exactByteDuplicate": row["sha256"] == target["sha256"],
                "aHashDistance": hamming_hex(ta, row["source"]["aHash"]),
                "dHashDistance": hamming_hex(td, row["source"]["dHash"]),
                "combinedDistance": hamming_hex(ta, row["source"]["aHash"])
                + hamming_hex(td, row["source"]["dHash"]),
            }
        )
    good = [x for x in rows if "error" not in x]
    bad = [x for x in rows if "error" in x]
    good.sort(key=lambda x: (not x["exactByteDuplicate"], x["combinedDistance"], x["path"]))
    return good[:limit] + bad[: max(0, limit - len(good[:limit]))]


def nested_metric(target: dict, feature: str) -> float | None:
    metric_path = CALIBRATION_METRICS.get(feature)
    if not metric_path:
        return None
    value = target
    for key in metric_path:
        if not isinstance(value, dict) or key not in value:
            return None
        value = value[key]
    return float(value) if isinstance(value, (int, float)) else None


def neighbor_feature(report: dict, feature: str) -> float | None:
    rows = [row for row in report.get("nearestNeighbors", []) if "error" not in row]
    if not rows:
        return None
    if feature == "nearestAnyDistance":
        values = [row["combinedDistance"] for row in rows]
        return float(min(values)) if values else None
    if feature == "nearestSameCollectionDistance":
        collection = report.get("targetCollectionId")
        values = [
            row["combinedDistance"]
            for row in rows
            if collection and row.get("collectionId") == collection
        ]
        return float(min(values)) if values else None
    return None


def threshold_predict(value: float, direction: str, threshold: float) -> bool:
    if direction == "LE":
        return value <= threshold
    if direction == "GE":
        return value >= threshold
    return False


def apply_calibration(report: dict, calibration: dict | None) -> None:
    report["calibratedWarnings"] = []
    report["calibrationEvidence"] = {
        "provided": bool(calibration),
        "warningReadyFeatureCount": 0,
        "evaluatedFeatureCount": 0,
        "blockingEnabled": False,
    }
    if not calibration:
        return

    candidates = calibration.get("warningCandidates") or {}
    for feature, row in sorted(candidates.items()):
        if not row.get("warningReady") or row.get("blockingEnabled"):
            continue
        candidate = row.get("candidate") or {}
        direction = candidate.get("direction")
        threshold = candidate.get("threshold")
        if direction not in {"LE", "GE"} or not isinstance(threshold, (int, float)):
            continue

        value = nested_metric(report["target"], feature)
        if value is None:
            value = neighbor_feature(report, feature)
        if value is None:
            continue

        triggered = threshold_predict(float(value), direction, float(threshold))
        entry = {
            "feature": feature,
            "targetFailureCodes": row.get("targetFailureCodes") or [],
            "value": value,
            "direction": direction,
            "threshold": threshold,
            "triggered": triggered,
            "leaveOneOut": row.get("leaveOneOut"),
            "status": "REPORT_ONLY_WARNING" if triggered else "CALIBRATED_NO_WARNING",
            "blocking": False,
        }
        report["calibratedWarnings"].append(entry)

    report["calibrationEvidence"] = {
        "provided": True,
        "schemaVersion": calibration.get("schemaVersion"),
        "warningReadyFeatureCount": sum(
            1 for row in candidates.values() if row.get("warningReady")
        ),
        "evaluatedFeatureCount": len(report["calibratedWarnings"]),
        "triggeredWarningCount": sum(
            1 for row in report["calibratedWarnings"] if row["triggered"]
        ),
        "blockingEnabled": False,
        "sourcePolicy": calibration.get("policy"),
        "readiness": calibration.get("readiness"),
    }
    report["policy"]["thresholdsCalibrated"] = bool(
        report["calibrationEvidence"]["warningReadyFeatureCount"]
    )


def build_report(
    path: Path,
    neighbors: Path | None = None,
    thumbnail_size: int = 160,
    limit: int = 12,
    calibration: dict | None = None,
    neighbor_cache: dict | None = None,
) -> dict:
    if path.suffix.lower() not in ALLOWED:
        raise ValueError("preflight accepts PNG/JPEG/WebP only")
    target = scan_one(path, thumbnail_size=thumbnail_size)
    item_id = item_id_from_path(path)
    report = {
        "schemaVersion": 2,
        "kind": "STARBLOX_CATALOG_VISUAL_PREFLIGHT",
        "policy": {
            "reportOnly": True,
            "automaticAccept": False,
            "automaticRework": False,
            "humanExactHashReviewRequired": True,
            "thresholdsCalibrated": False,
            "calibratedWarningsAreBlocking": False,
        },
        "targetItemId": item_id,
        "targetCollectionId": collection_from_item_id(item_id),
        "target": target,
        "nearestNeighbors": [],
    }
    if neighbor_cache is not None:
        report["nearestNeighbors"] = compare_neighbor_cache(
            target,
            path,
            neighbor_cache,
            limit=limit,
        )
        report["neighborEvidence"] = {
            "mode": "CACHE",
            "entryCount": len(neighbor_cache.get("entries", [])),
            "cacheErrorCount": len(neighbor_cache.get("errors", [])),
        }
    elif neighbors:
        report["nearestNeighbors"] = compare_neighbors(
            target,
            path,
            neighbor_files(neighbors, path),
            limit=limit,
        )
        report["neighborEvidence"] = {"mode": "DIRECT_SCAN"}
    else:
        report["neighborEvidence"] = {"mode": "NONE"}
    apply_calibration(report, calibration)
    return report


def self_test() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        a = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        for x in range(28, 100):
            for y in range(20, 108):
                a.putpixel((x, y), (60 + (x % 40), 120, 220, 255))
        p1 = root / "auras-1-w11-v2.png"
        p2 = root / "auras-2-w11-v2.webp"
        p3 = root / "wall-1-w05-v2.png"
        a.save(p1)
        a.convert("RGB").save(p2, quality=82)
        b = Image.new("RGB", (128, 128), (245, 215, 40))
        b = ImageChops.add(
            b,
            Image.new("RGB", (128, 128), (0, 20, 40)),
            scale=1.0,
        )
        b.save(p3)

        cache = build_neighbor_cache(root)
        baseline = build_report(p1, neighbor_cache=cache)
        assert baseline["neighborEvidence"]["mode"] == "CACHE"
        assert baseline["policy"]["reportOnly"] is True
        assert baseline["target"]["source"]["width"] == 128
        assert baseline["target"]["source"]["hasAlpha"] is True
        assert baseline["targetItemId"] == "auras-1"
        # Same-item historical versions would be excluded; auras-2 and wall-1 remain.
        assert len(baseline["nearestNeighbors"]) == 2

        calibration = {
            "schemaVersion": 2,
            "policy": {"reportOnly": True, "blockingThresholdActivation": False},
            "readiness": {"automaticThresholdActivation": False},
            "warningCandidates": {
                "sourceEntropyBits": {
                    "warningReady": True,
                    "blockingEnabled": False,
                    "targetFailureCodes": ["SMALL_CARD_READABILITY"],
                    "candidate": {
                        "direction": "GE",
                        "threshold": 0.0,
                    },
                    "leaveOneOut": {
                        "falsePositiveRate": 0.05,
                        "recall": 0.5,
                        "balancedAccuracy": 0.7,
                    },
                },
                "sourceEdgeDensity": {
                    "warningReady": False,
                    "blockingEnabled": False,
                    "candidate": {"direction": "LE", "threshold": 0.2},
                },
            },
        }
        report = build_report(p1, calibration=calibration, neighbor_cache=cache)
        assert report["policy"]["thresholdsCalibrated"] is True
        assert report["policy"]["calibratedWarningsAreBlocking"] is False
        assert report["calibrationEvidence"]["triggeredWarningCount"] == 1
        assert report["calibratedWarnings"][0]["targetFailureCodes"] == ["SMALL_CARD_READABILITY"]
        assert report["calibratedWarnings"][0]["blocking"] is False
        print("SELF_TEST=PASS")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="command", required=True)
    sub.add_parser("self-test")
    cache_cmd = sub.add_parser("cache")
    cache_cmd.add_argument("--neighbors", required=True)
    cache_cmd.add_argument("--thumbnail", type=int, default=160)
    cache_cmd.add_argument("--output", required=True)
    scan = sub.add_parser("scan")
    scan.add_argument("--input", required=True)
    scan.add_argument("--neighbors")
    scan.add_argument("--neighbor-cache")
    scan.add_argument("--calibration")
    scan.add_argument("--thumbnail", type=int, default=160)
    scan.add_argument("--limit", type=int, default=12)
    scan.add_argument("--output")
    args = ap.parse_args()
    if args.command == "self-test":
        self_test()
        return
    if args.command == "cache":
        cache = build_neighbor_cache(Path(args.neighbors), thumbnail_size=args.thumbnail)
        dest = Path(args.output)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps(cache, indent=2) + "\n")
        print(json.dumps({
            "cached": len(cache["entries"]),
            "errors": len(cache["errors"]),
            "output": str(dest),
        }, indent=2))
        return

    calibration = (
        json.loads(Path(args.calibration).read_text())
        if args.calibration
        else None
    )
    neighbor_cache = (
        json.loads(Path(args.neighbor_cache).read_text())
        if args.neighbor_cache
        else None
    )
    report = build_report(
        Path(args.input),
        Path(args.neighbors) if args.neighbors else None,
        args.thumbnail,
        args.limit,
        calibration=calibration,
        neighbor_cache=neighbor_cache,
    )
    text = json.dumps(report, indent=2) + "\n"
    if args.output:
        dest = Path(args.output)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
