import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {parseRun,summarize,totalInput,ARMS,breakEven,PRICES} from '../scripts/measure-cost.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const result=(extra={})=>({type:'result',session_id:'s',is_error:false,num_turns:1,result:'OK',total_cost_usd:0.03,duration_ms:2000,ttft_ms:1900,
 usage:{input_tokens:2,cache_creation_input_tokens:7000,cache_read_input_tokens:8600,output_tokens:100},...extra});

test('total input counts uncached, cache-write and cache-read tokens',()=>{
 assert.equal(totalInput({input_tokens:2,cache_creation_input_tokens:7000,cache_read_input_tokens:8600}),15602);
 assert.equal(totalInput({}),0);
});
test('parseRun reads the final result of claude -p JSON output and counts Skill calls',()=>{
 const out=JSON.stringify([{type:'system',subtype:'init'},{type:'assistant',message:{content:[{type:'tool_use',name:'Skill',input:{skill:'skip-echo'}}]}},result()]);
 const r=parseRun(out);
 assert.equal(r.total_input_tokens,15602);assert.equal(r.usage.output_tokens,100);assert.equal(r.cost_usd,0.03);assert.deepEqual(r.skill_calls,['skip-echo']);assert.equal(r.reply_chars,2);
 assert.equal(parseRun(JSON.stringify(result())).num_turns,1);
 assert.throws(()=>parseRun('[]'),/no result/);
});
test('summarize reports medians per arm and turn and the input-token deltas between arms',()=>{
 const rec=(arm,turn,tin,extra={})=>({arm,turn,total_input_tokens:tin,usage:{output_tokens:100},cost_usd:0.01,duration_ms:2000,ttft_ms:1900,skill_calls:[],hook:null,...extra});
 const rows=[];
 for(const t of [1,2])rows.push(rec('none',t,14300),rec('none',t,14320),rec('plugin',t,15630),rec('plugin',t,15640),rec('plugin-off',t,14460),rec('plugin+skill',t,15780),rec('plugin+skill',t,1,{error:'x'}));
 const s=summarize(rows);
 assert.equal(s.by_arm_turn['none turn 1'].median_total_input_tokens,14310);assert.equal(s.by_arm_turn['plugin+skill turn 1'].n,1);
 assert.deepEqual(s.input_token_deltas['turn 2'],{plugin_vs_none:1325,policy_only:1175,listings_only:150,duplicate_skill_vs_plugin:145});
 assert.deepEqual(ARMS,['none','plugin','plugin-off','plugin+skill']);
});
test('each committed cost record is complete, isolated, and shows the hook only where it should',()=>{
 for(const name of readdirSync(resolve(root,'evals/results')).filter(n=>/^cost-.*\.json$/.test(n))){
 const d=JSON.parse(readFileSync(resolve(root,'evals/results',name),'utf8'));
 assert.equal(d.partial,false);assert.ok(d.records.every(r=>!r.error));
 for(const r of d.records){
  // The record was made with the policy of its date, not necessarily the current one.
  if(r.arm==='plugin'||r.arm==='plugin+skill')assert.equal(r.hook.context_chars,d.records.find(x=>x.arm==='plugin').hook.context_chars,JSON.stringify(r.hook));
  else if(r.arm==='plugin-off')assert.equal(r.hook.context_chars,null);
  else assert.equal(r.hook,null);
 }
 }
});
test('the CLI refuses invalid options before calling claude',()=>{
 const p=spawnSync(process.execPath,[resolve(root,'scripts/measure-cost.mjs'),'--runs','0'],{encoding:'utf8',env:{...process.env,PATH:''}});
 assert.equal(p.status,1);assert.match(p.stderr,/^measure-cost: --runs/);
});
test('break-even converts input overhead into output tokens to save per turn under each cache regime',()=>{
 const b=breakEven(1000,PRICES.published);
 assert.deepEqual(b.output_tokens_to_save_per_turn,{cache_read:20,cache_rewrite_1h:400,uncached:200});
 assert.equal(b.one_time_first_turn_write_usd,0.004);
 assert.equal(breakEven(1000,PRICES.implied).output_tokens_to_save_per_turn.cache_read,10);
});
