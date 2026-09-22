from __future__ import annotations
import hashlib,io,json,os,subprocess,sys,urllib.parse,urllib.request
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
BRANCH='screenshot-match-preproduction'
MAX=16*1024*1024
REQUEST=ROOT/os.environ.get('STAR_BLOX_RECOVERY_REQUEST','docs/preproduction/catalog-sprint/chat-catalog-recovery-desks5-6-rug9-20260921.json')
REPORT=ROOT/os.environ.get('STAR_BLOX_RECOVERY_REPORT','docs/preproduction/catalog-sprint/chat-catalog-recovery-desks5-6-rug9-result.json')

def sha(b): return hashlib.sha256(b).hexdigest()
def blob(b): return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()

def fetch(url):
    p=urllib.parse.urlparse(url)
    if p.scheme!='https' or p.hostname!='at.adobe.com':
        raise ValueError('Only resolved Adobe HTTPS URLs are allowed')
    req=urllib.request.Request(url,headers={'User-Agent':'StarBlox-Asset-Intake/1.0'})
    with urllib.request.urlopen(req,timeout=60) as r:
        data=r.read(MAX+1)
    if not data or len(data)>MAX:
        raise ValueError('empty/oversized response')
    return data

def imageinfo(data):
    with Image.open(io.BytesIO(data)) as im:
        fmt=im.format; size=im.size; im.verify()
    if fmt not in {'JPEG','PNG','WEBP'} or size[0]!=size[1] or not 512<=size[0]<=4096:
        raise ValueError(f'unsupported image {fmt} {size}')
    with Image.open(io.BytesIO(data)) as im:
        im.load()
        ex=im.getextrema()
        bands=ex if isinstance(ex[0],tuple) else [ex]
        if all(a==b for a,b in bands):
            raise ValueError('blank constant-color image rejected')
    return {'format':fmt,'dimensions':list(size),'bytes':len(data),'sha256':sha(data),'gitBlobSha':blob(data)}

def store():
    code="import {store} from './src/gameModel.js'; console.log(JSON.stringify(store));"
    items=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT,text=True))
    if len(items)!=192 or len({x['id'] for x in items})!=192:
        raise ValueError('Store invariant failed')
    return {x['id']:x for x in items}

def write(path,data):
    path=path.resolve()
    if ROOT not in path.parents or path.is_symlink():
        raise ValueError('unsafe output path')
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():
        if path.read_bytes()!=data:
            raise ValueError('conflicting existing output: '+str(path.relative_to(ROOT)))
        return
    path.write_bytes(data)
    if path.read_bytes()!=data:
        raise ValueError('byte readback mismatch')

def main():
    if subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()!=BRANCH:
        raise RuntimeError('wrong branch')
    req=json.loads(REQUEST.read_text())
    items=req.get('items') or []
    if not items:
        raise ValueError('empty recovery request')
    if len({x['id'] for x in items})!=len(items):
        raise ValueError('duplicate request IDs')
    metadata=store()

    if REPORT.exists():
        existing=json.loads(REPORT.read_text())
        print(f"Existing report found with {len(existing.get('items',[]))} items; refusing duplicate recovery")
        return

    original_dir=ROOT/'docs/preproduction/catalog-sprint/recovered-originals'/req['batchId']
    rows=[]
    for x in items:
        real=metadata[x['id']]
        candidate=fetch(x['renditionUrl'])
        ci=imageinfo(candidate)
        cp=ROOT/x['candidateRepositoryPath']
        if cp.suffix.lower() in {'.jpg','.jpeg'} and ci['format']!='JPEG':
            raise ValueError(f"{x['id']}: .jpg destination but rendition is {ci['format']}")
        if cp.suffix.lower()=='.png' and ci['format']!='PNG':
            raise ValueError(f"{x['id']}: .png destination but rendition is {ci['format']}")
        source=fetch(x['sourceUrl'])
        try:
            si=imageinfo(source)
            ext={'PNG':'.png','JPEG':'.jpg','WEBP':'.webp'}[si['format']]
        except Exception:
            if not source.startswith(b'PK\x03\x04'):
                raise
            si={'format':'PRESERVED_GENERATION_CONTAINER','bytes':len(source),'sha256':sha(source),'gitBlobSha':blob(source)}
            ext='.ffgenimg'
        op=original_dir/(x['id']+'-'+x['assetId'].rsplit(':',1)[-1]+ext)
        write(cp,candidate); write(op,source)
        row={k:real[k] for k in ['id','name','collectionId','collectionName','type','tier','theme','price','starReq']}
        row.update(ci)
        row.update({
            'producer':x['producer'],
            'transportHelper':'CHAT',
            'independentReviewer':x['independentReviewer'],
            'repositoryPath':str(cp.relative_to(ROOT)),
            'assetPath':'/'+str(cp.relative_to(ROOT/'public')),
            'assetId':x['assetId'],
            'status':f"READY_FOR_REVIEW_{x['independentReviewer']}",
            'readback':'PASS',
            'original':{**si,'repositoryPath':str(op.relative_to(ROOT))}
        })
        rows.append(row)
        print(row['id'],row['dimensions'],row['gitBlobSha'])
    if len({r['sha256'] for r in rows})!=len(rows):
        raise ValueError('duplicate candidate content')
    report={
        'schemaVersion':1,
        'batchId':req['batchId'],
        'status':'STAGED_READY_FOR_INDEPENDENT_REVIEW',
        'sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),
        'workflowRunId':os.environ.get('GITHUB_RUN_ID'),
        'transportHelper':'CHAT',
        'canonicalWriter':'08',
        'newGenerations':0,
        'storedCandidateCount':len(rows),
        'storedOriginalCount':len(rows),
        'duplicateCandidateContent':0,
        'items':rows,
        'checks':{
            'metadata':f"PASS_{len(rows)}_OF_{len(rows)}_FROM_CURRENT_GAME_MODEL",
            'exactByteReadback':f"PASS_{len(rows)*2}_OF_{len(rows)*2}",
            'candidateDecode':f"PASS_{len(rows)}_OF_{len(rows)}",
            'independentVisualReview':'PENDING_ASSIGNED_REVIEWERS'
        },
        'freeze':{
            'replitTouched':False,'flootTouched':False,'mainTouched':False,
            'canonicalMappingsTouched':False,'gameplayChanged':False,'playerDataTouched':False
        }
    }
    REPORT.write_text(json.dumps(report,indent=2)+'\n')

if __name__=='__main__':
    try: main()
    except Exception as e:
        print('Catalog recovery FAILED: '+str(e),file=sys.stderr)
        raise
