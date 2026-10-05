import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,cpSync,rmSync,writeFileSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const json=p=>JSON.parse(read(p));
const run=(script,opts={})=>spawnSync(process.execPath,[resolve(root,script)],{encoding:'utf8',timeout:4000,...opts});
test('generated skill and hook exactly match source',()=>{
 const p=spawnSync(process.execPath,[resolve(root,'scripts/build.mjs'),'--check'],{encoding:'utf8'});
 assert.equal(p.status,0,p.stderr);assert.equal(read('SKILL.md'),read('skills/skip-echo/SKILL.md'));
});
for(const source of ['startup','resume','clear','compact','fork']) test('hook output is fixed JSON for '+source,()=>{
 const p=run('scripts/session-start.mjs',{input:JSON.stringify({source,transcript_path:'/must-not-read',secret:'NEVER_ECHO'})});
 assert.equal(p.status,0,p.stderr);assert.equal(p.stderr,'');
 assert.deepEqual(JSON.parse(p.stdout),{hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:read('src/response-policy.md').trim()}});
 assert.ok(!p.stdout.includes('NEVER_ECHO'));
});
test('hook does not require valid stdin',()=>{
 const a=run('scripts/session-start.mjs',{input:'not JSON'});const b=run('scripts/session-start.mjs',{input:''});assert.equal(a.status,0);assert.equal(a.stdout,b.stdout);
});
test('works with unrelated cwd and spaces in installation path',()=>{
 const dir=mkdtempSync(join(tmpdir(),'skip echo '));
 try{cpSync(resolve(root,'scripts'),join(dir,'scripts'),{recursive:true});const p=spawnSync(process.execPath,[join(dir,'scripts/session-start.mjs')],{cwd:tmpdir(),encoding:'utf8'});assert.equal(p.status,0);assert.equal(JSON.parse(p.stdout).hookSpecificOutput.additionalContext,read('src/response-policy.md').trim());}finally{rmSync(dir,{recursive:true,force:true});}
});
test('missing or malformed generated module fails open',()=>{
 const dir=mkdtempSync(join(tmpdir(),'skip-echo-failure-'));
 try{
  cpSync(resolve(root,'scripts/session-start.mjs'),join(dir,'session-start.mjs'));
  for(const mode of ['missing','invalid','empty']){
   if(mode==='invalid')writeFileSync(join(dir,'policy.generated.mjs'),'invalid syntax !');
   if(mode==='empty')writeFileSync(join(dir,'policy.generated.mjs'),'export default "";');
   const p=spawnSync(process.execPath,[join(dir,'session-start.mjs')],{encoding:'utf8'});
   assert.equal(p.status,0);assert.equal(p.stdout,'');assert.match(p.stderr,/continuing without/);
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('single default hook registration with five match sources',()=>{
 const manifest=json('.claude-plugin/plugin.json');assert.equal(manifest.name,'skip-echo');assert.ok(!('hooks' in manifest));
 const hooks=json('hooks/hooks.json').hooks;assert.deepEqual(Object.keys(hooks),['SessionStart']);assert.equal(hooks.SessionStart.length,1);
 const entry=hooks.SessionStart[0];assert.equal(entry.hooks.length,1);assert.equal(entry.hooks[0].timeout,5);
 for(const source of ['startup','resume','clear','compact','fork'])assert.match(source,new RegExp(entry.matcher));
 assert.ok(!new RegExp(entry.matcher).test('other'));
 assert.equal(json('.claude-plugin/marketplace.json').plugins[0].source,'./');
 assert.equal(manifest.version,json('package.json').version);
});
test('60 frozen cases with paired-language split isolation and 12 smoke cases',()=>{
 const manifest=json('evals/manifest.json');assert.equal(manifest.cases.length,60);
 const cases=manifest.cases.map(c=>{const raw=read('evals/cases/'+c.id+'.json');assert.equal(createHash('sha256').update(raw).digest('hex'),c.sha256);const obj=JSON.parse(raw);assert.equal(c.split,obj.split);assert.equal(c.id,obj.id);return obj;});
 assert.equal(new Set(cases.map(c=>c.id)).size,60);
 assert.equal(readdirSync(resolve(root,'evals/cases')).length,60);
 assert.equal(cases.filter(c=>c.split==='dev').length,36);assert.equal(cases.filter(c=>c.split==='holdout').length,24);
 for(const lang of ['ja','en'])assert.equal(cases.filter(c=>c.language===lang).length,30);
 for(const c of cases){assert.equal(c.messages.length,5);assert.deepEqual(c.messages.map(m=>m.role),['user','assistant','user','assistant','user']);assert.ok(c.required_facts.length>0);assert.ok(c.critical_omissions.length>0);assert.equal(new Set(cases.filter(p=>p.pair_id===c.pair_id).map(p=>p.split)).size,1);}
 const smoke=json('evals/smoke.json').map(id=>cases.find(c=>c.id===id));assert.equal(smoke.length,12);assert.ok(smoke.every(c=>c.split==='dev'));assert.equal(new Set(smoke.map(c=>c.category)).size,12);
});
