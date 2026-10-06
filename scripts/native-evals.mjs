// Converts frozen cases into `claude plugin eval` suites.
// evals/native/: smoke + stress dev cases, run with/without the plugin (A vs D).
// evals/conditions/: stress dev cases × A/B/C/D, run with `--ablation none`.
// evals/hard/: dev cases from evals/hard.json (agent-session and tool-use families), run with/without the plugin.
// Holdout cases are deliberately excluded so both suites can be run while iterating.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export const NATIVE_DIR = 'evals/native';
export const CONDITIONS_DIR = 'evals/conditions';
export const HARD_DIR = 'evals/hard';
// Same text in every arm: the frozen cases are chat conversations, so stop the agent from hunting for files.
const CHAT_ONLY = 'This conversation has no codebase or workspace files. Do not search for, read, or create files; answer in your reply.';

const uuid = seed => {
 const h = createHash('sha256').update(seed).digest('hex');
 return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
};
const bullets = items => items.map(x => `- ${x}`).join('\n');

// A message's content is a string, or an array of Messages API blocks (text, tool_use, tool_result) for tool-use histories.
function history(c) {
 const sessionId = uuid(`${c.id}:session`);
 let parent = null;
 return c.messages.slice(0, -1).map((m, i) => {
  const id = uuid(`${c.id}:${i}`);
  const base = { parentUuid: parent, isSidechain: false, userType: 'external', cwd: '/', sessionId, version: 'synthetic', type: m.role, uuid: id, timestamp: `2026-01-01T00:00:${String(i).padStart(2, '0')}.000Z` };
  parent = id;
  const message = m.role === 'user'
   ? { role: 'user', content: m.content }
   : { id: `msg_synthetic_${i}`, type: 'message', role: 'assistant', model: '<synthetic>', content: typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : m.content, stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } };
  return JSON.stringify({ ...base, message });
 }).join('\n') + '\n';
}

function essentials(c, last) {
 return `---\ntype: llm\nweight: 2\n---\n\nThe reply answers the final turn of a multi-turn conversation. The user's final message was:\n\n> ${last.replace(/\n/g, '\n> ')}\n\nPASS only if the reply conveys every required point below; wording and language may differ:\n\n${bullets(c.required_facts)}\n\nFAIL if any required point is missing or contradicted, or if the reply does any of the following:\n\n${bullets(c.critical_omissions)}\n\nDo not judge length or style.\n`;
}

function noEcho(item) {
 return `---\ntype: llm\n---\n\nPASS if the reply does not restate the following material from earlier turns. A short pointer of one clause is acceptable; restating its details is not:\n\n- ${item}\n\nFAIL if the reply restates it beyond a short pointer. Ignore everything else, including correctness, length, and other content.\n`;
}

function load(root) {
 const manifest = JSON.parse(readFileSync(resolve(root, 'evals/manifest.json')));
 const list = name => new Set(JSON.parse(readFileSync(resolve(root, `evals/${name}.json`))));
 const read = item => {
  const c = JSON.parse(readFileSync(resolve(root, 'evals/cases', item.id + '.json')));
  if (c.split !== 'dev') throw new Error('Generated suites must not contain holdout cases: ' + c.id);
  if (typeof c.messages.at(-1).content !== 'string') throw new Error('The final user message must be plain text: ' + c.id);
  return { c, item };
 };
 return { manifest, smoke: list('smoke'), stress: list('stress'), hard: list('hard'), read };
}

function caseFiles(files, dir, { c, item }, { name, tags, appendix = '', plugins }) {
 const last = c.messages.at(-1).content;
 const system = appendix ? `${CHAT_ONLY}\n\n${appendix}` : CHAT_ONLY;
 files.set(`${dir}/case.yaml`, `schema_version: "1.1"\nname: ${name}\ndescription: ${JSON.stringify(`Generated from evals/cases/${c.id}.json (sha256 ${item.sha256.slice(0, 12)}). Do not edit.`)}\ntags: [${tags.join(', ')}]\n${plugins ? `plugins: [${JSON.stringify(plugins)}]\n` : ''}context:\n  history_file: history.jsonl\nexecution:\n  max_turns: 3\n  allowed_tools: [Skill]\n  append_system_prompt: ${JSON.stringify(system)}\n`);
 files.set(`${dir}/prompt.md`, last + '\n');
 files.set(`${dir}/history.jsonl`, history(c));
 files.set(`${dir}/graders/essentials.md`, essentials(c, last));
 c.unnecessary_repetition.forEach((rep, i) => files.set(`${dir}/graders/no-echo-${i + 1}.md`, noEcho(rep)));
}

export function nativeEvalFiles(root) {
 const { manifest, smoke, stress, read } = load(root);
 const files = new Map();
 for (const item of manifest.cases.filter(c => smoke.has(c.id) || stress.has(c.id))) {
  const x = read(item);
  caseFiles(files, `${NATIVE_DIR}/${x.c.id}`, x, { name: x.c.id, tags: [x.c.category, x.c.language, smoke.has(x.c.id) ? 'smoke' : 'stress'] });
 }
 return files;
}

export function hardEvalFiles(root) {
 const { manifest, hard, read } = load(root);
 const files = new Map();
 for (const item of manifest.cases.filter(c => hard.has(c.id))) {
  const x = read(item);
  caseFiles(files, `${HARD_DIR}/${x.c.id}`, x, { name: x.c.id, tags: [x.c.category, x.c.language, 'hard'] });
 }
 return files;
}

export function conditionEvalFiles(root) {
 const { manifest, stress, read } = load(root);
 const policy = readFileSync(resolve(root, 'src/response-policy.md'), 'utf8').trim();
 const control = readFileSync(resolve(root, 'evals/control.txt'), 'utf8').trim();
 // `claude plugin eval` requires a plugin shipped with a case to sit in that case's own subdirectory.
 const baseline = JSON.stringify({ name: 'skip-echo-eval-baseline', version: '0.0.0', description: 'Empty plugin used as the no-SkipEcho arm of evals/conditions.' }, null, 2) + '\n';
 const files = new Map();
 const conditions = {
  A: { plugins: 'baseline-plugin' },
  B: { plugins: 'baseline-plugin', appendix: control },
  C: { plugins: 'baseline-plugin', appendix: policy },
  D: { plugins: '../../../..' }
 };
 for (const item of manifest.cases.filter(c => stress.has(c.id))) {
  const x = read(item);
  for (const [cond, opts] of Object.entries(conditions)) {
   const dir = `${CONDITIONS_DIR}/${x.c.id}/${cond}`;
   if (cond !== 'D') files.set(`${dir}/baseline-plugin/.claude-plugin/plugin.json`, baseline);
   caseFiles(files, dir, x, { name: `${x.c.id}.${cond}`, tags: [`cond-${cond}`, x.c.category, x.c.language], ...opts });
  }
 }
 return files;
}
