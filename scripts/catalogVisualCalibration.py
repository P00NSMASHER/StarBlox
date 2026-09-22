#!/usr/bin/env python3
"""Calibrate StarBlox report-only visual metrics against independent review labels.

This script measures whether objective image metrics separate ACCEPT from REWORK
in the current exact-hash corpus. It never activates blocking thresholds.
"""
from __future__ import annotations

import argparse
import json
import math
import statistics
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

from catalogVisualPreflight import scan_one, hamming_hex

RASTER_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
METRIC_PATHS = {
    "sourceLuminanceContrastRange": ("source", "luminanceContrastRange"),
    "sourceEntropyBits": ("source", "entropyBits"),
    "sourceEdgeDensity": ("source", "edgeDensity"),
    "thumbnailLuminanceContrastRange": ("thumbnail", "luminanceContrastRange"),
    "thumbnailEntropyBits": ("thumbnail", "entropyBits"),
    "thumbnailEdgeDensity": ("thumbnail", "edgeDensity"),
    "nonTransparentRatio": ("source", "nonTransparentRatio"),
    "contentBoundsRatio": ("source", "contentBoundsRatio"),
}


def normalize_repo_path(value: str | None) -> str | None:
    if not value:
        return None
    p = str(value).replace("\\", "/").lstrip("/")
    if p.startswith("assets/"):
        p = "public/" + p
    return p


def quantile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    xs = sorted(float(x) for x in values)
    if len(xs) == 1:
        return xs[0]
    pos = (len(xs) - 1) * q
    lo = math.floor(pos)
    hi = math.ceil(pos)
    if lo == hi:
        return xs[lo]
    frac = pos - lo
    return xs[lo] * (1 - frac) + xs[hi] * frac


def describe(values: list[float]) -> dict:
    if not values:
        return {"count": 0, "min": None, "q10": None, "median": None, "q90": None, "max": None}
    xs = [float(x) for x in values]
    return {
        "count": len(xs),
        "min": min(xs),
        "q10": quantile(xs, 0.10),
        "median": statistics.median(xs),
        "q90": quantile(xs, 0.90),
        "max": max(xs),
    }


def get_metric(row: dict, path: tuple[str, str]) -> float | None:
    value = row
    for key in path:
        if not isinstance(value, dict) or key not in value:
            return None
        value = value[key]
    return float(value) if isinstance(value, (int, float)) else None


def nearest_distances(rows: list[dict]) -> list[dict]:
    out = []
    for i, row in enumerate(rows):
        best = None
        same_collection = None
        for j, other in enumerate(rows):
            if i == j or row["itemId"] == other["itemId"]:
                continue
            distance = hamming_hex(row["metrics"]["source"]["aHash"], other["metrics"]["source"]["aHash"]) + hamming_hex(
                row["metrics"]["source"]["dHash"], other["metrics"]["source"]["dHash"]
            )
            candidate = {"itemId": other["itemId"], "collectionId": other["collectionId"], "distance": distance}
            if best is None or distance < best["distance"]:
                best = candidate
            if row["collectionId"] == other["collectionId"] and (same_collection is None or distance < same_collection["distance"]):
                same_collection = candidate
        out.append({
            "itemId": row["itemId"],
            "decision": row["decision"],
            "collectionId": row["collectionId"],
            "nearestAny": best,
            "nearestSameCollection": same_collection,
        })
    return out


def build_calibration(repo_root: Path, corpus: dict) -> dict:
    measured = []
    skipped = []
    for row in corpus.get("current", []):
        if not row.get("independent") or row.get("decision") not in {"ACCEPT", "REWORK"}:
            continue
        repo_path = normalize_repo_path(row.get("assetPath"))
        if not repo_path:
            skipped.append({"itemId": row.get("itemId"), "reason": "NO_ASSET_PATH"})
            continue
        path = (repo_root / repo_path).resolve()
        try:
            path.relative_to(repo_root.resolve())
        except ValueError:
            skipped.append({"itemId": row.get("itemId"), "reason": "PATH_ESCAPE"})
            continue
        if path.suffix.lower() not in RASTER_EXTS:
            skipped.append({"itemId": row.get("itemId"), "assetPath": repo_path, "reason": "NON_RASTER_CURRENT_ASSET"})
            continue
        if not path.is_file():
            skipped.append({"itemId": row.get("itemId"), "assetPath": repo_path, "reason": "MISSING_FILE"})
            continue
        try:
            metrics = scan_one(path)
        except Exception as exc:
            skipped.append({"itemId": row.get("itemId"), "assetPath": repo_path, "reason": type(exc).__name__ + ": " + str(exc)})
            continue
        measured.append({
            "itemId": row["itemId"],
            "collectionId": row.get("collectionId"),
            "decision": row["decision"],
            "failureCodes": row.get("failureCodes") or [],
            "assetPath": repo_path,
            "assetHash": row.get("assetHash"),
            "metrics": metrics,
        })

    by_decision = {"ACCEPT": [], "REWORK": []}
    for row in measured:
        by_decision[row["decision"]].append(row)

    distributions = {}
    for metric_name, metric_path in METRIC_PATHS.items():
        distributions[metric_name] = {}
        for decision in ("ACCEPT", "REWORK"):
            values = [get_metric(row["metrics"], metric_path) for row in by_decision[decision]]
            distributions[metric_name][decision] = describe([v for v in values if v is not None])

    nearest = nearest_distances(measured)
    for scope_key in ("nearestAny", "nearestSameCollection"):
        distributions[scope_key + "Distance"] = {}
        for decision in ("ACCEPT", "REWORK"):
            values = [row[scope_key]["distance"] for row in nearest if row["decision"] == decision and row[scope_key] is not None]
            distributions[scope_key + "Distance"][decision] = describe(values)

    by_failure_code = {}
    for row in measured:
        if row["decision"] != "REWORK":
            continue
        for code in row["failureCodes"]:
            group = by_failure_code.setdefault(code, {"count": 0, "items": []})
            group["count"] += 1
            group["items"].append(row["itemId"])

    accept_n = len(by_decision["ACCEPT"])
    rework_n = len(by_decision["REWORK"])
    raster_coverage = len(measured) / max(1, sum(1 for r in corpus.get("current", []) if r.get("independent") and r.get("decision") in {"ACCEPT", "REWORK"}))
    readiness = {
        "acceptedRasterSamples": accept_n,
        "reworkRasterSamples": rework_n,
        "rasterCoverage": round(raster_coverage, 4),
        "minimumRecommendedSamples": {"ACCEPT": 20, "REWORK": 12},
        "sampleCountReady": accept_n >= 20 and rework_n >= 12,
        "automaticThresholdActivation": False,
        "blockingThresholds": [],
        "note": "Metrics remain report-only even when sample-count readiness is met; false-positive calibration and reviewer sign-off are still required.",
    }

    return {
        "schemaVersion": 1,
        "kind": "STARBLOX_VISUAL_PREFLIGHT_CALIBRATION",
        "policy": {
            "humanReviewAuthoritative": True,
            "reportOnly": True,
            "automaticAccept": False,
            "automaticRework": False,
            "exactHashReviewRequired": True,
        },
        "readiness": readiness,
        "measured": measured,
        "skipped": skipped,
        "nearestNeighbors": nearest,
        "distributions": distributions,
        "reworkFailureCodeCoverage": by_failure_code,
    }


def self_test() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        asset_dir = root / "public/assets/catalog"
        asset_dir.mkdir(parents=True)

        def make(name: str, base: tuple[int, int, int], variant: int) -> None:
            im = Image.new("RGB", (128, 128), base)
            draw = ImageDraw.Draw(im)
            draw.rectangle((20 + variant, 18, 100, 108 - variant), outline=(250, 250, 250), width=5)
            draw.ellipse((40, 35 + variant, 90, 85 + variant), fill=(20 + variant * 8, 90, 220))
            im.save(asset_dir / name)

        make("a.png", (15, 20, 40), 0)
        make("b.png", (18, 24, 45), 2)
        make("c.png", (230, 210, 30), 8)
        make("d.png", (220, 200, 20), 12)

        current = [
            {"itemId": "wall-1", "collectionId": "wall", "decision": "ACCEPT", "independent": True, "assetPath": "/assets/catalog/a.png", "assetHash": "a", "failureCodes": []},
            {"itemId": "wall-2", "collectionId": "wall", "decision": "ACCEPT", "independent": True, "assetPath": "/assets/catalog/b.png", "assetHash": "b", "failureCodes": []},
            {"itemId": "wall-3", "collectionId": "wall", "decision": "REWORK", "independent": True, "assetPath": "/assets/catalog/c.png", "assetHash": "c", "failureCodes": ["THEME_MISMATCH"]},
            {"itemId": "wall-4", "collectionId": "wall", "decision": "REWORK", "independent": True, "assetPath": "/assets/catalog/d.png", "assetHash": "d", "failureCodes": ["WEAK_DEPTH"]},
        ]
        report = build_calibration(root, {"current": current})
        assert len(report["measured"]) == 4
        assert report["readiness"]["automaticThresholdActivation"] is False
        assert report["distributions"]["sourceEntropyBits"]["ACCEPT"]["count"] == 2
        assert report["reworkFailureCodeCoverage"]["THEME_MISMATCH"]["count"] == 1
        assert all(row["nearestSameCollection"] is not None for row in report["nearestNeighbors"])
        print("SELF_TEST=PASS")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--corpus")
    ap.add_argument("--output")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.corpus:
        raise SystemExit("--corpus is required unless --self-test is used")
    root = Path(args.repo_root).resolve()
    corpus = json.loads(Path(args.corpus).read_text())
    report = build_calibration(root, corpus)
    text = json.dumps(report, indent=2) + "\n"
    if args.output:
        dest = Path(args.output)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
