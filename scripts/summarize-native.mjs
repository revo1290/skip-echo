// Summarizes a `claude plugin eval` aggregate-result.json by condition.
// evals/conditions cases are named <case>.<A|B|C|D>; evals/native cases use the with/without arms (D/A).
// Judge-scored screening only; never report these numbers as human-reviewed results.
import { readFileSync } from 'node:fs';
const file = process.argv[2];
if (!file) throw new Error('Usage: node scripts/summarize-native.mjs <aggregate-result.json>');
const doc = JSON.parse(readFileSync(file, 'utf8'));
const rows = [];
for (const c of doc.cases ?? []) {
 const m = c.name.match(/^(.*)\.([ABCD])$/);
 for (const [arm, runs] of Object.entries(c.arms ?? {})) {
  const condition = m ? m[2] : arm === 'with' ? 'D' : 'A';
  const id = m ? m[1] : c.name;
  for (const r of runs) rows.push({ id, category: id.replace(/-\d\d-(en|ja)$/, ''), condition, r });
 }
}
const rate = xs => xs.length ? Math.round(1000 * xs.filter(Boolean).length / xs.length) / 1000 : null;
const summarize = group => {
 const graders = group.flatMap(x => x.r.graders ?? []);
 return {
  runs: group.length,
  errors: group.filter(x => x.r.error).length,
  mean_score: group.length ? Math.round(1000 * group.reduce((n, x) => n + x.r.score, 0) / group.length) / 1000 : null,
  essentials_pass: rate(graders.filter(g => g.name === 'essentials').map(g => g.passed)),
  no_echo_pass: rate(graders.filter(g => g.name.startsWith('no-echo')).map(g => g.passed))
 };
};
const by = key => Object.fromEntries([...new Set(rows.map(key))].sort().map(k => [k, summarize(rows.filter(x => key(x) === k))]));
console.log(JSON.stringify({
 source: file, claudeVersion: doc.claudeVersion ?? null, costUsd: doc.costUsd ?? null, partial: doc.partial ?? false,
 by_condition: by(x => x.condition),
 by_category_condition: by(x => `${x.category} ${x.condition}`),
 note: 'Judge-scored screening; not human review and not release evidence.'
}, null, 2));
