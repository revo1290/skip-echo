// Echo meter: a deterministic, judge-free measure of cross-turn repetition.
//   node scripts/echo-meter.mjs results <result.json> [--json]                 recorded eval outputs vs their case history
//   node scripts/echo-meter.mjs transcript <file.jsonl|dir>... [--json] [--examples]   your own Claude Code sessions
//   node scripts/echo-meter.mjs transcript --project [--json] [--examples]            sessions of the current directory
// A reply "echoes" when its word sequences (CJK: character sequences) already appeared in earlier assistant turns.
// Text the user wrote in the current turn and fenced code are not counted as prose echo; code is reported separately,
// because requested full artifacts are supposed to repeat. This measures surface overlap, not meaning: a paraphrased
// repeat is missed and a quoted identifier can count. Use it next to the judged graders, never instead of them.
// Reads only the files passed. No network, no model call, nothing written. Prints no text unless --examples is given.
import { readFileSync, readdirSync, statSync, existsSync, realpathSync } from 'node:fs';
import { dirname, resolve, join, basename } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SHINGLE = 5;
// A sentence counts as echoed when at least this share of its shingles appeared in earlier assistant turns.
// Headings and sentences with fewer than MIN_SHINGLES shingles (about 8 words or CJK characters) are not judged,
// so repeated labels such as "**Remaining**" or "Tests passed." do not count as echoed sentences.
export const SENTENCE_ECHO = 0.6;
export const MIN_SHINGLES = 4;

const TOKEN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]|[\p{L}\p{N}_]+/gu;
export const tokens = text => (text.normalize('NFKC').toLowerCase().match(TOKEN) ?? []);
export const shingles = (text, n = SHINGLE) => {
 const t = tokens(text), out = new Set();
 for (let i = 0; i + n <= t.length; i++) out.add(t.slice(i, i + n).join(' '));
 return out;
};
// Fenced code blocks are measured separately from prose.
export const splitCode = text => {
 const code = [];
 const prose = text.replace(/```[^\n]*\n([\s\S]*?)(?:```|$)/g, (_, body) => { code.push(body); return '\n'; });
 return { prose, code: code.join('\n') };
};
const HEADING = /^(#{1,6}\s|\*\*[^*]+\*\*:?$|__[^_]+__:?$)/;
const sentences = text => text.split(/(?<=[.!?。！？])\s+|(?<=[。！？])|\n+/).map(s => s.trim()).filter(s => s && !HEADING.test(s));

// prior: earlier assistant texts; current: the user's message this turn (restating it is not echo).
export function measure(reply, prior, current = '') {
 const seen = new Set(), user = shingles(current);
 for (const p of prior) for (const s of shingles(p)) seen.add(s);
 const { prose, code } = splitCode(reply);
 const share = (set) => { let hit = 0, total = 0; for (const s of set) { if (user.has(s)) continue; total++; if (seen.has(s)) hit++; } return { hit, total }; };
 const p = share(shingles(prose)), c = share(shingles(code));
 const echoed = [];
 let echoedChars = 0;
 for (const s of sentences(prose)) {
  const r = share(shingles(s));
  if (r.total >= MIN_SHINGLES && r.hit / r.total >= SENTENCE_ECHO) { echoed.push(s); echoedChars += s.length; }
 }
 return {
  chars: reply.length,
  prose_chars: prose.trim().length,
  prose_echo: p.total ? round(p.hit / p.total) : 0,
  code_echo: c.total ? round(c.hit / c.total) : null,
  echoed_sentences: echoed.length,
  echoed_chars: echoedChars,
  examples: echoed
 };
}
const round = x => Math.round(1000 * x) / 1000;
const mean = xs => xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : null;

const textOf = content => typeof content === 'string' ? content
 : Array.isArray(content) ? content.filter(b => b?.type === 'text' && typeof b.text === 'string').map(b => b.text).join('\n') : '';

// ---- recorded eval outputs -------------------------------------------------------------------------------------
// Accepts this repository's records (runs[] or results[] or outputs[] with case or case_id, arm, set, output;
// a case named "<id>.<A-D>" is a condition) and any claude plugin eval aggregate whose runs carry an `output` string.
export function runsOf(doc, set = '') {
 const rows = [];
 const push = (name, arm, set, output) => {
  if (typeof name !== 'string' || typeof output !== 'string') return;
  const m = name.match(/^(.*)\.([ABCD])$/);
  rows.push({ case: m ? m[1] : name, group: [set, m ? m[2] : arm].filter(Boolean).join(' ') || 'all', output });
 };
 for (const r of [...(doc.runs ?? []), ...(doc.results ?? []), ...(doc.outputs ?? [])]) {
  if (Array.isArray(r.results)) rows.push(...runsOf(r, r.set ?? ''));
  else push(r.case ?? r.case_id, r.arm ?? '', r.set ?? set, r.output);
 }
 for (const c of doc.cases ?? []) for (const [arm, runs] of Object.entries(c.arms ?? {})) for (const r of runs) push(c.name, arm, '', r.output);
 return rows;
}

export function caseContext(id, casesDir = join(root, 'evals/cases')) {
 const file = join(casesDir, id + '.json');
 if (!existsSync(file)) return null;
 const c = JSON.parse(readFileSync(file, 'utf8'));
 const msgs = c.messages ?? [];
 const last = msgs.at(-1);
 return {
  split: c.split ?? null,
  prior: msgs.slice(0, -1).filter(m => m.role === 'assistant').map(m => textOf(m.content)),
  current: last?.role === 'user' ? textOf(last.content) : ''
 };
}

export function meterResults(doc, opts = {}) {
 const rows = runsOf(doc);
 if (!rows.length) throw new Error('No outputs found. This file has no runs with an `output` string; claude plugin eval aggregates do not store replies, so record them first (see evals/results/README.md).');
 const missing = new Set(), holdout = new Set(), measured = [];
 for (const r of rows) {
  const ctx = caseContext(r.case, opts.casesDir);
  if (!ctx) { missing.add(r.case); continue; }
  if (ctx.split === 'holdout') holdout.add(r.case);
  measured.push({ ...r, m: measure(r.output, ctx.prior, ctx.current) });
 }
 const groups = [...new Set(measured.map(r => r.group))].sort();
 const summarize = xs => ({
  runs: xs.length,
  mean_chars: mean(xs.map(x => x.m.chars)),
  mean_prose_echo: mean(xs.map(x => x.m.prose_echo)),
  mean_echoed_chars: mean(xs.map(x => x.m.echoed_chars)),
  runs_with_echoed_sentence: xs.filter(x => x.m.echoed_sentences > 0).length
 });
 const byGroup = Object.fromEntries(groups.map(g => [g, summarize(measured.filter(r => r.group === g))]));
 const byCase = {};
 for (const id of [...new Set(measured.map(r => r.case))].sort())
  byCase[id] = Object.fromEntries(groups.map(g => [g, measured.filter(r => r.case === id && r.group === g)]).filter(([, xs]) => xs.length).map(([g, xs]) => [g, mean(xs.map(x => x.m.prose_echo))]));
 // Paired per case: in how many cases did group a echo less than, the same as, or more than group b?
 const paired = [];
 for (const [i, a] of groups.entries()) for (const b of groups.slice(i + 1)) {
  const counts = { lower: 0, same: 0, higher: 0 };
  for (const v of Object.values(byCase)) if (a in v && b in v) counts[v[a] < v[b] ? 'lower' : v[a] > v[b] ? 'higher' : 'same']++;
  if (counts.lower + counts.same + counts.higher) paired.push({ a, b, cases_where_a_echoes: counts });
 }
 return {
  shingle: SHINGLE,
  by_group: byGroup,
  paired,
  by_case_mean_prose_echo: byCase,
  ...(missing.size && { cases_not_found: [...missing].sort() }),
  ...(holdout.size && { holdout_cases_measured: [...holdout].sort() }),
  note: 'Surface overlap with earlier assistant turns; not a judgment of whether the repetition was needed. Corrections, warnings, and requested full versions can legitimately repeat.'
 };
}

// ---- Claude Code transcripts -----------------------------------------------------------------------------------
// One turn = everything the assistant wrote between two real user prompts (tool results are not prompts).
export function turnsOf(lines) {
 const turns = [];
 let cur = null;
 for (const line of lines) {
  let o;
  try { o = JSON.parse(line); } catch { continue; }
  if (o.isSidechain || !o.message) continue;
  if (o.type === 'user') {
   const c = o.message.content;
   const isPrompt = typeof c === 'string' ? !o.isMeta : Array.isArray(c) && c.some(b => b?.type === 'text') && !c.some(b => b?.type === 'tool_result');
   if (isPrompt && !o.isMeta) { cur = { user: textOf(c), reply: [] }; turns.push(cur); }
  } else if (o.type === 'assistant' && cur) {
   const t = textOf(o.message.content);
   if (t.trim()) cur.reply.push(t);
  }
 }
 return turns.filter(t => t.reply.length).map(t => ({ user: t.user, reply: t.reply.join('\n\n') }));
}

export function meterTranscript(text, { examples = false } = {}) {
 const turns = turnsOf(text.split('\n'));
 const prior = [], per = [];
 for (const t of turns) { per.push(measure(t.reply, prior, t.user)); prior.push(t.reply); }
 const later = per.slice(1);
 const proseChars = later.reduce((n, m) => n + m.prose_chars, 0);
 const echoedChars = later.reduce((n, m) => n + m.echoed_chars, 0);
 return {
  turns: turns.length,
  assistant_chars: per.reduce((n, m) => n + m.chars, 0),
  // The first turn has nothing to echo, so the shares cover turns 2 and later.
  mean_prose_echo: mean(later.map(m => m.prose_echo)),
  prose_chars_after_first: proseChars,
  echoed_chars: echoedChars,
  echoed_share_of_prose: proseChars ? round(echoedChars / proseChars) : null,
  turns_with_echoed_sentence: later.filter(m => m.echoed_sentences > 0).length,
  ...(examples && { examples: per.flatMap((m, i) => m.examples.map(s => ({ turn: i + 1, sentence: s.length > 160 ? s.slice(0, 157) + '...' : s }))) })
 };
}

// Claude Code keeps a project's sessions in <config>/projects/<cwd with every non-alphanumeric character as ->.
export const projectDir = (cwd, env = process.env) => join(env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'));
const jsonlFiles = p => statSync(p).isDirectory() ? readdirSync(p).filter(f => f.endsWith('.jsonl')).sort().map(f => join(p, f)) : [p];

function main(argv) {
 const [mode, ...rest] = argv;
 const json = rest.includes('--json'), examples = rest.includes('--examples');
 const files = rest.filter(a => !a.startsWith('--'));
 if (mode === 'transcript' && rest.includes('--project')) {
  const dir = projectDir(process.cwd());
  if (!existsSync(dir)) throw new Error(`no Claude Code sessions found for this directory (looked in ${dir})`);
  files.push(dir);
 }
 if (!['results', 'transcript'].includes(mode) || !files.length) {
  console.error('Usage:\n  node scripts/echo-meter.mjs results <result.json> [--json]\n  node scripts/echo-meter.mjs transcript <session.jsonl|directory>... [--json] [--examples]\n  node scripts/echo-meter.mjs transcript --project [--json] [--examples]');
  return 2;
 }
 if (mode === 'results') {
  const out = { source: files[0], ...meterResults(JSON.parse(readFileSync(files[0], 'utf8'))) };
  if (json) { console.log(JSON.stringify(out, null, 2)); return 0; }
  console.log(`SkipEcho echo meter: ${basename(files[0])} (${SHINGLE}-token shingles)\n`);
  console.log(['group', 'runs', 'mean chars', 'prose echo', 'echoed chars', 'runs w/ echo'].join('\t'));
  for (const [g, s] of Object.entries(out.by_group)) console.log([g, s.runs, s.mean_chars, s.mean_prose_echo, s.mean_echoed_chars, s.runs_with_echoed_sentence].join('\t'));
  if (out.paired.length) console.log('\nPer case, mean prose echo of a vs b (lower / same / higher):');
  for (const p of out.paired) console.log(`  ${p.a} vs ${p.b}: ${p.cases_where_a_echoes.lower} / ${p.cases_where_a_echoes.same} / ${p.cases_where_a_echoes.higher}`);
  if (out.cases_not_found) console.log(`\nCases without a history in evals/cases: ${out.cases_not_found.join(', ')}`);
  if (out.holdout_cases_measured) console.log(`\nWarning: holdout cases measured: ${out.holdout_cases_measured.join(', ')}. Do not tune on them.`);
  console.log(`\n${out.note}`);
  return 0;
 }
 const all = files.flatMap(jsonlFiles).map(f => ({ file: basename(f, '.jsonl'), ...meterTranscript(readFileSync(f, 'utf8'), { examples }) }));
 // A one-turn session has nothing earlier to echo.
 const sessions = all.filter(s => s.turns > 1);
 const prose = sessions.reduce((n, s) => n + s.prose_chars_after_first, 0), echoed = sessions.reduce((n, s) => n + s.echoed_chars, 0);
 const pooled = { sessions: sessions.length, skipped_single_turn: all.length - sessions.length, echoed_chars: echoed, echoed_share_of_prose: prose ? round(echoed / prose) : null };
 if (json) { console.log(JSON.stringify({ shingle: SHINGLE, pooled, sessions }, null, 2)); return 0; }
 console.log(`SkipEcho echo meter: ${sessions.length} multi-turn session(s), ${pooled.skipped_single_turn} single-turn skipped (${SHINGLE}-token shingles)\n`);
 console.log(['session', 'turns', 'assistant chars', 'mean prose echo', 'echoed chars', 'echoed share'].join('\t'));
 for (const s of sessions) {
  console.log([s.file.slice(0, 8), s.turns, s.assistant_chars, s.mean_prose_echo ?? '-', s.echoed_chars, s.echoed_share_of_prose ?? '-'].join('\t'));
  for (const e of s.examples ?? []) console.log(`  turn ${e.turn}: ${e.sentence}`);
 }
 if (sessions.length > 1) console.log(`\nPooled: ${echoed} of ${prose} prose characters after the first turn were in echoed sentences (${pooled.echoed_share_of_prose ?? '-'}).`);
 console.log('\nCompare sessions with and without SkipEcho (SKIP_ECHO=off) on similar work; one session is not evidence.');
 return 0;
}

const isMain = () => { try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } };
if (isMain()) {
 try { process.exitCode = main(process.argv.slice(2)); }
 catch (e) { console.error(`echo-meter: ${e.message}`); process.exitCode = 1; }
}
