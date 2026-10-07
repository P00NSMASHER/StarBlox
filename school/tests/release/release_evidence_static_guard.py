#!/usr/bin/env python3
from pathlib import Path

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
assert workflow.index(candidate_expression) < workflow.index(checkout_expression)
assert workflow.index(checkout_expression) < workflow.index('rojo-bin/rojo build')
assert workflow.index('rojo-bin/rojo build') < workflow.index(digest_capture)
assert workflow.index(digest_capture) < workflow.index(digest_receipt_field)
assert workflow.index(digest_receipt_field) < workflow.index('Upload deterministic candidate')

print("high-school exact-head release evidence guard: PASS")
