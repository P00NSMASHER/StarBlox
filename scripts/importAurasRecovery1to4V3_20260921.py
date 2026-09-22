"""Recover exact existing Workstream-11 Aura 1-4 v3 source/candidate bytes into versioned repository paths.
No regeneration, creative edits, canonical mapping changes, gameplay changes, or player-state changes.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import urllib.parse
import urllib.request

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
LANE = ROOT / 'docs/preproduction/catalog-sprint/lane-11.json'
REPORT = ROOT / 'docs/preproduction/catalog-sprint/chat-auras-recovery-1-4-v3-result.json'
ORIGINALS = ROOT / 'docs/preproduction/catalog-sprint/recovered-originals/auras-1-4-v3-20260921'
EXPECTED_IDS = ['auras-1','auras-2','auras-3','auras-4']
BRANCH = 'screenshot-match-preproduction'
MAX_BYTES = 16 * 1024 * 1024
Image.MAX_IMAGE_PIXELS = 20_000_000


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def current_head() -> str:
    return subprocess.check_output(['git','rev-parse','HEAD'], cwd=ROOT, text=True).strip()


def guard_branch() -> None:
    actual = subprocess.check_output(['git','branch','--show-current'], cwd=ROOT, text=True).strip()
    expected_ref='refs/heads/' + BRANCH
    if actual != BRANCH or os.environ.get('GITHUB_REF', expected_ref) != expected_ref:
        raise RuntimeError('Only screenshot-match-preproduction may run this intake')


def fetch_exact(url: str) -> bytes:
    parsed=urllib.parse.urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname != 'photoshop-api.adobe.io':
        raise ValueError('Only producer-recorded Adobe Photoshop HTTPS short URLs are allowed')
    req=urllib.request.Request(url,headers={'User-Agent':'StarBlox-Authorized-Asset-Intake/1.0'})
    with urllib.request.urlopen(req, timeout=60) as response:
        if urllib.parse.urlparse(response.url).scheme != 'https':
            raise ValueError('Non-HTTPS redirect rejected')
        data=response.read(MAX_BYTES+1)
    if not data or len(data)>MAX_BYTES:
        raise ValueError('Empty or oversized Adobe response')
    return data


def image_info(data: bytes) -> dict:
    with Image.open(io.BytesIO(data)) as image:
        fmt=image.format
        width,height=image.size
        image.verify()
    if fmt not in {'PNG','JPEG','WEBP'} or width != height or not 512 <= width <= 4096:
        raise ValueError(f'Unsupported/non-square image {fmt} {width}x{height}')
    with Image.open(io.BytesIO(data)) as image:
        image.load()
        extrema=image.getextrema()
        bands=extrema if isinstance(extrema[0],tuple) else [extrema]
        if all(lo==hi for lo,hi in bands):
            raise ValueError('Blank constant-color image rejected')
    return {'format':fmt,'dimensions':[width,height],'bytes':len(data),'sha256':sha256(data),'gitBlobSha':git_blob_sha(data)}


def store_metadata() -> dict:
    code="import {store} from './src/gameModel.js'; console.log(JSON.stringify(store));"
    items=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT,text=True))
    if len(items)!=192 or len({x['id'] for x in items})!=192:
        raise ValueError('Authoritative Store no longer has 192 unique IDs')
    return {x['id']:x for x in items}


def immutable_write(path: Path, data: bytes) -> None:
    resolved=path.resolve()
    if ROOT not in resolved.parents or resolved.is_symlink():
        raise ValueError('Unsafe output path')
    if path.exists():
        if path.read_bytes()!=data:
            raise ValueError('Conflicting existing bytes: '+str(path.relative_to(ROOT)))
        return
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_name(path.name+'.intake-tmp')
    tmp.write_bytes(data)
    tmp.replace(path)
    if path.read_bytes()!=data:
        raise ValueError('Byte readback mismatch')


def verify_stored(lane: dict, report: dict, metadata: dict) -> None:
    assets={x['id']:x for x in lane['secondRepairBatch']['assets']}
    if [x['id'] for x in report.get('items',[])] != EXPECTED_IDS:
        raise ValueError('Stored report IDs mismatch')
    hashes=set()
    for item in report['items']:
        real=metadata[item['id']]
        for key in ['name','collectionId','collectionName','type','tier','theme','price','starReq']:
            if item[key] != real[key]:
                raise ValueError(f"{item['id']}: report metadata drift {key}")
        p=ROOT / item['repositoryPath']
        info=image_info(p.read_bytes())
        if info['sha256']!=item['sha256'] or info['gitBlobSha']!=item['gitBlobSha']:
            raise ValueError(f"{item['id']}: candidate hash mismatch")
        source=ROOT / item['original']['repositoryPath']
        source_bytes=source.read_bytes()
        if sha256(source_bytes)!=item['original']['sha256'] or git_blob_sha(source_bytes)!=item['original']['gitBlobSha']:
            raise ValueError(f"{item['id']}: source hash mismatch")
        a=assets[item['id']]
        if a.get('repositoryPath')!=item['repositoryPath'] or a.get('gitBlobSha')!=item['gitBlobSha']:
            raise ValueError(f"{item['id']}: lane/report handoff mismatch")
        hashes.add(item['sha256'])
    if len(hashes)!=4:
        raise ValueError('Duplicate candidate content across Auras 1-4')


def main() -> None:
    guard_branch()
    lane=json.loads(LANE.read_text())
    batch=lane.get('secondRepairBatch',{})
    assets=batch.get('assets',[])
    if [x.get('id') for x in assets] != EXPECTED_IDS:
        raise ValueError('Lane-11 second repair batch no longer matches Auras 1-4')
    metadata=store_metadata()

    if REPORT.exists() and batch.get('status')=='STAGED_READY_FOR_REVIEW_05':
        report=json.loads(REPORT.read_text())
        verify_stored(lane,report,metadata)
        print('Auras 1-4 v3 already staged; exact bytes and hashes reverified without redownload')
        return

    prepared=[]
    for asset in assets:
        real=metadata[asset['id']]
        for key in ['name','tier','theme']:
            if asset.get(key)!=real[key]:
                raise ValueError(f"{asset['id']}: lane {key} disagrees with authoritative Store")
        candidate_path=ROOT / f"public/assets/catalog/{asset['id']}-w11-v3.png"
        candidate=fetch_exact(asset['candidateOutputUrl'])
        cinfo=image_info(candidate)
        if cinfo['format']!='PNG' or cinfo['dimensions'] != [768,768]:
            raise ValueError(f"{asset['id']}: expected exact 768x768 PNG candidate")
        source=fetch_exact(asset['sourceOutputUrl'])
        sinfo=image_info(source)
        if sinfo['format']!='PNG' or sinfo['dimensions'] != [1024,1024]:
            raise ValueError(f"{asset['id']}: expected exact 1024x1024 PNG source")
        source_path=ORIGINALS / (asset['id'] + '-' + asset['sourceAssetId'].rsplit(':',1)[-1] + '.png')
        prepared.append((asset,real,candidate_path,candidate,cinfo,source_path,source,sinfo))

    if len({x[4]['sha256'] for x in prepared})!=4:
        raise ValueError('Duplicate candidate content across Auras 1-4')

    for _,_,cp,c,_,sp,s,_ in prepared:
        immutable_write(cp,c)
        immutable_write(sp,s)

    results=[]
    for asset,real,cp,c,cinfo,sp,s,sinfo in prepared:
        rel=str(cp.relative_to(ROOT))
        public_path='/' + str(cp.relative_to(ROOT/'public'))
        asset.update({
            'repositoryStatus':'STAGED_READBACK_PASS',
            'repositoryPath':rel,
            'assetPath':public_path,
            'gitBlobSha':cinfo['gitBlobSha'],
            'sha256':cinfo['sha256'],
            'candidateBytes':cinfo['bytes'],
            'candidateDimensions':cinfo['dimensions'],
            'status':'READY_FOR_REVIEW_05',
            'readback':'PASS',
            'transformation':'None: exact producer-recorded 768x768 PNG candidate bytes copied; no regeneration or creative edit',
        })
        item={key:real[key] for key in ['id','name','collectionId','collectionName','type','tier','theme','price','starReq']}
        item.update(cinfo)
        item.update({
            'producer':'11','transportHelper':'CHAT','independentReviewer':'05',
            'repositoryPath':rel,'assetPath':public_path,
            'sourceGenerationRequestId':asset['sourceGenerationRequestId'],
            'sourceAssetId':asset['sourceAssetId'],
            'status':'READY_FOR_REVIEW_05','readback':'PASS',
            'transformation':asset['transformation'],
            'original':{**sinfo,'repositoryPath':str(sp.relative_to(ROOT))}
        })
        results.append(item)
        print(f"{item['id']}: PNG {cinfo['dimensions']} {cinfo['bytes']} bytes; {cinfo['gitBlobSha']}")

    batch['status']='STAGED_READY_FOR_REVIEW_05'
    batch['repositoryStoredCount']=4
    batch['transportBlocker']='CLEARED_BY_COORDINATION_OWNED_EXACT_BYTE_RECOVERY'
    batch['checks']['repositoryWrite']='PASS_4_OF_4'
    batch['checks']['repositoryHashReadback']='PASS_8_FILES_SOURCE_PLUS_CANDIDATE'
    batch['checks']['independentReview']='PENDING_05_EXACT_HASH'
    for state in lane.get('currentAuraState',[]):
        if state.get('id') in EXPECTED_IDS:
            state['status']='V3_STAGED_READY_FOR_REVIEW_05'
            state['hash']=next(x['gitBlobSha'] for x in assets if x['id']==state['id'])
    lane['status']='AURAS_6_8_ACCEPTED_AND_CANONICAL__AURAS_1_4_V3_STAGED_READY_FOR_REVIEW__AURAS_5_9_12_REWORK'
    lane['handoff']['05']='Auras 1-4 v3 are now repository-staged with exact current hashes; independently review these exact rendered candidates. Preserve Auras 6/7/8 ACCEPTs.'
    lane['handoff']['15']='Aura 1-4 v3 transport blocker cleared. No regeneration needed; reviewer 05 owns next decision.'
    lane['handoff']['08']='Auras 6/7/8 remain canonical. Auras 1-4 v3 are staged but not integration-eligible until reviewer 05 exact-hash ACCEPT.'

    report={
        'schemaVersion':1,'batchId':'chat-auras-recovery-1-4-v3-20260921',
        'status':'STAGED_READY_FOR_INDEPENDENT_REVIEW_05','sourceHead':current_head(),
        'workflowRunId':os.environ.get('GITHUB_RUN_ID'),'producer':'11','transportHelper':'CHAT',
        'independentReviewer':'05','canonicalWriter':'08','newGenerations':0,
        'storedCandidateCount':4,'storedOriginalCount':4,'duplicateCandidateContent':0,
        'metadataSource':'src/gameModel.js store export','items':results,
        'checks':{'metadata':'PASS_4_OF_4','exactByteReadback':'PASS_8_FILES_SOURCE_PLUS_CANDIDATE','candidateDecode':'PASS_4_OF_4','repeatBehavior':'PENDING_SECOND_RUN','independentVisualReview':'PENDING_05'},
        'freeze':{'replitTouched':False,'flootTouched':False,'mainTouched':False,'canonicalMappingsTouched':False,'gameplayChanged':False,'playerDataTouched':False,'liveAuraLogicTouched':False},
        'handoff':'05: independently inspect exact Aura 1-4 v3 hashes. 08: integrate only after qualified ACCEPT. 11: preserve exact versions pending review.'
    }
    LANE.write_text(json.dumps(lane,indent=2)+'\n')
    REPORT.write_text(json.dumps(report,indent=2)+'\n')
    verify_stored(lane,report,metadata)


if __name__=='__main__':
    try:
        main()
    except Exception as error:
        print('Aura 1-4 v3 intake FAILED: '+str(error),file=sys.stderr)
        raise
