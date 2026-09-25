#!/usr/bin/env python3
import argparse, json, pathlib, sys
from typing import Any

DEFAULT_LIMIT = 77

def _ids(encoded: Any):
    ids = encoded.get("input_ids") if isinstance(encoded, dict) else getattr(encoded, "input_ids", None)
    if ids and isinstance(ids[0], list):
        ids = ids[0]
    return list(ids or [])

def count_with_tokenizer(tokenizer, text: str) -> tuple[int,int]:
    limit = int(getattr(tokenizer, "model_max_length", DEFAULT_LIMIT) or DEFAULT_LIMIT)
    if limit > 10000:
        limit = DEFAULT_LIMIT
    encoded = tokenizer(text, add_special_tokens=True, truncation=False)
    return len(_ids(encoded)), limit

def validate_attempt(job: dict, attempt_id: str, model_id: str, revision: str, tokenizer_loader=None):
    attempts = [a for a in job.get("attempts", []) if str(a.get("attemptId")) == attempt_id]
    if len(attempts) != 1:
        raise ValueError(f"expected exactly one attempt {attempt_id}")
    attempt = attempts[0]
    prompt = str(attempt.get("runtimePromptText") or attempt.get("promptText") or "")
    negative = str(attempt.get("runtimeNegativePromptText") or "")
    if not prompt:
        raise ValueError("runtime prompt missing")

    if tokenizer_loader is None:
        from transformers import AutoTokenizer
        tokenizer_loader = lambda subfolder: AutoTokenizer.from_pretrained(
            model_id,
            revision=revision,
            subfolder=subfolder,
            use_fast=True,
        )

    results = {}
    for subfolder in ("tokenizer", "tokenizer_2"):
        tokenizer = tokenizer_loader(subfolder)
        p_count, p_limit = count_with_tokenizer(tokenizer, prompt)
        n_count, n_limit = count_with_tokenizer(tokenizer, negative) if negative else (0, p_limit)
        results[subfolder] = {
            "runtimePromptTokens": p_count,
            "runtimeNegativePromptTokens": n_count,
            "limit": p_limit,
        }
        if p_count > p_limit:
            raise ValueError(f"runtime prompt exceeds {subfolder} limit: {p_count} > {p_limit}")
        if negative and n_count > n_limit:
            raise ValueError(f"runtime negative prompt exceeds {subfolder} limit: {n_count} > {n_limit}")

    constraints = attempt.get("constraints") or {}
    required = [str(x).strip() for x in constraints.get("required", []) if str(x).strip()]
    forbidden = [str(x).strip() for x in constraints.get("forbidden", []) if str(x).strip()]
    low_prompt = prompt.lower()
    low_negative = negative.lower()
    for phrase in required:
        if phrase.lower() not in low_prompt:
            raise ValueError(f"runtime prompt dropped required constraint: {phrase}")
    for phrase in forbidden:
        if phrase.lower() not in low_negative:
            raise ValueError(f"runtime negative prompt dropped forbidden constraint: {phrase}")

    return {
        "itemId": job.get("item", {}).get("id"),
        "attemptId": attempt_id,
        "modelId": model_id,
        "modelRevision": revision,
        "constraints": constraints,
        "tokenizers": results,
        "status": "PASS",
    }

def self_test():
    class FakeTokenizer:
        model_max_length = 77
        def __init__(self, extra=0):
            self.extra = extra
        def __call__(self, text, add_special_tokens=True, truncation=False):
            return {"input_ids": list(range(len(str(text).split()) + 2 + self.extra))}

    job = {
        "item": {"id": "desks-10"},
        "attempts": [{
            "attemptId": "a",
            "runtimePromptText": "desks-10 Neon Streaming Desk Required: boom microphone; smaller monitor; white studio",
            "runtimeNegativePromptText": "room shelves text",
            "constraints": {
                "required": ["boom microphone", "smaller monitor", "white studio"],
                "forbidden": ["room", "shelves", "text"],
            },
        }],
    }
    result = validate_attempt(job, "a", "m", "r", tokenizer_loader=lambda _: FakeTokenizer())
    assert result["status"] == "PASS"
    bad = json.loads(json.dumps(job))
    bad["attempts"][0]["runtimePromptText"] = "desks-10 Neon Streaming Desk smaller monitor white studio"
    try:
        validate_attempt(bad, "a", "m", "r", tokenizer_loader=lambda _: FakeTokenizer())
    except ValueError as exc:
        assert "dropped required constraint" in str(exc)
    else:
        raise AssertionError("required constraint omission was not rejected")
    too_long = json.loads(json.dumps(job))
    too_long["attempts"][0]["runtimePromptText"] = " ".join(["token"] * 80) + " boom microphone smaller monitor white studio"
    try:
        validate_attempt(too_long, "a", "m", "r", tokenizer_loader=lambda _: FakeTokenizer())
    except ValueError as exc:
        assert "exceeds tokenizer limit" in str(exc)
    else:
        raise AssertionError("token overflow was not rejected")
    print("PROMPT_TOKEN_PREFLIGHT_SELF_TEST=PASS")

def main():
    if "--self-test" in sys.argv:
        self_test()
        return

    ap = argparse.ArgumentParser()
    ap.add_argument("--job", required=True)
    ap.add_argument("--attempt-id", required=True)
    ap.add_argument("--model-id", required=True)
    ap.add_argument("--model-revision", required=True)
    ap.add_argument("--output")
    args = ap.parse_args()

    job = json.loads(pathlib.Path(args.job).read_text())
    result = validate_attempt(job, args.attempt_id, args.model_id, args.model_revision)
    body = json.dumps(result, indent=2) + "\n"
    if args.output:
        out = pathlib.Path(args.output)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(body)
    sys.stdout.write(body)

if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"PROMPT_PREFLIGHT_FAIL: {exc}", file=sys.stderr)
        raise
