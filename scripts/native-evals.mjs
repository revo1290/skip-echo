// Converts frozen smoke cases into a `claude plugin eval` suite under evals/native/.
// Holdout cases are deliberately excluded so the suite can be run while iterating.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

export const NATIVE_DIR = 'evals/native';

const uuid = seed => {
 const h = createHash('sha256').update(seed).digest('hex');
 return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-8${h.slice(17,20)}-${h.slice(20,32)}`;
};
const bullets = items => items.map(x => `- ${x}`).join('\n');

function history(c) {
 const sessionId = uuid(`${c.id}:session`);
 let parent = null;
 return c.messages.slice(0, -1).map((m, i) => {
  const id = uuid(`${c.id}:${i}`);
  const base = { parentUuid: parent, isSidechain: false, userType: 'external', cwd: '/', sessionId, version: 'synthetic', type: m.role, uuid: id, timestamp: `2026-01-01T00:00:0${i}.000Z` };
  parent = id;
  const message = m.role === 'user'
   ? { role: 'user', content: m.content }
   : { id: `msg_synthetic_${i}`, type: 'message', role: 'assistant', model: '<synthetic>', content: [{ type: 'text', text: m.content }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 0, output_tokens: 0 } };
  return JSON.stringify({ ...base, message });
 }).join('\n') + '\n';
}

function essentials(c, last) {
 return `---\ntype: llm\nweight: 2\n---\n\nThe reply answers the final turn of a multi-turn conversation. The user's final message was:\n\n> ${last.replace(/\n/g, '\n> ')}\n\nPASS only if the reply conveys every required point below; wording and language may differ:\n\n${bullets(c.required_facts)}\n\nFAIL if any required point is missing or contradicted, or if the reply does any of the following:\n\n${bullets(c.critical_omissions)}\n\nDo not judge length or style.\n`;
}

function noEcho(c) {
 return `---\ntype: llm\n---\n\nPASS if the reply does not restate any of the following material from earlier turns. A short pointer of one clause is acceptable; restating its details is not:\n\n${bullets(c.unnecessary_repetition)}\n\nFAIL if the reply restates any of them beyond a short pointer. Ignore everything else, including correctness and length.\n`;
}

export function nativeEvalFiles(root) {
 const manifest = JSON.parse(readFileSync(resolve(root, 'evals/manifest.json')));
 const smoke = new Set(JSON.parse(readFileSync(resolve(root, 'evals/smoke.json'))));
 const files = new Map();
 for (const item of manifest.cases.filter(c => smoke.has(c.id))) {
  const c = JSON.parse(readFileSync(resolve(root, 'evals/cases', item.id + '.json')));
  if (c.split !== 'dev') throw new Error('Native suite must not contain holdout cases: ' + c.id);
  const last = c.messages.at(-1).content;
  const dir = `${NATIVE_DIR}/${c.id}`;
  files.set(`${dir}/case.yaml`, `schema_version: "1.1"\nname: ${c.id}\ndescription: ${JSON.stringify(`Generated from evals/cases/${c.id}.json (sha256 ${item.sha256.slice(0, 12)}). Do not edit.`)}\ntags: [${c.category}, ${c.language}, smoke]\ncontext:\n  history_file: history.jsonl\nexecution:\n  max_turns: 3\n  allowed_tools: [Skill]\n`);
  files.set(`${dir}/prompt.md`, last + '\n');
  files.set(`${dir}/history.jsonl`, history(c));
  files.set(`${dir}/graders/essentials.md`, essentials(c, last));
  if (c.unnecessary_repetition.length) files.set(`${dir}/graders/no-echo.md`, noEcho(c));
 }
 return files;
}
