#!/usr/bin/env python3
import argparse
import json
import math
import pickle
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pandas as pd


def args():
    p=argparse.ArgumentParser()
    p.add_argument("--psi-repo",required=True)
    p.add_argument("--data-dir",required=True)
    p.add_argument("--evaluation",required=True)
    p.add_argument("--manifest",required=True)
    p.add_argument("--out",required=True)
    return p.parse_args()


a=args()
psi_repo=Path(a.psi_repo).resolve()
sys.path.insert(0,str(psi_repo))

import torch
from sklearn.metrics import roc_auc_score
from knowledge_tracing.data.data_loader import DataReader
from knowledge_tracing.baseline.EduKTM.dkt import DKT


class NullLogs:
    def __init__(self,log_path):
        self.args=SimpleNamespace(log_path=str(log_path))
    def write_to_log_file(self,*args,**kwargs):
        return None


class StarBloxDKT(DKT):
    """Expose the all-skill next-response vector already computed by upstream DKT."""

    def selector_state(self,feed_dict):
        items=feed_dict["skill_seq"]
        labels=feed_dict["label_seq"]
        embedded=self.skill_embeddings(items+labels*self.skill_num)
        output,_=self.rnn(embedded,None)
        logits=self.out(output)
        return torch.sigmoid(logits[:,-1,:])


def repair_alignment(reader,max_step):
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
        source_time=source["timestamp"].to_numpy(dtype=np.int64)
        source_time=(source_time-source_time[0]).tolist()
        expected_skill=source["skill_id"].astype(int).tolist()
        expected_problem=source["problem_id"].astype(int).tolist()
        expected_correct=[round(float(x)) for x in source["correct"].tolist()]
        if [int(x) for x in row["skill_seq"]]!=expected_skill:
            raise RuntimeError(f"skill_seq mismatch for user {user_id}")
        if [int(x) for x in row["problem_seq"]]!=expected_problem:
            raise RuntimeError(f"problem_seq mismatch for user {user_id}")
        if [int(x) for x in row["time_seq"]]!=source_time:
            raise RuntimeError(f"time_seq mismatch for user {user_id}")
        if [round(float(x)) for x in row["correct_seq"]]!=expected_correct:
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


def pearson(x,y):
    x=np.asarray(x,dtype=float)
    y=np.asarray(y,dtype=float)
    if len(x)<2 or np.std(x)==0 or np.std(y)==0:
        return 0.0
    return float(np.corrcoef(x,y)[0,1])


def rankdata(values):
    v=np.asarray(values,dtype=float)
    order=np.argsort(v,kind="stable")
    ranks=np.empty(len(v),dtype=float)
    i=0
    while i<len(v):
        j=i+1
        while j<len(v) and v[order[j]]==v[order[i]]:
            j+=1
        rank=(i+j-1)/2.0
        for k in range(i,j):
            ranks[order[k]]=rank
        i=j
    return ranks


def spearman(x,y):
    return pearson(rankdata(x),rankdata(y))


def state_metrics(predictions,evaluation):
    skills=evaluation["skills"]
    truth={
        row["playerLocalId"]:row["selectionTruthMastery"]
        for row in evaluation["learners"]
    }
    ae=[]
    se=[]
    lp=[]
    ls=[]
    hit=[]
    top3=[]
    flat_p=[]
    flat_t=[]
    for player,preds in predictions.items():
        actual=truth[player]
        p=[float(preds[s]) for s in skills]
        t=[float(actual[s]) for s in skills]
        ae.extend(abs(x-y) for x,y in zip(p,t))
        se.extend((x-y)**2 for x,y in zip(p,t))
        flat_p.extend(p)
        flat_t.extend(t)
        lp.append(pearson(p,t))
        ls.append(spearman(p,t))
        pred_order=sorted(range(len(skills)),key=lambda i:(p[i],skills[i]))
        true_weak=min(range(len(skills)),key=lambda i:(t[i],skills[i]))
        hit.append(1.0 if pred_order[0]==true_weak else 0.0)
        top3.append(1.0 if true_weak in pred_order[:3] else 0.0)
    return {
        "learnerCount":len(predictions),
        "skillCount":len(skills),
        "mae":float(np.mean(ae)),
        "rmse":float(np.sqrt(np.mean(se))),
        "globalPearson":pearson(flat_p,flat_t),
        "meanLearnerPearson":float(np.mean(lp)),
        "meanLearnerSpearman":float(np.mean(ls)),
        "weakestSkillHitRate":float(np.mean(hit)),
        "weakestSkillTop3Rate":float(np.mean(top3)),
    }


def bkt_state(evaluation):
    return {
        row["playerLocalId"]:{
            s:float(row["selectionBktMastery"][s])
            for s in evaluation["skills"]
        }
        for row in evaluation["learners"]
    }


with open(a.manifest,"r",encoding="utf-8") as f:
    manifest=json.load(f)
with open(a.evaluation,"r",encoding="utf-8") as f:
    evaluation=json.load(f)

if manifest["authorization"]!="synthetic-only-no-real-player-data":
    raise RuntimeError("manifest authorization mismatch")
if evaluation["authorization"]!="synthetic-only-no-real-player-data":
    raise RuntimeError("dataset authorization mismatch")
if int(manifest["seed"])!=int(evaluation["seed"]):
    raise RuntimeError("seed mismatch")
if int(evaluation["seed"]) in set(manifest.get("forbiddenSeeds",[])):
    raise RuntimeError("reused forbidden cohort")
if int(evaluation["selectionStep"])!=int(manifest["selectionStep"]):
    raise RuntimeError("selection boundary mismatch")

upstream=subprocess.check_output(
    ["git","-C",str(psi_repo),"rev-parse","HEAD"],text=True
).strip()
if upstream!=manifest["upstream"]["commit"]:
    raise RuntimeError("upstream commit drift")

training=manifest["training"]
log_dir=Path(a.out).resolve().parent/"dkt-logs"
log_dir.mkdir(parents=True,exist_ok=True)
logs=NullLogs(log_dir)
model_args=SimpleNamespace(
    data_dir=str(Path(a.data_dir).resolve()),
    dataset=evaluation["datasetName"],
    kfold=1,
    max_step=int(evaluation["maxStep"]),
    num_learner=0,
    train_mode="ls_split_time",
    train_time_ratio=float(evaluation["trainTimeRatio"]),
    test_time_ratio=1.0-float(evaluation["trainTimeRatio"]),
    val_time_ratio=0.25,
    random_seed=int(evaluation["seed"]),
    device=torch.device("cpu"),
    log_path=str(log_dir),
    emb_size=int(training["embeddingSize"]),
    hidden_size=int(training["hiddenSize"]),
    dropout=float(training["dropout"]),
)

reader=DataReader(model_args,logs)
reader.create_corpus()
alignment=repair_alignment(reader,model_args.max_step)
corpus=reader.load_corpus(model_args)

torch.manual_seed(int(evaluation["seed"]))
np.random.seed(int(evaluation["seed"]))
model=StarBloxDKT(model_args,corpus,logs).to(model_args.device)
optimizer=torch.optim.Adam(
    model.customize_parameters(),
    lr=float(training["learningRate"]),
    weight_decay=float(training["weightDecay"]),
)
train_batches=model.prepare_batches(
    corpus,corpus.data_df["train"],int(training["batchSize"]),"train"
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
            raise RuntimeError(f"non-finite DKT loss at epoch {epoch}")
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(),10.0)
        optimizer.step()
        batch_losses.append(float(loss.detach().cpu()))
    epoch_losses.append(float(np.mean(batch_losses)))

# Extract state for every learner from the exact observed prefix used for training.
user_reverse={int(v):k for k,v in evaluation["userIdMap"].items()}
skill_reverse={int(v):k for k,v in evaluation["skillIdMap"].items()}
predictions={}
model.eval()
with torch.no_grad():
    data=corpus.data_df["train"].reset_index(drop=True)
    for start in range(0,len(data),8):
        batch_data=data.iloc[start:start+8].reset_index(drop=True)
        feed=model.get_feed_dict(corpus,batch_data,0,len(batch_data),"state")
        state=model.selector_state(feed).detach().cpu().numpy()
        users=feed["user_id"].detach().cpu().numpy().reshape(-1)
        for i,user_id in enumerate(users):
            player=user_reverse[int(user_id)]
            predictions[player]={
                skill_reverse[j]:float(state[i,j])
                for j in sorted(skill_reverse)
            }

dkt_metrics=state_metrics(predictions,evaluation)
bkt_metrics=state_metrics(bkt_state(evaluation),evaluation)

# Held-out autoregressive response prediction on the upstream test split.
test_batches=model.prepare_batches(
    corpus,corpus.data_df["test"],int(training["batchSize"]),"test"
)
pred_rows=[]
label_rows=[]
with torch.no_grad():
    for batch in test_batches:
        out=model.predictive_model(batch)
        pred_rows.extend(out["prediction"].detach().cpu().numpy().reshape(-1).tolist())
        label_rows.extend(out["label"].detach().cpu().numpy().reshape(-1).tolist())
pred=np.asarray(pred_rows,dtype=float)
label=np.asarray(label_rows,dtype=int)
heldout={
    "predictionCount":int(pred.size),
    "accuracy":float(np.mean((pred>=0.5)==label)),
    "brier":float(np.mean((pred-label)**2)),
    "auc":float(roc_auc_score(label,pred)) if len(np.unique(label))>1 else None,
}

rule=manifest["candidateRule"]
delta={
    "mae":dkt_metrics["mae"]-bkt_metrics["mae"],
    "globalPearson":dkt_metrics["globalPearson"]-bkt_metrics["globalPearson"],
    "meanLearnerPearson":dkt_metrics["meanLearnerPearson"]-bkt_metrics["meanLearnerPearson"],
    "meanLearnerSpearman":dkt_metrics["meanLearnerSpearman"]-bkt_metrics["meanLearnerSpearman"],
    "weakestSkillHitRate":dkt_metrics["weakestSkillHitRate"]-bkt_metrics["weakestSkillHitRate"],
    "weakestSkillTop3Rate":dkt_metrics["weakestSkillTop3Rate"]-bkt_metrics["weakestSkillTop3Rate"],
}
checks={
    "meanSpearmanGainVsBkt":
        delta["meanLearnerSpearman"]>=float(rule["meanSpearmanGainVsBktMin"]),
    "weakestSkillHitGainVsBkt":
        delta["weakestSkillHitRate"]>=float(rule["weakestSkillHitGainVsBktMin"]),
    "globalPearsonGainVsBkt":
        delta["globalPearson"]>=float(rule["globalPearsonGainVsBktMin"]),
    "maeRegressionVsBkt":
        delta["mae"]<=float(rule["maeRegressionVsBktMax"]),
}
supportive=all(checks.values())

result={
    "schemaVersion":"starblox-dkt-model-development-result-v1",
    "developmentOnly":True,
    "tuneAgainstThisCohort":True,
    "authorization":evaluation["authorization"],
    "benchmarkId":manifest["benchmarkId"],
    "seed":evaluation["seed"],
    "upstream":{"repository":manifest["upstream"]["repository"],"commit":upstream},
    "selectorStateAdapter":"sigmoid(upstream DKT final-step all-skill output vector)",
    "dataAlignmentShim":alignment,
    "training":{
        "epochs":len(epoch_losses),
        "initialLoss":epoch_losses[0],
        "finalLoss":epoch_losses[-1],
        "minLoss":min(epoch_losses),
    },
    "bkt":{"stateMetrics":bkt_metrics},
    "dkt":{
        "stateMetrics":dkt_metrics,
        "heldOutAutoregressive":heldout,
        "vsBkt":delta,
        "checks":checks,
        "supportive":supportive,
    },
    "promotionBoundary":{
        "liveSelectorAllowed":False,
        "note":(
            "Supportive development signal only. Freeze DKT protocol and use a new independent model-validation cohort before any selector experiment."
            if supportive else
            "DKT did not clear the predeclared BKT signal gate; do not build a selector from this result."
        ),
    },
}
out=Path(a.out)
out.parent.mkdir(parents=True,exist_ok=True)
with open(out,"w",encoding="utf-8") as f:
    json.dump(result,f,indent=2,sort_keys=True)
    f.write("\n")
print(json.dumps({
    "benchmarkId":result["benchmarkId"],
    "bkt":bkt_metrics,
    "dkt":dkt_metrics,
    "heldOutAutoregressive":heldout,
    "vsBkt":delta,
    "checks":checks,
    "supportive":supportive,
    "liveSelectorAllowed":False,
},indent=2,sort_keys=True))
