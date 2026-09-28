import fs from 'node:fs';
import crypto from 'node:crypto';
const path = process.argv[2];
if (!path) throw new Error('runtime source path required');
const original = fs.readFileSync(path, 'utf8');
const sha = text => crypto.createHash('sha256').update(text).digest('hex');
if (sha(original) !== '4777e76c9c71a26fa67aac499a9db86fc91baa7961189dbb73d03cad5a813461') throw new Error('Unexpected source revision; refusing rewrite');
const groups = [
 ['heliFixture','helicopter',['heliGuiOk','heliInspect','heliGuiBuild','heliFlightOn','heliLift','heliSpeedUp','heliSpeedCap','heliFlightOff']],
 ['socialCarrier','social',['socialOk','socialPair','pairValueCreated','socialClear']],
 ['horseLifecycleFixture','horse_lifecycle',['horseLifecycleOk','horseLifecycleInspect','horseLifecycleMounted','horseLifecycleRestored']],
 ['followerDisplay','follower',['followerOk','followerBuild','followerName']],
 ['displayPart','tool_visual',['toolVisualOk','displayToolResult']],
 ['horseFixture','horse_customization',['horseCustomizationOk','horseNameResult','horseNameColorResult','horseBodyResult','horseHairResult','horseSaddleResult','horseTextureResult','horsePresetResult']],
];
let patched = original;
for (const [first, checkpoint, retained] of groups) {
 const start = patched.indexOf('\n\tlocal '+first+' =', patched.indexOf('function RuntimeCore.runBehaviorProbe()'));
 const end = patched.indexOf('\n\tprint("NATIVE_PROBE_CHECKPOINT '+checkpoint+'")', start);
 if (start < 0 || end < start) throw new Error('Missing fixture boundary: '+first);
 let body = patched.slice(start+1,end);
 for (const name of retained) {
  const pattern = '\tlocal '+name+' =';
  if(body.split(pattern).length !== 2) throw new Error('Ambiguous retained output: '+name);
  body = body.replace(pattern,'\t'+name+' =');
 }
 const scoped = '\n\tlocal '+retained.join(', ')+'\n\tdo -- Fixture temporaries must not exhaust Luau registers.\n'+body.split('\n').map(line=>'\t'+line).join('\n')+'\n\tend\n';
 patched = patched.slice(0,start)+scoped+patched.slice(end);
}
fs.writeFileSync(path,patched);
console.log(JSON.stringify({inputSha256:sha(original),outputSha256:sha(patched),scopedFixtureGroups:groups.length,gameplayHandlersChanged:false},null,2));
