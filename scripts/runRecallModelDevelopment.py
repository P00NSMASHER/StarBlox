#!/usr/bin/env python3
import argparse
import copy
import json
import math
import pickle
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pandas as pd


def parse_args():
    p=argparse.ArgumentParser()
    p.add_argument("--psi-repo",required=True)
    p.add_argument("--data-dir",required=True)
    p.add_argument("--evaluation",required=True)
    p.add_argument("--manifest",required=True)
    p.add_argument("--out",required=True)
    return p.parse_args()


args_cli=parse_args()
psi_repo=Path(args_cli.psi_repo).resolve()
sys.path.insert(0,str(psi_repo))

import torch
from knowledge_tracing.data.data_loader import DataReader
from knowledge_tracing.baseline.halflife_regression.hlr import HLR
from knowledge_tracing.baseline.ppe import PPE


class NullLogs:
    def __init__(self,log_path):
        self.args=SimpleNamespace(log_path=str(log_path))
    def write_to_log_file(self,*args,**kwargs):
        return None


def repair_upstream_sequence_alignment(reader,max_step):
    repaired=0
    audited=0
    for row_index,row in reader.user_seq_df.iterrows():
        user_id=int(row["user_id"])
        source=(
            reader.inter_df[reader.inter_df["user_id"]==user_id]
            .sort_values("timestamp",kind="stable")
            .head(int(max_step))
            .copy()
        )
        if len(source)!=int(max_step):
            raise RuntimeError(
                f"user {user_id} has {len(source)} rows; expected {max_step}"
            )
        source_time=source["timestamp"].to_numpy(dtype=np.int64)
        source_time=(source_time-source_time[0]).tolist()
        expected_skill=source["skill_id"].astype(int).tolist()
        expected_problem=source["problem_id"].astype(int).tolist()
        expected_correct=[
            round(float(value)) for value in source["correct"].tolist()
        ]
        actual_skill=[int(value) for value in row["skill_seq"]]
        actual_problem=[int(value) for value in row["problem_seq"]]
        actual_time=[int(value) for value in row["time_seq"]]
        if actual_skill!=expected_skill:
            raise RuntimeError(f"skill_seq misalignment for user {user_id}")
        if actual_problem!=expected_problem:
            raise RuntimeError(f"problem_seq misalignment for user {user_id}")
        if actual_time!=source_time:
            raise RuntimeError(f"time_seq misalignment for user {user_id}")
        actual_correct=[round(float(value)) for value in row["correct_seq"]]
        if actual_correct!=expected_correct:
            reader.user_seq_df.at[row_index,"correct_seq"]=expected_correct
            repaired+=1
        audited+=1
    with open(reader.corpus_path,"wb") as handle:
        pickle.dump(reader,handle)
    return {
        "shim":"repair-correct-seq-after-upstream-groupby-before-time-sort",
        "auditedLearnerCount":audited,
        "repairedLearnerCount":repaired,
    }


class SafeLearnerForwardMixin:
    """Preserve upstream simulate_path math while avoiding leaf in-place x0."""

    def forward(self,feed_dict):
        skills=feed_dict["skill_seq"]
        times=feed_dict["time_seq"]
        labels=feed_dict["label_seq"]
        batch_size,_=labels.shape
        self.num_seq=batch_size

        x0=torch.zeros(
            (batch_size,self.num_node),
            device=labels.device,
            dtype=torch.float32,
        )
        if self.num_node>1:
            x0=x0.scatter(
                1,
                skills[:,0:1].long(),
                labels[:,0:1].float(),
            )
            items=skills
        else:
            x0[:,0]=labels[:,0].float()
            items=None

        stats=torch.stack(
            [
                feed_dict["num_history"],
                feed_dict["num_success"],
                feed_dict["num_failure"],
            ],
            dim=-1,
        ).unsqueeze(1)

        out=self.simulate_path(
            x0=x0,
            t=times,
            items=items,
            user_id=feed_dict["user_id"],
            stats=stats,
        )
        out.update({
            "prediction":out["x_item_pred"],
            "label":labels.unsqueeze(1),
        })
        return out


class StarBloxHLR(SafeLearnerForwardMixin,HLR):
    pass


class StarBloxPPE(SafeLearnerForwardMixin,PPE):
    pass


def safe_float(v):
    v=float(v)
    return v if math.isfinite(v) else None


def pearson(a,b):
    a=np.asarray(a,dtype=float)
    b=np.asarray(b,dtype=float)
    if a.size<2 or np.std(a)==0 or np.std(b)==0:
        return 0.0
    return float(np.corrcoef(a,b)[0,1])


def rankdata(values):
    values=np.asarray(values,dtype=float)
    order=np.argsort(values,kind="stable")
    ranks=np.empty(len(values),dtype=float)
    i=0
    while i<len(values):
        j=i+1
        while j<len(values) and values[order[j]]==values[order[i]]:
            j+=1
        rank=(i+j-1)/2.0
        for k in range(i,j):
            ranks[order[k]]=rank
        i=j
    return ranks


def spearman(a,b):
    return pearson(rankdata(a),rankdata(b))


def aggregate_state(predictions,evaluation):
    skills=evaluation["skills"]
    truth_by_player={
        row["playerLocalId"]:row["selectionTruthMastery"]
        for row in evaluation["learners"]
    }
    abs_errors=[]
    sq_errors=[]
    pearsons=[]
    spearmans=[]
    weakest_hits=[]
    weakest_top3=[]
    evaluated=0

    for player,skill_rows in predictions.items():
        truth=truth_by_player.get(player)
        if not truth:
            continue
        pred=[float(skill_rows[s]) for s in skills]
        actual=[float(truth[s]) for s in skills]
        if not all(math.isfinite(x) for x in pred):
            raise RuntimeError(f"non-finite state for {player}")
        abs_errors.extend(abs(p-t) for p,t in zip(pred,actual))
        sq_errors.extend((p-t)**2 for p,t in zip(pred,actual))
        pearsons.append(pearson(pred,actual))
        spearmans.append(spearman(pred,actual))

        predicted_order=sorted(
            range(len(skills)),
            key=lambda i:(pred[i],skills[i]),
        )
        true_weak=min(
            range(len(skills)),
            key=lambda i:(actual[i],skills[i]),
        )
        weakest_hits.append(1.0 if predicted_order[0]==true_weak else 0.0)
        weakest_top3.append(1.0 if true_weak in predicted_order[:3] else 0.0)
        evaluated+=1

    if not evaluated:
        raise RuntimeError("no mastery-state rows evaluated")

    flat_pred=[]
    flat_truth=[]
    for player,skill_rows in predictions.items():
        truth=truth_by_player.get(player)
        if not truth:
            continue
        for skill in skills:
            flat_pred.append(float(skill_rows[skill]))
            flat_truth.append(float(truth[skill]))

    return {
        "learnerCount":evaluated,
        "skillCount":len(skills),
        "mae":float(np.mean(abs_errors)),
        "rmse":float(np.sqrt(np.mean(sq_errors))),
        "globalPearson":pearson(flat_pred,flat_truth),
        "meanLearnerPearson":float(np.mean(pearsons)),
        "meanLearnerSpearman":float(np.mean(spearmans)),
        "weakestSkillHitRate":float(np.mean(weakest_hits)),
        "weakestSkillTop3Rate":float(np.mean(weakest_top3)),
    }


def prefix_frame(user_seq_df,selection_step):
    rows=[]
    sequence_keys=[
        "skill_seq","correct_seq","time_seq","problem_seq",
        "num_history","num_success","num_failure"
    ]
    for _,row in user_seq_df.iterrows():
        out={"user_id":int(row["user_id"])}
        for key in sequence_keys:
            out[key]=list(row[key][:selection_step])
        rows.append(out)
    return pd.DataFrame(rows)


def train_model(model_cls,name,model_args,corpus,logs,training,seed):
    torch.manual_seed(seed)
    np.random.seed(seed)
    model=model_cls(model_args,corpus,logs).to(model_args.device)
    model.actions_before_train()

    optimizer=torch.optim.Adam(
        model.customize_parameters(),
        lr=float(training["learningRate"]),
        weight_decay=float(training["weightDecay"]),
    )
    train_batches=model.prepare_batches(
        corpus,
        corpus.data_df["train"],
        int(training["batchSize"]),
        phase="train",
    )
    epoch_losses=[]
    for epoch in range(int(training["epochs"])):
        model.train()
        batch_losses=[]
        for batch in train_batches:
            optimizer.zero_grad(set_to_none=True)
            out=model(batch)
            losses=model.loss(batch,out,metrics=None)
            loss=losses["loss_total"]
            if not torch.isfinite(loss):
                raise RuntimeError(f"{name} non-finite loss at epoch {epoch}")
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(),10.0)
            optimizer.step()
            batch_losses.append(float(loss.detach().cpu()))
        epoch_losses.append(float(np.mean(batch_losses)))
    return model,epoch_losses


def extract_all_skill_state(model,corpus,prefix_df,evaluation):
    model.eval()
    skill_reverse={int(v):k for k,v in evaluation["skillIdMap"].items()}
    user_reverse={int(v):k for k,v in evaluation["userIdMap"].items()}
    predictions={}
    with torch.no_grad():
        for start in range(0,len(prefix_df),8):
            data=prefix_df.iloc[start:start+8].reset_index(drop=True)
            feed=model.get_feed_dict(corpus,data,0,len(data),phase="state")
            out=model(feed)
            all_state=out.get("x_all_pred")
            if all_state is None:
                raise RuntimeError("model did not expose x_all_pred")
            final_state=all_state[:,:,-1].detach().cpu().numpy()
            users=feed["user_id"].detach().cpu().numpy().reshape(-1)
            for row_index,user_id in enumerate(users):
                player=user_reverse[int(user_id)]
                predictions[player]={
                    skill_reverse[skill_id]:float(final_state[row_index,skill_id])
                    for skill_id in sorted(skill_reverse)
                }
    return predictions


def bkt_predictions(evaluation):
    return {
        row["playerLocalId"]:{
            skill:float(row["selectionBktMastery"][skill])
            for skill in evaluation["skills"]
        }
        for row in evaluation["learners"]
    }


with open(args_cli.manifest,"r",encoding="utf-8") as handle:
    manifest=json.load(handle)
with open(args_cli.evaluation,"r",encoding="utf-8") as handle:
    evaluation=json.load(handle)

if manifest["authorization"]!="synthetic-only-no-real-player-data":
    raise RuntimeError("benchmark must remain synthetic-only")
if evaluation["authorization"]!="synthetic-only-no-real-player-data":
    raise RuntimeError("dataset must remain synthetic-only")
if int(manifest["seed"])!=int(evaluation["seed"]):
    raise RuntimeError("benchmark seed mismatch")
if int(evaluation["selectionStep"])!=int(manifest["selectionStep"]):
    raise RuntimeError("selection boundary mismatch")
if int(evaluation["seed"]) in set(manifest.get("forbiddenSeeds",[])):
    raise RuntimeError("benchmark reused a forbidden seed")

try:
    upstream_commit=subprocess.check_output(
        ["git","-C",str(psi_repo),"rev-parse","HEAD"],
        text=True,
    ).strip()
except Exception:
    upstream_commit="unknown"
if upstream_commit!=manifest["upstream"]["commit"]:
    raise RuntimeError(
        f"upstream commit {upstream_commit} != locked {manifest['upstream']['commit']}"
    )

data_dir=Path(args_cli.data_dir).resolve()
log_dir=Path(args_cli.out).resolve().parent/"recall-model-logs"
log_dir.mkdir(parents=True,exist_ok=True)
logs=NullLogs(log_dir)

model_args=SimpleNamespace(
    data_dir=str(data_dir),
    dataset=evaluation["datasetName"],
    kfold=1,
    max_step=int(evaluation["maxStep"]),
    num_learner=0,
    train_mode="ls_split_time",
    train_time_ratio=float(evaluation["trainTimeRatio"]),
    test_time_ratio=1.0-float(evaluation["trainTimeRatio"]),
    val_time_ratio=0.25,
    random_seed=int(evaluation["seed"]),
    multi_node=1,
    device=torch.device("cpu"),
    log_path=str(log_dir),
)

reader=DataReader(model_args,logs)
reader.create_corpus()
alignment_audit=repair_upstream_sequence_alignment(reader,model_args.max_step)
corpus=reader.load_corpus(model_args)
prefix=prefix_frame(corpus.user_seq_df,int(evaluation["selectionStep"]))

models={}
for index,(name,cls) in enumerate([
    ("HLR",StarBloxHLR),
    ("PPE",StarBloxPPE),
]):
    model,losses=train_model(
        cls,
        name,
        model_args,
        corpus,
        logs,
        manifest["training"],
        int(evaluation["seed"])+index*9973,
    )
    state=extract_all_skill_state(model,corpus,prefix,evaluation)
    models[name]={
        "stateMetrics":aggregate_state(state,evaluation),
        "training":{
            "epochs":len(losses),
            "initialLoss":safe_float(losses[0]),
            "finalLoss":safe_float(losses[-1]),
            "minLoss":safe_float(min(losses)),
        },
        "selectorState":state,
    }

bkt_state=bkt_predictions(evaluation)
bkt_metrics=aggregate_state(bkt_state,evaluation)

rule=manifest["candidateRule"]
supportive=[]
for name,row in models.items():
    m=row["stateMetrics"]
    checks={
        "meanSpearmanGainVsBkt":
            m["meanLearnerSpearman"]-bkt_metrics["meanLearnerSpearman"]
            >=float(rule["meanSpearmanGainVsBktMin"]),
        "weakestSkillHitGainVsBkt":
            m["weakestSkillHitRate"]-bkt_metrics["weakestSkillHitRate"]
            >=float(rule["weakestSkillHitGainVsBktMin"]),
        "globalPearsonGainVsBkt":
            m["globalPearson"]-bkt_metrics["globalPearson"]
            >=float(rule["globalPearsonGainVsBktMin"]),
        "maeRegressionVsBkt":
            m["mae"]-bkt_metrics["mae"]
            <=float(rule["maeRegressionVsBktMax"]),
    }
    row["vsBkt"]={
        "mae":m["mae"]-bkt_metrics["mae"],
        "globalPearson":m["globalPearson"]-bkt_metrics["globalPearson"],
        "meanLearnerPearson":
            m["meanLearnerPearson"]-bkt_metrics["meanLearnerPearson"],
        "meanLearnerSpearman":
            m["meanLearnerSpearman"]-bkt_metrics["meanLearnerSpearman"],
        "weakestSkillHitRate":
            m["weakestSkillHitRate"]-bkt_metrics["weakestSkillHitRate"],
        "weakestSkillTop3Rate":
            m["weakestSkillTop3Rate"]-bkt_metrics["weakestSkillTop3Rate"],
    }
    row["checks"]=checks
    row["supportive"]=all(checks.values())
    if row["supportive"]:
        supportive.append(name)

result={
    "schemaVersion":"starblox-recall-model-development-result-v1",
    "developmentOnly":True,
    "tuneAgainstThisCohort":True,
    "authorization":evaluation["authorization"],
    "benchmarkId":manifest["benchmarkId"],
    "seed":evaluation["seed"],
    "selectionStep":evaluation["selectionStep"],
    "learnerCount":evaluation["learnerCount"],
    "skillCount":len(evaluation["skills"]),
    "upstream":{
        "repository":manifest["upstream"]["repository"],
        "commit":upstream_commit,
    },
    "dataAlignmentShim":alignment_audit,
    "bkt":{"stateMetrics":bkt_metrics},
    "models":models,
    "candidateRule":rule,
    "supportiveModels":supportive,
    "promotionBoundary":{
        "liveSelectorAllowed":False,
        "note":(
            "A supportive recall model must be frozen and tested on a new "
            "independent model-validation cohort before any selector experiment."
            if supportive else
            "Neither recall model cleared the predeclared BKT signal gate; "
            "do not build a selector from these results."
        ),
    },
}

out=Path(args_cli.out)
out.parent.mkdir(parents=True,exist_ok=True)
with open(out,"w",encoding="utf-8") as handle:
    json.dump(result,handle,indent=2,sort_keys=True)
    handle.write("\n")

print(json.dumps({
    "benchmarkId":result["benchmarkId"],
    "seed":result["seed"],
    "bkt":bkt_metrics,
    "HLR":{
        "stateMetrics":models["HLR"]["stateMetrics"],
        "vsBkt":models["HLR"]["vsBkt"],
        "supportive":models["HLR"]["supportive"],
    },
    "PPE":{
        "stateMetrics":models["PPE"]["stateMetrics"],
        "vsBkt":models["PPE"]["vsBkt"],
        "supportive":models["PPE"]["supportive"],
    },
    "supportiveModels":supportive,
    "alignmentAudit":alignment_audit,
    "liveSelectorAllowed":False,
},indent=2,sort_keys=True))
