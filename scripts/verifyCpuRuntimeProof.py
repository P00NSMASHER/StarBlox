#!/usr/bin/env python3
"""Fail-closed verifier for the durable StarBlox CPU generation proof."""

from __future__ import annotations

import argparse
import hashlib
import json
import struct
from pathlib import Path, PurePosixPath
from typing import Any


EXPECTED_REPOSITORY = "P00NSMASHER/StarBlox"
EXPECTED_BRANCH = "screenshot-match-preproduction"
EXPECTED_RUNTIME_REPO = "huggingface/diffusers"
EXPECTED_RUNTIME_COMMIT = "7263f3317f6b392d62f41e9d75ed9d7e21fc5a5c"
EXPECTED_MODEL_ID = "stabilityai/stable-diffusion-xl-base-1.0"
EXPECTED_MODEL_REVISION = "462165984030d82259a11f4367a4eed129e94a7b"
EXPECTED_RIGHTS_BASIS = "USER_ATTESTED_FULL_RIGHTS"
EXPECTED_WORKFLOW = ".github/workflows/art-factory-cpu-runtime-proof.yml"
PROOF_PREFIX = PurePosixPath("docs/preproduction/art-factory/runtime-proofs")


def canonical_json_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(f"blob {len(data)}\0".encode() + data).hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def require_hex(value: Any, length: int, label: str) -> str:
    text = str(value or "").lower()
    require(len(text) == length, f"{label} must be {length} lowercase hex characters")
    require(all(char in "0123456789abcdef" for char in text), f"{label} is not lowercase hex")
    return text


def load_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"cannot read valid JSON from {path}") from exc
    require(isinstance(value, dict), f"{path} must contain a JSON object")
    return value


def resolve_evidence_path(root: Path, relative: Any, label: str) -> Path:
    raw = str(relative or "").replace("\\", "/")
    posix = PurePosixPath(raw)
    require(not posix.is_absolute() and ".." not in posix.parts, f"unsafe {label} path")
    require(posix.parts[: len(PROOF_PREFIX.parts)] == PROOF_PREFIX.parts, f"{label} must stay under {PROOF_PREFIX}")
    resolved = (root / Path(*posix.parts)).resolve()
    require(resolved.is_relative_to(root), f"{label} escapes repository root")
    require(resolved.is_file(), f"missing {label}: {raw}")
    return resolved


def verify_record_sha(record: dict[str, Any], label: str) -> str:
    recorded = require_hex(record.get("recordSha256"), 64, f"{label}.recordSha256")
    unsigned = dict(record)
    unsigned.pop("recordSha256", None)
    actual = sha256_bytes(canonical_json_bytes(unsigned))
    require(actual == recorded, f"{label} recordSha256 mismatch")
    return recorded


def png_dimensions(data: bytes) -> tuple[int, int]:
    require(data.startswith(b"\x89PNG\r\n\x1a\n"), "proof image is not a PNG")
    require(len(data) >= 24 and data[12:16] == b"IHDR", "proof image lacks a valid PNG IHDR")
    width, height = struct.unpack(">II", data[16:24])
    require(width > 0 and height > 0, "proof image dimensions must be positive")
    return width, height


def verify_job(job: dict[str, Any]) -> tuple[dict[str, Any], str]:
    require(job.get("kind") == "STARBLOX_ART_FACTORY_JOB", "unexpected proof job kind")
    require(job.get("repository") == EXPECTED_REPOSITORY, "proof job repository mismatch")
    require(job.get("branch") == EXPECTED_BRANCH, "proof job branch mismatch")
    source_head = require_hex(job.get("sourceHead"), 40, "proof job sourceHead")
    recorded = require_hex(job.get("planSha256"), 64, "proof job planSha256")
    unsigned = dict(job)
    unsigned.pop("planSha256", None)
    require(sha256_bytes(canonical_json_bytes(unsigned)) == recorded, "proof job planSha256 mismatch")
    attempts = job.get("attempts")
    require(isinstance(attempts, list) and len(attempts) == 1, "proof job must contain exactly one attempt")
    attempt = attempts[0]
    require(isinstance(attempt, dict), "proof attempt must be an object")
    require(attempt.get("itemId") == "runtime-proof", "proof attempt item mismatch")
    require(str(attempt.get("producer")) == "13", "proof attempt producer mismatch")
    prompt = str(attempt.get("promptText") or "")
    require(sha256_bytes(prompt.encode()) == attempt.get("promptSha256"), "proof prompt hash mismatch")
    require(int(attempt.get("seed") or 0) > 0, "proof attempt seed missing")
    runtime = attempt.get("runtime") or {}
    model = attempt.get("model") or {}
    require(runtime.get("repo") == EXPECTED_RUNTIME_REPO, "proof job runtime repo mismatch")
    require(runtime.get("commit") == EXPECTED_RUNTIME_COMMIT, "proof job runtime commit mismatch")
    require(model.get("modelId") == EXPECTED_MODEL_ID, "proof job model ID mismatch")
    require(model.get("revision") == EXPECTED_MODEL_REVISION, "proof job model revision mismatch")
    require(model.get("rightsBasis") == EXPECTED_RIGHTS_BASIS, "proof job rights basis mismatch")
    return attempt, source_head


def verify(root: Path, proof_path: Path) -> dict[str, Any]:
    proof = load_json(proof_path)
    require(proof.get("schemaVersion") == 1, "unsupported CPU proof schemaVersion")
    require(proof.get("kind") == "STARBLOX_ART_FACTORY_CPU_RUNTIME_PROOF", "unexpected CPU proof kind")
    require(proof.get("status") == "PROVEN", "CPU runtime proof is not PROVEN")
    require(proof.get("repository") == EXPECTED_REPOSITORY, "CPU proof repository mismatch")
    require(proof.get("branch") == EXPECTED_BRANCH, "CPU proof branch mismatch")

    workflow = proof.get("workflow") or {}
    require(workflow.get("path") == EXPECTED_WORKFLOW, "CPU proof workflow path mismatch")
    require(workflow.get("event") in {"push", "workflow_dispatch"}, "CPU proof workflow event is not allowed")
    require(workflow.get("status") == "completed", "CPU proof workflow is not completed")
    require(workflow.get("conclusion") == "success", "CPU proof workflow did not succeed")
    require(int(workflow.get("runId") or 0) > 0, "CPU proof workflow runId missing")
    require(int(workflow.get("jobId") or 0) > 0, "CPU proof workflow jobId missing")
    workflow_head = require_hex(workflow.get("headSha"), 40, "CPU proof workflow headSha")

    evidence = proof.get("evidence") or {}
    paths: dict[str, Path] = {}
    for key in ("job", "runtimeProbe", "generationReceipt", "proofImage"):
        paths[key] = resolve_evidence_path(root, evidence.get(f"{key}Path"), key)
        expected_sha = require_hex(evidence.get(f"{key}Sha256"), 64, f"{key}Sha256")
        require(sha256_bytes(paths[key].read_bytes()) == expected_sha, f"{key} file SHA-256 mismatch")

    job = load_json(paths["job"])
    probe = load_json(paths["runtimeProbe"])
    receipt = load_json(paths["generationReceipt"])
    image_bytes = paths["proofImage"].read_bytes()
    attempt, job_head = verify_job(job)
    require(job_head == workflow_head, "proof job head does not match successful workflow head")
    verify_record_sha(probe, "runtime probe")
    verify_record_sha(receipt, "generation receipt")

    require(probe.get("kind") == "STARBLOX_ART_FACTORY_RUNTIME_PROBE", "unexpected runtime probe kind")
    require(probe.get("repository") == EXPECTED_REPOSITORY and probe.get("branch") == EXPECTED_BRANCH, "runtime probe scope mismatch")
    require(probe.get("sourceHead") == job_head, "runtime probe source head mismatch")
    require(probe.get("sourcePlanSha256") == job.get("planSha256"), "runtime probe plan hash mismatch")
    require(probe.get("attemptId") == attempt.get("attemptId"), "runtime probe attempt mismatch")
    require((probe.get("executionCheckout") or {}).get("planSourceHeadMatchesExecutionHead") is True, "runtime probe checkout/head binding failed")
    probe_runtime = probe.get("runtime") or {}
    probe_model = probe.get("model") or {}
    require(probe_runtime.get("repo") == EXPECTED_RUNTIME_REPO, "runtime probe repo mismatch")
    require(probe_runtime.get("commit") == EXPECTED_RUNTIME_COMMIT, "runtime probe requested commit mismatch")
    require(probe_runtime.get("resolvedCommit") == EXPECTED_RUNTIME_COMMIT, "runtime probe resolved commit mismatch")
    require(probe_model.get("modelId") == EXPECTED_MODEL_ID, "runtime probe model ID mismatch")
    require(probe_model.get("revision") == EXPECTED_MODEL_REVISION, "runtime probe requested revision mismatch")
    require(probe_model.get("resolvedRevision") == EXPECTED_MODEL_REVISION, "runtime probe resolved revision mismatch")
    require((probe.get("hardware") or {}).get("cpuFallback", {}).get("eligible") is True, "CPU capacity gate did not pass")

    require(receipt.get("kind") == "STARBLOX_ART_FACTORY_GENERATION_RECEIPT", "unexpected generation receipt kind")
    require(receipt.get("status") == "GENERATED_SOURCE_BYTES_UNVERIFIED", "generation receipt status mismatch")
    require(receipt.get("repository") == EXPECTED_REPOSITORY and receipt.get("branch") == EXPECTED_BRANCH, "generation receipt scope mismatch")
    require(receipt.get("sourceHead") == job_head, "generation receipt source head mismatch")
    require(receipt.get("sourcePlanSha256") == job.get("planSha256"), "generation receipt plan hash mismatch")
    checkout = receipt.get("executionCheckout") or {}
    require(checkout.get("branch") == EXPECTED_BRANCH and checkout.get("head") == job_head, "generation checkout mismatch")
    require(checkout.get("planSourceHeadMatchesExecutionHead") is True, "generation checkout/head binding failed")
    rec_attempt = receipt.get("attempt") or {}
    require(rec_attempt.get("attemptId") == attempt.get("attemptId"), "generation attempt ID mismatch")
    for key in ("itemId", "promptSha256", "promptRecipeVersion", "seed"):
        require(rec_attempt.get(key) == attempt.get(key), f"generation attempt {key} mismatch")
    require(str(rec_attempt.get("producer")) == "13", "generation producer mismatch")
    rec_runtime = receipt.get("runtime") or {}
    rec_model = receipt.get("model") or {}
    require(rec_runtime.get("repo") == EXPECTED_RUNTIME_REPO, "generation runtime repo mismatch")
    require(rec_runtime.get("commit") == EXPECTED_RUNTIME_COMMIT, "generation requested runtime commit mismatch")
    require(rec_runtime.get("resolvedCommit") == EXPECTED_RUNTIME_COMMIT, "generation resolved runtime commit mismatch")
    require(rec_runtime.get("runtimeCommitVerified") is True, "generation runtime commit is unverified")
    require(rec_runtime.get("device") == "cpu" and rec_runtime.get("executionMode") == "cpu-fallback", "generation did not execute on CPU fallback")
    require(rec_model.get("modelId") == EXPECTED_MODEL_ID, "generation model ID mismatch")
    require(rec_model.get("revision") == EXPECTED_MODEL_REVISION, "generation requested model revision mismatch")
    require(rec_model.get("resolvedRevision") == EXPECTED_MODEL_REVISION, "generation resolved model revision mismatch")
    require(rec_model.get("snapshotRevisionVerified") is True, "generation model revision is unverified")
    require(rec_model.get("rightsBasis") == EXPECTED_RIGHTS_BASIS, "generation rights basis mismatch")
    generation = receipt.get("generation") or {}
    require(generation.get("executedSeed") == attempt.get("seed"), "executed seed mismatch")

    output = receipt.get("output") or {}
    width, height = png_dimensions(image_bytes)
    require((width, height) == (output.get("width"), output.get("height")), "proof PNG dimensions do not match receipt")
    require(8 <= width <= 256 and 8 <= height <= 256 and width % 8 == 0 and height % 8 == 0, "proof dimensions are outside the bounded proof range")
    require(output.get("format") == "PNG", "proof output format mismatch")
    require(output.get("sourceBytesPreserved") is True, "proof source bytes were not preserved")
    require(output.get("bytes") == len(image_bytes), "proof output byte count mismatch")
    require(output.get("sha256") == sha256_bytes(image_bytes), "proof output SHA-256 mismatch")
    require(output.get("gitBlobSha") == git_blob_sha(image_bytes), "proof output Git blob SHA mismatch")
    summary = proof.get("output") or {}
    for key in ("sha256", "gitBlobSha", "bytes", "width", "height", "format"):
        require(summary.get(key) == output.get(key), f"CPU proof output summary {key} mismatch")

    safety = receipt.get("safety") or {}
    require(safety.get("canonicalArtModified") is False, "proof claims canonical art mutation")
    require(safety.get("gameplayModified") is False, "proof claims gameplay mutation")
    require(safety.get("reviewDecisionMade") is False, "proof claims a review decision")
    require(safety.get("deploymentPerformed") is False, "proof claims deployment")
    require(safety.get("rightsBasis") == EXPECTED_RIGHTS_BASIS, "proof safety rights basis mismatch")
    require(receipt.get("nextGate") == "RUN_VERIFY_STAGED_OUTPUT_THEN_REAL_RENDER_AND_INDEPENDENT_EXACT_HASH_REVIEW", "independent review gate was not preserved")

    return {
        "status": "PROVEN",
        "workflowRunId": workflow["runId"],
        "workflowHead": workflow_head,
        "runtimeCommit": EXPECTED_RUNTIME_COMMIT,
        "modelRevision": EXPECTED_MODEL_REVISION,
        "executedSeed": generation["executedSeed"],
        "outputSha256": output["sha256"],
        "outputGitBlobSha": output["gitBlobSha"],
        "width": width,
        "height": height,
        "nextGate": receipt["nextGate"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--proof", default="docs/preproduction/art-factory/CPU_RUNTIME_PROOF.json")
    args = parser.parse_args()
    root = Path(args.repo_root).resolve()
    proof_path = (root / args.proof).resolve()
    require(proof_path.is_relative_to(root), "proof path escapes repository root")
    result = verify(root, proof_path)
    print("CPU_RUNTIME_PROOF=PASS")
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
