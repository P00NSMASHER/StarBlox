"""Recover three immutable user reference images; never edit game runtime or saves."""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path
import tempfile
import urllib.request

from PIL import Image, __version__ as pillow_version

BRANCH = "screenshot-match-preproduction"
OUT = Path("docs/preproduction/reference-screenshots")
SOURCES = (
    ("home", "259C0221-9344-4000-97EA-9DE94B2B168C.jpeg", 702103,
     "6a4b110aeaf12a6ab0c629f9181cc6cfa8d4f55a518d4f2a6adb3ac6e756c457",
     "urn:aaid:sc:US:12ec85e5-0ee5-4871-b864-5664180dd47b",
     "https://at.adobe.com/DQevuA4DWStJoZI9"),
    ("store", "E6C9947A-B734-4A05-93D2-B8736B697DF0.jpeg", 775979,
     "b26cb14947d85258bcfff211174e54f34f2e2a11b83c73560b2365167071071d",
     "urn:aaid:sc:US:3f85aee0-7a63-42e4-b537-692b1b1859e1",
     "https://at.adobe.com/5TX2FZvgWQlEPMAb"),
    ("quest", "D3CF87BB-CB64-4D41-B3A2-6E6C75D09EDD.jpeg", 789649,
     "70f1b952709a85c77bb11851ffe9ae704acf8b97640355e908b6ec537b5c73c9",
     "urn:aaid:sc:US:45034c54-017e-440c-a5a4-7c61478f6bb2",
     "https://at.adobe.com/o65ot7CAnhtMv5yv"),
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def validate_original(data: bytes, expected_bytes: int, expected_sha: str) -> Image.Image:
    if len(data) != expected_bytes or sha256(data) != expected_sha:
        raise ValueError("Original source byte count or SHA-256 mismatch; nothing accepted.")
    with Image.open(io.BytesIO(data)) as image:
        if image.format != "JPEG" or image.size != (1448, 1086) or image.mode != "RGB":
            raise ValueError("Unexpected original image format, dimensions or color mode.")
        if image.getexif().get(274, 1) != 1 or 34853 in image.getexif():
            raise ValueError("Unexpected orientation or GPS metadata; publication stopped.")
        image.load()
        return image.copy()


def normalized_png(image: Image.Image) -> bytes:
    output = io.BytesIO()
    image.resize((1408, 1056), Image.Resampling.LANCZOS).save(output, "PNG")
    return output.getvalue()


def prepare(root: Path, source_dir: Path | None = None) -> dict:
    destination = root / OUT
    pending: dict[Path, bytes] = {}
    records = []
    for screen, filename, size, expected_hash, adobe_id, source_url in SOURCES:
        original_rel = OUT / "originals" / f"{screen}-1448x1086.jpeg"
        original = root / original_rel
        if original.is_file():
            data = original.read_bytes()
        elif source_dir is not None:
            data = (source_dir / filename).read_bytes()
        else:
            # Single-object URLs for these three reference images only; no account
            # token or authorization header is used. Stored originals avoid later expiry.
            request = urllib.request.Request(source_url, headers={"User-Agent": "StarBlox-reference-intake"})
            with urllib.request.urlopen(request, timeout=45) as response:
                data = response.read(size + 1)
        image = validate_original(data, size, expected_hash)
        derivative_rel = OUT / f"{screen}-desktop-1408x1056.png"
        derivative = normalized_png(image)
        for rel, content in ((original_rel, data), (derivative_rel, derivative)):
            path = root / rel
            if path.is_file() and path.read_bytes() != content:
                raise ValueError(f"Refusing to replace a different reference at {rel}.")
            pending[path] = content
        records.append({
            "screen": screen, "sourceAttachmentName": filename,
            "originalRepositoryPath": original_rel.as_posix(),
            "originalDimensions": [1448, 1086], "originalBytes": size,
            "originalSha256": expected_hash, "originalGitBlobSha": blob_sha(data),
            "adobeAssetId": adobe_id,
            "comparisonRepositoryPath": derivative_rel.as_posix(),
            "comparisonDimensions": [1408, 1056], "comparisonBytes": len(derivative),
            "comparisonSha256": sha256(derivative), "comparisonGitBlobSha": blob_sha(derivative),
            "transformation": "RGB JPEG decode; uniform 176/181 scale; Pillow LANCZOS; lossless PNG; no crop or creative edits",
        })
    report = {
        "schemaVersion": 1, "status": "ORIGINAL_BYTES_VERIFIED_AND_COMPARISON_FILES_PREPARED",
        "source": "Original three screenshots attached by the user in this conversation; not generated promotional collages",
        "branch": BRANCH, "pillowVersion": pillow_version, "images": records,
        "referenceCoverage": {"desktop": 3, "tablet": 0, "phone": 0},
        "checks": {"originalSha256": "PASS_3_OF_3", "originalDimensions": "PASS_1448x1086_3_OF_3",
                   "comparisonDimensions": "PASS_1408x1056_3_OF_3", "noGpsMetadata": "PASS_3_OF_3",
                   "referenceIdentity": "VISUALLY_CONFIRMED_HOME_STORE_QUEST_IN_INTERACTIVE_CHAT",
                   "gameVisualParity": "NOT_TESTED_BY_IMPORT", "catalogArtCompleted": 0},
        "usage": "Use originals for art direction and normalized desktop PNGs for the existing referenceScreenshotCapture.mjs naming contract. Do not invent mobile reference pixels or use a comparison-completed flag as visual acceptance.",
        "constraints": "Keep original StarBlox identity, exact real item IDs, source-grounded questions and child-safe economy. Screenshot wording, displayed balances, answers, scarcity/sale messaging and social promises are not product requirements.",
    }
    pending[destination / "original-reference-manifest.json"] = (json.dumps(report, indent=2) + "\n").encode()
    # Validate all sources before publishing any prepared files.
    for path, content in pending.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists() and path.read_bytes() == content:
            continue
        with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as temporary:
            temporary.write(content)
            temp_path = Path(temporary.name)
        temp_path.replace(path)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    parser.add_argument("--source-dir", type=Path, default=None)
    args = parser.parse_args()
    report = prepare(args.root.resolve(), args.source_dir)
    for entry in report["images"]:
        print(entry["screen"], "VERIFIED", entry["originalSha256"], entry["comparisonSha256"])
    print("REFERENCE_INTAKE_PASS=3; GAME_VISUAL_PARITY=NOT_TESTED; CATALOG_ITEMS_COMPLETED=0")


if __name__ == "__main__":
    main()
