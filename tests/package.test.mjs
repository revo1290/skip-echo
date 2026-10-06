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
const V4=['tool-report','rerun-report','review-response','infra-ops','data-analysis','doc-writing','long-session','safety'];
test('148 frozen cases with paired-language split isolation, 14 smoke and 8 stress cases',()=>{
 const manifest=json('evals/manifest.json');assert.equal(manifest.version,4);assert.equal(manifest.cases.length,148);
 const cases=manifest.cases.map(c=>{const raw=read('evals/cases/'+c.id+'.json');assert.equal(createHash('sha256').update(raw).digest('hex'),c.sha256);const obj=JSON.parse(raw);assert.equal(c.split,obj.split);assert.equal(c.id,obj.id);return obj;});
 assert.equal(new Set(cases.map(c=>c.id)).size,148);
 assert.equal(readdirSync(resolve(root,'evals/cases')).length,148);
 assert.equal(cases.filter(c=>c.split==='dev').length,80);assert.equal(cases.filter(c=>c.split==='holdout').length,68);
 for(const lang of ['ja','en'])assert.equal(cases.filter(c=>c.language===lang).length,74);
 for(const c of cases){assert.ok(c.messages.length>=5&&c.messages.length%2===1);assert.deepEqual(c.messages.map(m=>m.role),c.messages.map((_,i)=>i%2?'assistant':'user'));assert.ok(c.required_facts.length>0);assert.ok(c.critical_omissions.length>0);assert.equal(new Set(cases.filter(p=>p.pair_id===c.pair_id).map(p=>p.split)).size,1);}
 const smoke=json('evals/smoke.json').map(id=>cases.find(c=>c.id===id));assert.equal(smoke.length,14);assert.ok(smoke.every(c=>c.split==='dev'));assert.equal(new Set(smoke.map(c=>c.category)).size,14);
 const stress=json('evals/stress.json').map(id=>cases.find(c=>c.id===id));assert.equal(stress.length,8);assert.ok(stress.every(c=>c.split==='dev'&&c.messages.length>=7));
});
test('v4 families: 2 development and 2 holdout pairs each, valid message blocks, plain-text final turn',()=>{
 const cases=json('evals/manifest.json').cases.map(c=>json('evals/cases/'+c.id+'.json'));
 for(const cat of V4){
  const own=cases.filter(c=>c.category===cat);assert.equal(own.length,8,cat);
  for(const split of ['dev','holdout'])assert.equal(own.filter(c=>c.split===split).length,4,cat+' '+split);
  for(const lang of ['en','ja'])assert.equal(own.filter(c=>c.language===lang).length,4,cat+' '+lang);
 }
 for(const c of cases){
  assert.equal(typeof c.messages.at(-1).content,'string',c.id+': final turn is plain text');
  const open=[];
  for(const m of c.messages){
   if(typeof m.content==='string')continue;
   for(const b of m.content){
    if(b.type==='tool_use'){assert.equal(m.role,'assistant');assert.ok(b.id&&b.name&&b.input);open.push(b.id);}
    else if(b.type==='tool_result'){assert.equal(m.role,'user');assert.equal(b.tool_use_id,open.shift(),c.id+': tool_result pairs with the preceding tool_use');}
    else assert.equal(b.type,'text',c.id);
   }
  }
  assert.equal(open.length,0,c.id+': every tool_use has a tool_result');
 }
 for(const lang of ['en','ja']){const t=cases.filter(c=>c.category==='tool-report'&&c.language===lang);assert.ok(t.every(c=>c.messages.some(m=>Array.isArray(m.content)&&m.content.some(b=>b.type==='tool_use'))));}
 assert.ok(cases.filter(c=>c.category==='long-session').every(c=>c.messages.filter(m=>m.role==='user').length>=10));
});
test('hard suite lists exactly the v4 development cases and mirrors them in evals/hard',()=>{
 const manifest=json('evals/manifest.json');const hard=json('evals/hard.json');
 const expected=manifest.cases.filter(c=>c.split==='dev'&&V4.includes(json('evals/cases/'+c.id+'.json').category)).map(c=>c.id).sort();
 assert.deepEqual([...hard].sort(),expected);assert.equal(hard.length,32);
 const dirs=readdirSync(resolve(root,'evals/hard'),{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name!=='results').map(e=>e.name).sort();assert.deepEqual(dirs,expected);
 for(const id of hard){
  const c=json('evals/cases/'+id+'.json');assert.equal(c.split,'dev');
  const lines=read(`evals/hard/${id}/history.jsonl`).trim().split('\n').map(l=>JSON.parse(l));
  assert.deepEqual(lines.map(l=>l.message.role),c.messages.slice(0,-1).map(m=>m.role));
  for(let i=1;i<lines.length;i++)assert.equal(lines[i].parentUuid,lines[i-1].uuid);
  lines.forEach((l,i)=>{const src=c.messages[i].content;if(typeof src!=='string')assert.deepEqual(l.message.content,src);});
  assert.equal(read(`evals/hard/${id}/prompt.md`),c.messages.at(-1).content+'\n');
  for(const f of c.required_facts)assert.ok(read(`evals/hard/${id}/graders/essentials.md`).includes(f));
 }
});
test('native plugin eval suite mirrors smoke and stress dev cases, with replayable history',()=>{
 assert.equal(json('.claude-plugin/plugin.json').experimental.evals,'evals/native');
 const smoke=json('evals/smoke.json');const dirs=readdirSync(resolve(root,'evals/native'),{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name!=='results').map(e=>e.name).sort();
 const selected=[...smoke,...json('evals/stress.json')].sort();assert.deepEqual(dirs,selected);
 for(const id of selected){
  const c=json('evals/cases/'+id+'.json');assert.equal(c.split,'dev');
  assert.match(read(`evals/native/${id}/case.yaml`),/history_file: history\.jsonl/);
  assert.equal(read(`evals/native/${id}/prompt.md`),c.messages.at(-1).content+'\n');
  const lines=read(`evals/native/${id}/history.jsonl`).trim().split('\n').map(l=>JSON.parse(l));
  assert.deepEqual(lines.map(l=>l.message.role),c.messages.slice(0,-1).map(m=>m.role));
  for(let i=1;i<lines.length;i++)assert.equal(lines[i].parentUuid,lines[i-1].uuid);
  const g=read(`evals/native/${id}/graders/essentials.md`);for(const f of c.required_facts)assert.ok(g.includes(f));
 }
});
test('manual mode arguments are documented in the shipped policy',()=>{
 const skill=read('skills/skip-echo/SKILL.md');assert.match(skill,/argument-hint: "\[on\|off\|full\]"/);
 for(const mode of ['`off`','`full`','`on`'])assert.ok(skill.includes(mode));
 assert.ok(read('integrations/cursor/skip-echo.mdc').startsWith('---\ndescription:'));
 assert.ok(read('integrations/AGENTS.md').includes(read('src/response-policy.md').trim()));
});
test('condition suite runs stress cases under A/B/C/D with matching instructions',()=>{
 const stress=json('evals/stress.json');const policy=read('src/response-policy.md').trim();const control=read('evals/control.txt').trim();
 for(const id of stress)for(const cond of ['A','B','C','D']){
  const y=read(`evals/conditions/${id}/${cond}/case.yaml`);assert.match(y,new RegExp(`name: ${id.replace(/[-]/g,'\\-')}\\.${cond}`));
  const system=JSON.parse(y.match(/append_system_prompt: (.*)/)[1]);
  assert.equal(system.includes(control),cond==='B');assert.equal(system.includes(policy),cond==='C');
  assert.match(y,cond==='D'?/plugins: \["\.\.\/\.\.\/\.\.\/\.\."\]/:/plugins: \["baseline-plugin"\]/);
  if(cond!=='D')assert.equal(json(`evals/conditions/${id}/${cond}/baseline-plugin/.claude-plugin/plugin.json`).name,'skip-echo-eval-baseline');
 }
});
