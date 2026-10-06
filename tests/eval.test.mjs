import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function score(rows){const d=mkdtempSync(join(tmpdir(),'skip-echo-score-'));try{const f=join(d,'annotations.json');writeFileSync(f,JSON.stringify(rows));return spawnSync(process.execPath,[resolve(root,'scripts/score-eval.mjs'),f],{encoding:'utf8'});}finally{rmSync(d,{recursive:true,force:true});}}
const row=(condition,n)=>({case_id:'artifact-01-en',condition,repeat:1,model_exact:'synthetic-test-model',client_version:'synthetic-test-client',output:'synthetic unit-test fixture only',required:[true,true,true,true],critical_omissions:0,unnecessary_repetitions:n,self_contained:true,human_reviewed:true});
test('scoring calculates paired reductions and handles baseline zero separately',()=>{
 const p=score([row('B',4),row('C',2),row('D',0)]);assert.equal(p.status,0,p.stderr);const a=JSON.parse(p.stdout);assert.equal(a.comparisons.C.median_repetition_reduction,0.5);assert.equal(a.comparisons.D.median_repetition_reduction,1);
 const z=JSON.parse(score([row('B',0),row('C',0),row('D',1)]).stdout);assert.equal(z.comparisons.C.median_repetition_reduction,null);assert.equal(z.comparisons.C.zero_B.equal,1);assert.equal(z.comparisons.D.zero_B.worse,1);
});
test('scoring refuses missing fact grades, duplicates and AI-only review',()=>{
 for(const rows of [[{...row('C',0),required:[]}],[row('C',0),row('C',0)],[{...row('C',0),human_reviewed:false}]])assert.notEqual(score(rows).status,0);
});
test('preparation creates four conditions without leaking rubric into model messages',()=>{
 const p=spawnSync(process.execPath,[resolve(root,'scripts/prepare-eval.mjs'),'smoke','1'],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);
 const jobs=JSON.parse(readFileSync(resolve(root,'evals/runs/smoke-1/jobs.json')));assert.equal(jobs.length,56);assert.equal(new Set(jobs.map(j=>j.id)).size,56);
 for(const j of jobs){assert.ok(!('required_facts' in j));assert.equal(j.messages.length,5);if(j.condition==='D'){assert.equal(j.instruction,null);assert.equal(j.environment,'installed-plugin-no-manual-invocation');}}
});

function summarize(doc,...extra){const d=mkdtempSync(join(tmpdir(),'skip-echo-sum-'));try{const f=join(d,'aggregate.json');writeFileSync(f,JSON.stringify(doc));return spawnSync(process.execPath,[resolve(root,'scripts/summarize-native.mjs'),f,...extra],{encoding:'utf8'});}finally{rmSync(d,{recursive:true,force:true});}}
const run=(passes)=>({score:1,error:null,graders:passes.map((p,i)=>({name:'no-echo-'+(i+1),passed:p}))});
test('ceiling check passes only when the baseline fails enough no-echo graders, and flags saturated categories',()=>{
 const doc=(without,partial=false)=>({partial,cases:[{name:'tool-report-01-en',arms:{with:[run([true,true])],without:[run(without)]}},{name:'safety-01-en',arms:{with:[run([true])],without:[run([true])]}}]});
 const ok=JSON.parse(summarize(doc([false,false]),'--ceiling','0.6').stdout);
 assert.equal(ok.ceiling_check.baseline_no_echo_pass,0.333);assert.equal(ok.ceiling_check.met,true);assert.deepEqual(ok.ceiling_check.categories_where_baseline_passes_every_no_echo,['safety']);
 assert.equal(JSON.parse(summarize(doc([true,true]),'--ceiling','0.6').stdout).ceiling_check.met,false);
 assert.equal(JSON.parse(summarize(doc([false,false],true),'--ceiling','0.6').stdout).ceiling_check.met,null);
 assert.equal(JSON.parse(summarize(doc([false,false])).stdout).ceiling_check,undefined);
 assert.notEqual(summarize(doc([false,false]),'--ceiling','2').status,0);
});
