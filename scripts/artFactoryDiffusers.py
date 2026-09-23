#!/usr/bin/env python3
"""Deterministic Diffusers generation adapter for the StarBlox Art Factory.

This adapter deliberately sits between artFactoryJob.mjs and
verify_staged_output.py. It may create versioned source candidates and a
provenance receipt, but it never reviews art, edits canonical mappings, deploys,
or mutates gameplay/state.

Heavy ML imports are lazy so `self-test` and `dry-run` remain cheap and CI-safe.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import importlib.metadata
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

FACTORY_BRANCH = "screenshot-match-preproduction"
RIGHTS_BASIS = "USER_ATTESTED_FULL_RIGHTS"
EXPECTED_RUNTIME_REPO = "huggingface/diffusers"
EXPECTED_RUNTIME_COMMIT = "7263f3317f6b392d62f41e9d75ed9d7e21fc5a5c"
ALLOWED_OUTPUT_EXTS = {".png"}
ALLOWED_OUTPUT_PREFIXES = ("public/assets/catalog/", "public/assets/catalog-candidates/")
HEX40_RE = re.compile(r"^[0-9a-f]{40}$")


def canonical_json_bytes(value: dict[str, Any]) -> bytes:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def derive_seed(item_id: str, prompt_sha256: str, variant: str) -> int:
    digest = hashlib.sha256(f"{item_id}|{prompt_sha256}|{variant}".encode()).digest()
    return 1 + (int.from_bytes(digest[:4], "big") % 2147483646)


def validate_plan_integrity(plan: dict[str, Any]) -> None:
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
            raise ValueError("planSha256 mismatch; job changed after compilation")


def select_attempt(plan: dict[str, Any], attempt_id: str) -> dict[str, Any]:
    validate_plan_integrity(plan)
    item = dict(plan.get("item") or {})
    item_id = str(item.get("id") or "")
    if not item_id:
        raise ValueError("job item.id missing")

    attempts = list(plan.get("attempts") or [])
    attempt = next((a for a in attempts if a.get("attemptId") == attempt_id), None)
    if attempt is None:
        raise ValueError(f"attempt not found: {attempt_id}")
    if attempt.get("itemId") != item_id:
        raise ValueError("attempt itemId does not match job item")
    if attempt.get("status") != "PLANNED_NOT_GENERATED":
        raise ValueError("generator accepts only planner-emitted PLANNED_NOT_GENERATED attempts")
    if attempt.get("model", {}).get("rightsBasis") != RIGHTS_BASIS:
        raise ValueError("attempt model rights basis mismatch")

    prompt = str(attempt.get("promptText") or "")
    prompt_sha = str(attempt.get("promptSha256") or "")
    if not prompt or sha256_bytes(prompt.encode()) != prompt_sha:
        raise ValueError("prompt text/hash mismatch")

    expected_seed = derive_seed(item_id, prompt_sha, str(attempt.get("variant") or ""))
    if int(attempt.get("seed") or 0) != expected_seed:
        raise ValueError("deterministic seed mismatch")

    runtime = dict(attempt.get("runtime") or {})
    if runtime.get("repo") != EXPECTED_RUNTIME_REPO:
        raise ValueError(f"runtime repo must be {EXPECTED_RUNTIME_REPO}")
    if runtime.get("commit") != EXPECTED_RUNTIME_COMMIT:
        raise ValueError("runtime commit does not match the pinned Art Factory Diffusers revision")

    model = dict(attempt.get("model") or {})
    if not model.get("modelId") or not model.get("revision"):
        raise ValueError("exact modelId and model revision are required")
    if not HEX40_RE.fullmatch(str(model["revision"]).lower()):
        raise ValueError("model revision must be an immutable lowercase 40-char commit SHA")

    return attempt


def safe_output_path(root: Path, repo_path: str, item_id: str, producer: str) -> tuple[Path, str]:
    rel = str(repo_path).strip().replace("\\", "/").lstrip("/")
    if rel.startswith("assets/"):
        rel = "public/" + rel
    if not any(rel.startswith(prefix) for prefix in ALLOWED_OUTPUT_PREFIXES):
        raise ValueError(
            "generated source must live under public/assets/catalog/ "
            "or public/assets/catalog-candidates/"
        )
    if Path(rel).suffix.lower() not in ALLOWED_OUTPUT_EXTS:
        raise ValueError("first-party generator currently emits PNG source candidates only")
    producer_num = int(producer) if str(producer).isdigit() else None
    producer_pat = f"(?:0?{producer_num})" if producer_num is not None else re.escape(str(producer))
    if not re.search(rf"{re.escape(item_id)}-w{producer_pat}-v\d+(?:-|$)", Path(rel).stem, re.I):
        raise ValueError("output filename must bind itemId + producer + numeric version")

    root_real = root.resolve()
    out = (root_real / rel).resolve()
    try:
        out.relative_to(root_real)
    except ValueError as exc:
        raise ValueError("output path escapes repository root") from exc
    return out, rel


def verify_reference_binding(attempt: dict[str, Any], reference_image: Path | None) -> dict[str, Any]:
    conditioning = dict(attempt.get("conditioning") or {})
    expected_sha = conditioning.get("referenceAssetSha256")
    if expected_sha and reference_image is None:
        raise ValueError("job declares referenceAssetSha256 but no --reference-image was supplied")
    if reference_image is not None and not expected_sha:
        raise ValueError("reference image supplied but job does not bind referenceAssetSha256")
    if reference_image is None:
        return {"referenceImage": None, "referenceAssetSha256": None}

    if not reference_image.is_file():
        raise ValueError(f"reference image missing: {reference_image}")
    actual = sha256_file(reference_image)
    if actual != expected_sha:
        raise ValueError(f"reference image SHA-256 mismatch: expected {expected_sha}, got {actual}")
    return {
        "referenceImage": str(reference_image),
        "referenceAssetSha256": actual,
    }


def installed_version(name: str) -> str | None:
    try:
        return importlib.metadata.version(name)
    except importlib.metadata.PackageNotFoundError:
        return None


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\\0" + data).hexdigest()


def verify_exact_revision(label: str, revision: str) -> str:
    value = str(revision or "").lower()
    if not HEX40_RE.fullmatch(value):
        raise ValueError(f"{label} must be an immutable lowercase 40-char commit SHA")
    return value


def installed_diffusers_provenance() -> dict[str, Any]:
    try:
        dist = importlib.metadata.distribution("diffusers")
    except importlib.metadata.PackageNotFoundError as exc:
        raise RuntimeError("diffusers distribution is not installed") from exc

    raw = dist.read_text("direct_url.json")
    if not raw:
        raise RuntimeError(
            "diffusers direct_url.json is missing; install the pinned runtime from the exact Git commit"
        )
    try:
        direct = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("diffusers direct_url.json is invalid JSON") from exc

    vcs = dict(direct.get("vcs_info") or {})
    commit = str(vcs.get("commit_id") or "").lower()
    if commit != EXPECTED_RUNTIME_COMMIT:
        raise RuntimeError(
            "installed Diffusers commit mismatch: "
            f"expected {EXPECTED_RUNTIME_COMMIT}, got {commit or 'missing'}"
        )
    return {
        "packageVersion": dist.version,
        "resolvedCommit": commit,
        "requestedRevision": vcs.get("requested_revision"),
        "vcs": vcs.get("vcs"),
        "sourceUrl": direct.get("url"),
        "verified": True,
    }


def resolve_hf_snapshot(
    repo_id: str,
    revision: str,
    *,
    local_files_only: bool,
    label: str,
) -> tuple[Path, dict[str, Any]]:
    exact = verify_exact_revision(label, revision)
    try:
        from huggingface_hub import snapshot_download
    except Exception as exc:  # pragma: no cover - generation environment only
        raise RuntimeError("huggingface_hub is required for exact snapshot resolution") from exc

    snapshot = Path(
        snapshot_download(
            repo_id=repo_id,
            revision=exact,
            local_files_only=bool(local_files_only),
        )
    ).resolve()
    resolved = snapshot.name.lower()
    if not HEX40_RE.fullmatch(resolved):
        raise RuntimeError(
            f"{label} snapshot path does not expose an immutable resolved revision: {snapshot}"
        )
    if resolved != exact:
        raise RuntimeError(
            f"{label} resolved revision mismatch: expected {exact}, got {resolved}"
        )
    return snapshot, {
        "repoId": repo_id,
        "requestedRevision": exact,
        "resolvedRevision": resolved,
        "verified": True,
    }


def checkout_identity(root: Path) -> dict[str, Any]:
    try:
        branch = subprocess.check_output(
            ["git", "branch", "--show-current"], cwd=root, text=True
        ).strip()
        head = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=root, text=True
        ).strip()
    except Exception as exc:
        raise RuntimeError("generation requires a real Git checkout for provenance") from exc
    if branch != FACTORY_BRANCH:
        raise RuntimeError(f"generation checkout must be on {FACTORY_BRANCH}, got {branch or 'DETACHED'}")
    if not HEX40_RE.fullmatch(head.lower()):
        raise RuntimeError("generation checkout HEAD is not a full 40-char commit SHA")
    return {"branch": branch, "head": head.lower()}



def build_dry_run(
    *,
    plan: dict[str, Any],
    attempt: dict[str, Any],
    repo_path: str,
    reference: dict[str, Any],
    args: argparse.Namespace,
) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "kind": "STARBLOX_ART_FACTORY_GENERATION_REQUEST",
        "repository": plan.get("repository"),
        "branch": FACTORY_BRANCH,
        "sourceHead": plan.get("sourceHead"),
        "sourcePlanSha256": plan.get("planSha256"),
        "attemptId": attempt.get("attemptId"),
        "itemId": attempt.get("itemId"),
        "producer": str(attempt.get("producer")),
        "variant": attempt.get("variant"),
        "promptSha256": attempt.get("promptSha256"),
        "seed": attempt.get("seed"),
        "runtime": attempt.get("runtime"),
        "model": attempt.get("model"),
        "conditioning": {
            **dict(attempt.get("conditioning") or {}),
            **reference,
            "ipAdapterModelId": args.ip_adapter_model_id,
            "ipAdapterRevision": args.ip_adapter_revision,
            "ipAdapterWeightName": args.ip_adapter_weight_name,
            "ipAdapterSubfolder": args.ip_adapter_subfolder,
        },
        "generation": {
            "width": args.width,
            "height": args.height,
            "numInferenceSteps": args.steps,
            "guidanceScale": args.guidance_scale,
            "device": args.device,
            "dtype": args.dtype,
        },
        "output": {"repoPath": repo_path},
        "status": "VALIDATED_NOT_GENERATED",
    }


def load_pipeline(attempt: dict[str, Any], args: argparse.Namespace):
    try:
        import torch
        import diffusers
        from diffusers import DiffusionPipeline
    except Exception as exc:  # pragma: no cover - exercised only in generation env
        raise RuntimeError(
            "generation requires torch + the pinned Diffusers runtime; "
            "self-test/dry-run intentionally do not import them"
        ) from exc

    runtime_proof = installed_diffusers_provenance()
    model = dict(attempt["model"])
    snapshot, model_proof = resolve_hf_snapshot(
        model["modelId"],
        model["revision"],
        local_files_only=bool(args.local_files_only),
        label="model revision",
    )

    requested = args.device
    if requested == "auto":
        if torch.cuda.is_available():
            device = "cuda"
        elif getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            device = "mps"
        else:
            device = "cpu"
    else:
        device = requested

    dtype_name = args.dtype
    if dtype_name == "auto":
        dtype_name = "float16" if device == "cuda" else "float32"
    dtype = getattr(torch, dtype_name, None)
    if dtype is None:
        raise ValueError(f"unsupported torch dtype: {dtype_name}")

    pipe = DiffusionPipeline.from_pretrained(
        str(snapshot),
        torch_dtype=dtype,
        local_files_only=True,
    )

    if args.enable_cpu_offload:
        if not hasattr(pipe, "enable_model_cpu_offload"):
            raise RuntimeError("selected pipeline does not expose enable_model_cpu_offload")
        pipe.enable_model_cpu_offload()
    else:
        pipe = pipe.to(device)

    return pipe, torch, diffusers, device, dtype_name, runtime_proof, model_proof


def maybe_load_ip_adapter(pipe, attempt: dict[str, Any], args: argparse.Namespace, reference_image: Path | None):
    conditioning = dict(attempt.get("conditioning") or {})
    if reference_image is None:
        if args.ip_adapter_model_id:
            raise ValueError("--ip-adapter-model-id requires --reference-image")
        return None, None

    if not args.ip_adapter_model_id or not args.ip_adapter_revision:
        raise ValueError("reference-conditioned generation requires exact --ip-adapter-model-id and --ip-adapter-revision")
    if not hasattr(pipe, "load_ip_adapter"):
        raise RuntimeError("selected Diffusers pipeline does not expose load_ip_adapter")

    adapter_snapshot, adapter_proof = resolve_hf_snapshot(
        args.ip_adapter_model_id,
        args.ip_adapter_revision,
        local_files_only=bool(args.local_files_only),
        label="IP-Adapter revision",
    )
    kwargs: dict[str, Any] = {}
    if args.ip_adapter_weight_name:
        kwargs["weight_name"] = args.ip_adapter_weight_name
    if args.ip_adapter_subfolder:
        kwargs["subfolder"] = args.ip_adapter_subfolder
    pipe.load_ip_adapter(str(adapter_snapshot), **kwargs)

    scale = conditioning.get("adapterScale")
    if scale is not None:
        if not hasattr(pipe, "set_ip_adapter_scale"):
            raise RuntimeError("job declares adapterScale but pipeline lacks set_ip_adapter_scale")
        pipe.set_ip_adapter_scale(float(scale))

    try:
        from PIL import Image
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Pillow is required for IP-Adapter reference images") from exc
    return Image.open(reference_image).convert("RGB"), adapter_proof


def generate(
    *,
    root: Path,
    plan: dict[str, Any],
    attempt: dict[str, Any],
    output_path: Path,
    output_repo_path: str,
    reference_image: Path | None,
    reference: dict[str, Any],
    args: argparse.Namespace,
) -> dict[str, Any]:
    if (attempt.get("conditioning") or {}).get("controlImageSha256"):
        raise ValueError("control-image jobs are not yet supported by this adapter; refusing to ignore bound conditioning")

    checkout = checkout_identity(root)
    pipe, torch, diffusers, device, dtype_name, runtime_proof, model_proof = load_pipeline(attempt, args)
    ip_image, ip_adapter_proof = maybe_load_ip_adapter(pipe, attempt, args, reference_image)

    generator_device = "cuda" if device == "cuda" else "cpu"
    gen = torch.Generator(device=generator_device).manual_seed(int(attempt["seed"]))
    call_kwargs: dict[str, Any] = {
        "prompt": attempt["promptText"],
        "generator": gen,
        "num_inference_steps": int(args.steps),
        "guidance_scale": float(args.guidance_scale),
        "width": int(args.width),
        "height": int(args.height),
    }
    if ip_image is not None:
        call_kwargs["ip_adapter_image"] = ip_image

    result = pipe(**call_kwargs)
    images = getattr(result, "images", None)
    if not images:
        raise RuntimeError("Diffusers pipeline returned no images")
    image = images[0]

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        prefix=output_path.stem + "-",
        suffix=".png",
        dir=output_path.parent,
        delete=False,
    ) as fh:
        temp_path = Path(fh.name)
    reused_existing_output = False
    try:
        image.save(temp_path, format="PNG", optimize=False)
        candidate_bytes = temp_path.read_bytes()
        if output_path.exists():
            existing = output_path.read_bytes()
            if existing != candidate_bytes:
                raise FileExistsError(
                    f"refusing to overwrite different existing candidate bytes: {output_repo_path}"
                )
            reused_existing_output = True
            temp_path.unlink(missing_ok=True)
        else:
            os.replace(temp_path, output_path)
    finally:
        if temp_path.exists():
            temp_path.unlink(missing_ok=True)

    data = output_path.read_bytes()
    output = {
        "repoPath": output_repo_path,
        "sha256": sha256_bytes(data),
        "gitBlobSha": git_blob_sha(data),
        "bytes": len(data),
        "width": int(getattr(image, "width")),
        "height": int(getattr(image, "height")),
        "format": "PNG",
        "sourceBytesPreserved": True,
        "reusedExistingIdenticalBytes": reused_existing_output,
    }

    receipt = {
        "schemaVersion": 1,
        "kind": "STARBLOX_ART_FACTORY_GENERATION_RECEIPT",
        "repository": plan.get("repository"),
        "branch": FACTORY_BRANCH,
        "sourceHead": plan.get("sourceHead"),
        "sourcePlanSha256": plan.get("planSha256"),
        "executionCheckout": {
            **checkout,
            "planSourceHeadMatchesExecutionHead": checkout["head"] == str(plan.get("sourceHead") or "").lower(),
        },
        "attempt": {
            "attemptId": attempt.get("attemptId"),
            "itemId": attempt.get("itemId"),
            "producer": str(attempt.get("producer")),
            "variant": attempt.get("variant"),
            "promptSha256": attempt.get("promptSha256"),
            "promptRecipeVersion": attempt.get("promptRecipeVersion"),
            "seed": int(attempt.get("seed")),
        },
        "runtime": {
            **dict(attempt.get("runtime") or {}),
            "resolvedCommit": runtime_proof["resolvedCommit"],
            "runtimeCommitVerified": True,
            "diffusersVersion": getattr(diffusers, "__version__", None) or installed_version("diffusers"),
            "diffusersInstallSource": runtime_proof.get("sourceUrl"),
            "torchVersion": getattr(torch, "__version__", None) or installed_version("torch"),
            "pythonPillowVersion": installed_version("Pillow"),
            "device": device,
            "dtype": dtype_name,
        },
        "model": {
            **dict(attempt.get("model") or {}),
            "resolvedRevision": model_proof["resolvedRevision"],
            "snapshotRevisionVerified": True,
        },
        "conditioning": {
            **dict(attempt.get("conditioning") or {}),
            **reference,
            "ipAdapterModelId": args.ip_adapter_model_id,
            "ipAdapterRevision": args.ip_adapter_revision,
            "ipAdapterResolvedRevision": (
                ip_adapter_proof.get("resolvedRevision") if ip_adapter_proof else None
            ),
            "ipAdapterRevisionVerified": bool(ip_adapter_proof),
            "ipAdapterWeightName": args.ip_adapter_weight_name,
            "ipAdapterSubfolder": args.ip_adapter_subfolder,
        },
        "generation": {
            "width": int(args.width),
            "height": int(args.height),
            "numInferenceSteps": int(args.steps),
            "guidanceScale": float(args.guidance_scale),
            "executedSeed": int(attempt.get("seed")),
        },
        "output": output,
        "safety": {
            "canonicalArtModified": False,
            "gameplayModified": False,
            "reviewDecisionMade": False,
            "deploymentPerformed": False,
            "rightsBasis": RIGHTS_BASIS,
        },
        "nextGate": "RUN_VERIFY_STAGED_OUTPUT_THEN_REAL_RENDER_AND_INDEPENDENT_EXACT_HASH_REVIEW",
        "status": "GENERATED_SOURCE_BYTES_UNVERIFIED",
    }
    receipt["recordSha256"] = sha256_bytes(canonical_json_bytes(receipt))
    return receipt


def self_test() -> None:
    prompt = "STARBLOX CATALOG ART — test"
    prompt_sha = sha256_bytes(prompt.encode())
    seed = derive_seed("decor-5", prompt_sha, "A-PHYSICAL")
    attempt = {
        "attemptId": "decor-5-w09-a-physical-test",
        "itemId": "decor-5",
        "producer": "09",
        "variant": "A-PHYSICAL",
        "promptBlocks": ["physical"],
        "promptText": prompt,
        "promptSha256": prompt_sha,
        "promptRecipeVersion": "test",
        "seed": seed,
        "runtime": {"repo": EXPECTED_RUNTIME_REPO, "commit": EXPECTED_RUNTIME_COMMIT},
        "model": {"modelId": "example/model", "revision": "d" * 40, "rightsBasis": RIGHTS_BASIS},
        "conditioning": {"referenceAssetSha256": None, "controlImageSha256": None, "adapterScale": None},
        "output": {"repoPath": None},
        "status": "PLANNED_NOT_GENERATED",
    }
    plan = {
        "schemaVersion": 1,
        "kind": "STARBLOX_ART_FACTORY_JOB",
        "repository": "P00NSMASHER/StarBlox",
        "branch": FACTORY_BRANCH,
        "sourceHead": "a" * 40,
        "item": {"id": "decor-5", "name": "Test", "collectionId": "decor", "type": "room", "tier": 3, "theme": "Test"},
        "sourceReviewHash": "old",
        "rightsBasis": RIGHTS_BASIS,
        "attempts": [attempt],
    }
    plan["planSha256"] = sha256_bytes(canonical_json_bytes(plan))

    got = select_attempt(plan, attempt["attemptId"])
    assert got["seed"] == seed
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        out, rel = safe_output_path(root, "public/assets/catalog/decor-5-w09-v99.png", "decor-5", "09")
        assert rel.endswith(".png")
        assert out.name == "decor-5-w09-v99.png"

        candidate_out, candidate_rel = safe_output_path(
            root,
            "public/assets/catalog-candidates/w09-decor/decor-5-w09-v99-a-original.png",
            "decor-5",
            "09",
        )
        assert candidate_rel.startswith("public/assets/catalog-candidates/")
        assert candidate_out.name.endswith("-original.png")

        try:
            bad = copy.deepcopy(plan)
            bad["attempts"][0]["model"]["revision"] = "main"
            unsigned = copy.deepcopy(bad)
            unsigned.pop("planSha256", None)
            bad["planSha256"] = sha256_bytes(canonical_json_bytes(unsigned))
            select_attempt(bad, attempt["attemptId"])
            raise AssertionError("mutable model revision unexpectedly passed")
        except ValueError as exc:
            assert "40-char commit SHA" in str(exc)

        ref = root / "ref.png"
        ref.write_bytes(b"reference-bytes")
        attempt["conditioning"]["referenceAssetSha256"] = sha256_file(ref)
        plan["planSha256"] = None  # mutate only inside self-test after integrity path was exercised
        binding = verify_reference_binding(attempt, ref)
        assert binding["referenceAssetSha256"] == sha256_file(ref)

        try:
            attempt["conditioning"]["referenceAssetSha256"] = "0" * 64
            verify_reference_binding(attempt, ref)
            raise AssertionError("reference hash mismatch unexpectedly passed")
        except ValueError as exc:
            assert "SHA-256 mismatch" in str(exc)

    print("SELF_TEST=PASS")


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="command", required=True)

    sub.add_parser("self-test")

    for name in ("dry-run", "generate"):
        p = sub.add_parser(name)
        p.add_argument("--repo-root", default=".")
        p.add_argument("--job", required=True)
        p.add_argument("--attempt-id", required=True)
        p.add_argument("--repo-path", required=True)
        p.add_argument("--receipt", required=True)
        p.add_argument("--reference-image")
        p.add_argument("--ip-adapter-model-id")
        p.add_argument("--ip-adapter-revision")
        p.add_argument("--ip-adapter-weight-name")
        p.add_argument("--ip-adapter-subfolder")
        p.add_argument("--width", type=int, default=1024)
        p.add_argument("--height", type=int, default=1024)
        p.add_argument("--steps", type=int, default=28)
        p.add_argument("--guidance-scale", type=float, default=3.5)
        p.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda", "mps"])
        p.add_argument("--dtype", default="auto", choices=["auto", "float32", "float16", "bfloat16"])
        p.add_argument("--enable-cpu-offload", action="store_true")
        p.add_argument("--local-files-only", action="store_true")

    return ap.parse_args()


def main() -> None:
    args = parse_args()
    if args.command == "self-test":
        self_test()
        return

    root = Path(args.repo_root).resolve()
    plan = json.loads(Path(args.job).read_text())
    attempt = select_attempt(plan, args.attempt_id)
    producer = str(attempt.get("producer") or "")
    output_path, output_repo_path = safe_output_path(
        root, args.repo_path, str(attempt.get("itemId")), producer
    )
    reference_image = Path(args.reference_image).resolve() if args.reference_image else None
    reference = verify_reference_binding(attempt, reference_image)

    receipt_path = Path(args.receipt)
    receipt_path.parent.mkdir(parents=True, exist_ok=True)

    if args.command == "dry-run":
        report = build_dry_run(
            plan=plan,
            attempt=attempt,
            repo_path=output_repo_path,
            reference=reference,
            args=args,
        )
        report["recordSha256"] = sha256_bytes(canonical_json_bytes(report))
        receipt_path.write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps({
            "validated": True,
            "attemptId": attempt["attemptId"],
            "repoPath": output_repo_path,
            "seed": attempt["seed"],
            "receipt": str(receipt_path),
        }, indent=2))
        return

    report = generate(
        root=root,
        plan=plan,
        attempt=attempt,
        output_path=output_path,
        output_repo_path=output_repo_path,
        reference_image=reference_image,
        reference=reference,
        args=args,
    )
    receipt_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({
        "generated": True,
        "attemptId": attempt["attemptId"],
        "repoPath": report["output"]["repoPath"],
        "sha256": report["output"]["sha256"],
        "receipt": str(receipt_path),
        "nextGate": report["nextGate"],
    }, indent=2))


if __name__ == "__main__":
    main()
