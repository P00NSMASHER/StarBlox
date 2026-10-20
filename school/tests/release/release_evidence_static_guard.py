#!/usr/bin/env python3
import hashlib
import json
import tempfile
from pathlib import Path

from verify_build_receipt import verify_build_receipt

REPO = Path(__file__).resolve().parents[3]
workflow = (REPO / ".github/workflows/high-school-integration.yml").read_text(encoding="utf-8")

candidate_expression = "CANDIDATE_SOURCE_SHA: ${{ github.event.inputs.candidate_sha || github.event.pull_request.head.sha || github.sha }}"
manual_dispatch_input = 'candidate_sha:\n        description: "Full 40-character commit SHA to rebuild"\n        required: false\n        type: string'
candidate_validation = '[[ ! "$CANDIDATE_SOURCE_SHA" =~ ^[0-9a-f]{40}$ ]]'
checkout_expression = "ref: ${{ env.CANDIDATE_SOURCE_SHA }}"
checkout_action = "uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5"
python_action = "uses: actions/setup-python@ece7cb06caefa5fff74198d8649806c4678c61a1 # v6"
upload_action = "uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4"
candidate_artifact_expression = "CANDIDATE_ARTIFACT_NAME: high-school-integration-candidate-${{ github.event.inputs.candidate_sha || github.event.pull_request.head.sha || github.sha }}-run-${{ github.run_id }}-attempt-${{ github.run_attempt }}"
candidate_artifact_name = "name: ${{ env.CANDIDATE_ARTIFACT_NAME }}"
candidate_retention = "retention-days: 30"
runner_image = "runs-on: ubuntu-24.04"
integration_timeout = "timeout-minutes: 10"

assert runner_image in workflow, "release candidate must use the reviewed Ubuntu 24.04 image"
assert workflow.count(integration_timeout) == 1, (
    "integration evidence must keep one reviewed 10-minute job timeout"
)
integration_job_start = workflow.index("  integration-static:")
integration_env_start = workflow.index("    env:", integration_job_start)
assert integration_job_start < workflow.index(integration_timeout) < integration_env_start, (
    "release timeout must remain attached to the integration job before its environment"
)
assert "timeout-minutes: 360" not in workflow, (
    "GitHub's six-hour timeout is too broad for the bounded Pip High evidence build"
)
assert "runs-on: ubuntu-latest" not in workflow, (
    "floating runner aliases make identical-source builds environment-dependent"
)
assert manual_dispatch_input in workflow, (
    "manual evidence rebuilds must accept an explicit immutable candidate SHA"
)
assert candidate_expression in workflow, (
    "candidate identity must prefer a manual SHA and otherwise resolve to the PR head SHA"
)
assert candidate_validation in workflow, (
    "manual candidate identity must be validated as a full lowercase Git SHA before checkout"
)
assert workflow.index(candidate_validation) < workflow.index(checkout_expression), (
    "candidate SHA validation must happen before candidate-controlled code is checked out"
)
assert checkout_expression in workflow, "checkout must use the resolved candidate SHA"
checkout_identity_step = "Verify checked-out candidate identity"
checkout_identity_capture = 'CHECKED_OUT_SHA="$(git rev-parse HEAD)"'
checkout_identity_compare = 'if [[ "$CHECKED_OUT_SHA" != "$CANDIDATE_SOURCE_SHA" ]]; then'
assert workflow.count(checkout_identity_step) == 1, (
    "workflow must verify the checked-out commit exactly once"
)
assert checkout_identity_capture in workflow, (
    "checkout verification must resolve the actual Git HEAD"
)
assert checkout_identity_compare in workflow, (
    "checkout verification must fail when HEAD differs from the requested candidate"
)
assert workflow.index(checkout_expression) < workflow.index(checkout_identity_step)
assert workflow.index(checkout_identity_step) < workflow.index("Run release evidence guard")
assert checkout_action in workflow, "checkout must use the pinned Node 24 action"
checkout_credentials_policy = "persist-credentials: false"
assert workflow.count(checkout_credentials_policy) == 1, (
    "PR-controlled tests must not inherit a persisted repository credential"
)
assert workflow.index(checkout_expression) < workflow.index(checkout_credentials_policy), (
    "credential persistence policy must belong to the exact-candidate checkout"
)
assert python_action in workflow, "Python setup must use the pinned Node 24 action"
assert upload_action in workflow, "candidate upload must use the reviewed v4 commit"
assert candidate_artifact_expression in workflow, (
    "candidate artifact identity must derive from the same immutable source/run/attempt tuple"
)
assert candidate_artifact_name in workflow, (
    "uploaded candidate name must bind source SHA, workflow run, and retry attempt"
)
assert "\n          name: name: high-school-integration-candidate-${{ env.CANDIDATE_SOURCE_SHA }}\n" not in workflow, (
    "source-only artifact names are ambiguous across manual rebuilds and reruns"
)
assert workflow.count(candidate_retention) == 1, (
    "candidate build and receipt evidence must remain available for a 30-day review window"
)
assert "retention-days: 7" not in workflow, (
    "seven-day retention can expire before composed release and native verification finish"
)
assert workflow.index("Upload deterministic candidate") < workflow.index(candidate_retention), (
    "candidate retention policy must belong to the deterministic upload step"
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
workflow_run_attempt = 2
project_path = "school/default.project.json"
rojo_version = "7.7.0"
workflow_sha = "b" * 40
workflow_ref = (
    f"{repository}/.github/workflows/high-school-integration.yml@refs/pull/189/merge"
)
workflow_event = "pull_request"
artifact_name = (
    f"high-school-integration-candidate-{'a' * 40}"
    f"-run-{workflow_run_id}-attempt-{workflow_run_attempt}"
)
workflow_sha_receipt_field = '"workflowSha":os.environ["GITHUB_WORKFLOW_SHA"]'
workflow_ref_receipt_field = '"workflowRef":os.environ["GITHUB_WORKFLOW_REF"]'
workflow_event_receipt_field = '"workflowEvent":os.environ["GITHUB_EVENT_NAME"]'
repository_receipt_field = '"repository":os.environ["GITHUB_REPOSITORY"]'
run_receipt_field = '"workflowRunId":int(os.environ["GITHUB_RUN_ID"])'
attempt_receipt_field = '"workflowRunAttempt":int(os.environ["GITHUB_RUN_ATTEMPT"])'
artifact_name_receipt_field = '"artifactName":os.environ["CANDIDATE_ARTIFACT_NAME"]'
project_receipt_field = f'"projectPath":"{project_path}"'
rojo_receipt_field = f'"rojoVersion":"{rojo_version}"'

assert digest_capture in workflow, "build digest must be captured from the generated place"
assert digest_length_check in workflow, "build digest must be validated before receipt creation"
assert digest_receipt_export in workflow, "validated build digest must be exported to receipt creation"
assert digest_receipt_field in workflow, "build receipt must bind the generated place SHA-256"
assert workflow_sha_receipt_field in workflow, "build receipt must bind the executed workflow revision"
assert workflow_ref_receipt_field in workflow, "build receipt must bind the canonical workflow file and ref"
assert workflow_event_receipt_field in workflow, "build receipt must bind the workflow trigger event"
assert repository_receipt_field in workflow, "build receipt must bind the workflow repository"
assert run_receipt_field in workflow, "build receipt must bind the workflow run ID"
assert attempt_receipt_field in workflow, "build receipt must bind the workflow run attempt"
assert artifact_name_receipt_field in workflow, "build receipt must bind the canonical artifact name"
assert '--expected-workflow-sha "$GITHUB_WORKFLOW_SHA"' in workflow, (
    "receipt verification must enforce the executed workflow revision"
)
assert '--expected-workflow-ref "$GITHUB_WORKFLOW_REF"' in workflow, (
    "receipt verification must enforce the canonical workflow file and ref"
)
assert '--expected-workflow-event "$GITHUB_EVENT_NAME"' in workflow, (
    "receipt verification must enforce the workflow trigger event"
)
assert '--expected-repository "$GITHUB_REPOSITORY"' in workflow, (
    "receipt verification must enforce the workflow repository"
)
assert '--expected-workflow-run-id "$GITHUB_RUN_ID"' in workflow, (
    "receipt verification must enforce the workflow run ID"
)
assert '--expected-workflow-run-attempt "$GITHUB_RUN_ATTEMPT"' in workflow, (
    "receipt verification must enforce the workflow run attempt"
)
assert '--expected-artifact-name "$CANDIDATE_ARTIFACT_NAME"' in workflow, (
    "receipt verification must enforce the canonical artifact upload identity"
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
primary_build = (
    "rojo-bin/rojo build school/default.project.json "
    "-o HighSchool-Integration.rbxlx"
)
repeat_build = (
    "rojo-bin/rojo build school/default.project.json "
    "-o HighSchool-Integration-Repeat.rbxlx"
)
repeat_compare = (
    "cmp -s HighSchool-Integration.rbxlx "
    "HighSchool-Integration-Repeat.rbxlx"
)
repeat_cleanup = "rm HighSchool-Integration-Repeat.rbxlx"
assert workflow.count("rojo-bin/rojo build school/default.project.json") == 2, (
    "release candidate must be built twice from the same source and toolchain"
)
for marker in (primary_build, repeat_build, repeat_compare, repeat_cleanup):
    assert marker in workflow, f"missing reproducibility proof step: {marker}"
assert workflow.index(primary_build) < workflow.index(repeat_build)
assert workflow.index(repeat_build) < workflow.index(repeat_compare)
assert workflow.index(repeat_compare) < workflow.index(repeat_cleanup)
assert workflow.index(repeat_cleanup) < workflow.index(digest_capture)
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
        "workflowSha": workflow_sha,
        "workflowRef": workflow_ref,
        "workflowEvent": workflow_event,
        "repository": repository,
        "workflowRunId": workflow_run_id,
        "workflowRunAttempt": workflow_run_attempt,
        "artifactName": artifact_name,
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
        workflow_sha,
        workflow_ref,
        workflow_event,
        repository,
        workflow_run_id,
        workflow_run_attempt,
        artifact_name,
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
            workflow_sha,
            workflow_ref,
            workflow_event,
            repository,
            workflow_run_id,
            workflow_run_attempt,
            artifact_name,
            project_path,
            rojo_version,
        )
    except ValueError as error:
        assert "SHA-256 does not match" in str(error)
    else:
        raise AssertionError("tampered build receipt must fail verification")

    for field, wrong_value, message in (
        ("workflowSha", "c" * 40, "workflow SHA does not match"),
        ("workflowRef", workflow_ref.replace("high-school-integration.yml", "other.yml"), "workflow ref does not match"),
        ("workflowEvent", "workflow_dispatch", "workflow event does not match"),
        ("repository", "P00NSMASHER/OtherRepo", "repository does not match"),
        ("workflowRunId", workflow_run_id + 1, "workflow run ID does not match"),
        ("workflowRunAttempt", workflow_run_attempt + 1, "workflow run attempt does not match"),
        ("artifactName", artifact_name + "-tampered", "artifact name does not match"),
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
                workflow_sha,
                workflow_ref,
                workflow_event,
                repository,
                workflow_run_id,
                workflow_run_attempt,
                artifact_name,
                project_path,
                rojo_version,
            )
        except ValueError as error:
            assert message in str(error)
        else:
            raise AssertionError(f"tampered {field} must fail verification")

print("high-school exact-head release evidence guard: PASS")
