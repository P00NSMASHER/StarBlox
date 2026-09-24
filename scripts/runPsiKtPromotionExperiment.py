#!/usr/bin/env python3
import argparse
import hashlib
import json
import math
import os
import pickle
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pandas as pd


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
from knowledge_tracing.psikt import EPS
from knowledge_tracing.psikt.psikt import AmortizedPSIKT
from knowledge_tracing.psikt.GMVAE.gmvae import LossFunctions
from knowledge_tracing.utils.logger import Logger


class StarBloxAmortizedPSIKT(AmortizedPSIKT):
    """Compatibility wrapper around upstream AmortizedPSIKT.

    Upstream commit ecada10... has a dead/debug-only branch in zt_transition_gen
    that tries to reshape a sampled tensor using an undefined local variable
    named bsn. The sampled tensor is never consumed after that assignment.
    Passing a non-None sentinel skips only that assignment while preserving the
    upstream transition distributions, loss, inference networks, and predictor.
    """

    def st_transition_infer(self, emb_inputs, num_sample=0, eval=False):
        # Pinned upstream InferenceNet already returns the categorical logits
        # and probabilities that loss() later expects, but st_transition_infer()
        # discards them. Preserve the upstream posterior construction in one
        # pass and expose only those two missing tensors.
        qs_out_inf = self.infer_network_posterior_s(
            emb_inputs,
            self.qs_temperature,
            self.qs_hard,
        )
        self.logits = qs_out_inf["logits"]
        self.probs = qs_out_inf["prob_cat"]

        s_category = qs_out_inf["categorical"]
        s_mean = qs_out_inf["s_mu_infer"]
        s_var = qs_out_inf["s_var_infer"]
        s_var_mat = torch.diag_embed(s_var + EPS)
        qs_dist = torch.distributions.MultivariateNormal(
            loc=s_mean,
            scale_tril=torch.tril(s_var_mat),
        )
        self.register_buffer("qs_category", s_category.clone().detach())
        return qs_dist

    def generative_process(self, qs_dist, qz_dist, feed_dict=None, eval=False):
        ps_dist = self.st_transition_gen(qs_dist, eval=eval)
        sentinel = torch.empty(
            0,
            device=feed_dict["time_seq"].device if feed_dict is not None else self.device,
        )
        pz_dist = self.zt_transition_gen(
            qs_dist=qs_dist,
            qz_dist=qz_dist,
            feed_dict=feed_dict,
            eval=eval,
            qs_sampled=sentinel,
        )
        return ps_dist, pz_dist

    def forward(self, feed_dict):
        # Pinned upstream forward() computes the full objective dictionary,
        # then overwrites it with a reduced debug dictionary. Upstream loss()
        # expects the original objective keys, including "prediction".
        t_train = feed_dict["time_seq"]
        y_train = feed_dict["label_seq"]
        item_train = feed_dict["skill_seq"]
        emb_history = self.embedding_process(
            time=t_train,
            label=y_train,
            item=item_train,
        )
        qs_dist, qz_dist = self.inference_process(emb_history, feed_dict)
        ps_dist, pz_dist = self.generative_process(
            qs_dist,
            qz_dist,
            feed_dict,
        )
        return_dict = self.get_objective_values(
            [qs_dist, qz_dist],
            [ps_dist, pz_dist],
            feed_dict,
        )
        self.register_buffer(
            name="output_emb_input",
            tensor=emb_history.clone().detach(),
        )
        return return_dict

    def loss(self, feed_dict, outdict, metrics=None):
        # Pinned upstream loss() unconditionally evaluates prior_entropy through
        # self.gen_network_transition_s, but AmortizedPSIKT never initializes
        # that attribute. In this promotion experiment cat_in_entropy_weight is
        # exactly zero, and upstream loss_total does not include this diagnostic
        # term. Preserve the effective upstream optimization objective and fail
        # explicitly if a future run tries to enable that missing regularizer.
        if metrics is not None:
            raise RuntimeError(
                "StarBlox PSI-KT compatibility loss is validated with metrics=None; "
                "evaluation metrics are computed from predictive_model separately."
            )
        if float(self.args.cat_in_entropy_weight) != 0.0:
            raise RuntimeError(
                "Pinned PSI-KT lacks gen_network_transition_s; "
                "cat_in_entropy_weight must remain zero."
            )

        losses = defaultdict(lambda: torch.zeros((), device=self.device))
        gt = outdict["label"].repeat(1, self.num_sample, 1, 1)
        pred = outdict["prediction"]

        loss_fn = torch.nn.BCELoss()
        losses["loss_bce"] = loss_fn(pred.flatten(), gt.float().flatten())

        for key in [
            "elbo",
            "initial_likelihood",
            "sequence_likelihood",
            "st_entropy",
            "zt_entropy",
            "yt_log_prob",
            "zt_log_prob",
            "st_log_prob",
        ]:
            losses[key] = outdict[key].mean()

        gmvae_loss = LossFunctions()
        loss_cat = -gmvae_loss.entropy(self.logits, self.probs) - np.log(0.1)
        losses["loss_cat"] = loss_cat * self.args.cat_weight
        losses["loss_cat_in_entropy"] = torch.zeros((), device=pred.device)

        # Exact effective upstream objective at this commit.
        losses["loss_total"] = -outdict["elbo"].mean() + losses["loss_cat"]
        return losses


def repair_upstream_sequence_alignment(reader, max_step):
    """Audit and repair the pinned DataReader's correct_seq ordering.

    The pinned upstream reader constructs skill/time/problem sequences from a
    chronologically sorted frame but constructs correct_seq from the pre-sort
    skill-grouped frame. We verify the structural sequences against the source
    TSV, repair only correct_seq when necessary, and persist the repaired corpus
    before upstream load_corpus() performs its normal split.
    """

    repaired = 0
    audited = 0
    for row_index, row in reader.user_seq_df.iterrows():
        user_id = int(row["user_id"])
        source = (
            reader.inter_df[reader.inter_df["user_id"] == user_id]
            .sort_values("timestamp", kind="stable")
            .head(int(max_step))
            .copy()
        )
        if len(source) != int(max_step):
            raise RuntimeError(
                f"user {user_id} has {len(source)} source rows; expected {max_step}"
            )

        source_time = source["timestamp"].to_numpy(dtype=np.int64)
        source_time = (source_time - source_time[0]).tolist()
        expected_skill = source["skill_id"].astype(int).tolist()
        expected_problem = source["problem_id"].astype(int).tolist()
        expected_correct = [round(float(value)) for value in source["correct"].tolist()]

        actual_skill = [int(value) for value in row["skill_seq"]]
        actual_problem = [int(value) for value in row["problem_seq"]]
        actual_time = [int(value) for value in row["time_seq"]]

        if actual_skill != expected_skill:
            raise RuntimeError(f"upstream skill_seq misalignment for user {user_id}")
        if actual_problem != expected_problem:
            raise RuntimeError(f"upstream problem_seq misalignment for user {user_id}")
        if actual_time != source_time:
            raise RuntimeError(f"upstream time_seq misalignment for user {user_id}")

        actual_correct = [round(float(value)) for value in row["correct_seq"]]
        if actual_correct != expected_correct:
            reader.user_seq_df.at[row_index, "correct_seq"] = expected_correct
            repaired += 1
        audited += 1

    with open(reader.corpus_path, "wb") as handle:
        pickle.dump(reader, handle)

    return {
        "shim":"repair-correct-seq-after-upstream-groupby-before-time-sort",
        "auditedLearnerCount":audited,
        "repairedLearnerCount":repaired,
    }

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
alignment_audit = repair_upstream_sequence_alignment(reader, model_args.max_step)
corpus = reader.load_corpus(model_args)

model = StarBloxAmortizedPSIKT(
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
    "wrapperClass":"StarBloxAmortizedPSIKT",
    "compatibilityShim":"skip-unused-qs-sample-assignment-with-undefined-bsn",
    "forwardCompatibilityShim":"preserve-objective-dict-discarded-by-upstream-forward",
    "categoricalCompatibilityShim":"expose-upstream-gmvae-logits-and-prob-cat-for-loss",
    "priorEntropyCompatibilityShim":"skip-zero-weight-missing-gen-network-transition-s-diagnostic",
    "dataAlignmentShim":alignment_audit,
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
    "wrapperClass":receipt["wrapperClass"],
    "compatibilityShim":receipt["compatibilityShim"],
    "forwardCompatibilityShim":receipt["forwardCompatibilityShim"],
    "categoricalCompatibilityShim":receipt["categoricalCompatibilityShim"],
    "priorEntropyCompatibilityShim":receipt["priorEntropyCompatibilityShim"],
    "dataAlignmentShim":receipt["dataAlignmentShim"],
    "upstreamCommit":upstream_commit,
    "epochs":receipt["epochs"],
    "trainLearners":receipt["trainLearners"],
    "testLearners":receipt["testLearners"],
    "skillCount":receipt["skillCount"],
    "metrics":receipt["metrics"],
    "modelStateSha256":receipt["modelStateSha256"],
}, indent=2, sort_keys=True))
