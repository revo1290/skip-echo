import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,realpathSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {measure,tokens,splitCode,runsOf,meterResults,turnsOf,meterTranscript,projectDir} from '../scripts/echo-meter.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const run=(args,opts={})=>spawnSync(process.execPath,[resolve(root,'scripts/echo-meter.mjs'),...args],{encoding:'utf8',timeout:15000,...opts});
const line=o=>JSON.stringify(o);
const user=(content,extra={})=>line({type:'user',isSidechain:false,message:{role:'user',content},...extra});
const assistant=(text,extra={})=>line({type:'assistant',isSidechain:false,message:{role:'assistant',content:[{type:'text',text}]},...extra});
const background='The cache stores session tokens in Redis with a ten minute expiry window for every user.';

test('tokens split CJK by character and Latin by word, case- and width-insensitive',()=>{
 assert.deepEqual(tokens('Redis は ＴＴＬ 600'),['redis','は','ttl','600']);
 assert.deepEqual(tokens('設定変更'),['設','定','変','更']);
});
test('a reply that restates earlier assistant prose is measured as echo; new prose is not',()=>{
 const echo=measure(`${background} The new limit is 50 requests.`,[background]);
 assert.ok(echo.prose_echo>0.5,JSON.stringify(echo));assert.equal(echo.echoed_sentences,1);assert.equal(echo.echoed_chars,background.length);
 const fresh=measure('Raise the connection pool to 50 and keep retries at three attempts each.',[background]);
 assert.equal(fresh.prose_echo,0);assert.equal(fresh.echoed_sentences,0);
});
test('repeating the user this turn is not echo, and code is measured separately',()=>{
 assert.equal(measure(background,[background],background).prose_echo,0);
 const code='cache:\n  ttl: 600\n  max_entries: 1000\n  enabled: true\n';
 const m=measure('Updated:\n```yaml\n'+code+'```\nOnly the ttl changed in this block.',['```yaml\n'+code+'```']);
 assert.equal(m.code_echo,1);assert.equal(m.prose_echo,0);
 {const s=splitCode('a\n```js\nx()\n```\nb');assert.equal(s.code,'x()\n');assert.ok(!s.prose.includes('x()'));}
});
test('headings and short sentences are not judged as echoed sentences',()=>{
 const m=measure('**Remaining checks**\nTests passed.',['**Remaining checks**\nTests passed.']);
 assert.equal(m.echoed_sentences,0);
});
test('Japanese echo is detected at the character level',()=>{
 const prior='アプリ内メモリは各プロセス内、共有ストアは複数プロセスで状態を共有できます。';
 const m=measure(prior+'3台ならRedisは必須ではありません。',[prior]);
 assert.equal(m.echoed_sentences,1);assert.ok(m.prose_echo>0.4);
});
test('result records of every shape in evals/results are read, with conditions and sets as groups',()=>{
 assert.deepEqual(runsOf({runs:[{set:'s',case:'x',arm:'with',output:'a'}]}).map(r=>r.group),['s with']);
 assert.deepEqual(runsOf({results:[{case:'x.B',output:'a'}]}).map(r=>[r.case,r.group]),[['x','B']]);
 assert.deepEqual(runsOf({runs:[{suite:'smoke',results:[{case_id:'x',arm:'without',output:'a'}]}]}).map(r=>r.group),['without']);
 assert.deepEqual(runsOf({cases:[{name:'x',arms:{with:[{output:'a'},{score:1}]}}]}).length,1);
 assert.throws(()=>meterResults({cases:[{name:'x',arms:{with:[{score:1}]}}]}),/No outputs found/);
});
test('recorded results are measured against the case history and compared per case',()=>{
 const r=meterResults({runs:[
  {set:'s',arm:'with',case:'added-constraint-01-en',output:'Redis is not mandatory for three servers if you use sticky sessions.'},
  {set:'s',arm:'without',case:'added-constraint-01-en',output:'In-process memory belongs to each process; a shared store can share state between processes. Redis is not mandatory.'},
  {set:'s',arm:'with',case:'no-such-case',output:'x'}]});
 assert.ok(r.by_group['s without'].mean_prose_echo>r.by_group['s with'].mean_prose_echo,JSON.stringify(r.by_group));
 assert.deepEqual(r.paired,[{a:'s with',b:'s without',cases_where_a_echoes:{lower:1,same:0,higher:0}}]);
 assert.deepEqual(r.cases_not_found,['no-such-case']);
});
test('transcript turns start at real prompts; tool results, meta messages and sidechains are not prompts',()=>{
 const lines=[user('first'),assistant('one'),line({type:'user',message:{role:'user',content:[{type:'tool_result',content:'x'}]}}),assistant('two'),
  user('hook text',{isMeta:true}),assistant('side',{isSidechain:true}),user([{type:'text',text:'second'}]),assistant('three'),'not json'];
 assert.deepEqual(turnsOf(lines),[{user:'first',reply:'one\n\ntwo'},{user:'second',reply:'three'}]);
});
test('a transcript reports echo from turn 2 on, and examples only on request',()=>{
 const text=[user('explain the cache'),assistant(background),user('and the limit?'),assistant(`${background} The limit is 50.`)].join('\n');
 const r=meterTranscript(text);
 assert.equal(r.turns,2);assert.equal(r.turns_with_echoed_sentence,1);assert.equal(r.echoed_chars,background.length);assert.equal('examples' in r,false);
 assert.deepEqual(meterTranscript(text,{examples:true}).examples,[{turn:2,sentence:background}]);
});
test('the CLI reads a directory and --project, prints no text without --examples, and fails cleanly',()=>{
 const dir=realpathSync(mkdtempSync(join(tmpdir(),'skip-echo-meter-')));
 try{
  const cwd=join(dir,'my.project');mkdirSync(cwd);
  const sessions=projectDir(cwd,{CLAUDE_CONFIG_DIR:join(dir,'config')});mkdirSync(sessions,{recursive:true});
  assert.match(sessions,/projects[\\/][^\\/]*-my-project$/);
  writeFileSync(join(sessions,'a.jsonl'),[user('explain'),assistant(background),user('more'),assistant(background)].join('\n'));
  writeFileSync(join(sessions,'b.jsonl'),[user('once'),assistant('single')].join('\n'));
  const env={...process.env,CLAUDE_CONFIG_DIR:join(dir,'config')};
  const p=run(['transcript','--project','--json'],{cwd,env});assert.equal(p.status,0,p.stderr);
  const out=JSON.parse(p.stdout);assert.equal(out.pooled.sessions,1);assert.equal(out.pooled.skipped_single_turn,1);assert.equal(out.sessions[0].echoed_share_of_prose,1);
  const text=run(['transcript',sessions],{env});assert.equal(text.status,0);assert.ok(!text.stdout.includes('session tokens'),text.stdout);
  assert.ok(run(['transcript',sessions,'--examples'],{env}).stdout.includes('session tokens'));
  const missing=run(['transcript','--project'],{cwd:dir,env});assert.equal(missing.status,1);assert.match(missing.stderr,/^echo-meter: no Claude Code sessions/);
  assert.equal(run([]).status,2);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('every recorded result with outputs can be measured',()=>{
 for(const f of ['conditions-pilot-2026-10-05','native-smoke-2026-10-05','native-regression-2026-10-12','safety-rule-2026-10-12']){
  const p=run(['results',`evals/results/${f}.json`,'--json'],{cwd:root});assert.equal(p.status,0,f+p.stderr);
  const out=JSON.parse(p.stdout);assert.ok(Object.keys(out.by_group).length>=2,f);assert.equal(out.cases_not_found,undefined,f);assert.equal(out.holdout_cases_measured,undefined,f);
 }
});
