// Bounded image-only QA; defaults preserve the original Lighting 5-8 contract.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const batches = {
  'lighting-5-8': {intake:'docs/preproduction/catalog-sprint/chat-lighting-recovery-result.json',out:'artifacts/lighting-recovery-isolated',ids:['lighting-5','lighting-6','lighting-7','lighting-8']},
  'desks-5-6': {intake:'docs/preproduction/catalog-sprint/chat-desks-5-6-recovery-result.json',out:'artifacts/desks-5-6-recovery',ids:['desks-5','desks-6']}
};
const batch = process.env.STARBLOX_RECOVERY_BATCH || 'lighting-5-8';
const config = batches[batch];
if (!config) throw new Error('Unsupported recovery batch');
const {intake:intakePath,out,ids:expectedIds} = config;
const intake = JSON.parse(await fs.readFile(intakePath,'utf8'));
if (JSON.stringify(intake.items.map(x=>x.id)) !== JSON.stringify(expectedIds)) throw new Error('Unexpected batch IDs');
const report = {sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workflowRunId:process.env.GITHUB_RUN_ID ?? null,scope:`Only recovered ${batch}; not canonical Store, other candidates, or visual acceptance`,status:'NOT_RUN',items:[],errors:[],screenshots:[]};
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const origin='http://127.0.0.1:4174';
await fs.mkdir(out,{recursive:true});
const files=new Map();
for(const item of intake.items){
  if(!item.repositoryPath.startsWith('public/assets/catalog/'+item.id+'-') || !item.repositoryPath.endsWith('.jpg') || item.repositoryPath.includes('..')) throw new Error('Unexpected candidate path');
  const b=await fs.readFile(item.repositoryPath);
  const blob=crypto.createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
  if(hash(b)!==item.sha256||blob!==item.gitBlobSha)throw new Error(`${item.id}: changed bytes`);
  files.set('/'+item.repositoryPath,{bytes:b,type:'image/jpeg'});
}
if(new Set(intake.items.map(x=>x.sha256)).size!==expectedIds.length)throw new Error('Duplicate content');
const passStatus=`PASS_${expectedIds.length}_OF_${expectedIds.length}_ISOLATED_RENDER`;
const browser=await chromium.launch({headless:true});
try{
  // Only inert same-origin HTML and the exact validated candidate images.
  const width=expectedIds.length*256;
  const context=await browser.newContext({viewport:{width,height:390},deviceScaleFactor:1,reducedMotion:'reduce'});
  await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin!==origin){report.errors.push('Unexpected network origin: '+u.origin);return route.abort();}
    if(u.pathname==='/__lighting_review__')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>Exact-byte recovery QA</title>'});
    const f=files.get(u.pathname);
    if(!f){report.errors.push('Unexpected fixture resource: '+u.pathname);return route.fulfill({status:404,body:'Not in this batch'});}
    return route.fulfill({status:200,contentType:f.type,body:f.bytes});
  });
  const page=await context.newPage();
  page.on('pageerror',e=>report.errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure()?.errorText));
  await page.goto(origin+'/__lighting_review__');
  const styles=`<style>html,body{margin:0;background:#081936;color:white;font:15px system-ui}main{box-sizing:border-box;display:grid;grid-template-columns:repeat(${expectedIds.length},1fr);gap:16px;padding:24px;width:${width}px}article{padding:10px;background:#102c5d;border:2px solid #39d5ff;border-radius:16px}img{width:200px;height:200px;object-fit:contain;display:block}p{line-height:1.4;margin:10px 0 0}small{color:#bfd8ff}</style>`;
  await page.setContent('<!doctype html><meta charset="utf-8">'+styles+'<main>'+intake.items.map(i=>`<article><img data-id="${i.id}" src="${origin}/${i.repositoryPath}" alt="${escape(i.name)}"><p><b>${escape(i.name)}</b><br>${i.id}<br><small>Tier ${i.tier} · ${escape(i.theme)}</small></p></article>`).join('')+'</main>');
  const state=await page.locator('img').evaluateAll(async images=>{await Promise.all(images.map(i=>i.decode()));return images.map(i=>{const c=document.createElement('canvas');c.width=c.height=48;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(i,0,0,48,48);const data=x.getImageData(0,0,48,48).data;let count=0;for(let n=3;n<data.length;n+=4)if(data[n]>8)count++;return{id:i.dataset.id,width:i.naturalWidth,height:i.naturalHeight,opaqueFraction:count/2304};});});
  const capture=async(file,selector)=>{const dest=path.join(out,file);if(selector)await page.locator(selector).screenshot({path:dest});else await page.screenshot({path:dest,fullPage:true});const bytes=await fs.readFile(dest);report.screenshots.push({path:dest,sha256:hash(bytes),bytes:bytes.length});};
  await capture(`${batch}-card-contact-sheet.png`);
  for(const item of intake.items){
    const s=state.find(x=>x.id===item.id);
    if(s?.width!==600||s?.height!==600||s.opaqueFraction<0.9)throw new Error(`${item.id}: decode/visibility failure`);
    await page.setViewportSize({width:800,height:800});
    await page.setContent(`<!doctype html><style>html,body{margin:0;width:800px;height:800px;background:#081936}img{width:800px;height:800px;object-fit:contain}</style><img id="asset" src="${origin}/${item.repositoryPath}" alt="${escape(item.name)}">`);
    await page.locator('#asset').evaluate(i=>i.decode());
    await capture(`${item.id}-${item.gitBlobSha.slice(0,8)}-detail.png`,'#asset');
    report.items.push({id:item.id,name:item.name,path:item.repositoryPath,gitBlobSha:item.gitBlobSha,sha256:item.sha256,...s,cardCaptured:true,detailCaptured:true});
  }
  await context.close();
  report.status=report.items.length===expectedIds.length&&report.errors.length===0?passStatus:'FAIL';
}catch(error){report.errors.push(String(error));report.status='FAIL';}
finally{await browser.close();await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));}
if(report.status!==passStatus)process.exitCode=1;
