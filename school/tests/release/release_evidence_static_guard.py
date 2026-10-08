#!/usr/bin/env python3
import hashlib
import json
import tempfile
from pathlib import Path

from verify_build_receipt import verify_build_receipt

REPO = Path(__file__).resolve().parents[3]
workflow = (REPO / ".github/workflows/high-school-integration.yml").read_text(encoding="utf-8")

candidate_expression = "CANDIDATE_SOURCE_SHA: ${{ github.event.pull_request.head.sha || github.sha }}"
checkout_expression = "ref: ${{ env.CANDIDATE_SOURCE_SHA }}"

assert candidate_expression in workflow, "candidate identity must resolve to the PR head SHA"
assert checkout_expression in workflow, "checkout must use the resolved candidate SHA"
assert 'os.environ["CANDIDATE_SOURCE_SHA"]' in workflow, (
    "build receipt must record the resolved candidate SHA"
)
assert 'os.environ["GITHUB_SHA"]' not in workflow, (
    "pull-request GITHUB_SHA is a synthetic merge ref and must not label candidate evidence"
)
digest_capture = "BUILD_SHA256=\"$(sha256sum HighSchool-Integration.rbxlx"
digest_length_check = 'test "${#BUILD_SHA256}" -eq 64'
digest_receipt_field = '"sha256":os.environ["BUILD_SHA256"]'
digest_receipt_export = 'BUILD_SHA256="$BUILD_SHA256" python -c'

assert digest_capture in workflow, "build digest must be captured from the generated place"
assert digest_length_check in workflow, "build digest must be validated before receipt creation"
assert digest_receipt_export in workflow, "validated build digest must be exported to receipt creation"
assert digest_receipt_field in workflow, "build receipt must bind the generated place SHA-256"
receipt_writer_lines = [
    line for line in workflow.splitlines()
    if "high-school-build-receipt.json" in line and "python -c" in line
]
assert len(receipt_writer_lines) == 1, "workflow must have exactly one build-receipt writer"
receipt_writer = receipt_writer_lines[0]
assert "print(json.dumps(" in receipt_writer, (
    "receipt writer must emit one complete JSON document with a real line ending"
)
assert ".write(json.dumps(" not in receipt_writer, (
    "escape-sensitive write pattern can append a literal backslash-n and corrupt JSON"
)
assert 'encoding="utf-8"' in receipt_writer, "receipt writer must use explicit UTF-8"

assert workflow.index(candidate_expression) < workflow.index(checkout_expression)
assert workflow.index(checkout_expression) < workflow.index('rojo-bin/rojo build')
assert workflow.index('rojo-bin/rojo build') < workflow.index(digest_capture)
assert workflow.index(digest_capture) < workflow.index(digest_receipt_field)
verification_step = "Verify build receipt binding"
verification_command = "python school/tests/release/verify_build_receipt.py"
assert verification_step in workflow, "workflow must independently verify the generated receipt"
assert verification_command in workflow, "workflow must run the receipt verifier"
assert workflow.index(digest_receipt_field) < workflow.index(verification_step)
assert workflow.index(verification_step) < workflow.index('Upload deterministic candidate')

with tempfile.TemporaryDirectory() as temp_dir:
    temp = Path(temp_dir)
    artifact = temp / "HighSchool-Integration.rbxlx"
    digest = temp / "high-school-integration.sha256"
    receipt = temp / "high-school-build-receipt.json"
    source_sha = "a" * 40
    artifact.write_bytes(b"pip-high-build-evidence" * 64)
    artifact_digest = hashlib.sha256(artifact.read_bytes()).hexdigest()
    digest.write_text(f"{artifact_digest}  {artifact.name}\n", encoding="utf-8")
    valid_receipt = {
        "sourceSha": source_sha,
        "sha256": artifact_digest,
        "bytes": artifact.stat().st_size,
    }
    receipt.write_text(json.dumps(valid_receipt), encoding="utf-8")
    verified = verify_build_receipt(artifact, digest, receipt, source_sha)
    assert verified == valid_receipt

    tampered_receipt = dict(valid_receipt)
    tampered_receipt["sha256"] = "0" * 64
    receipt.write_text(json.dumps(tampered_receipt), encoding="utf-8")
    try:
        verify_build_receipt(artifact, digest, receipt, source_sha)
    except ValueError as error:
        assert "SHA-256 does not match" in str(error)
    else:
        raise AssertionError("tampered build receipt must fail verification")

print("high-school exact-head release evidence guard: PASS")
