#!/usr/bin/env python3
"""Report-only visual preflight for StarBlox catalog rasters.

This tool never ACCEPTs or REWORKs art. It records objective image metrics and
perceptual-neighbor evidence so human reviewers can spend less time on obvious
technical/duplicate failures.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import tempfile
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageChops, ImageFilter, ImageOps, ImageStat

ALLOWED = {".png", ".jpg", ".jpeg", ".webp"}


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


def compare_neighbors(target: dict, paths: Iterable[Path], limit: int = 12) -> list[dict]:
    rows = []
    ta = target["source"]["aHash"]
    td = target["source"]["dHash"]
    for path in paths:
        try:
            row = scan_one(path)
        except Exception as exc:
            rows.append({"path": path.as_posix(), "error": type(exc).__name__ + ": " + str(exc)})
            continue
        rows.append({
            "path": path.as_posix(),
            "sha256": row["sha256"],
            "exactByteDuplicate": row["sha256"] == target["sha256"],
            "aHashDistance": hamming_hex(ta, row["source"]["aHash"]),
            "dHashDistance": hamming_hex(td, row["source"]["dHash"]),
            "combinedDistance": hamming_hex(ta, row["source"]["aHash"]) + hamming_hex(td, row["source"]["dHash"]),
        })
    good = [x for x in rows if "error" not in x]
    bad = [x for x in rows if "error" in x]
    good.sort(key=lambda x: (not x["exactByteDuplicate"], x["combinedDistance"], x["path"]))
    return good[:limit] + bad[: max(0, limit - len(good[:limit]))]


def build_report(path: Path, neighbors: Path | None = None, thumbnail_size: int = 160, limit: int = 12) -> dict:
    if path.suffix.lower() not in ALLOWED:
        raise ValueError("preflight accepts PNG/JPEG/WebP only")
    target = scan_one(path, thumbnail_size=thumbnail_size)
    report = {
        "schemaVersion": 1,
        "kind": "STARBLOX_CATALOG_VISUAL_PREFLIGHT",
        "policy": {
            "reportOnly": True,
            "automaticAccept": False,
            "automaticRework": False,
            "humanExactHashReviewRequired": True,
            "thresholdsCalibrated": False,
        },
        "target": target,
        "nearestNeighbors": [],
    }
    if neighbors:
        report["nearestNeighbors"] = compare_neighbors(target, neighbor_files(neighbors, path), limit=limit)
    return report


def self_test() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        a = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        for x in range(28, 100):
            for y in range(20, 108):
                a.putpixel((x, y), (60 + (x % 40), 120, 220, 255))
        p1 = root / "a.png"
        p2 = root / "same-different-compression.webp"
        p3 = root / "different.png"
        a.save(p1)
        a.convert("RGB").save(p2, quality=82)
        b = Image.new("RGB", (128, 128), (245, 215, 40))
        b = ImageChops.add(b, Image.new("RGB", (128, 128), (0, 20, 40)), scale=1.0)
        b.save(p3)
        report = build_report(p1, root)
        assert report["policy"]["reportOnly"] is True
        assert report["target"]["source"]["width"] == 128
        assert report["target"]["source"]["hasAlpha"] is True
        assert len(report["nearestNeighbors"]) == 2
        same = next(x for x in report["nearestNeighbors"] if x["path"].endswith("same-different-compression.webp"))
        different = next(x for x in report["nearestNeighbors"] if x["path"].endswith("different.png"))
        assert same["combinedDistance"] <= different["combinedDistance"]
        assert same["exactByteDuplicate"] is False
        print("SELF_TEST=PASS")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="command", required=True)
    sub.add_parser("self-test")
    scan = sub.add_parser("scan")
    scan.add_argument("--input", required=True)
    scan.add_argument("--neighbors")
    scan.add_argument("--thumbnail", type=int, default=160)
    scan.add_argument("--limit", type=int, default=12)
    scan.add_argument("--output")
    args = ap.parse_args()
    if args.command == "self-test":
        self_test()
        return
    report = build_report(Path(args.input), Path(args.neighbors) if args.neighbors else None, args.thumbnail, args.limit)
    text = json.dumps(report, indent=2) + "\n"
    if args.output:
        dest = Path(args.output)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
