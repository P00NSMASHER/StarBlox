#!/usr/bin/env python3
import argparse
import hashlib
import json
import re
from pathlib import Path

SHA_PATTERN = re.compile(r"^[0-9a-f]{40}(?:[0-9a-f]{24})?$")
DIGEST_PATTERN = re.compile(r"^[0-9a-f]{64}$")


def verify_build_receipt(
    artifact_path,
    digest_path,
    receipt_path,
    expected_source_sha,
    expected_project_path,
    expected_rojo_version,
):
    artifact_path = Path(artifact_path)
    digest_path = Path(digest_path)
    receipt_path = Path(receipt_path)

    if not SHA_PATTERN.fullmatch(expected_source_sha):
        raise ValueError("expected source SHA must be a lowercase 40- or 64-character Git object id")

    artifact_bytes = artifact_path.read_bytes()
    actual_bytes = len(artifact_bytes)
    actual_digest = hashlib.sha256(artifact_bytes).hexdigest()

    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    for key in ("sourceSha", "projectPath", "rojoVersion", "sha256", "bytes"):
        if key not in receipt:
            raise ValueError(f"build receipt missing {key}")

    if receipt["sourceSha"] != expected_source_sha:
        raise ValueError("build receipt source SHA does not match the checked-out candidate")
    if receipt["projectPath"] != expected_project_path:
        raise ValueError("build receipt project path does not match the canonical project")
    if receipt["rojoVersion"] != expected_rojo_version:
        raise ValueError("build receipt Rojo version does not match the pinned toolchain")
    if not isinstance(receipt["bytes"], int) or receipt["bytes"] <= 1000:
        raise ValueError("build receipt byte count must be an integer greater than 1000")
    if receipt["bytes"] != actual_bytes:
        raise ValueError("build receipt byte count does not match the artifact")
    if not isinstance(receipt["sha256"], str) or not DIGEST_PATTERN.fullmatch(receipt["sha256"]):
        raise ValueError("build receipt SHA-256 must be lowercase hexadecimal")
    if receipt["sha256"] != actual_digest:
        raise ValueError("build receipt SHA-256 does not match the artifact")

    sidecar_lines = digest_path.read_text(encoding="utf-8").splitlines()
    if len(sidecar_lines) != 1:
        raise ValueError("digest sidecar must contain exactly one record")
    sidecar_parts = sidecar_lines[0].split(maxsplit=1)
    if len(sidecar_parts) != 2:
        raise ValueError("digest sidecar must include a digest and filename")
    sidecar_digest, sidecar_filename = sidecar_parts
    if sidecar_filename.strip() != artifact_path.name:
        raise ValueError("digest sidecar filename does not match the artifact")
    if sidecar_digest != actual_digest:
        raise ValueError("digest sidecar SHA-256 does not match the artifact")

    return {
        "sourceSha": expected_source_sha,
        "projectPath": expected_project_path,
        "rojoVersion": expected_rojo_version,
        "sha256": actual_digest,
        "bytes": actual_bytes,
    }


def main():
    parser = argparse.ArgumentParser(description="Verify Pip High build evidence binding")
    parser.add_argument("--artifact", required=True)
    parser.add_argument("--digest", required=True)
    parser.add_argument("--receipt", required=True)
    parser.add_argument("--expected-source-sha", required=True)
    parser.add_argument("--expected-project-path", required=True)
    parser.add_argument("--expected-rojo-version", required=True)
    args = parser.parse_args()

    verified = verify_build_receipt(
        args.artifact,
        args.digest,
        args.receipt,
        args.expected_source_sha,
        args.expected_project_path,
        args.expected_rojo_version,
    )
    print(
        "high-school build receipt verification: PASS "
        f"{verified['sourceSha']} {verified['sha256']} {verified['bytes']}"
    )


if __name__ == "__main__":
    main()
