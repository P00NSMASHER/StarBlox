/** Offline build: compile production, execute real pure modules, package twice, retain hashes. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const argv=process.argv.slice(2);
function arg(name,fallback){const i=argv.indexOf(name);if(i<0)return fallback;if(!argv[i+1]||argv[i+1].startsWith('--'))throw Error(`Missing ${name}`);return argv[i+1];}
const commands={rojo:arg('--rojo','rojo'),luau:arg('--luau','luau'),compile:arg('--compile','luau-compile'),analyze:arg('--analyze','luau-analyze')};
const sha=data=>crypto.createHash('sha256').update(data).digest('hex');
function run(exe,args){const r=spawnSync(exe,args,{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});if(r.error||r.status!==0)throw Error(`${path.basename(exe)} failed: ${r.error?.message??''}\n${r.stdout??''}\n${r.stderr??''}`);if(r.stdout?.trim())console.log(r.stdout.trim());if(r.stderr?.trim())console.log(r.stderr.trim());return r.stdout??'';}
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const f=path.join(dir,e.name);if(e.isSymbolicLink())throw Error('Symlink forbidden');return e.isDirectory()?walk(f):[f];}).sort();}
try{
 const projectFile=path.join(root,'default.project.json');const project=JSON.parse(fs.readFileSync(projectFile,'utf8'));
 if(JSON.stringify(project.servePlaceIds)!=='[0]')throw Error('Isolated unpublished-place restriction changed');
 function verify(node){if(!node||typeof node!=='object')return;if('$path'in node){if(!['src/shared','src/server','src/client'].includes(node.$path))throw Error('Unexpected project mapping');const p=fs.realpathSync(path.resolve(root,node.$path));if(!p.startsWith(root+path.sep))throw Error('Mapping escapes project');}for(const v of Object.values(node))verify(v);}
 verify(project.tree);
 const sources=walk(path.join(root,'src')).filter(f=>/\.lua(u)?$/.test(f));
 const tests=walk(path.join(root,'tests')).filter(f=>/\.spec\.luau$/.test(f));
 const files=[projectFile,...sources,...tests,path.join(root,'tools/build.mjs')];
 const hashes=Object.fromEntries(files.map(f=>[path.relative(root,f).replaceAll('\\','/'),sha(fs.readFileSync(f))]));
 const sourceFingerprint=sha(JSON.stringify(hashes));
 run(commands.compile,['--null',...sources,...tests]);
 run(commands.analyze,['src/shared/Protocol.luau','tests/runtime_protocol.spec.luau']);
 const protocol=run(commands.luau,['tests/runtime_protocol.spec.luau']);
 const gameplay=run(commands.luau,['tests/mission_reward.spec.luau']);
 const answerLayout=run(commands.luau,['tests/answer_layout.spec.luau']);
 const layoutMatch=answerLayout.match(/RESULT (\d+) answer layout behavior tests passed/);
 if(!layoutMatch)throw Error('Answer-layout regression suite did not complete');
 const p=protocol.match(/RESULT (\d+) protocol behavior tests passed/);const m=gameplay.match(/RESULT (\d+) mission\/reward behavior tests passed/);
 if(!p||!m)throw Error('A required test suite did not report completion');
 const rojoVersion=run(commands.rojo,['--version']).trim();
 project.tree.ServerScriptService.LanternIslandServer.BuildIdentity.$properties.Value=sourceFingerprint;
 const generated=path.join(root,'.adventure-build.project.json');const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});fs.writeFileSync(generated,JSON.stringify(project,null,2));
 const artifact=path.join(dist,'LanternIsland-Adventures.rbxlx');const repeated=path.join(dist,'.repeat.rbxlx');
 try{run(commands.rojo,['build',generated,'-o',artifact]);run(commands.rojo,['build',generated,'-o',repeated]);if(sha(fs.readFileSync(artifact))!==sha(fs.readFileSync(repeated)))throw Error('Repeat artifact hash mismatch');}finally{fs.rmSync(generated,{force:true});fs.rmSync(repeated,{force:true});}
 const bytes=fs.readFileSync(artifact);if(!bytes.toString('utf8',0,100).includes('<roblox'))throw Error('Not a Roblox XML package');
 const receipt={schemaVersion:2,status:'OFFLINE_TESTED_CANDIDATE',sourceCommit:arg('--source-commit',null),builtAt:new Date().toISOString(),sourceFingerprint,sourceHashes:hashes,
 artifact:path.basename(artifact),artifactSha256:sha(bytes),artifactBytes:bytes.length,toolchain:{rojo:rojoVersion,luau:'0.740'},
 checks:{productionFilesCompiled:sources.length,testFilesCompiled:tests.length,protocolBehaviorTests:Number(p[1]),missionRewardAndUIModelTests:Number(m[1]),answerLayoutTests:Number(layoutMatch[1]),protocolStrictTypecheck:'PASS',repeatArtifactHashMatched:true},
 scope:'Actual pure production modules executed with fake world/save adapters; package compilation is not client proof.',
 nativeRobloxEngineExecution:'NOT_RUN_BY_THIS_SCRIPT',physicalDeviceInput:'NOT_RUN',realDataStoreLeaveRejoin:'NOT_RUN',schoolworkIntegration:'ORIGINAL_SAMPLE_ONLY',publishedTarget:null};
 fs.writeFileSync(path.join(dist,'offline-receipt.json'),JSON.stringify(receipt,null,2)+'\n');
 fs.writeFileSync(path.join(dist,'offline-test-output.txt'),protocol+'\n'+gameplay+'\n'+answerLayout);
 console.log(JSON.stringify(receipt,null,2));
}catch(e){console.error(`BUILD FAILED: ${e.message}`);process.exitCode=1;}
