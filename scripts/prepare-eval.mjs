import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const selection = process.argv[2] ?? 'smoke';
if (!['smoke','dev','holdout'].includes(selection)) throw new Error('Use smoke, dev, or holdout');
const repetitions = Number(process.argv[3] ?? 1);
if (!Number.isInteger(repetitions) || repetitions < 1 || repetitions > 10) throw new Error('Repetitions: 1–10');
const manifest = JSON.parse(readFileSync(resolve(root, 'evals/manifest.json')));
const smoke = JSON.parse(readFileSync(resolve(root, 'evals/smoke.json')));
const policy = readFileSync(resolve(root, 'src/response-policy.md'), 'utf8').trim();
const control = readFileSync(resolve(root, 'evals/control.txt'), 'utf8').trim();
const selected = manifest.cases.filter(c => selection === 'smoke' ? smoke.includes(c.id) : c.split === selection);
const jobs=[];
for (const item of selected) {
 const bytes = readFileSync(resolve(root, 'evals/cases', item.id+'.json'));
 if (createHash('sha256').update(bytes).digest('hex') !== item.sha256) throw new Error('Case changed after freeze: '+item.id);
 const c=JSON.parse(bytes);
 for(let repeat=1;repeat<=repetitions;repeat++) for(const condition of ['A','B','C','D']) {
  const id=createHash('sha256').update(`${c.id}:${condition}:${repeat}`).digest('hex').slice(0,16);
  jobs.push({id,case_id:c.id,condition,repeat,mode:'fixed-history',messages:c.messages,
   instruction: condition==='B'?control:condition==='C'?policy:null,
   environment:condition==='D'?'installed-plugin-no-manual-invocation':'plugin-and-skill-disabled',
   required_capture:['model_exact','client_version','os','node_version','raw_output','usage_or_null','latency_ms_or_null','hook_context_evidence_or_null']});
 }
}
// Deterministic shuffled order; scoring packets omit the condition and instructions.
jobs.sort((a,b)=>a.id.localeCompare(b.id));
const out=resolve(root,'evals/runs',selection+'-'+repetitions);
mkdirSync(out,{recursive:true});
writeFileSync(resolve(out,'jobs.json'),JSON.stringify(jobs,null,2)+'\n');
writeFileSync(resolve(out,'blind-template.json'),JSON.stringify(jobs.map(j=>({id:j.id,case_id:j.case_id,output:null})),null,2)+'\n');
console.log(JSON.stringify({directory:out,jobs:jobs.length,executed:0}));
