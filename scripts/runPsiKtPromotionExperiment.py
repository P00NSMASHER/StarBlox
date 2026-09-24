#!/usr/bin/env python3
import argparse
import hashlib
import json
import math
import os
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from types import SimpleNamespace

import numpy as np


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--psi-repo", required=True)
    parser.add_argument("--data-dir", required=True)
    parser.add_argument("--evaluation", required=True)
    parser.add_argument("--graph-json", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--max-step", type=int, default=30)
    return parser.parse_args()


def sha256_file(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


args_cli = parse_args()
psi_repo = Path(args_cli.psi_repo).resolve()
sys.path.insert(0, str(psi_repo))

import torch
from sklearn.metrics import roc_auc_score
from knowledge_tracing.data.data_loader import DataReader
from knowledge_tracing.psikt.psikt import AmortizedPSIKT
from knowledge_tracing.utils.logger import Logger

with open(args_cli.evaluation, "r", encoding="utf-8") as handle:
    evaluation = json.load(handle)
with open(args_cli.graph_json, "r", encoding="utf-8") as handle:
    graph_spec = json.load(handle)

skill_id_map = evaluation["skillIdMap"]
num_skills = len(skill_id_map)
adj = np.zeros((num_skills, num_skills), dtype=np.float32)
for skill_name, skill_id in skill_id_map.items():
    adj[int(skill_id), int(skill_id)] = 0.5
for edge in graph_spec.get("edges", []):
    if edge["from"] in skill_id_map and edge["to"] in skill_id_map:
        adj[int(skill_id_map[edge["from"]]), int(skill_id_map[edge["to"]])] = float(edge.get("weight", 0.2))

dataset = evaluation["datasetName"]
data_dir = Path(args_cli.data_dir).resolve()
dataset_dir = data_dir / dataset
dataset_dir.mkdir(parents=True, exist_ok=True)
np.save(dataset_dir / "adj.npy", adj)

seed = int(evaluation["seed"])
torch.manual_seed(seed)
np.random.seed(seed)

output_path = Path(args_cli.out).resolve()
output_path.parent.mkdir(parents=True, exist_ok=True)
save_folder = output_path.parent / "psi-logs"

model_args = SimpleNamespace(
    # data
    data_dir=str(data_dir),
    dataset=dataset,
    kfold=1,
    max_step=int(args_cli.max_step),
    num_learner=32,
    train_mode="ls_split_time",
    train_time_ratio=0.6,
    val_time_ratio=0.25,
    test_time_ratio=0.4,
    random_seed=seed,
    regenerate_corpus=1,
    # logging/model paths
    create_logs=1,
    save_folder=str(save_folder),
    model_name="AmortizedPSIKT",
    time="deterministic-shadow",
    expername="starblox",
    overfit=0,
    # model
    device=torch.device("cpu"),
    learned_graph="w_gt",
    node_dim=8,
    num_category=4,
    num_sample=2,
    var_log_max=6,
    time_dependent_s=1,
    s_entropy_weight=0.1,
    z_entropy_weight=0.1,
    s_log_weight=1.0,
    z_log_weight=1.0,
    y_log_weight=1.0,
    sparsity_loss_weight=1e-12,
    cat_weight=1.0,
    cat_in_entropy_weight=0.0,
    # optimizer/training
    epoch=int(args_cli.epochs),
    batch_size=8,
    batch_size_multiGPU=8,
    eval_batch_size=8,
    lr=0.002,
    l2=1e-5,
    optimizer="Adam",
    lr_decay=100,
    gamma=0.5,
    early_stop=0,
    save_every=999,
    validate=1,
    test=1,
    test_every=1,
    multi_node=1,
    distributed=0,
    em_train=0,
    vcl=0,
    finetune=0,
    start_epoch=0,
    load=0,
    load_folder="",
    GPU_to_use=None,
    num_GPU=None,
)

logs = Logger(model_args)
reader = DataReader(model_args, logs)
reader.create_corpus()
corpus = reader.load_corpus(model_args)

model = AmortizedPSIKT(
    mode=model_args.train_mode,
    num_node=corpus.n_skills,
    nx_graph=adj,
    device=model_args.device,
    args=model_args,
    logs=logs,
).to(model_args.device)
model.actions_before_train()

optimizer = torch.optim.Adam(
    model.customize_parameters(),
    lr=model_args.lr,
    weight_decay=model_args.l2,
)

train_batches = model.prepare_batches(
    corpus,
    corpus.data_df["train"],
    model_args.batch_size,
    phase="train",
)
test_batches = model.prepare_batches(
    corpus,
    corpus.data_df["test"],
    model_args.eval_batch_size,
    phase="test",
)

epoch_losses = []
for epoch in range(model_args.epoch):
    model.train()
    batch_losses = []
    for batch in train_batches:
        optimizer.zero_grad(set_to_none=True)
        output = model(batch)
        losses = model.loss(batch, output, metrics=None)
        loss = losses["loss_total"]
        if not torch.isfinite(loss):
            raise RuntimeError("PSI-KT produced a non-finite training loss")
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 100)
        optimizer.step()
        batch_losses.append(float(loss.detach().cpu()))
    epoch_losses.append(float(np.mean(batch_losses)))

model.eval()
predictions = []
labels = []
per_user_skill = defaultdict(lambda: defaultdict(list))
test_step = int(model_args.max_step * model_args.test_time_ratio)

with torch.no_grad():
    for batch in test_batches:
        out = model.predictive_model(batch)
        pred = out["prediction"].mean(dim=1).detach().cpu().numpy()
        label = out["label"][:, 0, :].detach().cpu().numpy()
        skills = batch["skill_seq"][:, -test_step:].detach().cpu().numpy()
        users = batch["user_id"].detach().cpu().numpy().reshape(-1)

        predictions.extend(pred.reshape(-1).tolist())
        labels.extend(label.reshape(-1).tolist())

        for row_index, user_id in enumerate(users):
            for step_index in range(pred.shape[1]):
                skill_id = int(skills[row_index, step_index])
                per_user_skill[str(int(user_id))][str(skill_id)].append(
                    float(pred[row_index, step_index])
                )

pred_np = np.asarray(predictions, dtype=float)
label_np = np.asarray(labels, dtype=int)
accuracy = float(np.mean((pred_np >= 0.5) == label_np))
brier = float(np.mean((pred_np - label_np) ** 2))
auc = None
if len(np.unique(label_np)) > 1:
    auc = float(roc_auc_score(label_np, pred_np))

reverse_skill = {str(v): k for k, v in skill_id_map.items()}
skill_predictions = {}
for user_id, skill_rows in per_user_skill.items():
    skill_predictions[user_id] = {
        reverse_skill[skill_id]: float(np.mean(values))
        for skill_id, values in skill_rows.items()
    }

model_path = output_path.parent / "amortized-psikt-shadow.pt"
torch.save(model.state_dict(), model_path)

try:
    upstream_commit = subprocess.check_output(
        ["git", "-C", str(psi_repo), "rev-parse", "HEAD"],
        text=True,
    ).strip()
except Exception:
    upstream_commit = "unknown"

receipt = {
    "schemaVersion":"starblox-psikt-promotion-run-v1",
    "datasetAuthorization":evaluation["authorization"],
    "upstreamRepository":"mlcolab/psi-kt",
    "upstreamCommit":upstream_commit,
    "model":"AmortizedPSIKT",
    "device":"cpu",
    "epochs":model_args.epoch,
    "trainLearners":len(corpus.data_df["train"]),
    "testLearners":len(corpus.data_df["test"]),
    "skillCount":corpus.n_skills,
    "problemCount":corpus.n_problems,
    "epochLosses":epoch_losses,
    "metrics":{
        "accuracy":accuracy,
        "auc":auc,
        "brier":brier,
        "predictionCount":int(pred_np.size),
    },
    "skillPredictions":skill_predictions,
    "modelStatePath":str(model_path),
    "modelStateSha256":sha256_file(model_path),
}
with open(output_path, "w", encoding="utf-8") as handle:
    json.dump(receipt, handle, indent=2, sort_keys=True)
    handle.write("\n")

print(json.dumps({
    "model":receipt["model"],
    "upstreamCommit":upstream_commit,
    "epochs":receipt["epochs"],
    "trainLearners":receipt["trainLearners"],
    "testLearners":receipt["testLearners"],
    "skillCount":receipt["skillCount"],
    "metrics":receipt["metrics"],
    "modelStateSha256":receipt["modelStateSha256"],
}, indent=2, sort_keys=True))
