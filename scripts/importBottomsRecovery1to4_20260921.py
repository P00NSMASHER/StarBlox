"""Recover exact existing Workstream-05 Bottoms 1-4 source/candidate bytes into versioned repository paths.
No regeneration, creative edits, catalog mappings, gameplay, or player state changes.
"""
from __future__ import annotations
import copy, hashlib, io, json, os, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
LANE=ROOT/'docs/preproduction/catalog-sprint/lane-05.json'
REPORT=ROOT/'docs/preproduction/catalog-sprint/chat-bottoms-recovery-1-4-result.json'
ORIGINALS=ROOT/'docs/preproduction/catalog-sprint/recovered-originals/bottoms-1-4-20260921'
EXPECTED=['bottoms-1','bottoms-2','bottoms-3','bottoms-4']
BRANCH='screenshot-match-preproduction'
MAX_BYTES=16*1024*1024
Image.MAX_IMAGE_PIXELS=20_000_000

def sha256(b): return hashlib.sha256(b).hexdigest()
def blob(b): return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()

def guard():
    actual=subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()
    if actual!=BRANCH or os.environ.get('GITHUB_REF','refs/heads/'+BRANCH)!='refs/heads/'+BRANCH:
        raise RuntimeError('Only screenshot-match-preproduction may run this intake')

def fetch(url):
    p=urllib.parse.urlparse(url)
    if p.scheme!='https' or p.hostname!='photoshop-api.adobe.io':
        raise ValueError('Only producer-recorded Adobe HTTPS short URLs are allowed')
    req=urllib.request.Request(url,headers={'User-Agent':'StarBlox-Authorized-Asset-Intake/1.0'})
    with urllib.request.urlopen(req,timeout=60) as resp:
        if urllib.parse.urlparse(resp.url).scheme!='https':
            raise ValueError('Non-HTTPS redirect rejected')
        data=resp.read(MAX_BYTES+1)
    if not data or len(data)>MAX_BYTES: raise ValueError('Empty or oversized response')
    return data

def info(data, expected_dim):
    with Image.open(io.BytesIO(data)) as im:
        fmt=im.format; size=im.size; im.verify()
    if fmt!='PNG' or list(size)!=expected_dim:
        raise ValueError(f'Unexpected image {fmt} {size}, expected PNG {expected_dim}')
    with Image.open(io.BytesIO(data)) as im:
        im.load(); ex=im.getextrema(); bands=ex if isinstance(ex[0],tuple) else [ex]
        if all(lo==hi for lo,hi in bands): raise ValueError('Blank constant-color image rejected')
    return {'format':fmt,'dimensions':list(size),'bytes':len(data),'sha256':sha256(data),'gitBlobSha':blob(data)}

def store():
    code="import {store} from './src/gameModel.js'; console.log(JSON.stringify(store));"
    items=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT,text=True))
    if len(items)!=192 or len({i['id'] for i in items})!=192: raise ValueError('Store invariant failed')
    return {i['id']:i for i in items}

def all_objects(v,out=None):
    if out is None: out=[]
    if isinstance(v,list):
        for x in v: all_objects(x,out)
    elif isinstance(v,dict):
        out.append(v)
        for x in v.values(): all_objects(x,out)
    return out

def immutable_write(path,data):
    path=path.resolve()
    if ROOT not in path.parents or path.is_symlink(): raise ValueError('Unsafe output path')
    if path.exists():
        if path.read_bytes()!=data: raise ValueError('Conflicting existing bytes: '+str(path.relative_to(ROOT)))
        return
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_name(path.name+'.intake-tmp'); tmp.write_bytes(data); tmp.replace(path)
    if path.read_bytes()!=data: raise ValueError('Readback mismatch')

def main():
    guard()
    lane=json.loads(LANE.read_text())
    source=[o for o in all_objects(lane) if (o.get('id') or o.get('itemId')) in EXPECTED and o.get('repositoryStatus')=='GENERATED_REMOTE_UPLOAD_BLOCKED']
    by={o.get('id') or o.get('itemId'):o for o in source}
    if sorted(by)!=EXPECTED: raise ValueError('Expected exact Bottoms 1-4 upload-blocked batch not found')
    meta=store()
    if REPORT.exists() and all(by[i].get('repositoryStatus')=='STAGED_READBACK_PASS' for i in EXPECTED):
        rep=json.loads(REPORT.read_text())
        print('Bottoms 1-4 already staged; report exists, no redownload')
        return

    prepared=[]
    for id in EXPECTED:
        o=by[id]; real=meta[id]
        for key in ['name','tier','theme','price','starReq']:
            if o[key]!=real[key]: raise ValueError(f'{id}: {key} drift')
        cand=ROOT/o['intendedRepositoryPath']
        if cand.suffix.lower()!='.png': raise ValueError('Expected .png candidate destination')
        src=fetch(o['sourceUrl']); srcinfo=info(src,o['sourceDimensions'])
        candidate=fetch(o['candidateUrl']); cinfo=info(candidate,o['candidateDimensions'])
        original=ORIGINALS/f"{id}-{o['sourceGenerationRequestId']}.png"
        prepared.append((id,o,real,src,srcinfo,candidate,cinfo,original,cand))

    if len({x[6]['sha256'] for x in prepared})!=4: raise ValueError('Duplicate candidate content')
    for _,_,_,src,_,candidate,_,original,cand in prepared:
        immutable_write(original,src); immutable_write(cand,candidate)

    results=[]
    for id,o,real,src,srcinfo,candidate,cinfo,original,cand in prepared:
        rel=str(cand.relative_to(ROOT)); asset='/'+str(cand.relative_to(ROOT/'public'))
        o.update({'repositoryPath':rel,'assetPath':asset,'gitBlobSha':cinfo['gitBlobSha'],'sha256':cinfo['sha256'],
                  'bytes':cinfo['bytes'],'dimensions':cinfo['dimensions'],'repositoryStatus':'STAGED_READBACK_PASS',
                  'status':'READY_FOR_REVIEW_01','readback':'PASS',
                  'transformation':'Exact producer-recorded 768x768 PNG candidate bytes; no new generation or creative edit'})
        item={k:real[k] for k in ['id','name','collectionId','collectionName','type','tier','theme','price','starReq']}
        item.update(cinfo)
        item.update({'producer':'05','transportHelper':'CHAT','independentReviewer':'01','repositoryPath':rel,'assetPath':asset,
                     'sourceGenerationRequestId':o['sourceGenerationRequestId'],'candidateResizeRequestId':o['candidateResizeRequestId'],
                     'status':'READY_FOR_REVIEW_01','readback':'PASS',
                     'original':{**srcinfo,'repositoryPath':str(original.relative_to(ROOT))}})
        results.append(item)
        print(id,cinfo['dimensions'],cinfo['bytes'],cinfo['gitBlobSha'])

    prior=copy.deepcopy(lane.get('staging',{}))
    if prior: lane.setdefault('stagingHistory',[]).append(prior)
    lane['status']='BOTTOMS_1_4_STAGED_READY_FOR_REVIEW_01__WALL_1_12_AWAIT_14'
    lane['staging']={'status':'PASS_BOTTOMS_1_4_EXACT_BYTES_STAGED','method':'Authorized GitHub Actions from producer-recorded Adobe URLs',
                     'exactByteReadback':'PASS_8_FILES_SOURCE_PLUS_CANDIDATE','metadata':'PASS_4_OF_4_AGAINST_CURRENT_GAME_MODEL',
                     'duplicateCandidateContent':0,'independentVisualReview':'PENDING_01','canonicalIntegration':'PENDING_08_AFTER_ACCEPT'}
    LANE.write_text(json.dumps(lane,indent=2)+'\n')

    report={'schemaVersion':1,'batchId':'chat-bottoms-recovery-1-4-20260921','status':'STAGED_READY_FOR_INDEPENDENT_REVIEW_01',
            'sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
            'workflowRunId':os.environ.get('GITHUB_RUN_ID'),'producer':'05','transportHelper':'CHAT','independentReviewer':'01','canonicalWriter':'08',
            'newGenerations':0,'storedCandidateCount':4,'storedOriginalCount':4,'duplicateCandidateContent':0,
            'metadataSource':'src/gameModel.js store export','items':results,
            'checks':{'metadata':'PASS_4_OF_4','exactByteReadback':'PASS_8_OF_8','candidateDecode':'PASS_4_OF_4',
                      'repeatBehavior':'PENDING_SECOND_RUN','independentVisualReview':'PENDING_01'},
            'freeze':{'replitTouched':False,'flootTouched':False,'mainTouched':False,'canonicalMappingsTouched':False,'gameplayChanged':False,'playerDataTouched':False},
            'handoff':'01: independently inspect exact Bottoms 1-4 hashes at card/detail scale. 08: integrate only after qualified ACCEPT. 05: preserve exact versions pending review.'}
    REPORT.write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':
    try: main()
    except Exception as e:
        print('Bottoms 1-4 intake FAILED: '+str(e),file=sys.stderr); raise
