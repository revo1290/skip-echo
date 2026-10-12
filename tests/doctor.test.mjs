import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync,cpSync,readdirSync} from 'node:fs';
import {resolve,dirname,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {parseDebugLog,skipEchoMode} from '../scripts/doctor.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const temp=()=>mkdtempSync(join(tmpdir(),'skip-echo-doctor-'));
// A clean environment: no developer SKIP_ECHO, not inside Claude Code, and an empty config directory.
function doctor(args=[],{extra={},cwd,script=resolve(root,'scripts/doctor.mjs')}={}){
 const dir=temp();
 try{
  const env={...process.env,CLAUDE_CONFIG_DIR:join(dir,'config'),...extra};
  for(const k of ['SKIP_ECHO','CLAUDECODE'])if(!(k in extra))delete env[k];
  for(const [k,v] of Object.entries(env))if(v===undefined)delete env[k];
  return spawnSync(process.execPath,[script,...args],{cwd:cwd??dir,encoding:'utf8',timeout:15000,env});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
const report=p=>JSON.parse(p.stdout);
const check=(r,id)=>r.checks.filter(c=>c.id===id);

test('doctor passes on this repository and names every check',()=>{
 const p=doctor(['--json']);assert.equal(p.status,0,p.stderr+p.stdout);
 const r=report(p);assert.equal(r.ok,true);assert.equal(r.failures,0);assert.equal(r.version,JSON.parse(read('.claude-plugin/plugin.json')).version);
 for(const id of ['node','plugin','hook-registration','policy','hook-run','skip-echo-env','session-env','standalone-skill'])assert.equal(check(r,id).length,1,id);
 assert.ok(r.checks.filter(c=>c.id!=='hook-time').every(c=>c.status==='ok'||c.status==='info'),JSON.stringify(r.checks));
 assert.match(check(r,'hook-run')[0].message,new RegExp(`would inject ${read('src/response-policy.md').trim().length} characters`));
 assert.equal(check(r,'debug-log').length,0);
});
test('text report ends with a summary and the host check, and keeps the home directory out of paths',()=>{
 const home=dirname(root);
 const p=doctor([],{extra:{HOME:home,USERPROFILE:home}});assert.equal(p.status,0,p.stderr);
 assert.match(p.stdout,/^SkipEcho doctor /);assert.match(p.stdout,/0 failed, 0 warnings\./);
 assert.match(p.stdout,/claude --debug-file skip-echo-debug\.log --init-only/);assert.match(p.stdout,/--debug-log skip-echo-debug\.log/);
 assert.ok(!p.stdout.includes(home+sep),p.stdout);assert.ok(p.stdout.includes('~'+sep)&&p.stdout.includes('$HOME'+sep),p.stdout);
});
test('doctor reports SKIP_ECHO off, unrecognized values, and where it looked',()=>{
 const off=report(doctor(['--json'],{extra:{SKIP_ECHO:'off'}}));assert.equal(off.ok,true);
 assert.match(check(off,'hook-run')[0].message,/injected nothing because SKIP_ECHO is off/);assert.equal(check(off,'skip-echo-env')[0].status,'info');
 const odd=report(doctor(['--json'],{extra:{SKIP_ECHO:'NEVER_ECHO'}}));assert.equal(odd.ok,true);
 assert.equal(check(odd,'skip-echo-env')[0].status,'warn');assert.ok(!JSON.stringify(odd).includes('NEVER_ECHO'));
 const inside=report(doctor(['--json'],{extra:{CLAUDECODE:'1'}}));
 assert.match(check(inside,'skip-echo-env')[0].message,/in this Claude Code session/);assert.equal(check(inside,'session-env').length,0);
});
test('doctor and hook agree on every SKIP_ECHO value',()=>{
 for(const value of ['off','OFF',' off ','0','false','on','1','true','','maybe','no']){
  const env={...process.env,SKIP_ECHO:value};
  const p=spawnSync(process.execPath,[resolve(root,'scripts/session-start.mjs')],{input:'',encoding:'utf8',env});
  assert.equal(p.stdout==='',skipEchoMode(value)==='off',JSON.stringify(value));
 }
 assert.equal(skipEchoMode(undefined),'on');
});
test('doctor warns about a standalone skill installed next to the plugin',()=>{
 const dir=temp();
 try{
  const config=join(dir,'config');const project=join(dir,'project');
  for(const base of [join(config,'skills'),join(project,'.claude','skills')]){mkdirSync(join(base,'skip-echo'),{recursive:true});writeFileSync(join(base,'skip-echo','SKILL.md'),'x');}
  const r=report(doctor(['--json'],{cwd:project,extra:{CLAUDE_CONFIG_DIR:config}}));
  const w=check(r,'standalone-skill')[0];assert.equal(w.status,'warn');assert.equal(r.ok,true);
  // The project path comes from process.cwd(), which resolves symlinks such as macOS /var -> /private/var, so match only its tail.
  assert.ok(w.message.includes(join(config,'skills','skip-echo','SKILL.md'))&&w.message.includes(join('project','.claude','skills','skip-echo','SKILL.md')),w.message);
  // Without CLAUDE_CONFIG_DIR the user skills directory is ~/.claude/skills, reported with ~.
  mkdirSync(join(dir,'h','.claude','skills','skip-echo'),{recursive:true});writeFileSync(join(dir,'h','.claude','skills','skip-echo','SKILL.md'),'x');
  const found=report(doctor(['--json'],{cwd:dir,extra:{CLAUDE_CONFIG_DIR:undefined,HOME:join(dir,'h'),USERPROFILE:join(dir,'h')}}));
  assert.equal(check(found,'standalone-skill')[0].message,`a standalone skip-echo skill is also installed: ${join('~','.claude','skills','skip-echo','SKILL.md')}`);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('doctor fails, with exit code 1, on a broken copy of the plugin',()=>{
 const dir=temp();
 try{
  for(const d of ['.claude-plugin','hooks','scripts'])cpSync(resolve(root,d),join(dir,d),{recursive:true});
  rmSync(join(dir,'scripts','policy.generated.mjs'));writeFileSync(join(dir,'hooks','hooks.json'),'{"hooks":{}}');
  const p=doctor(['--json'],{script:join(dir,'scripts','doctor.mjs')});assert.equal(p.status,1,p.stdout);
  const r=report(p);assert.equal(r.ok,false);
  for(const id of ['policy','hook-registration','hook-run'])assert.equal(check(r,id)[0].status,'fail',id);
  assert.match(check(r,'hook-run')[0].message,/printed no policy: SkipEcho: policy unavailable/);
  assert.ok(r.checks.filter(c=>c.status==='fail').every(c=>c.hint),'every failure has a hint');
 }finally{rmSync(dir,{recursive:true,force:true});}
});

// Line formats copied from a Claude Code 2.1.296 debug log (`claude --debug-file <file> --init-only`); paths replaced.
const T='2026-10-12T16:22:25.';
const plugin=(ms,source='startup',status='finished with status 0 (64ms)')=>`${T}${ms}Z [DEBUG] Hooks: SessionStart:${source} [node "/p/skip-echo/scripts/session-start.mjs"] (plugin skip-echo@skip-echo-marketplace) ${status}`;
const settings=ms=>`${T}${ms}Z [DEBUG] Hooks: SessionStart:startup [node "/p/skip-echo/scripts/session-start.mjs"] finished with status 0 (65ms)`;
const provided=(cmd,n=3905)=>`${T}700Z [DEBUG] Hook SessionStart (node "${cmd}/scripts/session-start.mjs") provided additionalContext (${n} chars)`;
const noise=[`${T}100Z [DEBUG] Hooks: Checking first line for async: {"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"Apply SkipEcho"}}`,`${T}101Z [DEBUG] Hooks: SessionStart:startup [node "/other/hook.mjs"] (plugin other@x) finished with status 0 (5ms)`,`${T}102Z [DEBUG] Hook SessionStart (node "/other/hook.mjs") provided additionalContext (12 chars)`,`${T}103Z [DEBUG] "Hook SessionStart:startup (SessionStart) success:\\n{\\"hookSpecificOutput\\":{}}"`];
test('debug log parser pairs runs with delivered context and ignores other hooks',()=>{
 const {runs,unavailable}=parseDebugLog([...noise,plugin(200),provided('${CLAUDE_PLUGIN_ROOT}')].join('\n'));
 assert.equal(unavailable,0);assert.deepEqual(runs,[{time:T+'200Z',source:'startup',origin:'plugin skip-echo@skip-echo-marketplace',outcome:'finished with status 0',ok:true,ms:64,contextChars:3905}]);
 // Interleaved: settings hook and plugin hook finish before either context line.
 const both=parseDebugLog([settings(200),plugin(201),provided('${CLAUDE_PLUGIN_ROOT}',3905),provided('/p/skip-echo',3900)].join('\n')).runs;
 assert.deepEqual(both.map(r=>[r.origin,r.contextChars]),[['settings or another hook file',3900],['plugin skip-echo@skip-echo-marketplace',3905]]);
 const off=parseDebugLog([plugin(200),plugin(900,'compact'),provided('${CLAUDE_PLUGIN_ROOT}')].join('\n')).runs;
 assert.deepEqual(off.map(r=>[r.source,r.contextChars]),[['startup',null],['compact',3905]]);
 const slow=parseDebugLog(plugin(200,'resume','timed out after 5000ms')).runs[0];assert.equal(slow.ok,false);assert.equal(slow.outcome,'timed out after 5000ms');assert.equal(slow.ms,null);
 assert.equal(parseDebugLog(`${T}1Z [DEBUG] "Hook SessionStart:startup (SessionStart) success:\\nstderr:\\nSkipEcho: policy unavailable; continuing without response guidance."`).unavailable,1);
});
test('doctor --debug-log reports delivery, suppression, duplicates, and missing evidence',()=>{
 const dir=temp();
 const log=(name,lines)=>{const f=join(dir,name);writeFileSync(f,lines.join('\n'));return f;};
 try{
  const ok=report(doctor(['--json','--debug-log',log('ok.log',[...noise,plugin(200),provided('${CLAUDE_PLUGIN_ROOT}',read('src/response-policy.md').trim().length)])]));
  assert.equal(ok.ok,true);assert.equal(check(ok,'debug-log')[0].status,'ok');assert.match(check(ok,'debug-log')[0].message,/policy delivered \(\d+ characters\)$/);
  const off=report(doctor(['--json','--debug-log',log('off.log',[plugin(200)])]));assert.equal(off.ok,true);assert.equal(check(off,'debug-log')[0].status,'info');
  const dup=report(doctor(['--json','--debug-log',log('dup.log',[settings(200),provided('/p/skip-echo'),plugin(201),provided('${CLAUDE_PLUGIN_ROOT}')])]));
  assert.ok(check(dup,'debug-log').some(c=>c.status==='warn'&&/ran twice for one startup event/.test(c.message)));
  const old=report(doctor(['--json','--debug-log',log('old.log',[plugin(200),provided('${CLAUDE_PLUGIN_ROOT}',100)])]));assert.match(check(old,'debug-log')[0].message,/may come from another version/);
  for(const [name,lines] of [['empty.log',noise],['bad.log',[plugin(200,'startup','finished with status 1 (9ms)')]]]){const p=doctor(['--json','--debug-log',log(name,lines)]);assert.equal(p.status,1,name);assert.equal(check(report(p),'debug-log')[0].status,'fail',name);}
  const missing=doctor(['--json','--debug-log',join(dir,'nope.log')]);assert.equal(missing.status,1);assert.match(check(report(missing),'debug-log')[0].message,/cannot read/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('doctor rejects unknown arguments and a missing log path',()=>{
 for(const args of [['--nope'],['extra'],['--debug-log'],['--debug-log','--json']])assert.equal(doctor(args).status,2,args.join(' '));
 const help=doctor(['--help']);assert.equal(help.status,0);assert.match(help.stdout,/^Usage: node scripts\/doctor\.mjs/);
});
test('the /skip-echo:doctor command runs only the doctor and is never model-invoked',()=>{
 const cmd=read('commands/doctor.md');const front=cmd.split('---')[1];
 assert.match(front,/^description: \S/m);assert.match(front,/^disable-model-invocation: true$/m);assert.match(front,/^argument-hint: "\[--debug-log <file>\]"$/m);
 assert.ok(cmd.includes('node "${CLAUDE_PLUGIN_ROOT}/scripts/doctor.mjs"'));assert.ok(cmd.includes('$ARGUMENTS'));
});
test('the repository ships exactly two SKILL.md copies, so skill discovery still finds one skill',()=>{
 const walk=d=>readdirSync(d,{withFileTypes:true}).flatMap(e=>['.git','node_modules'].includes(e.name)?[]:e.isDirectory()?walk(join(d,e.name)):e.name==='SKILL.md'?[join(d,e.name).slice(root.length+1).split(sep).join('/')]:[]);
 assert.deepEqual(walk(root).sort(),['SKILL.md','skills/skip-echo/SKILL.md']);
});
