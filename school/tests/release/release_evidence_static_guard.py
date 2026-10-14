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
checkout_action = "uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5"
python_action = "uses: actions/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1 # v6"
upload_action = "uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4"
candidate_artifact_name = "name: high-school-integration-candidate-${{ env.CANDIDATE_SOURCE_SHA }}"

assert candidate_expression in workflow, "candidate identity must resolve to the PR head SHA"
assert checkout_expression in workflow, "checkout must use the resolved candidate SHA"
assert checkout_action in workflow, "checkout must use the pinned Node 24 action"
assert python_action in workflow, "Python setup must use the pinned Node 24 action"
assert upload_action in workflow, "candidate upload must use the reviewed v4 commit"
assert candidate_artifact_name in workflow, (
    "uploaded candidate name must bind the artifact to the exact source SHA"
)
assert "\n          name: high-school-integration-candidate\n" not in workflow, (
    "generic candidate artifact names make stale and current builds ambiguous"
)
assert "uses: actions/upload-artifact@v4" not in workflow, (
    "mutable upload-artifact major tags cannot protect release evidence provenance"
)
assert "uses: actions/checkout@v4" not in workflow, "deprecated Node 20 checkout action returned"
assert "uses: actions/setup-python@v5" not in workflow, "deprecated Node 20 Python setup action returned"

download_retry_policy = (
    "--retry 3 --retry-all-errors --connect-timeout 10 --max-time 120"
)
assert workflow.count(download_retry_policy) == 2, (
    "both pinned tool downloads require the bounded retry and timeout policy"
)
for archive_url in (
    "luau-lang/luau/releases/download/0.740/luau-ubuntu.zip",
    "rojo-rbx/rojo/releases/download/v7.7.0/rojo-7.7.0-linux-x86_64.zip",
):
    download_line = next(
        (line for line in workflow.splitlines() if archive_url in line),
        None,
    )
    assert download_line is not None, f"missing pinned tool archive: {archive_url}"
    assert download_retry_policy in download_line, (
        f"pinned tool download lacks bounded retry policy: {archive_url}"
    )

tool_archive_digests = {
    "luau.zip": "7d4035db01816f977f6e4c42e3d5e8ef4235d95e9afe63a3c38905b42dde60f2",
    "rojo.zip": "22503e5839864f9d7c2171c48b536fc229f2cc4d8774c9cc149f60941d864073",
}
for archive_name, expected_digest in tool_archive_digests.items():
    download_marker = f"--output {archive_name}"
    checksum_command = (
        f'echo "{expected_digest}  {archive_name}" '
        "| sha256sum --check --strict -"
    )
    unzip_marker = f"unzip -q {archive_name}"
    assert checksum_command in workflow, (
        f"{archive_name} must be authenticated against its reviewed release digest"
    )
    assert workflow.index(download_marker) < workflow.index(checksum_command), (
        f"{archive_name} checksum must run after download"
    )
    assert workflow.index(checksum_command) < workflow.index(unzip_marker), (
        f"{archive_name} checksum must pass before extraction or execution"
    )

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
repository = "P00NSMASHER/StarBlox"
workflow_run_id = 123456789
project_path = "school/default.project.json"
rojo_version = "7.7.0"
repository_receipt_field = '"repository":os.environ["GITHUB_REPOSITORY"]'
run_receipt_field = '"workflowRunId":int(os.environ["GITHUB_RUN_ID"])'
project_receipt_field = f'"projectPath":"{project_path}"'
rojo_receipt_field = f'"rojoVersion":"{rojo_version}"'

assert digest_capture in workflow, "build digest must be captured from the generated place"
assert digest_length_check in workflow, "build digest must be validated before receipt creation"
assert digest_receipt_export in workflow, "validated build digest must be exported to receipt creation"
assert digest_receipt_field in workflow, "build receipt must bind the generated place SHA-256"
assert repository_receipt_field in workflow, "build receipt must bind the workflow repository"
assert run_receipt_field in workflow, "build receipt must bind the workflow run ID"
assert '--expected-repository "$GITHUB_REPOSITORY"' in workflow, (
    "receipt verification must enforce the workflow repository"
)
assert '--expected-workflow-run-id "$GITHUB_RUN_ID"' in workflow, (
    "receipt verification must enforce the workflow run ID"
)
assert project_receipt_field in workflow, "build receipt must bind the canonical project path"
assert rojo_receipt_field in workflow, "build receipt must bind the pinned Rojo version"
assert f'--expected-project-path "{project_path}"' in workflow, (
    "receipt verification must enforce the canonical project path"
)
assert f'--expected-rojo-version "{rojo_version}"' in workflow, (
    "receipt verification must enforce the pinned Rojo version"
)
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
        "repository": repository,
        "workflowRunId": workflow_run_id,
        "projectPath": project_path,
        "rojoVersion": rojo_version,
        "sha256": artifact_digest,
        "bytes": artifact.stat().st_size,
    }
    receipt.write_text(json.dumps(valid_receipt), encoding="utf-8")
    verified = verify_build_receipt(
        artifact,
        digest,
        receipt,
        source_sha,
        repository,
        workflow_run_id,
        project_path,
        rojo_version,
    )
    assert verified == valid_receipt

    tampered_receipt = dict(valid_receipt)
    tampered_receipt["sha256"] = "0" * 64
    receipt.write_text(json.dumps(tampered_receipt), encoding="utf-8")
    try:
        verify_build_receipt(
            artifact,
            digest,
            receipt,
            source_sha,
            project_path,
            rojo_version,
        )
    except ValueError as error:
        assert "SHA-256 does not match" in str(error)
    else:
        raise AssertionError("tampered build receipt must fail verification")

    for field, wrong_value, message in (
        ("repository", "P00NSMASHER/OtherRepo", "repository does not match"),
        ("workflowRunId", workflow_run_id + 1, "workflow run ID does not match"),
        ("projectPath", "school/alternate.project.json", "project path does not match"),
        ("rojoVersion", "7.7.1", "Rojo version does not match"),
    ):
        tampered_receipt = dict(valid_receipt)
        tampered_receipt[field] = wrong_value
        receipt.write_text(json.dumps(tampered_receipt), encoding="utf-8")
        try:
            verify_build_receipt(
                artifact,
                digest,
                receipt,
                source_sha,
                project_path,
                rojo_version,
            )
        except ValueError as error:
            assert message in str(error)
        else:
            raise AssertionError(f"tampered {field} must fail verification")

print("high-school exact-head release evidence guard: PASS")
