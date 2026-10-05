// Manual semantic annotations, never keyword-based grading. See evals/rubric.md.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const file=process.argv[2];
if(!file) throw new Error('Usage: node scripts/score-eval.mjs annotations.json');
const rows=JSON.parse(readFileSync(file));
if(!Array.isArray(rows)||!rows.length) throw new Error('Annotations must be a nonempty array');
const keys=new Set();
for(const r of rows){
 const key=`${r.case_id}:${r.condition}:${r.repeat}`;
 if(keys.has(key)) throw new Error('Duplicate annotation');keys.add(key);
 const c=JSON.parse(readFileSync(resolve(root,'evals/cases',r.case_id+'.json')));
 if(!['A','B','C','D'].includes(r.condition)||!Number.isInteger(r.repeat)||r.repeat<1) throw new Error('Invalid condition/repeat');
 if(!Array.isArray(r.required)||r.required.length!==c.required_facts.length||r.required.some(x=>typeof x!=='boolean')) throw new Error('Grade every required fact with a boolean');
 if(!Number.isInteger(r.critical_omissions)||r.critical_omissions<0||!Number.isInteger(r.unnecessary_repetitions)||r.unnecessary_repetitions<0||typeof r.self_contained!=='boolean') throw new Error('Invalid semantic scores');
 if(r.human_reviewed!==true||typeof r.output!=='string'||!r.output.trim()||!r.model_exact||!r.client_version) throw new Error('Human review, raw output, model and client are required');
}
if(new Set(rows.map(r=>r.model_exact)).size!==1||new Set(rows.map(r=>r.client_version)).size!==1) throw new Error('Score one model and client version at a time');
const stats={};
for(const condition of ['A','B','C','D']){
 const group=rows.filter(r=>r.condition===condition);
 if(!group.length) continue;
 stats[condition]={n:group.length,required_retention:group.flatMap(r=>r.required).filter(Boolean).length/group.flatMap(r=>r.required).length,critical_omissions:group.reduce((n,r)=>n+r.critical_omissions,0),self_contained_rate:group.filter(r=>r.self_contained).length/group.length};
}
const median=a=>{a.sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;};
const comparisons={};
for(const condition of ['C','D']){
 const deltas=[],zero={equal:0,worse:0};let matched=0;
 for(const r of rows.filter(r=>r.condition===condition)){
  const b=rows.find(b=>b.condition==='B'&&b.case_id===r.case_id&&b.repeat===r.repeat);
  if(!b)continue;matched++;
  if(b.unnecessary_repetitions===0) zero[r.unnecessary_repetitions===0?'equal':'worse']++;
  else deltas.push((b.unnecessary_repetitions-r.unnecessary_repetitions)/b.unnecessary_repetitions);
 }
 comparisons[condition]={matched_pairs:matched,nonzero_B_pairs:deltas.length,median_repetition_reduction:deltas.length?median(deltas):null,zero_B:zero};
}
console.log(JSON.stringify({stats,comparisons,release_gate:'NOT_ASSESSED: also requires complete holdout, category review, lifecycle evidence and cost disclosures'},null,2));
