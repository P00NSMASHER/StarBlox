#!/usr/bin/env python3
"""Contract tests for the durable CPU runtime proof verifier."""

from __future__ import annotations

import copy
import hashlib
import json
import struct
import tempfile
import zlib
from pathlib import Path

from verifyCpuRuntimeProof import (
    EXPECTED_BRANCH,
    EXPECTED_MODEL_ID,
    EXPECTED_MODEL_REVISION,
    EXPECTED_REPOSITORY,
    EXPECTED_RIGHTS_BASIS,
    EXPECTED_RUNTIME_COMMIT,
    EXPECTED_RUNTIME_REPO,
    EXPECTED_WORKFLOW,
    canonical_json_bytes,
    git_blob_sha,
    sha256_bytes,
    verify,
)


def png_chunk(kind: bytes, payload: bytes) -> bytes:
    return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)


def make_png(width: int = 8, height: int = 8) -> bytes:
    rows = b"".join(b"\x00" + (b"\x33\x66\x99" * width) for _ in range(height))
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    return b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", zlib.compress(rows)) + png_chunk(b"IEND", b"")


def with_record_sha(record: dict) -> dict:
    result = copy.deepcopy(record)
    result["recordSha256"] = sha256_bytes(canonical_json_bytes(result))
    return result


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")


def build_fixture(root: Path) -> Path:
    head = "a" * 40
    prompt = "StarBlox deterministic runtime proof"
    prompt_sha = hashlib.sha256(prompt.encode()).hexdigest()
    attempt = {
        "attemptId": "runtime-proof-w13-a-proof",
        "itemId": "runtime-proof",
        "producer": "13",
        "variant": "A-PROOF",
        "promptText": prompt,
        "promptSha256": prompt_sha,
        "promptRecipeVersion": "cpu-runtime-proof-v1",
        "seed": 12345,
        "runtime": {"repo": EXPECTED_RUNTIME_REPO, "commit": EXPECTED_RUNTIME_COMMIT},
        "model": {
            "modelId": EXPECTED_MODEL_ID,
            "revision": EXPECTED_MODEL_REVISION,
            "rightsBasis": EXPECTED_RIGHTS_BASIS,
        },
    }
    job = {
        "schemaVersion": 1,
        "kind": "STARBLOX_ART_FACTORY_JOB",
        "repository": EXPECTED_REPOSITORY,
        "branch": EXPECTED_BRANCH,
        "sourceHead": head,
        "attempts": [attempt],
    }
    job["planSha256"] = sha256_bytes(canonical_json_bytes(job))
    checkout = {"branch": EXPECTED_BRANCH, "head": head, "planSourceHeadMatchesExecutionHead": True}
    probe = with_record_sha({
        "schemaVersion": 1,
        "kind": "STARBLOX_ART_FACTORY_RUNTIME_PROBE",
        "repository": EXPECTED_REPOSITORY,
        "branch": EXPECTED_BRANCH,
        "sourceHead": head,
        "sourcePlanSha256": job["planSha256"],
        "attemptId": attempt["attemptId"],
        "executionCheckout": checkout,
        "runtime": {
            **attempt["runtime"],
            "resolvedCommit": EXPECTED_RUNTIME_COMMIT,
        },
        "model": {
            **attempt["model"],
            "resolvedRevision": EXPECTED_MODEL_REVISION,
        },
        "hardware": {"cpuFallback": {"eligible": True}},
    })
    image = make_png()
    output = {
        "repoPath": "public/assets/catalog-candidates/runtime-proof/runtime-proof.png",
        "sha256": sha256_bytes(image),
        "gitBlobSha": git_blob_sha(image),
        "bytes": len(image),
        "width": 8,
        "height": 8,
        "format": "PNG",
        "sourceBytesPreserved": True,
    }
    receipt = with_record_sha({
        "schemaVersion": 1,
        "kind": "STARBLOX_ART_FACTORY_GENERATION_RECEIPT",
        "repository": EXPECTED_REPOSITORY,
        "branch": EXPECTED_BRANCH,
        "sourceHead": head,
        "sourcePlanSha256": job["planSha256"],
        "executionCheckout": checkout,
        "attempt": {
            "attemptId": attempt["attemptId"],
            "itemId": attempt["itemId"],
            "producer": attempt["producer"],
            "variant": attempt["variant"],
            "promptSha256": attempt["promptSha256"],
            "promptRecipeVersion": attempt["promptRecipeVersion"],
            "seed": attempt["seed"],
        },
        "runtime": {
            **attempt["runtime"],
            "resolvedCommit": EXPECTED_RUNTIME_COMMIT,
            "runtimeCommitVerified": True,
            "device": "cpu",
            "executionMode": "cpu-fallback",
        },
        "model": {
            **attempt["model"],
            "resolvedRevision": EXPECTED_MODEL_REVISION,
            "snapshotRevisionVerified": True,
        },
        "generation": {"executedSeed": attempt["seed"]},
        "output": output,
        "safety": {
            "canonicalArtModified": False,
            "gameplayModified": False,
            "reviewDecisionMade": False,
            "deploymentPerformed": False,
            "rightsBasis": EXPECTED_RIGHTS_BASIS,
        },
        "nextGate": "RUN_VERIFY_STAGED_OUTPUT_THEN_REAL_RENDER_AND_INDEPENDENT_EXACT_HASH_REVIEW",
        "status": "GENERATED_SOURCE_BYTES_UNVERIFIED",
    })

    rel_dir = Path("docs/preproduction/art-factory/runtime-proofs/123")
    files = {
        "job": rel_dir / "runtime-proof-job.json",
        "runtimeProbe": rel_dir / "runtime-probe.json",
        "generationReceipt": rel_dir / "generation-receipt.json",
        "proofImage": rel_dir / "runtime-proof.png",
    }
    write_json(root / files["job"], job)
    write_json(root / files["runtimeProbe"], probe)
    write_json(root / files["generationReceipt"], receipt)
    (root / files["proofImage"]).write_bytes(image)
    proof = {
        "schemaVersion": 1,
        "kind": "STARBLOX_ART_FACTORY_CPU_RUNTIME_PROOF",
        "status": "PROVEN",
        "repository": EXPECTED_REPOSITORY,
        "branch": EXPECTED_BRANCH,
        "workflow": {
            "path": EXPECTED_WORKFLOW,
            "event": "push",
            "status": "completed",
            "conclusion": "success",
            "runId": 123,
            "jobId": 456,
            "headSha": head,
        },
        "evidence": {},
        "output": output,
    }
    for key, rel in files.items():
        proof["evidence"][f"{key}Path"] = rel.as_posix()
        proof["evidence"][f"{key}Sha256"] = sha256_bytes((root / rel).read_bytes())
    proof_path = root / "docs/preproduction/art-factory/CPU_RUNTIME_PROOF.json"
    write_json(proof_path, proof)
    return proof_path


def main() -> None:
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp).resolve()
        proof_path = build_fixture(root)
        result = verify(root, proof_path)
        assert result["status"] == "PROVEN"

        image_path = root / json.loads(proof_path.read_text())["evidence"]["proofImagePath"]
        image_path.write_bytes(image_path.read_bytes() + b"tamper")
        try:
            verify(root, proof_path)
        except ValueError as exc:
            assert "proofImage file SHA-256 mismatch" in str(exc)
        else:
            raise AssertionError("tampered proof image was accepted")

    print("CPU_RUNTIME_PROOF_VERIFIER_TEST=PASS")


if __name__ == "__main__":
    main()
