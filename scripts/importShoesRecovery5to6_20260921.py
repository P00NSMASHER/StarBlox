"""Exact-byte intake for Workstream 04 Shoes 5-6. No image edits or canonical/gameplay changes."""
from __future__ import annotations
import hashlib, io, json, os, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
REQUEST=ROOT/'docs/preproduction/catalog-sprint/chat-shoes-recovery-5-6-20260921.json'
REPORT=ROOT/'docs/preproduction/catalog-sprint/chat-shoes-recovery-5-6-result.json'
ORIGINALS=ROOT/'docs/preproduction/catalog-sprint/recovered-originals/shoes-5-6-20260921'
EXPECTED=['shoes-5','shoes-6']; BRANCH='screenshot-match-preproduction'; MAX=12*1024*1024
Image.MAX_IMAGE_PIXELS=20_000_000

def sha(b): return hashlib.sha256(b).hexdigest()
def blob(b): return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def head(): return subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
def guard():
    if subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()!=BRANCH or os.environ.get('GITHUB_REF','refs/heads/'+BRANCH)!='refs/heads/'+BRANCH: raise RuntimeError('authorized preproduction branch only')
def fetch(url):
    p=urllib.parse.urlparse(url)
    if p.scheme!='https' or p.hostname!='at.adobe.com': raise ValueError('Adobe HTTPS URL required')
    with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'StarBlox-Authorized-Asset-Intake/1.0'}),timeout=45) as r: data=r.read(MAX+1)
    if not data or len(data)>MAX: raise ValueError('empty/oversized asset')
    return data
def info(data):
    with Image.open(io.BytesIO(data)) as im: fmt=im.format; w,h=im.size; im.verify()
    if fmt not in {'PNG','JPEG','WEBP'} or w!=h or not 512<=w<=4096: raise ValueError(f'bad image {fmt} {w}x{h}')
    return {'format':fmt,'dimensions':[w,h],'bytes':len(data),'sha256':sha(data),'gitBlobSha':blob(data)}
def store():
    code="import {store} from './src/gameModel.js'; console.log(JSON.stringify(store));"
    xs=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT,text=True))
    if len(xs)!=192 or len({x['id'] for x in xs})!=192: raise ValueError('Store invariant failed')
    return {x['id']:x for x in xs}
def write(path,data):
    path=path.resolve()
    if ROOT not in path.parents or path.is_symlink(): raise ValueError('unsafe path')
    if path.exists():
        if path.read_bytes()!=data: raise ValueError('conflicting existing file '+str(path.relative_to(ROOT)))
        return
    path.parent.mkdir(parents=True,exist_ok=True); tmp=path.with_name(path.name+'.tmp'); tmp.write_bytes(data); tmp.replace(path)
    if path.read_bytes()!=data: raise ValueError('readback mismatch')
def verify(report,meta):
    if [x['id'] for x in report['items']]!=EXPECTED: raise ValueError('id mismatch')
    hs=set()
    for x in report['items']:
        for k in ['name','collectionId','type','tier','theme','price','starReq']:
            if x[k]!=meta[x['id']][k]: raise ValueError(f"{x['id']} metadata drift {k}")
        for r in [x,x['original']]:
            b=(ROOT/r['repositoryPath']).read_bytes()
            if sha(b)!=r['sha256'] or blob(b)!=r['gitBlobSha']: raise ValueError('hash mismatch')
        info((ROOT/x['repositoryPath']).read_bytes()); hs.add(x['sha256'])
    if len(hs)!=2: raise ValueError('duplicate candidate bytes')
def main():
    guard(); req=json.loads(REQUEST.read_text()); meta=store()
    if [x['id'] for x in req['items']]!=EXPECTED: raise ValueError('request ids')
    if REPORT.exists(): verify(json.loads(REPORT.read_text()),meta); print('2/2 stored pairs reverified'); return
    pre=[]
    for x in req['items']:
        real=meta[x['id']]
        for k in ['name','collectionId','type','tier','theme','price','starReq']:
            if x[k]!=real[k]: raise ValueError(f"{x['id']} request mismatch {k}")
        cp=ROOT/x['candidateRepositoryPath']; expected=ROOT/f"public/assets/catalog/{x['id']}-w04-v2.jpg"
        if cp!=expected: raise ValueError('unexpected destination')
        rend=fetch(x['renditionUrl']); ri=info(rend)
        if ri['format']!='JPEG': raise ValueError('rendition not JPEG')
        src=fetch(x['sourceUrl']); si=info(src)
        ext={'PNG':'.png','JPEG':'.jpg','WEBP':'.webp'}[si['format']]
        op=ORIGINALS/(x['id']+'-'+x['assetId'].rsplit(':',1)[-1]+ext)
        pre.append((x,rend,ri,src,si,cp,op))
    if len({p[2]['sha256'] for p in pre})!=2: raise ValueError('duplicate candidate bytes')
    out=[]
    for x,rend,ri,src,si,cp,op in pre:
        write(cp,rend); write(op,src); real=meta[x['id']]
        row={k:real[k] for k in ['id','name','collectionId','collectionName','type','tier','theme','price','starReq']}; row.update(ri)
        row.update({'producer':'04','independentReviewer':'02','assetId':x['assetId'],'repositoryPath':str(cp.relative_to(ROOT)),'assetPath':'/'+str(cp.relative_to(ROOT/'public')),'status':'READY_FOR_REVIEW','readback':'PASS','producerPixelInspection':x['producerPixelInspection'],'transformation':'None: exact Adobe rendition bytes copied','original':{**si,'repositoryPath':str(op.relative_to(ROOT))}}); out.append(row)
    report={'schemaVersion':1,'batchId':req['batchId'],'status':'STAGED_READY_FOR_INDEPENDENT_REVIEW','sourceHead':head(),'workflowRunId':os.environ.get('GITHUB_RUN_ID'),'producer':'04','independentReviewer':'02','canonicalWriter':'08','newGenerations':2,'storedCandidateCount':2,'storedOriginalCount':2,'items':out,'checks':{'metadata':'PASS_2_OF_2','exactByteReadback':'PASS_4_OF_4','candidateDecode':'PASS_2_OF_2','independentVisualReview':'PENDING_02'},'freeze':{'replitTouched':False,'flootTouched':False,'mainTouched':False,'canonicalMappingsTouched':False,'gameplayChanged':False}}
    REPORT.write_text(json.dumps(report,indent=2)+'\n'); verify(report,meta)
if __name__=='__main__':
    try: main()
    except Exception as e: print('Shoes 5-6 intake FAILED: '+str(e),file=sys.stderr); raise
