// Local diagnostics for the SkipEcho plugin: node scripts/doctor.mjs [--json] [--debug-log <file>]
// Reads only this plugin's own files, the SKIP_ECHO variable, whether a standalone skip-echo skill exists,
// and a Claude Code debug log when one is passed explicitly. Prints no policy text and shortens the home directory to ~.
// No network, no model call, nothing written. Exit code 1 when a check fails.
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { dirname, resolve, join, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SOURCES = ['startup', 'resume', 'clear', 'compact', 'fork'];
const MIN_NODE = 22;
// build.mjs and the hook refuse longer policies; Claude Code caps additionalContext at 10,000 characters.
const POLICY_LIMIT = 9000;
const HOOK_TIMEOUT_MS = 5000;
// Must match scripts/session-start.mjs; tests/doctor.test.mjs checks that they agree.
export const skipEchoMode = value => {
 const v = (value ?? '').trim().toLowerCase();
 return ['off', '0', 'false'].includes(v) ? 'off' : ['', 'on', '1', 'true'].includes(v) ? 'on' : 'unrecognized';
};

// Debug log lines written by Claude Code 2.1.296 (see docs/troubleshooting.md):
//   Hooks: SessionStart:startup [node ".../scripts/session-start.mjs"] (plugin skip-echo@...) finished with status 0 (71ms)
//   Hook SessionStart (node "${CLAUDE_PLUGIN_ROOT}/scripts/session-start.mjs") provided additionalContext (3905 chars)
const FINISHED = /^(\S+) .*?Hooks: SessionStart:(\w+) \[[^\]]*session-start\.mjs[^\]]*\](?: \(plugin ([^)]+)\))? (finished with status (\d+)|timed out after \d+ms|cancelled|failed to start|moved to the background)(?: \((\d+)ms\))?/;
const PROVIDED = /Hook SessionStart \([^)]*session-start\.mjs[^)]*\) provided additionalContext \((\d+) chars\)/;

export function parseDebugLog(text) {
 const runs = [];
 let unavailable = 0;
 for (const line of text.split('\n')) {
  const f = line.match(FINISHED);
  if (f) { runs.push({ time: f[1], source: f[2], origin: f[3] ? `plugin ${f[3]}` : 'settings or another hook file', outcome: f[4], ok: f[5] === '0', ms: f[6] ? Number(f[6]) : null, contextChars: null }); continue; }
  const p = line.match(PROVIDED);
  // A plugin hook is logged with the unexpanded ${CLAUDE_PLUGIN_ROOT}; pair each context line with the latest run of the same origin.
  if (p) { const plugin = line.includes('${CLAUDE_PLUGIN_ROOT}'); const run = runs.findLast(r => r.contextChars === null && r.origin.startsWith('plugin ') === plugin); if (run) run.contextChars = Number(p[1]); continue; }
  if (line.includes('SkipEcho: policy unavailable')) unavailable++;
 }
 return { runs, unavailable };
}

export async function diagnose({ root, env = process.env, cwd = process.cwd(), home = homedir(), debugLog = null }) {
 const checks = [];
 const add = (id, status, message, hint) => checks.push({ id, status, message, ...(hint && { hint }) });
 const tilde = p => home && (p === home || p.startsWith(home + sep)) ? '~' + p.slice(home.length) : p;
 const mode = skipEchoMode(env.SKIP_ECHO);
 const insideClaude = env.CLAUDECODE === '1';

 const major = Number(process.versions.node.split('.')[0]);
 if (major >= MIN_NODE) add('node', 'ok', `Node.js ${process.versions.node}`);
 else add('node', 'warn', `Node.js ${process.versions.node} is older than ${MIN_NODE}, the oldest version this project tests`, 'Install Node.js 22 or later on the PATH that Claude Code uses for hooks.');

 let version = null;
 try {
  const manifest = JSON.parse(readFileSync(join(root, '.claude-plugin/plugin.json'), 'utf8'));
  if (manifest.name !== 'skip-echo') throw new Error();
  version = manifest.version ?? null;
  add('plugin', 'ok', `skip-echo ${version ?? '(no version)'} at ${tilde(root)}`);
 } catch {
  add('plugin', 'fail', `no skip-echo plugin manifest at ${tilde(root)}`, 'Run the doctor from the plugin directory, or reinstall the plugin.');
 }

 try {
  const sessionStart = JSON.parse(readFileSync(join(root, 'hooks/hooks.json'), 'utf8')).hooks?.SessionStart ?? [];
  const entries = sessionStart.flatMap(e => (e.hooks ?? []).map(h => ({ matcher: e.matcher, ...h }))).filter(h => /session-start\.mjs/.test(h.command ?? ''));
  if (entries.length !== 1) throw new Error(`${entries.length} SessionStart entries run session-start.mjs; expected 1`);
  const missing = SOURCES.filter(s => !new RegExp(entries[0].matcher ?? '').test(s));
  if (missing.length) add('hook-registration', 'warn', `the SessionStart matcher skips ${missing.join(', ')}`, 'Reinstall the plugin; the shipped matcher covers all five sources.');
  else add('hook-registration', 'ok', `SessionStart hook registered for ${SOURCES.join(', ')}`);
 } catch (e) {
  add('hook-registration', 'fail', `hooks/hooks.json: ${e.message || 'missing or not JSON'}`, 'Reinstall the plugin.');
 }

 let policy = null;
 try {
  policy = (await import(pathToFileURL(join(root, 'scripts/policy.generated.mjs')).href)).default;
  if (typeof policy !== 'string' || !policy.trim()) throw new Error('the generated policy module is empty');
  if (policy.length > POLICY_LIMIT) throw new Error(`the policy has ${policy.length} characters; the limit is ${POLICY_LIMIT}`);
  add('policy', 'ok', `policy ${policy.length} characters, sha256 ${createHash('sha256').update(policy).digest('hex').slice(0, 12)}`);
  const source = join(root, 'src/response-policy.md');
  if (existsSync(source) && readFileSync(source, 'utf8').trim() !== policy) add('policy-source', 'warn', 'scripts/policy.generated.mjs differs from src/response-policy.md', 'Run node scripts/build.mjs.');
 } catch (e) {
  policy = null;
  add('policy', 'fail', `cannot load scripts/policy.generated.mjs: ${e.message?.split('\n')[0] || 'unknown error'}`, 'Reinstall the plugin. The hook fails open, so sessions continue without the policy.');
 }

 const started = Date.now();
 const run = spawnSync(process.execPath, [join(root, 'scripts/session-start.mjs')], { input: '', encoding: 'utf8', timeout: HOOK_TIMEOUT_MS, env });
 const ms = Date.now() - started;
 if (run.error || run.status !== 0) {
  add('hook-run', 'fail', `the hook script did not finish cleanly (${run.error ? run.error.code ?? run.error.message : `status ${run.status}`})`, 'Check that scripts/session-start.mjs exists and that node runs it.');
 } else if (!run.stdout.trim()) {
  if (mode === 'off') add('hook-run', 'ok', `the hook ran in ${ms} ms and injected nothing because SKIP_ECHO is off`);
  else add('hook-run', 'fail', `the hook ran in ${ms} ms but printed no policy${run.stderr.trim() ? `: ${run.stderr.trim().split('\n')[0]}` : ''}`, 'Reinstall the plugin.');
 } else {
  let context = null;
  try { const out = JSON.parse(run.stdout).hookSpecificOutput; if (out?.hookEventName === 'SessionStart') context = out.additionalContext; } catch {}
  if (typeof context !== 'string') add('hook-run', 'fail', 'the hook printed output that Claude Code would not accept as SessionStart context', 'Reinstall the plugin.');
  else if (policy !== null && context !== policy) add('hook-run', 'fail', 'the hook injected text that differs from the policy module', 'Reinstall the plugin.');
  else add('hook-run', 'ok', `the hook ran in ${ms} ms and would inject ${context.length} characters`);
 }
 if (ms > HOOK_TIMEOUT_MS / 2) add('hook-time', 'warn', `the hook took ${ms} ms; Claude Code stops it after ${HOOK_TIMEOUT_MS / 1000} s`, 'A slow first start of Node.js is the usual cause; run the doctor again to compare.');

 const seen = insideClaude ? 'in this Claude Code session' : 'in this shell';
 if (mode === 'off') add('skip-echo-env', 'info', `SKIP_ECHO is off ${seen}: the hook injects nothing; /skip-echo still loads the policy on request`);
 else if (mode === 'unrecognized') add('skip-echo-env', 'warn', `SKIP_ECHO has an unrecognized value ${seen}; the hook ignores it and injects the policy`, 'Set SKIP_ECHO to on or off.');
 else add('skip-echo-env', 'ok', `SKIP_ECHO is ${env.SKIP_ECHO === undefined ? 'not set' : 'on'} ${seen}: the hook injects the policy`);
 if (!insideClaude) add('session-env', 'info', 'settings files can set SKIP_ECHO under "env", which this shell does not see', 'Run /skip-echo:doctor inside Claude Code to check the value a session uses.');

 const configDir = env.CLAUDE_CONFIG_DIR || join(home, '.claude');
 const copies = [join(configDir, 'skills', 'skip-echo', 'SKILL.md'), join(cwd, '.claude', 'skills', 'skip-echo', 'SKILL.md')].filter(p => existsSync(p));
 if (copies.length) add('standalone-skill', 'warn', `a standalone skip-echo skill is also installed: ${copies.map(tilde).join(', ')}`, 'With the plugin installed, remove the standalone copy; otherwise the policy can be loaded twice.');
 else add('standalone-skill', 'ok', 'no standalone skip-echo skill in the user or project skills directory');

 if (debugLog !== null) {
  let text = null;
  try { text = readFileSync(resolve(cwd, debugLog), 'utf8'); } catch { add('debug-log', 'fail', `cannot read ${tilde(resolve(cwd, debugLog))}`); }
  if (text !== null) {
   const { runs, unavailable } = parseDebugLog(text);
   if (!runs.length) add('debug-log', 'fail', 'the log has no SkipEcho SessionStart run', 'Check that the plugin is enabled (claude plugin list) and that the log comes from Claude Code 2.1.296 or later, which writes "Hooks: SessionStart" lines.');
   for (const r of runs) {
    const what = `${r.source}: hook ${r.outcome}${r.ms !== null ? ` in ${r.ms} ms` : ''} (${r.origin})`;
    if (!r.ok) add('debug-log', 'fail', what, 'Run the doctor without --debug-log to check the hook script itself.');
    else if (r.contextChars === null) add('debug-log', 'info', `${what}; no policy delivered, as expected when SKIP_ECHO is off`);
    else add('debug-log', 'ok', `${what}; policy delivered (${r.contextChars} characters)${policy !== null && r.contextChars !== policy.length ? `; this copy has ${policy.length}, so the log may come from another version` : ''}`);
   }
   // One session start runs each matching hook once; two runs within seconds for one source mean a second registration.
   for (let i = 1; i < runs.length; i++) {
    if (runs[i].source === runs[i - 1].source && Math.abs(Date.parse(runs[i].time) - Date.parse(runs[i - 1].time)) < 3000) {
     add('debug-log', 'warn', `the hook ran twice for one ${runs[i].source} event (${runs[i - 1].origin}; ${runs[i].origin})`, 'Remove the extra registration: a hook copied into settings, or a second copy of the plugin.');
     break;
    }
   }
   if (unavailable) add('debug-log', 'fail', 'the hook reported that the policy was unavailable', 'Reinstall the plugin.');
  }
 }

 const count = status => checks.filter(c => c.status === status).length;
 return { tool: 'skip-echo doctor', version, node: process.versions.node, ok: count('fail') === 0, failures: count('fail'), warnings: count('warn'), checks };
}

export function formatReport(report, script) {
 const lines = [`SkipEcho doctor ${report.version ?? ''}`.trim()];
 const width = Math.max(...report.checks.map(c => c.id.length));
 for (const c of report.checks) {
  lines.push(`  ${c.status.padEnd(4)}  ${c.id.padEnd(width)}  ${c.message}`);
  if (c.hint) lines.push(`        ${' '.repeat(width)}  hint: ${c.hint}`);
 }
 lines.push('', `${report.failures} failed, ${report.warnings} warning${report.warnings === 1 ? '' : 's'}.`);
 if (!report.checks.some(c => c.id === 'debug-log')) lines.push(
  'These checks run outside Claude Code\'s session start. To confirm that Claude Code ran the hook and received the policy:',
  '  claude --debug-file skip-echo-debug.log --init-only',
  `  node "${script}" --debug-log skip-echo-debug.log`
 );
 return lines.join('\n') + '\n';
}

// Node resolves symlinks in the main module's path (macOS /var -> /private/var, a symlinked ~/.claude), so compare real paths.
const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (isMain()) {
 const args = process.argv.slice(2);
 const usage = 'Usage: node scripts/doctor.mjs [--json] [--debug-log <file>]';
 const at = args.indexOf('--debug-log');
 const debugLog = at === -1 ? null : args[at + 1];
 const unknown = args.filter((a, i) => a !== '--json' && a !== '--debug-log' && !(at !== -1 && i === at + 1));
 if (args.includes('--help') || args.includes('-h')) { process.stdout.write(usage + '\n'); }
 else if (unknown.length || (at !== -1 && (!debugLog || debugLog.startsWith('--')))) { process.stderr.write(usage + '\n'); process.exitCode = 2; }
 else {
  const script = fileURLToPath(import.meta.url);
  const report = await diagnose({ root: resolve(dirname(script), '..'), debugLog });
  // $HOME expands inside double quotes in bash, zsh, and PowerShell, and keeps the user name out of pasted reports.
  const home = homedir();
  process.stdout.write(args.includes('--json') ? JSON.stringify(report, null, 2) + '\n' : formatReport(report, home && script.startsWith(home + sep) ? '$HOME' + script.slice(home.length) : script));
  process.exitCode = report.ok ? 0 : 1;
 }
}
