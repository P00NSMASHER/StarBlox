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
assert workflow.index(candidate_expression) < workflow.index(checkout_expression)
assert workflow.index(checkout_expression) < workflow.index('rojo-bin/rojo build')
assert workflow.index('rojo-bin/rojo build') < workflow.index('os.environ["CANDIDATE_SOURCE_SHA"]')

print("high-school exact-head release evidence guard: PASS")

