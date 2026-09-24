#!/usr/bin/env python3
import argparse
import hashlib
import json
import math
import os
import random
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pandas as pd
import torch

from knowledge_tracing.psikt.psikt import AmortizedPSIKT


PINNED_PSIKT_COMMIT = "ecada10cedb3237ba55f4277af0bdbd8d5d4a68e"


class NullLogs:
    def write_to_log_file(self, *args, **kwargs):
        return None


def parse_args():
    parser = argparse.ArgumentParser(
        description="Train/evaluate the pinned PSI-KT AmortizedPSIKT model on a StarBlox-shaped synthetic dataset."
    )
    parser.add_argument("--interactions", required=True)
    parser.add_argument("--evaluation", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--lr", type=float, default=0.002)
    parser.add_argument("--seed", type=int, default=20260924)
    parser.add_argument("--node-dim", type=int, default=8)
    parser.add_argument("--num-category", type=int, default=4)
    parser.add_argument("--num-sample", type=int, default=1)
    return parser.parse_args()


def load_sequences(path: str, max_step: int):
    frame = pd.read_csv(path, sep="\t")
    required = {"user_id", "skill_id", "correct", "timestamp", "problem_id"}
    missing = required - set(frame.columns)
    if missing:
        raise RuntimeError(f"PSI-KT interaction table missing columns: {sorted(missing)}")

    users = []
    skills = []
    labels = []
    times = []

    for user_id, user_frame in frame.groupby("user_id"):
        user_frame = user_frame.sort_values("timestamp", kind="stable").head(max_step)
        if len(user_frame) != max_step:
            raise RuntimeError(
                f"user {user_id} has {len(user_frame)} interactions; expected {max_step}"
            )
        timestamp = user_frame["timestamp"].to_numpy(dtype=np.int64)
        timestamp = timestamp - timestamp[0]
        users.append(int(user_id))
        skills.append(user_frame["skill_id"].to_numpy(dtype=np.int64))
        labels.append(user_frame["correct"].to_numpy(dtype=np.float32))
        times.append(timestamp)

    order = np.argsort(np.asarray(users))
    users = np.asarray(users, dtype=np.int64)[order]
    skills = np.asarray(skills, dtype=np.int64)[order]
    labels = np.asarray(labels, dtype=np.float32)[order]
    times = np.asarray(times, dtype=np.float64)[order]

    return users, skills, labels, times


def make_model_args(max_step: int, train_steps: int, test_steps: int, args):
    return SimpleNamespace(
        device=torch.device("cpu"),
        learned_graph="w_gt",
        var_log_max=5.0,
        node_dim=args.node_dim,
        num_category=args.num_category,
        num_sample=args.num_sample,
        max_step=max_step,
        train_time_ratio=train_steps / max_step,
        test_time_ratio=test_steps / max_step,
        s_entropy_weight=0.1,
        z_entropy_weight=0.1,
        s_log_weight=1.0,
        z_log_weight=1.0,
        y_log_weight=1.0,
        log_path=Path(".psikt-starblox-log"),
    )


def official_objective(model, feed):
    # Upstream AmortizedPSIKT.forward() computes this official objective and then
    # overwrites it before returning. Calling the same official model methods here
    # preserves the PSI-KT model while bypassing that orchestration bug.
    emb_history = model.embedding_process(
        time=feed["time_seq"],
        label=feed["label_seq"],
        item=feed["skill_seq"],
    )
    qs_dist, qz_dist = model.inference_process(emb_history, feed)
    ps_dist, pz_dist = model.generative_process(qs_dist, qz_dist, feed)
    return model.get_objective_values(
        [qs_dist, qz_dist],
        [ps_dist, pz_dist],
        feed,
    )


def binary_metrics(pred, label):
    pred = np.asarray(pred, dtype=np.float64)
    label = np.asarray(label, dtype=np.float64)
    eps = 1e-7
    clipped = np.clip(pred, eps, 1 - eps)
    bce = float(
        -np.mean(label * np.log(clipped) + (1 - label) * np.log(1 - clipped))
    )
    binary = (pred >= 0.5).astype(np.int64)
    accuracy = float(np.mean(binary == label.astype(np.int64)))
    return {"accuracy": accuracy, "bce": bce}


def main():
    cli = parse_args()
    evaluation = json.loads(Path(cli.evaluation).read_text(encoding="utf-8"))
    if evaluation.get("authorization") != "synthetic-only-no-real-player-data":
        raise RuntimeError("promotion dataset is not explicitly authorized as synthetic-only")

    max_step = int(evaluation["maxStep"])
    skill_count = len(evaluation["skills"])
    test_steps = skill_count
    train_steps = max_step - test_steps
    if train_steps < 4:
        raise RuntimeError("not enough training steps after reserving one test step per skill")

    users, skill_seq, label_seq, time_seq = load_sequences(cli.interactions, max_step)
    if skill_seq.shape[1] != max_step:
        raise RuntimeError("sequence width does not match maxStep")
    if int(skill_seq.max()) + 1 != skill_count:
        raise RuntimeError("interaction skill IDs do not match evaluation skill count")

    random.seed(cli.seed)
    np.random.seed(cli.seed)
    torch.manual_seed(cli.seed)
    torch.use_deterministic_algorithms(True, warn_only=True)

    device = torch.device("cpu")
    model_args = make_model_args(max_step, train_steps, test_steps, cli)

    # The graph is supplied only as a shape/structural prior. PSI-KT learns its
    # own graph representation; this deterministic ring avoids injecting the
    # synthetic truth into the model.
    adjacency = np.zeros((skill_count, skill_count), dtype=np.float32)
    for idx in range(skill_count):
        adjacency[idx, (idx + 1) % skill_count] = 0.1

    model = AmortizedPSIKT(
        mode="ls_split_time",
        num_node=skill_count,
        args=model_args,
        device=device,
        logs=NullLogs(),
        nx_graph=adjacency,
    ).to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=cli.lr, weight_decay=1e-5)

    full_feed = {
        "skill_seq": torch.tensor(skill_seq, dtype=torch.long, device=device),
        "label_seq": torch.tensor(label_seq, dtype=torch.float32, device=device),
        "time_seq": torch.tensor(time_seq, dtype=torch.float32, device=device),
    }
    train_feed = {
        key: value[:, :train_steps]
        for key, value in full_feed.items()
    }

    loss_history = []
    for epoch in range(cli.epochs):
        model.train()
        optimizer.zero_grad(set_to_none=True)
        objective = official_objective(model, train_feed)
        loss = -objective["elbo"]
        if not torch.isfinite(loss):
            raise RuntimeError(f"non-finite PSI-KT ELBO loss at epoch {epoch}: {loss.item()}")
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 20.0)
        optimizer.step()
        loss_history.append(float(loss.detach().cpu().item()))

    model.eval()
    with torch.no_grad():
        pred_out = model.predictive_model(full_feed)
        pred = pred_out["prediction"].mean(dim=1).detach().cpu().numpy()
        label = pred_out["label"][:, 0].detach().cpu().numpy()
        pred_s_mean = pred_out["pred_s_mean"].detach().cpu().numpy()

    metrics = binary_metrics(pred, label)
    test_skill_ids = skill_seq[:, -test_steps:]

    predictions = []
    for row_idx, user_id in enumerate(users.tolist()):
        for step_idx in range(test_steps):
            probability = float(pred[row_idx, step_idx])
            predictions.append({
                "userId": int(user_id),
                "skillId": int(test_skill_ids[row_idx, step_idx]),
                "step": int(step_idx),
                "probabilityCorrect": probability,
                "uncertainty": float(4.0 * probability * (1.0 - probability)),
                "label": int(label[row_idx, step_idx]),
            })

    model_state_bytes = b"".join(
        tensor.detach().cpu().numpy().tobytes()
        for _, tensor in sorted(model.state_dict().items())
    )
    model_sha256 = hashlib.sha256(model_state_bytes).hexdigest()

    receipt = {
        "schemaVersion": "starblox-psikt-training-receipt-v1",
        "model": "mlcolab/psi-kt AmortizedPSIKT",
        "pinnedCommit": PINNED_PSIKT_COMMIT,
        "authorization": evaluation["authorization"],
        "orchestrationPatches": [
            "bypass upstream PSIKTRunner CPU .module assumption",
            "call official AmortizedPSIKT objective methods directly because upstream forward overwrites its objective dictionary",
            "optimize negative official ELBO directly; no StarBlox labels or latent truth are passed as model features",
        ],
        "seed": cli.seed,
        "epochs": cli.epochs,
        "learningRate": cli.lr,
        "learnerCount": int(len(users)),
        "skillCount": int(skill_count),
        "maxStep": int(max_step),
        "trainSteps": int(train_steps),
        "testSteps": int(test_steps),
        "lossHistory": loss_history,
        "testMetrics": metrics,
        "predictionCount": len(predictions),
        "predictions": predictions,
        "latentStateSummary": {
            "mean": float(np.mean(pred_s_mean)),
            "std": float(np.std(pred_s_mean)),
        },
        "modelStateSha256": model_sha256,
    }

    output = json.dumps(receipt, indent=2, sort_keys=True) + "\n"
    Path(cli.out).write_text(output, encoding="utf-8")
    print(output, end="")


if __name__ == "__main__":
    main()
