#!/usr/bin/env python3
"""Verify one StarBlox Art Factory output before render/review handoff.

This tool is deliberately non-canonical: it verifies bytes/provenance and emits
a handoff record, but it never approves art or edits catalog runtime mappings.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
import tempfile
from pathlib import Path

from PIL import Image, ImageOps

FACTORY_BRANCH = "screenshot-match-preproduction"
RIGHTS_BASIS = "USER_ATTESTED_FULL_RIGHTS"
ALLOWED_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
FORBIDDEN_REPO_PATHS = {"catalog-art-manifest.json", "src/catalogArtRuntime.js"}
REVIEWER_BY_FAMILY = {
    "tops": "01", "bottoms": "01", "headwear": "01", "facegear": "01",
    "shoes": "02", "backgear": "02", "handgear": "02", "seating": "02",
    "beds": "05", "desks": "05", "companions": "05", "auras": "05",
    "lighting": "14", "wall": "14", "rugs": "14", "decor": "14",
}
ALLOWED_REVIEWERS = {"01", "02", "05", "11", "14"}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def canonical_json_bytes(value: dict) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def validate_plan_integrity(plan: dict) -> None:
    if plan.get("kind") != "STARBLOX_ART_FACTORY_JOB":
        raise ValueError("wrong job kind")
    if plan.get("branch") != FACTORY_BRANCH:
        raise ValueError(f"job branch must be {FACTORY_BRANCH}")
    if plan.get("rightsBasis") != RIGHTS_BASIS:
        raise ValueError("job rights basis mismatch")
    if plan.get("planSha256"):
        unsigned = copy.deepcopy(plan)
        recorded = unsigned.pop("planSha256")
        actual = sha256_bytes(canonical_json_bytes(unsigned))
        if recorded != actual:
            raise ValueError("planSha256 mismatch; job plan changed after compilation")


def normalize_repo_path(value: str) -> str:
    p = str(value).strip().replace("\\", "/").lstrip("/")
    if p.startswith("assets/"):
        p = "public/" + p
    return p


def safe_asset_path(root: Path, repo_path: str) -> tuple[Path, str]:
    rel = normalize_repo_path(repo_path)
    if rel in FORBIDDEN_REPO_PATHS or rel.startswith(".git/"):
        raise ValueError("factory output cannot target canonical/runtime/git control files")
    if Path(rel).suffix.lower() not in ALLOWED_EXTS:
        raise ValueError("factory output must be PNG/JPEG/WebP")
    root_real = root.resolve()
    path = (root_real / rel).resolve()
    try:
        path.relative_to(root_real)
    except ValueError as exc:
        raise ValueError("repo path escapes repository root") from exc
    if not path.is_file():
        raise ValueError(f"staged file missing: {rel}")
    return path, rel


def image_metadata(path: Path) -> dict:
    with Image.open(path) as im:
        fmt = im.format
        im.verify()
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im)
        width, height = im.size
        mode = im.mode
    if width <= 0 or height <= 0:
        raise ValueError("invalid raster dimensions")
    return {"format": fmt, "width": int(width), "height": int(height), "mode": mode}


def expected_reviewer(item: dict) -> str | None:
    collection = str(item.get("collectionId") or "").lower()
    return REVIEWER_BY_FAMILY.get(collection)


def load_reviewer_routing(root: Path, routing_file: str, item_id: str) -> dict:
    rel = normalize_repo_path(routing_file)
    root_real = root.resolve()
    path = (root_real / rel).resolve()
    try:
        path.relative_to(root_real)
    except ValueError as exc:
        raise ValueError("reviewer routing file escapes repository root") from exc
    if not path.is_file():
        raise ValueError(f"reviewer routing file missing: {rel}")
    record = json.loads(path.read_text())
    if record.get("kind") != "STARBLOX_ART_FACTORY_CPU_GENERATION_QUEUE":
        raise ValueError("reviewer routing file has wrong kind")
    if record.get("branch") != FACTORY_BRANCH:
        raise ValueError("reviewer routing file branch mismatch")
    reviewer = str((record.get("reviewerByItem") or {}).get(item_id) or "")
    if reviewer not in ALLOWED_REVIEWERS:
        raise ValueError(f"routing file has no valid independent reviewer for {item_id}")
    data = path.read_bytes()
    return {
        "reviewer": reviewer,
        "routingFile": rel,
        "routingFileSha256": sha256_bytes(data),
        "queueId": record.get("queueId"),
    }


def verify_output(
    *,
    root: Path,
    plan: dict,
    attempt_id: str,
    repo_path: str,
    reviewer: str | None = None,
    derivative_of_sha256: str | None = None,
    reviewer_routing_file: str | None = None,
) -> dict:
    validate_plan_integrity(plan)
    attempts = list(plan.get("attempts") or [])
    attempt = next((a for a in attempts if a.get("attemptId") == attempt_id), None)
    if attempt is None:
        raise ValueError(f"attempt not found: {attempt_id}")
    if attempt.get("status") != "PLANNED_NOT_GENERATED":
        raise ValueError("verifier accepts only planner-emitted PLANNED_NOT_GENERATED attempts")
    if attempt.get("model", {}).get("rightsBasis") != RIGHTS_BASIS:
        raise ValueError("attempt model rights basis mismatch")

    item = dict(plan.get("item") or {})
    item_id = str(item.get("id") or "")
    if not item_id or attempt.get("itemId") != item_id:
        raise ValueError("attempt itemId does not match job item")
    producer = str(attempt.get("producer") or "")
    if not producer:
        raise ValueError("producer missing")

    path, rel = safe_asset_path(root, repo_path)
    collection = str(item.get("collectionId") or "").lower()
    routed = expected_reviewer(item)
    routing_evidence = None
    if reviewer_routing_file:
        routing_evidence = load_reviewer_routing(root, reviewer_routing_file, item_id)
        chosen_reviewer = routing_evidence["reviewer"]
        if reviewer is not None and str(reviewer) != chosen_reviewer:
            raise ValueError(
                f"explicit reviewer {reviewer} disagrees with routing evidence {chosen_reviewer}"
            )
    else:
        chosen_reviewer = str(reviewer) if reviewer is not None else routed
        if routed and chosen_reviewer != routed:
            raise ValueError(
                f"{collection} must route to independent reviewer {routed}, not {chosen_reviewer}"
            )
    if chosen_reviewer not in ALLOWED_REVIEWERS:
        raise ValueError(f"invalid independent reviewer: {chosen_reviewer}")
    if chosen_reviewer == producer or (
        producer.isdigit() and chosen_reviewer.isdigit() and int(chosen_reviewer) == int(producer)
    ):
        raise ValueError("producer may not review its own output")

    if routed:
        producer_num = int(producer) if producer.isdigit() else None
        producer_pattern = f"(?:0?{producer_num})" if producer_num is not None else re.escape(producer)
        versioned = re.search(
            rf"{re.escape(item_id)}-w{producer_pattern}-v\d+",
            Path(rel).stem,
            re.I,
        )
        if not versioned:
            raise ValueError("catalog factory output path must bind itemId + producer + version")

    data = path.read_bytes()
    meta = image_metadata(path)
    output = {
        "repoPath": rel,
        "sha256": sha256_bytes(data),
        "gitBlobSha": git_blob_sha(data),
        "bytes": len(data),
        **meta,
    }
    report = {
        "schemaVersion": 1,
        "kind": "STARBLOX_ART_FACTORY_STAGED_OUTPUT",
        "repository": plan.get("repository"),
        "branch": FACTORY_BRANCH,
        "sourceHead": plan.get("sourceHead"),
        "sourcePlanSha256": plan.get("planSha256"),
        "item": item,
        "attempt": {
            "attemptId": attempt.get("attemptId"),
            "producer": producer,
            "variant": attempt.get("variant"),
            "promptBlocks": attempt.get("promptBlocks"),
            "promptSha256": attempt.get("promptSha256"),
            "promptRecipeVersion": attempt.get("promptRecipeVersion"),
            "seed": attempt.get("seed"),
            "runtime": attempt.get("runtime"),
            "model": attempt.get("model"),
            "conditioning": attempt.get("conditioning"),
        },
        "output": output,
        "derivativeLineage": {
            "derivativeOfSha256": derivative_of_sha256,
            "sourcePreserved": True,
        },
        "renderEvidence": [],
        "review": {
            "reviewer": chosen_reviewer,
            "routing": routing_evidence or {
                "legacyFamilyDefault": routed,
                "collection": collection,
            },
            "state": "PENDING_ACTUAL_PIXEL_REVIEW",
            "decision": None,
        },
        "safety": {
            "canonicalArtModified": False,
            "gameplayModified": False,
            "automaticPerceptualDecision": False,
            "rightsBasis": RIGHTS_BASIS,
        },
        "status": "STAGED_EXACT_BYTES_VERIFIED",
    }
    report["recordSha256"] = sha256_bytes(canonical_json_bytes(report))
    return report


def self_test() -> None:
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        out = root / "public/assets/catalog/decor-3-w09-v99.png"
        out.parent.mkdir(parents=True)
        Image.new("RGBA", (7, 5), (10, 20, 30, 180)).save(out)

        attempts = [{
            "attemptId": "decor-3-w09-a-abc",
            "itemId": "decor-3",
            "producer": "09",
            "variant": "A-PHYSICAL",
            "promptBlocks": ["physical", "card"],
            "promptText": "x",
            "promptSha256": hashlib.sha256(b"x").hexdigest(),
            "promptRecipeVersion": "artPromptOptimizer-v1",
            "seed": 123,
            "runtime": {"repo": "huggingface/diffusers", "commit": "abc"},
            "model": {"modelId": "model", "revision": "rev", "rightsBasis": RIGHTS_BASIS},
            "conditioning": {"referenceAssetSha256": None, "controlImageSha256": None, "adapterScale": None},
            "output": {"repoPath": None, "sha256": None, "gitBlobSha": None, "bytes": None, "width": None, "height": None},
            "status": "PLANNED_NOT_GENERATED",
        }]
        plan = {
            "schemaVersion": 1,
            "kind": "STARBLOX_ART_FACTORY_JOB",
            "repository": "P00NSMASHER/StarBlox",
            "branch": FACTORY_BRANCH,
            "sourceHead": "abc123",
            "item": {"id": "decor-3", "name": "Arcade Mini", "collectionId": "decor", "type": "room", "tier": 3, "theme": "Arcade Pop"},
            "sourceReviewHash": "old",
            "rightsBasis": RIGHTS_BASIS,
            "attempts": attempts,
        }
        plan["planSha256"] = sha256_bytes(canonical_json_bytes(plan))
        report = verify_output(root=root, plan=plan, attempt_id=attempts[0]["attemptId"], repo_path=str(out.relative_to(root)))
        assert report["output"]["width"] == 7 and report["output"]["height"] == 5
        assert report["review"]["reviewer"] == "14"
        assert report["status"] == "STAGED_EXACT_BYTES_VERIFIED"

        bad = copy.deepcopy(plan)
        bad["sourceHead"] = "tampered"
        try:
            verify_output(root=root, plan=bad, attempt_id=attempts[0]["attemptId"], repo_path=str(out.relative_to(root)))
            raise AssertionError("tampered plan unexpectedly verified")
        except ValueError as exc:
            assert "planSha256 mismatch" in str(exc)

        try:
            verify_output(root=root, plan=plan, attempt_id=attempts[0]["attemptId"], repo_path=str(out.relative_to(root)), reviewer="01")
            raise AssertionError("wrong reviewer unexpectedly verified")
        except ValueError as exc:
            assert "reviewer 14" in str(exc)

    print("SELF_TEST=PASS")


def main() -> None:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="command", required=True)
    sub.add_parser("self-test")
    verify = sub.add_parser("verify")
    verify.add_argument("--repo-root", default=".")
    verify.add_argument("--job", required=True)
    verify.add_argument("--attempt-id", required=True)
    verify.add_argument("--repo-path", required=True)
    verify.add_argument("--reviewer")
    verify.add_argument("--derivative-of-sha256")
    verify.add_argument("--reviewer-routing-file")
    verify.add_argument("--output", required=True)
    args = ap.parse_args()

    if args.command == "self-test":
        self_test()
        return

    root = Path(args.repo_root).resolve()
    plan = json.loads(Path(args.job).read_text())
    report = verify_output(
        root=root,
        plan=plan,
        attempt_id=args.attempt_id,
        repo_path=args.repo_path,
        reviewer=args.reviewer,
        derivative_of_sha256=args.derivative_of_sha256,
        reviewer_routing_file=args.reviewer_routing_file,
    )
    dest = Path(args.output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({
        "verified": True,
        "attemptId": report["attempt"]["attemptId"],
        "repoPath": report["output"]["repoPath"],
        "sha256": report["output"]["sha256"],
        "gitBlobSha": report["output"]["gitBlobSha"],
        "reviewer": report["review"]["reviewer"],
        "recordSha256": report["recordSha256"],
    }, indent=2))


if __name__ == "__main__":
    main()
