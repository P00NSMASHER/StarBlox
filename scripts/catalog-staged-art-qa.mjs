import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const base = 'http://127.0.0.1:4174';
const artifactRoot = 'artifacts/catalog-staged-art';
const themes = ['Cloud Pop','Pixel Party','Berry Blast','Garden Glow','Galaxy Glow','Sunny Pop','Aqua Wave','Art Attack','Star Luxe','Midnight Neon','Candy Core','Adventure Club'];
const definitions = {
  lighting: {lane:'docs/preproduction/catalog-sprint/lane-04.json', offset:0, names:['Starter Lamp','Cloud Lamp','Pixel Cube Light','Heart Lamp','Vine Light','Planet Lamp','Sun Lamp','Bubble Lamp','Color Lamp','Neon Strip Tower','Aurora Light','Crystal Chandelier']},
  wall: {lane:'docs/preproduction/catalog-sprint/lane-05.json', offset:3, names:['School Star Poster','Cloud Wall Flag','Pixel Scoreboard','Heart Gallery','Garden Garland','Planet Map','Skate Poster','Ocean Window','Art Gallery Wall','Neon City Sign','Star Mirror','Golden Crest']},
  rugs: {lane:'docs/preproduction/catalog-sprint/lane-07.json', offset:6, names:['Starter Mat','Cloud Rug','Pixel Grid Rug','Heart Rug','Leaf Rug','Orbit Rug','Checker Rug','Wave Rug','Splash Rug','Neon Grid Rug','Dream Cloud Rug','Luxe Star Rug']},
  decor: {lane:'docs/preproduction/catalog-sprint/lane-09.json', offset:9, names:['Book Crate','Cloud Shelf','Arcade Mini','Plush Stack','Plant Wall','Telescope','Skate Rack','Mini Aquarium','Easel Set','Mini Fridge','Dream Vanity Set','Trophy Wall']}
};
const producerLanes = [
  'docs/preproduction/catalog-sprint/lane-03.json',
  'docs/preproduction/catalog-sprint/lane-04.json',
  'docs/preproduction/catalog-sprint/lane-06.json',
  'docs/preproduction/catalog-sprint/lane-07.json',
  'docs/preproduction/catalog-sprint/lane-09.json',
  'docs/preproduction/catalog-sprint/lane-11.json'
];
const tierFor = i => i < 3 ? 1 : i < 6 ? 2 : i < 9 ? 3 : i < 11 ? 4 : 5;

function allObjects(value, out=[]) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) { for (const v of value) allObjects(v, out); return out; }
  out.push(value);
  for (const v of Object.values(value)) allObjects(v, out);
  return out;
}
function normalizeRepoPath(p) {
  if (!p || typeof p !== 'string') return null;
  if (p.startsWith('/assets/')) return `public${p}`;
  return p.replace(/^\//, '');
}
function candidatePathFromObject(o) {
  for (const key of ['candidateRepositoryPath','repositoryPath','candidatePath','optimizedPath','publicPath','path','intendedRepositoryPath']) {
    const p = normalizeRepoPath(o?.[key]);
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}
function blobSha(p) { return execFileSync('git',['hash-object',p],{encoding:'utf8'}).trim(); }
function stateText(o) {
  return ['status','decision','reviewStatus','candidateStatus','repositoryStatus'].map(k => String(o?.[k] ?? '').toUpperCase()).join(' ');
}
function looksReviewable(o) {
  const s = stateText(o);
  return s.includes('READY_FOR_REVIEW') || s.includes('READY_FOR_FRESH_REVIEW') || s.includes('READY_FOR_FRESH_INDEPENDENT_PIXEL_REVIEW') || s.includes('STAGED');
}
function replacementFileId(file) { return file.match(/^([a-z]+-\d+)-.+\.(?:svg|png|jpe?g|webp)$/i)?.[1] ?? null; }
function isReplacementPath(id, p) { return p !== `public/assets/catalog/${id}.svg`; }
function signatureCheck(p) {
  try {
    const b = fs.readFileSync(p);
    const ext = path.extname(p).toLowerCase();
    if (ext === '.svg') return {ok:/<svg\b/i.test(b.toString('utf8',0,Math.min(b.length,4096))), reason:'svg'};
    if (ext === '.jpg' || ext === '.jpeg') return {ok:b.length >= 3 && b[0]===0xff && b[1]===0xd8 && b[2]===0xff, reason:'jpeg'};
    if (ext === '.png') return {ok:b.length >= 8 && b.subarray(0,8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])), reason:'png'};
    if (ext === '.webp') return {ok:b.length >= 12 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP', reason:'webp'};
    return {ok:false, reason:`unsupported-${ext}`};
  } catch (error) { return {ok:false, reason:String(error)}; }
}
function readLane(lanePath) {
  try { return JSON.parse(fs.readFileSync(lanePath,'utf8')); } catch { return {}; }
}
function laneMetaById() {
  const map = new Map();
  for (const lanePath of producerLanes) {
    if (!fs.existsSync(lanePath)) continue;
    const lane = readLane(lanePath);
    for (const o of allObjects(lane)) {
      if (!o?.id || !/^[a-z]+-\d+$/.test(o.id)) continue;
      const list = map.get(o.id) ?? [];
      list.push({...o, producerLane:lanePath});
      map.set(o.id,list);
    }
  }
  return map;
}
function selectCurrentReplacementCandidates(report) {
  const meta = laneMetaById();
  const candidates = new Map();
  const add = (c) => {
    const sig = signatureCheck(c.repositoryPath);
    const item = {...c, blobSha:blobSha(c.repositoryPath), signature:sig};
    const list = candidates.get(c.id) ?? [];
    list.push(item);
    candidates.set(c.id,list);
  };

  for (const [id, objects] of meta.entries()) {
    for (const o of objects) {
      const repositoryPath = candidatePathFromObject(o);
      if (!repositoryPath || !isReplacementPath(id,repositoryPath) || !looksReviewable(o)) continue;
      add({id,name:o.name ?? id,tier:o.tier ?? null,theme:o.theme ?? null,producerLane:o.producerLane,discovery:'lane-reviewable',repositoryPath});
    }
  }
  const root = 'public/assets/catalog';
  if (fs.existsSync(root)) {
    for (const file of fs.readdirSync(root).sort()) {
      const id = replacementFileId(file);
      if (!id) continue;
      const repositoryPath = path.posix.join(root,file);
      const o = (meta.get(id) ?? []).at(-1) ?? {};
      add({id,name:o.name ?? id,tier:o.tier ?? null,theme:o.theme ?? null,producerLane:o.producerLane ?? null,discovery:'versioned-file-scan',repositoryPath});
    }
  }

  const selected = [];
  report.skippedCandidates = [];
  for (const [id, list] of candidates.entries()) {
    const dedup = [...new Map(list.map(x => [`${x.repositoryPath}:${x.blobSha}`,x])).values()];
    const valid = dedup.filter(x => x.signature.ok);
    // Prefer a valid lane-declared candidate. If lane metadata is stale/corrupt, use the valid versioned file instead.
    const pick = valid.find(x => x.discovery === 'lane-reviewable') ?? valid.sort((a,b) => b.repositoryPath.localeCompare(a.repositoryPath))[0];
    if (pick) selected.push(pick);
    for (const c of dedup) {
      if (!pick || c.repositoryPath !== pick.repositoryPath || c.blobSha !== pick.blobSha) {
        report.skippedCandidates.push({id,repositoryPath:c.repositoryPath,blobSha:c.blobSha,signature:c.signature,reason:c.signature.ok?'alternate-version-not-selected':'invalid-file-signature'});
      }
    }
    if (!pick) report.errors.push(`${id}: no valid staged replacement among ${dedup.map(x=>x.repositoryPath).join(', ')}`);
  }
  return selected.sort((a,b) => a.id.localeCompare(b.id));
}
function selectOwnCollectionPath(lane,id,fallback,report) {
  const matches = allObjects(lane).filter(o => o.id === id);
  for (let i=matches.length-1;i>=0;i--) {
    const p = candidatePathFromObject(matches[i]);
    if (!p) continue;
    const sig = signatureCheck(p);
    if (sig.ok) return p;
    report.warnings.push(`${id}: ignored invalid lane candidate ${p} (${sig.reason})`);
  }
  return fallback;
}

async function settleImages(page, timeoutMs=7000) {
  return page.evaluate(async timeout => {
    const images = [...document.images];
    await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
      const done = () => resolve();
      img.addEventListener('load',done,{once:true});
      img.addEventListener('error',done,{once:true});
      setTimeout(done,timeout);
    })));
    return images.map(img => ({src:img.getAttribute('src'),complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight}));
  },timeoutMs);
}
async function renderSet(browser,setName,items,report) {
  const out = path.join(artifactRoot,setName);
  fs.mkdirSync(path.join(out,'detail'),{recursive:true});
  const setReport = {items:[],contactSheetErrors:[],contactSheetImageStatus:[]};
  report.sets[setName] = setReport;
  if (!items.length) return;
  const page = await browser.newPage({viewport:{width:1200,height:960},deviceScaleFactor:1});
  page.on('console',m=>{ if(m.type()==='error') setReport.contactSheetErrors.push(m.text()); });
  page.on('pageerror',e=>setReport.contactSheetErrors.push(String(e)));
  try {
    const cards = items.map(item => `<article><img src="${base}/${item.repositoryPath}" alt="${item.id}"><div><b>${item.id}</b><br>${item.name}<br><span>${item.tier?`T${item.tier}`:''}${item.theme?` · ${item.theme}`:''} · ${item.blobSha.slice(0,8)}</span><br><small>${item.repositoryPath}</small></div></article>`).join('');
    await page.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:#081936;color:white;font:14px system-ui,sans-serif}main{box-sizing:border-box;width:1200px;padding:30px;display:grid;grid-template-columns:repeat(4,1fr);gap:18px}article{min-height:310px;background:#102c5d;border:2px solid #39d5ff;border-radius:18px;padding:12px;box-sizing:border-box;overflow:hidden}img{width:100%;height:210px;object-fit:contain;display:block}div{padding-top:7px;line-height:18px}span,small{color:#b9d8ff;font-size:11px;word-break:break-all}</style><main>${cards}</main>`);
    setReport.contactSheetImageStatus = await settleImages(page);
    for (const image of setReport.contactSheetImageStatus) if (!image.naturalWidth) setReport.contactSheetErrors.push(`contact-sheet decode failed: ${image.src}`);
    await page.screenshot({path:path.join(out,`${setName}-contact-sheet.png`),fullPage:true,timeout:15000});
  } catch(error) { setReport.contactSheetErrors.push(String(error)); }
  finally { await page.close(); }

  for (const item of items) {
    const p = await browser.newPage({viewport:{width:800,height:800},deviceScaleFactor:1});
    const errors=[];
    p.on('console',m=>{if(m.type()==='error') errors.push(m.text());});
    p.on('pageerror',e=>errors.push(String(e)));
    const url=`${base}/${item.repositoryPath}`;
    let status=null,naturalWidth=0,naturalHeight=0,screenshot=false;
    try {
      const probe=await fetch(url); status=probe.status; if(status!==200) throw new Error(`asset status ${status}`);
      await p.setContent(`<!doctype html><meta charset="utf-8"><style>html,body{margin:0;width:800px;height:800px;background:#081936;display:grid;place-items:center}img{width:800px;height:800px;object-fit:contain}</style><img id="asset" src="${url}" alt="${item.id}">`);
      const imageState=(await settleImages(p))[0]; naturalWidth=imageState?.naturalWidth??0; naturalHeight=imageState?.naturalHeight??0;
      if(!naturalWidth) throw new Error('asset image decode failed');
      await p.locator('#asset').screenshot({path:path.join(out,'detail',`${item.id}-${item.blobSha.slice(0,8)}.png`),timeout:15000}); screenshot=true;
    } catch(error) { errors.push(String(error)); }
    setReport.items.push({...item,status,naturalWidth,naturalHeight,screenshot,errors});
    await p.close();
  }
}

fs.mkdirSync(artifactRoot,{recursive:true});
const report={sourceHead:process.env.GITHUB_SHA,generatedAt:new Date().toISOString(),sets:{},errors:[],warnings:[],skippedCandidates:[]};
const browser=await chromium.launch({headless:true});
try {
  for (const [collection,def] of Object.entries(definitions)) {
    const lane=readLane(def.lane);
    const items=def.names.map((name,i)=>{
      const id=`${collection}-${i+1}`;
      const fallback=`public/assets/catalog/${id}.svg`;
      const repositoryPath=selectOwnCollectionPath(lane,id,fallback,report);
      if(!fs.existsSync(repositoryPath)) throw new Error(`${id}: no staged file at ${repositoryPath}`);
      return {id,name,tier:tierFor(i),theme:themes[(i+def.offset)%themes.length],repositoryPath,blobSha:blobSha(repositoryPath)};
    });
    await renderSet(browser,collection,items,report);
  }
  const replacements=selectCurrentReplacementCandidates(report);
  await renderSet(browser,'staged-replacements',replacements,report);
  report.replacementCount=replacements.length;
  report.replacementIds=replacements.map(x=>`${x.id}:${x.blobSha}:${x.repositoryPath}`);
} catch(error) { report.errors.push(String(error)); }
finally {
  await browser.close();
  fs.writeFileSync(path.join(artifactRoot,'report.json'),JSON.stringify(report,null,2));
}
const failures=[...report.errors,...Object.entries(report.sets).flatMap(([name,set])=>[
  ...set.contactSheetErrors.map(e=>`${name}: ${e}`),
  ...set.items.flatMap(i=>(i.status!==200||!i.screenshot||!i.naturalWidth||i.errors.length)?[`${name}/${i.id}/${i.blobSha}: ${JSON.stringify(i)}`]:[])
])];
if(failures.length){console.error(failures.join('\n'));process.exitCode=1;}
