from __future__ import annotations
import hashlib,io,json,os,subprocess,sys,urllib.parse,urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
REQ=ROOT/'docs/preproduction/catalog-sprint/chat-rugs-recovery-5-8-20260921.json'
REPORT=ROOT/'docs/preproduction/catalog-sprint/chat-rugs-recovery-5-8-result.json'
ORIG=ROOT/'docs/preproduction/catalog-sprint/recovered-originals/rugs-5-8-20260921'
EXPECTED=['rugs-5','rugs-6','rugs-7','rugs-8']; BRANCH='screenshot-match-preproduction'; MAX=12*1024*1024
def sha(b): return hashlib.sha256(b).hexdigest()
def blob(b): return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def fetch(url):
 p=urllib.parse.urlparse(url)
 if p.scheme!='https' or p.hostname!='at.adobe.com': raise ValueError('Only resolved Adobe HTTPS URLs allowed')
 req=urllib.request.Request(url,headers={'User-Agent':'StarBlox-Asset-Intake/1.0'})
 with urllib.request.urlopen(req,timeout=60) as r: data=r.read(MAX+1)
 if not data or len(data)>MAX: raise ValueError('empty/oversized')
 return data
def imageinfo(data):
 with Image.open(io.BytesIO(data)) as im: fmt=im.format; size=im.size; im.verify()
 if fmt not in {'JPEG','PNG','WEBP'} or size[0]!=size[1] or not 512<=size[0]<=4096: raise ValueError(f'bad image {fmt} {size}')
 with Image.open(io.BytesIO(data)) as im:
  im.load(); ex=im.getextrema(); bands=ex if isinstance(ex[0],tuple) else [ex]
  if all(a==b for a,b in bands): raise ValueError('blank image')
 return {'format':fmt,'dimensions':list(size),'bytes':len(data),'sha256':sha(data),'gitBlobSha':blob(data)}
def store():
 code="import {store} from './src/gameModel.js'; console.log(JSON.stringify(store));"
 items=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT,text=True))
 if len(items)!=192 or len({x['id'] for x in items})!=192: raise ValueError('Store invariant failed')
 return {x['id']:x for x in items}
def write(path,data):
 path.parent.mkdir(parents=True,exist_ok=True)
 if path.exists():
  if path.read_bytes()!=data: raise ValueError('conflicting '+str(path))
  return
 path.write_bytes(data)
 if path.read_bytes()!=data: raise ValueError('readback')
def main():
 if subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()!=BRANCH: raise RuntimeError('wrong branch')
 req=json.loads(REQ.read_text()); meta=store()
 if [x['id'] for x in req['items']]!=EXPECTED: raise ValueError('wrong ids')
 if REPORT.exists():
  print('Rugs 5-8 already staged; no duplicate recovery'); return
 rows=[]
 for x in req['items']:
  real=meta[x['id']]
  for k in ['name','collectionId','type','tier','theme','price','starReq']:
   if x[k]!=real[k]: raise ValueError(f"{x['id']} {k} drift")
  cand=fetch(x['renditionUrl']); ci=imageinfo(cand)
  if ci['format']!='JPEG': raise ValueError('rendition must be JPEG')
  src=fetch(x['sourceUrl'])
  try:
   si=imageinfo(src); ext={'PNG':'.png','JPEG':'.jpg','WEBP':'.webp'}[si['format']]
  except Exception:
   if not src.startswith(b'PK\x03\x04'): raise
   si={'format':'PRESERVED_GENERATION_CONTAINER','bytes':len(src),'sha256':sha(src),'gitBlobSha':blob(src)}
   ext='.ffgenimg'
  cp=ROOT/x['candidateRepositoryPath']; op=ORIG/(x['id']+'-'+x['assetId'].rsplit(':',1)[-1]+ext)
  write(cp,cand); write(op,src)
  row={k:real[k] for k in ['id','name','collectionId','collectionName','type','tier','theme','price','starReq']}
  row.update(ci); row.update({'producer':'07','transportHelper':'CHAT','independentReviewer':'14','repositoryPath':str(cp.relative_to(ROOT)),'assetPath':'/'+str(cp.relative_to(ROOT/'public')),'assetId':x['assetId'],'status':'READY_FOR_REVIEW_14','readback':'PASS','original':{**si,'repositoryPath':str(op.relative_to(ROOT))}})
  rows.append(row); print(row['id'],row['dimensions'],row['gitBlobSha'])
 if len({r['sha256'] for r in rows})!=4: raise ValueError('duplicate content')
 REPORT.write_text(json.dumps({'schemaVersion':1,'batchId':req['batchId'],'status':'STAGED_READY_FOR_INDEPENDENT_REVIEW_14','sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'workflowRunId':os.environ.get('GITHUB_RUN_ID'),'producer':'07','transportHelper':'CHAT','independentReviewer':'14','canonicalWriter':'08','newGenerations':0,'storedCandidateCount':4,'storedOriginalCount':4,'duplicateCandidateContent':0,'items':rows,'checks':{'metadata':'PASS_4_OF_4','exactByteReadback':'PASS_8_OF_8','candidateDecode':'PASS_4_OF_4','independentVisualReview':'PENDING_14'},'freeze':{'replitTouched':False,'flootTouched':False,'mainTouched':False,'canonicalMappingsTouched':False,'gameplayChanged':False,'playerDataTouched':False}},indent=2)+'\n')
if __name__=='__main__':
 try: main()
 except Exception as e:
  print('Rugs 5-8 recovery FAILED: '+str(e),file=sys.stderr); raise
