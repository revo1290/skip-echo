// Measures what SkipEcho adds to each request, from the usage Claude Code itself reports (issue #6).
//   node scripts/measure-cost.mjs [--runs 3] [--model claude-sonnet-5-5] [--max-cost-usd 2] [--out file.json]
//   node scripts/measure-cost.mjs --summarize <record.json>     recompute the summary of a saved record, no calls
// Runs `claude -p` in throwaway directories, two turns per session (the second through --resume), under four arms:
//   none          no plugin
//   plugin        this checkout through --plugin-dir
//   plugin-off    the same with SKIP_ECHO=off: skill and command listings only, no policy
//   plugin+skill  the plugin plus a project copy of the standalone skill (the duplicate route of #9)
// User settings, user plugins and MCP servers are excluded (--setting-sources project, --strict-mcp-config), so the
// arms differ only by SkipEcho. Every call is billed to the account running it; the run stops at --max-cost-usd.
// Records raw usage, cost, latency, and hook evidence parsed from a debug log; never estimates tokens from characters.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDebugLog } from './doctor.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const ARMS = ['none', 'plugin', 'plugin-off', 'plugin+skill'];
// Short, ordinary follow-up so output stays small; the second turn is where an unchanged policy is re-read.
export const PROMPTS = ['In two sentences: what does a TTL on a Redis key do?', 'And what happens to the key when it expires? Two sentences.'];

export const totalInput = u => (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
const median = xs => { const a = xs.filter(x => x != null).sort((x, y) => x - y); if (!a.length) return null; const m = a.length >> 1; return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };

// claude -p --output-format json prints an array of messages ending with the result.
export function parseRun(stdout) {
 const doc = JSON.parse(stdout);
 const msgs = Array.isArray(doc) ? doc : [doc];
 const result = msgs.findLast(m => m.type === 'result');
 if (!result) throw new Error('no result message');
 const skillCalls = msgs.filter(m => m.type === 'assistant').flatMap(m => m.message?.content ?? []).filter(b => b.type === 'tool_use' && b.name === 'Skill').map(b => b.input?.skill ?? b.input?.name ?? null);
 const u = result.usage ?? {};
 return {
  session_id: result.session_id, is_error: result.is_error, num_turns: result.num_turns,
  usage: { input_tokens: u.input_tokens ?? 0, cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0, cache_read_input_tokens: u.cache_read_input_tokens ?? 0, output_tokens: u.output_tokens ?? 0, cache_creation: u.cache_creation ?? null },
  total_input_tokens: totalInput(u), cost_usd: result.total_cost_usd ?? null, duration_ms: result.duration_ms ?? null, ttft_ms: result.ttft_ms ?? null,
  skill_calls: skillCalls, reply_chars: typeof result.result === 'string' ? result.result.length : null
 };
}

export function summarize(records) {
 const by = (arm, turn) => records.filter(r => r.arm === arm && r.turn === turn && !r.error);
 const out = {};
 for (const arm of ARMS) for (const turn of [1, 2]) {
  const rs = by(arm, turn);
  if (!rs.length) continue;
  out[`${arm} turn ${turn}`] = {
   n: rs.length,
   median_total_input_tokens: median(rs.map(r => r.total_input_tokens)),
   median_output_tokens: median(rs.map(r => r.usage.output_tokens)),
   median_cost_usd: median(rs.map(r => r.cost_usd)),
   median_duration_ms: median(rs.map(r => r.duration_ms)),
   median_ttft_ms: median(rs.map(r => r.ttft_ms)),
   hook_context_chars: [...new Set(rs.map(r => r.hook?.context_chars ?? null))],
   skill_calls: rs.reduce((n, r) => n + r.skill_calls.length, 0)
  };
 }
 const delta = (a, b, turn) => { const x = out[`${a} turn ${turn}`], y = out[`${b} turn ${turn}`]; return x && y ? x.median_total_input_tokens - y.median_total_input_tokens : null; };
 return {
  by_arm_turn: out,
  input_token_deltas: Object.fromEntries([1, 2].map(t => [`turn ${t}`, {
   plugin_vs_none: delta('plugin', 'none', t),
   policy_only: delta('plugin', 'plugin-off', t),
   listings_only: delta('plugin-off', 'none', t),
   duplicate_skill_vs_plugin: delta('plugin+skill', 'plugin', t)
  }]))
 };
}

// USD per million tokens for claude-sonnet-5-5. `published` is Anthropic's price list as bundled with Claude Code
// 2.1.296 (cache write: 1.25x input for 5 minutes, 2x for 1 hour). `implied` is what the cost Claude Code 2.1.296
// reported for these runs works out to; it prices cache reads at half the published rate. Both are shown.
export const PRICES = {
 published: { input: 2, output: 10, cache_write_5m: 2.5, cache_write_1h: 4, cache_read: 0.2 },
 implied: { input: 2, output: 10, cache_write_5m: 2.5, cache_write_1h: 4, cache_read: 0.1 }
};
// How many output tokens a reply must save, per turn, to pay for `overhead` extra input tokens on that turn,
// in three regimes: the overhead is read from the prompt cache (typical interactive turn), it is written to the cache
// again (observed on turn 2 of `claude -p --resume`), or it is not cached at all. The cache write of the first turn
// is a one-time cost and is reported separately.
export function breakEven(overhead, p) {
 const tokens = usd => Math.round(usd / p.output * 10) / 10;
 return {
  overhead_input_tokens: overhead,
  output_tokens_to_save_per_turn: { cache_read: tokens(overhead * p.cache_read), cache_rewrite_1h: tokens(overhead * p.cache_write_1h), uncached: tokens(overhead * p.input) },
  one_time_first_turn_write_usd: Math.round(overhead * p.cache_write_1h) / 1e6
 };
}
const withBreakEven = summary => {
 const o = summary.input_token_deltas['turn 2']?.plugin_vs_none ?? summary.input_token_deltas['turn 1']?.plugin_vs_none;
 return { ...summary, break_even: o == null ? null : Object.fromEntries(Object.entries(PRICES).map(([k, p]) => [k, breakEven(o, p)])) };
};

function call(args, { cwd, env, debugFile }) {
 const p = spawnSync('claude', [...args, '--output-format', 'json', '--setting-sources', 'project', '--strict-mcp-config', '--debug-file', debugFile], { cwd, env, encoding: 'utf8', timeout: 300000 });
 if (p.status !== 0) throw new Error(`claude exited ${p.status}: ${(p.stderr || p.stdout).slice(0, 300)}`);
 return parseRun(p.stdout);
}

function hookEvidence(debugFile) {
 let text = '';
 try { text = readFileSync(debugFile, 'utf8'); } catch { return null; }
 const { runs } = parseDebugLog(text);
 const ours = runs.filter(r => r.origin.startsWith('plugin skip-echo'));
 return { sources: ours.map(r => r.source), context_chars: ours.reduce((n, r) => n + (r.contextChars ?? 0), 0) || null, ok: ours.every(r => r.ok) };
}

function main(argv) {
 if (argv[0] === '--summarize') {
  const doc = JSON.parse(readFileSync(argv[1], 'utf8'));
  const { records, ...rest } = doc;
  const text = JSON.stringify({ ...rest, ...withBreakEven(summarize(records)), records }, null, 2) + '\n';
  writeFileSync(argv[1], text);
  return 0;
 }
 const opt = (name, def) => { const i = argv.indexOf(name); return i === -1 ? def : argv[i + 1]; };
 const runs = Number(opt('--runs', 3)), model = opt('--model', 'claude-sonnet-5-5'), cap = Number(opt('--max-cost-usd', 2)), outFile = opt('--out', null);
 if (!(runs >= 1) || !(cap > 0)) throw new Error('--runs needs a positive integer and --max-cost-usd a positive amount');
 const work = realpathSync(mkdtempSync(join(tmpdir(), 'skip-echo-cost-')));
 const version = spawnSync('claude', ['--version'], { encoding: 'utf8' }).stdout.trim();
 const records = [];
 let spent = 0, stopped = false;
 try {
  outer: for (let rep = 1; rep <= runs; rep++) {
   // Rotate the arm order each repetition so cache warm-up does not always favour the same arm.
   const order = ARMS.map((_, i) => ARMS[(i + rep - 1) % ARMS.length]);
   for (const arm of order) {
    // Same-length directory names keep the system prompt the same size across arms.
    const cwd = join(work, `r${String(rep).padStart(2, '0')}a${ARMS.indexOf(arm)}`);
    mkdirSync(cwd);
    if (arm === 'plugin+skill') cpSync(join(root, 'skills/skip-echo'), join(cwd, '.claude/skills/skip-echo'), { recursive: true });
    const env = { ...process.env };
    delete env.SKIP_ECHO;
    if (arm === 'plugin-off') env.SKIP_ECHO = 'off';
    const base = ['-p', '--model', model, '--max-budget-usd', String(Math.max(0.05, cap - spent)), ...(arm === 'none' ? [] : ['--plugin-dir', root])];
    let session = null, before = 0;
    for (const [i, prompt] of PROMPTS.entries()) {
     const turn = i + 1, debugFile = join(cwd, `debug-${turn}.log`);
     const rec = { rep, arm, turn };
     try {
      Object.assign(rec, call([...base, ...(session ? ['--resume', session] : []), prompt], { cwd, env, debugFile }));
      session = rec.session_id;
      // total_cost_usd is cumulative over a resumed session; usage is per call.
      rec.session_cost_usd = rec.cost_usd;
      rec.cost_usd = rec.cost_usd == null ? null : Math.round((rec.cost_usd - before) * 1e7) / 1e7;
      before = rec.session_cost_usd ?? before;
     } catch (e) { rec.error = e.message; }
     rec.hook = arm === 'none' ? null : hookEvidence(debugFile);
     delete rec.session_id;
     records.push(rec);
     spent += rec.cost_usd ?? 0;
     console.error(`rep ${rep} ${arm} turn ${turn}: ${rec.error ?? `${rec.total_input_tokens} in, ${rec.usage.output_tokens} out, $${rec.cost_usd}`}`);
     if (rec.error) break;
     if (spent >= cap) { stopped = true; break outer; }
    }
   }
  }
 } finally { rmSync(work, { recursive: true, force: true }); }
 const doc = {
  kind: 'skip-echo-cost-measurement', date: new Date().toISOString().slice(0, 10), client: version, model, os: process.platform, node: process.versions.node,
  runs_per_arm: runs, prompts: PROMPTS, partial: stopped || records.some(r => r.error), cost_usd: Math.round(spent * 1e6) / 1e6,
  isolation: '--setting-sources project --strict-mcp-config; fresh directory per arm and repetition; turn 2 through --resume',
  ...withBreakEven(summarize(records)), records
 };
 const text = JSON.stringify(doc, null, 2) + '\n';
 if (outFile) writeFileSync(outFile, text); else process.stdout.write(text);
 return doc.partial ? 1 : 0;
}

const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (isMain()) {
 try { process.exitCode = main(process.argv.slice(2)); }
 catch (e) { console.error(`measure-cost: ${e.message}`); process.exitCode = 1; }
}
