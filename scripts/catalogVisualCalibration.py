#!/usr/bin/env python3
"""Calibrate StarBlox report-only visual metrics against independent review labels.

The calibration learns candidate *warning* thresholds from the growing exact-hash
ACCEPT/REWORK corpus. It deliberately does not activate blocking thresholds.
Candidate thresholds must survive leave-one-out evaluation with a low false
positive rate before they are even marked as warning-ready.
"""
from __future__ import annotations

import argparse
import json
import math
import statistics
import tempfile
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw

from catalogVisualPreflight import scan_one, hamming_hex

RASTER_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
METRIC_PATHS = {
    "sourceLuminanceContrastRange": ("source", "luminanceContrastRange"),
    "sourceEntropyBits": ("source", "entropyBits"),
    "sourceEdgeDensity": ("source", "edgeDensity"),
    "thumbnailLuminanceContrastRange": ("thumbnail", "luminanceContrastRange"),
    "thumbnailEntropyBits": ("thumbnail", "entropyBits"),
    "thumbnailEdgeDensity": ("thumbnail", "edgeDensity"),
    "nonTransparentRatio": ("source", "nonTransparentRatio"),
    "contentBoundsRatio": ("source", "contentBoundsRatio"),
}
NEIGHBOR_FEATURES = ("nearestAnyDistance", "nearestSameCollectionDistance")

# Only calibrate a metric against failure modes it can plausibly observe.
# Unrelated REWORK rows (for example a pure theme mismatch) are excluded from
# that metric's positive class instead of teaching a spurious pixel threshold.
FEATURE_FAILURE_CODES = {
    "sourceLuminanceContrastRange": ("SMALL_CARD_READABILITY", "EXCESSIVE_BLOOM"),
    "sourceEntropyBits": ("FLAT_COMPOSITION", "WEAK_DEPTH"),
    "sourceEdgeDensity": ("FLAT_COMPOSITION", "SMALL_CARD_READABILITY"),
    "thumbnailLuminanceContrastRange": ("SMALL_CARD_READABILITY", "EXCESSIVE_BLOOM"),
    "thumbnailEntropyBits": ("SMALL_CARD_READABILITY", "FLAT_COMPOSITION"),
    "thumbnailEdgeDensity": ("SMALL_CARD_READABILITY", "FLAT_COMPOSITION"),
    "nonTransparentRatio": ("WEAK_SILHOUETTE_IDENTITY", "SMALL_CARD_READABILITY"),
    "contentBoundsRatio": ("WEAK_SILHOUETTE_IDENTITY", "SMALL_CARD_READABILITY"),
    "nearestAnyDistance": ("NEAR_DUPLICATE_TEMPLATE",),
    "nearestSameCollectionDistance": ("NEAR_DUPLICATE_TEMPLATE",),
}
MIN_ACCEPT_SAMPLES = 20
MIN_GLOBAL_REWORK_SAMPLES = 12
MIN_TARGETED_REWORK_SAMPLES = 6


def normalize_repo_path(value: str | None) -> str | None:
    if not value:
        return None
    p = str(value).replace("\\", "/").lstrip("/")
    if p.startswith("assets/"):
        p = "public/" + p
    return p


def quantile(values: list[float], q: float) -> float | None:
    if not values:
        return None
    xs = sorted(float(x) for x in values)
    if len(xs) == 1:
        return xs[0]
    pos = (len(xs) - 1) * q
    lo = math.floor(pos)
    hi = math.ceil(pos)
    if lo == hi:
        return xs[lo]
    frac = pos - lo
    return xs[lo] * (1 - frac) + xs[hi] * frac


def describe(values: list[float]) -> dict:
    if not values:
        return {"count": 0, "min": None, "q10": None, "median": None, "q90": None, "max": None}
    xs = [float(x) for x in values]
    return {
        "count": len(xs),
        "min": min(xs),
        "q10": quantile(xs, 0.10),
        "median": statistics.median(xs),
        "q90": quantile(xs, 0.90),
        "max": max(xs),
    }


def get_metric(row: dict, metric_path: tuple[str, str]) -> float | None:
    value = row
    for key in metric_path:
        if not isinstance(value, dict) or key not in value:
            return None
        value = value[key]
    return float(value) if isinstance(value, (int, float)) else None


def nearest_distances(rows: list[dict]) -> list[dict]:
    out = []
    for i, row in enumerate(rows):
        best = None
        same_collection = None
        for j, other in enumerate(rows):
            if i == j or row["itemId"] == other["itemId"]:
                continue
            distance = hamming_hex(
                row["metrics"]["source"]["aHash"],
                other["metrics"]["source"]["aHash"],
            ) + hamming_hex(
                row["metrics"]["source"]["dHash"],
                other["metrics"]["source"]["dHash"],
            )
            candidate = {
                "itemId": other["itemId"],
                "collectionId": other["collectionId"],
                "distance": distance,
            }
            if best is None or distance < best["distance"]:
                best = candidate
            if (
                row["collectionId"] == other["collectionId"]
                and (same_collection is None or distance < same_collection["distance"])
            ):
                same_collection = candidate
        out.append(
            {
                "itemId": row["itemId"],
                "decision": row["decision"],
                "collectionId": row["collectionId"],
                "nearestAny": best,
                "nearestSameCollection": same_collection,
            }
        )
    return out


def confusion(labels: list[str], predictions: list[bool]) -> dict:
    tp = fp = tn = fn = 0
    for label, pred in zip(labels, predictions):
        positive = label == "REWORK"
        if pred and positive:
            tp += 1
        elif pred and not positive:
            fp += 1
        elif not pred and positive:
            fn += 1
        else:
            tn += 1
    recall = tp / (tp + fn) if tp + fn else 0.0
    fpr = fp / (fp + tn) if fp + tn else 0.0
    specificity = tn / (tn + fp) if tn + fp else 0.0
    precision = tp / (tp + fp) if tp + fp else 0.0
    balanced = (recall + specificity) / 2 if (tp + fn) and (tn + fp) else 0.0
    return {
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "recall": round(recall, 6),
        "falsePositiveRate": round(fpr, 6),
        "specificity": round(specificity, 6),
        "precision": round(precision, 6),
        "balancedAccuracy": round(balanced, 6),
    }


def predict(value: float, direction: str, threshold: float) -> bool:
    if direction == "LE":
        return value <= threshold
    if direction == "GE":
        return value >= threshold
    raise ValueError(f"unknown direction {direction}")


def threshold_grid(values: Iterable[float]) -> list[float]:
    xs = sorted(set(float(x) for x in values))
    if not xs:
        return []
    if len(xs) == 1:
        return [xs[0]]
    span = max(1e-9, xs[-1] - xs[0])
    eps = span * 1e-6
    mids = [(a + b) / 2 for a, b in zip(xs, xs[1:])]
    return [xs[0] - eps, *mids, xs[-1] + eps]


def fit_threshold_candidate(pairs: list[tuple[float, str]]) -> dict | None:
    labels = [label for _, label in pairs]
    if len(set(labels)) < 2:
        return None
    if labels.count("ACCEPT") < 2 or labels.count("REWORK") < 2:
        return None
    best = None
    for direction in ("LE", "GE"):
        for threshold in threshold_grid(value for value, _ in pairs):
            predictions = [predict(value, direction, threshold) for value, _ in pairs]
            metrics = confusion(labels, predictions)
            rank = (
                metrics["balancedAccuracy"],
                -metrics["falsePositiveRate"],
                metrics["recall"],
                metrics["precision"],
            )
            row = {
                "direction": direction,
                "threshold": round(float(threshold), 8),
                "fit": metrics,
                "_rank": rank,
            }
            if best is None or row["_rank"] > best["_rank"]:
                best = row
    if best is None:
        return None
    best.pop("_rank", None)
    return best


def leave_one_out_threshold(pairs: list[tuple[float, str]]) -> dict:
    labels = []
    predictions = []
    skipped = 0
    for index, (value, label) in enumerate(pairs):
        train = pairs[:index] + pairs[index + 1 :]
        candidate = fit_threshold_candidate(train)
        if candidate is None:
            skipped += 1
            continue
        labels.append(label)
        predictions.append(predict(value, candidate["direction"], candidate["threshold"]))
    metrics = confusion(labels, predictions) if labels else confusion([], [])
    return {
        "evaluated": len(labels),
        "skipped": skipped,
        **metrics,
    }


def feature_pairs(
    measured: list[dict],
    nearest_by_item: dict[str, dict],
    feature_name: str,
) -> list[tuple[float, str]]:
    pairs = []
    target_codes = set(FEATURE_FAILURE_CODES.get(feature_name, ()))
    for row in measured:
        value = None
        if feature_name in METRIC_PATHS:
            value = get_metric(row["metrics"], METRIC_PATHS[feature_name])
        elif feature_name == "nearestAnyDistance":
            value = (nearest_by_item.get(row["itemId"]) or {}).get("nearestAny", {}).get("distance")
        elif feature_name == "nearestSameCollectionDistance":
            value = (nearest_by_item.get(row["itemId"]) or {}).get("nearestSameCollection", {}).get("distance")
        if not isinstance(value, (int, float)):
            continue

        decision = row["decision"]
        if decision == "ACCEPT":
            pairs.append((float(value), "ACCEPT"))
            continue

        # A REWORK row is a positive example only when its normalized failure
        # taxonomy says this metric is relevant. Unrelated REWORKs are omitted.
        failure_codes = set(row.get("failureCodes") or [])
        if decision == "REWORK" and target_codes.intersection(failure_codes):
            pairs.append((float(value), "REWORK"))
    return pairs


def calibrate_warning_candidates(
    measured: list[dict],
    nearest: list[dict],
    sample_count_ready: bool,
) -> dict:
    nearest_by_item = {row["itemId"]: row for row in nearest}
    total_rework = sum(1 for row in measured if row["decision"] == "REWORK")
    out = {}
    for feature in [*METRIC_PATHS, *NEIGHBOR_FEATURES]:
        pairs = feature_pairs(measured, nearest_by_item, feature)
        candidate = fit_threshold_candidate(pairs)
        loo = leave_one_out_threshold(pairs)
        accept_n = sum(1 for _, label in pairs if label == "ACCEPT")
        rework_n = sum(1 for _, label in pairs if label == "REWORK")
        targeted_ready = (
            accept_n >= MIN_ACCEPT_SAMPLES
            and rework_n >= MIN_TARGETED_REWORK_SAMPLES
        )
        evidence_ready = (
            sample_count_ready
            and targeted_ready
            and candidate is not None
            and loo["evaluated"] >= max(20, int(len(pairs) * 0.8))
            and loo["falsePositiveRate"] <= 0.10
            and loo["recall"] >= 0.35
            and loo["balancedAccuracy"] >= 0.65
        )
        out[feature] = {
            "targetFailureCodes": list(FEATURE_FAILURE_CODES.get(feature, ())),
            "samples": {
                "ACCEPT": accept_n,
                "REWORK": rework_n,
                "total": len(pairs),
                "unrelatedReworkExcluded": max(0, total_rework - rework_n),
            },
            "targetedSampleCountReady": targeted_ready,
            "candidate": candidate,
            "leaveOneOut": loo,
            "warningReady": evidence_ready,
            "status": "REPORT_ONLY_WARNING_CANDIDATE" if evidence_ready else "INSUFFICIENT_EVIDENCE",
            "blockingEnabled": False,
        }
    return out


def build_calibration(repo_root: Path, corpus: dict) -> dict:
    measured = []
    skipped = []
    labeled_total = sum(
        1
        for r in corpus.get("current", [])
        if r.get("independent") and r.get("decision") in {"ACCEPT", "REWORK"}
    )

    for row in corpus.get("current", []):
        if not row.get("independent") or row.get("decision") not in {"ACCEPT", "REWORK"}:
            continue
        repo_path = normalize_repo_path(row.get("assetPath"))
        if not repo_path:
            skipped.append({"itemId": row.get("itemId"), "reason": "NO_ASSET_PATH"})
            continue
        path = (repo_root / repo_path).resolve()
        try:
            path.relative_to(repo_root.resolve())
        except ValueError:
            skipped.append({"itemId": row.get("itemId"), "reason": "PATH_ESCAPE"})
            continue
        if path.suffix.lower() not in RASTER_EXTS:
            skipped.append(
                {
                    "itemId": row.get("itemId"),
                    "assetPath": repo_path,
                    "reason": "NON_RASTER_CURRENT_ASSET",
                }
            )
            continue
        if not path.is_file():
            skipped.append(
                {
                    "itemId": row.get("itemId"),
                    "assetPath": repo_path,
                    "reason": "MISSING_FILE",
                }
            )
            continue
        try:
            metrics = scan_one(path)
        except Exception as exc:
            skipped.append(
                {
                    "itemId": row.get("itemId"),
                    "assetPath": repo_path,
                    "reason": type(exc).__name__ + ": " + str(exc),
                }
            )
            continue
        measured.append(
            {
                "itemId": row["itemId"],
                "collectionId": row.get("collectionId"),
                "decision": row["decision"],
                "failureCodes": row.get("failureCodes") or [],
                "assetPath": repo_path,
                "assetHash": row.get("assetHash"),
                "metrics": metrics,
            }
        )

    by_decision = {"ACCEPT": [], "REWORK": []}
    for row in measured:
        by_decision[row["decision"]].append(row)

    distributions = {}
    for metric_name, metric_path in METRIC_PATHS.items():
        distributions[metric_name] = {}
        for decision in ("ACCEPT", "REWORK"):
            values = [get_metric(row["metrics"], metric_path) for row in by_decision[decision]]
            distributions[metric_name][decision] = describe([v for v in values if v is not None])

    nearest = nearest_distances(measured)
    for scope_key in ("nearestAny", "nearestSameCollection"):
        distributions[scope_key + "Distance"] = {}
        for decision in ("ACCEPT", "REWORK"):
            values = [
                row[scope_key]["distance"]
                for row in nearest
                if row["decision"] == decision and row[scope_key] is not None
            ]
            distributions[scope_key + "Distance"][decision] = describe(values)

    by_failure_code = {}
    for row in measured:
        if row["decision"] != "REWORK":
            continue
        for code in row["failureCodes"]:
            group = by_failure_code.setdefault(code, {"count": 0, "items": []})
            group["count"] += 1
            group["items"].append(row["itemId"])

    accept_n = len(by_decision["ACCEPT"])
    rework_n = len(by_decision["REWORK"])
    raster_coverage = len(measured) / max(1, labeled_total)
    sample_count_ready = (
        accept_n >= MIN_ACCEPT_SAMPLES
        and rework_n >= MIN_GLOBAL_REWORK_SAMPLES
    )
    warning_candidates = calibrate_warning_candidates(measured, nearest, sample_count_ready)
    warning_ready = [
        feature for feature, row in warning_candidates.items() if row["warningReady"]
    ]

    readiness = {
        "acceptedRasterSamples": accept_n,
        "reworkRasterSamples": rework_n,
        "rasterCoverage": round(raster_coverage, 4),
        "minimumRecommendedSamples": {
            "ACCEPT": MIN_ACCEPT_SAMPLES,
            "GLOBAL_REWORK": MIN_GLOBAL_REWORK_SAMPLES,
            "TARGETED_REWORK_PER_FEATURE": MIN_TARGETED_REWORK_SAMPLES,
        },
        "featureFailureCodeTargets": FEATURE_FAILURE_CODES,
        "sampleCountReady": sample_count_ready,
        "warningCandidateCount": len(warning_ready),
        "warningReadyFeatures": warning_ready,
        "automaticThresholdActivation": False,
        "blockingThresholds": [],
        "promotionRule": {
            "minimumLeaveOneOutEvaluated": "max(20, 80% of feature samples)",
            "maximumFalsePositiveRate": 0.10,
            "minimumRecall": 0.35,
            "minimumBalancedAccuracy": 0.65,
            "requiresIndependentReviewerSignoff": True,
        },
        "note": (
            "Candidate thresholds are report-only and failure-specific. Unrelated REWORK "
            "labels are excluded from each metric's calibration set. Meeting evidence criteria "
            "marks a metric as warning-ready, never blocking; reviewer sign-off is still required."
        ),
    }

    return {
        "schemaVersion": 2,
        "kind": "STARBLOX_VISUAL_PREFLIGHT_CALIBRATION",
        "policy": {
            "humanReviewAuthoritative": True,
            "reportOnly": True,
            "automaticAccept": False,
            "automaticRework": False,
            "exactHashReviewRequired": True,
            "blockingThresholdActivation": False,
        },
        "readiness": readiness,
        "warningCandidates": warning_candidates,
        "measured": measured,
        "skipped": skipped,
        "nearestNeighbors": nearest,
        "distributions": distributions,
        "reworkFailureCodeCoverage": by_failure_code,
    }


def self_test() -> None:
    obvious = [(80 + i, "ACCEPT") for i in range(20)] + [
        (5 + i, "REWORK") for i in range(12)
    ]
    candidate = fit_threshold_candidate(obvious)
    assert candidate is not None
    assert candidate["direction"] == "LE"
    loo = leave_one_out_threshold(obvious)
    assert loo["falsePositiveRate"] == 0.0
    assert loo["recall"] == 1.0
    assert loo["balancedAccuracy"] == 1.0

    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        asset_dir = root / "public/assets/catalog"
        asset_dir.mkdir(parents=True)

        def make(name: str, base: tuple[int, int, int], variant: int) -> None:
            im = Image.new("RGB", (128, 128), base)
            draw = ImageDraw.Draw(im)
            draw.rectangle(
                (20 + variant, 18, 100, 108 - variant),
                outline=(250, 250, 250),
                width=5,
            )
            draw.ellipse(
                (40, 35 + variant, 90, 85 + variant),
                fill=(20 + variant * 8, 90, 220),
            )
            im.save(asset_dir / name)

        make("a.png", (15, 20, 40), 0)
        make("b.png", (18, 24, 45), 2)
        make("c.png", (230, 210, 30), 8)
        make("d.png", (220, 200, 20), 12)

        current = [
            {
                "itemId": "wall-1",
                "collectionId": "wall",
                "decision": "ACCEPT",
                "independent": True,
                "assetPath": "/assets/catalog/a.png",
                "assetHash": "a",
                "failureCodes": [],
            },
            {
                "itemId": "wall-2",
                "collectionId": "wall",
                "decision": "ACCEPT",
                "independent": True,
                "assetPath": "/assets/catalog/b.png",
                "assetHash": "b",
                "failureCodes": [],
            },
            {
                "itemId": "wall-3",
                "collectionId": "wall",
                "decision": "REWORK",
                "independent": True,
                "assetPath": "/assets/catalog/c.png",
                "assetHash": "c",
                "failureCodes": ["THEME_MISMATCH"],
            },
            {
                "itemId": "wall-4",
                "collectionId": "wall",
                "decision": "REWORK",
                "independent": True,
                "assetPath": "/assets/catalog/d.png",
                "assetHash": "d",
                "failureCodes": ["WEAK_DEPTH"],
            },
        ]
        report = build_calibration(root, {"current": current})
        assert len(report["measured"]) == 4
        assert report["readiness"]["automaticThresholdActivation"] is False
        assert report["policy"]["blockingThresholdActivation"] is False
        assert report["distributions"]["sourceEntropyBits"]["ACCEPT"]["count"] == 2
        assert report["reworkFailureCodeCoverage"]["THEME_MISMATCH"]["count"] == 1
        assert all(
            row["nearestSameCollection"] is not None
            for row in report["nearestNeighbors"]
        )
        assert all(
            row["blockingEnabled"] is False
            for row in report["warningCandidates"].values()
        )
        duplicate_row = report["warningCandidates"]["nearestSameCollectionDistance"]
        assert duplicate_row["targetFailureCodes"] == ["NEAR_DUPLICATE_TEMPLATE"]
        assert duplicate_row["samples"]["REWORK"] == 0
        assert duplicate_row["samples"]["unrelatedReworkExcluded"] == 2
        depth_row = report["warningCandidates"]["sourceEntropyBits"]
        assert "WEAK_DEPTH" in depth_row["targetFailureCodes"]
        assert depth_row["samples"]["REWORK"] == 1
        print("SELF_TEST=PASS")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo-root", default=".")
    ap.add_argument("--corpus")
    ap.add_argument("--output")
    ap.add_argument("--self-test", action="store_true")
    args = ap.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.corpus:
        raise SystemExit("--corpus is required unless --self-test is used")
    root = Path(args.repo_root).resolve()
    corpus = json.loads(Path(args.corpus).read_text())
    report = build_calibration(root, corpus)
    text = json.dumps(report, indent=2) + "\n"
    if args.output:
        dest = Path(args.output)
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
