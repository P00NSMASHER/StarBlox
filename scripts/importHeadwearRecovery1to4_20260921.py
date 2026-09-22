from __future__ import annotations
import copy,hashlib,io,json,os,subprocess,sys,urllib.parse,urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
LANE=ROOT/'docs/preproduction/catalog-sprint/lane-12.json'
REPORT=ROOT/'docs/preproduction/catalog-sprint/chat-headwear-recovery-1-4-result.json'
ORIG=ROOT/'docs/preproduction/catalog-sprint/recovered-originals/headwear-1-4-20260921'
EXPECTED=['headwear-1','headwear-2','headwear-3','headwear-4']; BRANCH='screenshot-match-preproduction'; MAX=16*1024*1024
def sha(b): return hashlib.sha256(b).hexdigest()
def blob(b): return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def fetch(url):
 p=urllib.parse.urlparse(url)
 if p.scheme!='https' or p.hostname!='photoshop-api.adobe.io': raise ValueError('Only producer-recorded Adobe HTTPS URLs allowed')
 req=urllib.request.Request(url,headers={'User-Agent':'StarBlox-Asset-Intake/1.0'})
 with urllib.request.urlopen(req,timeout=60) as r: data=r.read(MAX+1)
 if not data or len(data)>MAX: raise ValueError('empty/oversized')
 return data
def info(data,expected):
 with Image.open(io.BytesIO(data)) as im: fmt=im.format; size=im.size; im.verify()
 if fmt not in {'PNG','JPEG','WEBP'} or list(size)!=expected: raise ValueError(f'bad image {fmt} {size}, expected {expected}')
 with Image.open(io.BytesIO(data)) as im:
  im.load(); ex=im.getextrema(); bands=ex if isinstance(ex[0],tuple) else [ex]
  if all(a==b for a,b in bands): raise ValueError('blank image')
 return {'format':fmt,'dimensions':list(size),'bytes':len(data),'sha256':sha(data),'gitBlobSha':blob(data)}
def store():
 code="import {store} from './src/gameModel.js'; console.log(JSON.stringify(store));"
 items=json.loads(subprocess.check_output(['node','--input-type=module','-e',code],cwd=ROOT,text=True))
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
 lane=json.loads(LANE.read_text()); meta=store()
 cands={x['id']:x for x in lane.get('items',[]) if x.get('id') in EXPECTED}
 if sorted(cands)!=EXPECTED: raise ValueError('expected headwear batch not found')
 if REPORT.exists() and all(cands[i].get('deliveryStatus')=='STAGED_READBACK_PASS' for i in EXPECTED):
  print('Headwear already staged; no redownload'); return
 rows=[]
 for id in EXPECTED:
  x=cands[id]; real=meta[id]
  for k in ['name','tier','theme']:
   if x[k]!=real[k]: raise ValueError(f'{id} {k} drift')
  src=fetch(x['provenance']['fullQualityOutputUrl']); si=info(src,[1024,1024])
  cand=fetch(x['phoneDerivative']['outputUrl']); ci=info(cand,[768,768])
  planned=ROOT/x['phoneDerivative']['plannedRepositoryPath']
  if planned.suffix.lower() not in {'.jpg','.jpeg'} or ci['format']!='JPEG': raise ValueError('candidate must be exact JPEG derivative')
  orig=ORIG/(id+'-'+x['provenance']['creativeCloudAssetId'].rsplit(':',1)[-1]+'.png')
  if si['format']!='PNG': raise ValueError('source must be PNG')
  write(orig,src); write(planned,cand)
  x['phoneDerivative'].update({'sha256':ci['sha256'],'gitBlobSha':ci['gitBlobSha'],'resolvedDownloadBytes':ci['bytes'],'repositoryPath':str(planned.relative_to(ROOT)),'readback':'PASS'})
  x['deliveryStatus']='STAGED_READBACK_PASS'; x['reviewStatus']='READY_FOR_REVIEW'
  row={k:real[k] for k in ['id','name','collectionId','collectionName','type','tier','theme','price','starReq']}
  row.update(ci); row.update({'producer':'12','transportHelper':'CHAT','independentReviewer':'01','repositoryPath':str(planned.relative_to(ROOT)),'assetPath':'/'+str(planned.relative_to(ROOT/'public')),'sourceAssetId':x['provenance']['creativeCloudAssetId'],'status':'READY_FOR_REVIEW_01','readback':'PASS','original':{**si,'repositoryPath':str(orig.relative_to(ROOT))}})
  rows.append(row); print(id,ci['dimensions'],ci['gitBlobSha'])
 if len({r['sha256'] for r in rows})!=4: raise ValueError('duplicate candidate content')
 lane['status']='HEADWEAR_1_4_STAGED_READY_FOR_REVIEW_01'
 lane['delivery']={'status':'PASS_HEADWEAR_1_4_EXACT_BYTES_STAGED','exactByteReadback':'PASS_8_OF_8','metadata':'PASS_4_OF_4_AGAINST_CURRENT_GAME_MODEL','independentVisualReview':'PENDING_01','canonicalIntegration':'PENDING_08_AFTER_ACCEPT'}
 LANE.write_text(json.dumps(lane,indent=2)+'\n')
 REPORT.write_text(json.dumps({'schemaVersion':1,'batchId':'chat-headwear-recovery-1-4-20260921','status':'STAGED_READY_FOR_INDEPENDENT_REVIEW_01','sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),'workflowRunId':os.environ.get('GITHUB_RUN_ID'),'producer':'12','transportHelper':'CHAT','independentReviewer':'01','canonicalWriter':'08','newGenerations':0,'storedCandidateCount':4,'storedOriginalCount':4,'duplicateCandidateContent':0,'items':rows,'checks':{'metadata':'PASS_4_OF_4','exactByteReadback':'PASS_8_OF_8','candidateDecode':'PASS_4_OF_4','independentVisualReview':'PENDING_01'},'freeze':{'replitTouched':False,'flootTouched':False,'mainTouched':False,'canonicalMappingsTouched':False,'gameplayChanged':False,'playerDataTouched':False}},indent=2)+'\n')
if __name__=='__main__':
 try: main()
 except Exception as e:
  print('Headwear recovery FAILED: '+str(e),file=sys.stderr); raise
