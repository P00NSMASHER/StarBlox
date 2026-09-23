#!/usr/bin/env python3
"""Cheap contract tests for scripts/artFactoryDiffusers.py.

No torch/model downloads are needed. Real inference remains an explicit local/GPU
operation after a deterministic job has been compiled.
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path


def run(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "scripts/artFactoryDiffusers.py", *args],
        text=True,
        capture_output=True,
        check=False,
    )


def main() -> None:
    direct = run("self-test")
    assert direct.returncode == 0, direct.stderr
    assert "SELF_TEST=PASS" in direct.stdout

    # The cheap self-test also covers CPU fallback capacity policy without
    # importing torch or downloading model weights.

    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        prompt = "x"
        import hashlib
        prompt_sha = hashlib.sha256(prompt.encode()).hexdigest()
        raw = hashlib.sha256(f"decor-5|{prompt_sha}|A-PHYSICAL".encode()).digest()
        seed = 1 + (int.from_bytes(raw[:4], "big") % 2147483646)
        attempt = {
            "attemptId": "decor-5-w09-a-test",
            "itemId": "decor-5",
            "producer": "09",
            "variant": "A-PHYSICAL",
            "promptBlocks": ["physical"],
            "promptText": prompt,
            "promptSha256": prompt_sha,
            "promptRecipeVersion": "test",
            "seed": seed,
            "runtime": {
                "repo": "huggingface/diffusers",
                "commit": "7263f3317f6b392d62f41e9d75ed9d7e21fc5a5c",
            },
            "model": {
                "modelId": "example/model",
                "revision": "d" * 40,
                "rightsBasis": "USER_ATTESTED_FULL_RIGHTS",
            },
            "conditioning": {
                "referenceAssetSha256": None,
                "controlImageSha256": None,
                "adapterScale": None,
            },
            "output": {"repoPath": None},
            "status": "PLANNED_NOT_GENERATED",
        }
        plan = {
            "schemaVersion": 1,
            "kind": "STARBLOX_ART_FACTORY_JOB",
            "repository": "P00NSMASHER/StarBlox",
            "branch": "screenshot-match-preproduction",
            "sourceHead": "abc123",
            "item": {
                "id": "decor-5",
                "name": "Test",
                "collectionId": "decor",
                "type": "room",
                "tier": 3,
                "theme": "Test",
            },
            "sourceReviewHash": "old",
            "rightsBasis": "USER_ATTESTED_FULL_RIGHTS",
            "attempts": [attempt],
        }
        encoded = json.dumps(plan, ensure_ascii=False, separators=(",", ":")).encode()
        plan["planSha256"] = hashlib.sha256(encoded).hexdigest()

        job = root / "job.json"
        receipt = root / "receipt.json"
        job.write_text(json.dumps(plan, indent=2) + "\n")
        p = run(
            "dry-run",
            "--repo-root", str(root),
            "--job", str(job),
            "--attempt-id", attempt["attemptId"],
            "--repo-path", "public/assets/catalog-candidates/test/decor-5-w09-v99-a-original.png",
            "--receipt", str(receipt),
        )
        assert p.returncode == 0, p.stderr
        report = json.loads(receipt.read_text())
        assert report["status"] == "VALIDATED_NOT_GENERATED"
        assert report["seed"] == seed
        assert report["runtime"]["commit"] == "7263f3317f6b392d62f41e9d75ed9d7e21fc5a5c"
        assert report["output"]["repoPath"].startswith("public/assets/catalog-candidates/")

        bad = json.loads(job.read_text())
        bad["attempts"][0]["model"]["revision"] = "main"
        unsigned = dict(bad)
        unsigned.pop("planSha256", None)
        encoded_bad = json.dumps(unsigned, ensure_ascii=False, separators=(",", ":")).encode()
        bad["planSha256"] = hashlib.sha256(encoded_bad).hexdigest()
        bad_job = root / "bad-job.json"
        bad_job.write_text(json.dumps(bad, indent=2) + "\n")
        bad_run = run(
            "dry-run",
            "--repo-root", str(root),
            "--job", str(bad_job),
            "--attempt-id", attempt["attemptId"],
            "--repo-path", "public/assets/catalog-candidates/test/decor-5-w09-v99-a-original.png",
            "--receipt", str(root / "bad-receipt.json"),
        )
        assert bad_run.returncode != 0
        assert "40-char commit SHA" in bad_run.stderr

    print("ART_FACTORY_DIFFUSERS_CONTRACT_TEST=PASS")


if __name__ == "__main__":
    main()
