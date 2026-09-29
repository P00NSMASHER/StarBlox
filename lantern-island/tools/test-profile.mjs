import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2);const i=args.indexOf('--luau');const luau=i<0?'luau':args[i+1];
const source=fs.readFileSync(path.join(root,'src/server/ProfileService.luau'),'utf8');
const test=fs.readFileSync(path.join(root,'tests/profile_persistence.spec.luau'),'utf8');
let eq='=';while(source.includes(']'+eq+']'))eq+='=';
const generated=path.join(root,'tests','.profile-execution.generated.luau');
try{fs.writeFileSync(generated,`local PROFILE_SOURCE = [${eq}[${source}]${eq}]\n${test}`.replace('\\n','\n'));
 const r=spawnSync(luau,[generated],{cwd:root,encoding:'utf8',timeout:30000});process.stdout.write(r.stdout??'');process.stderr.write(r.stderr??'');if(r.error)throw r.error;process.exitCode=r.status??1;
}finally{fs.rmSync(generated,{force:true});}
