// Summarizes a `claude plugin eval` aggregate-result.json by condition.
// evals/conditions cases are named <case>.<A|B|C|D>; evals/native cases use the with/without arms (D/A).
// Judge-scored screening only; never report these numbers as human-reviewed results.
// `--ceiling <share>` adds the corpus ceiling check from evals/rubric.md: condition A (baseline) must pass at most that share of no-echo graders.
import { readFileSync } from 'node:fs';
const args = process.argv.slice(2);
const flag = args.indexOf('--ceiling');
const ceiling = flag === -1 ? null : Number(args[flag + 1]);
if (flag !== -1 && !(ceiling > 0 && ceiling < 1)) throw new Error('--ceiling needs a share between 0 and 1, for example 0.6');
const file = args.find((a, i) => !a.startsWith('--') && (flag === -1 || i !== flag + 1));
if (!file) throw new Error('Usage: node scripts/summarize-native.mjs <aggregate-result.json> [--ceiling <share>]');
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
const byCondition = by(x => x.condition);
const byCategoryCondition = by(x => `${x.category} ${x.condition}`);
const ceilingCheck = ceiling === null ? undefined : {
 threshold: ceiling,
 baseline_no_echo_pass: byCondition.A?.no_echo_pass ?? null,
 // Null when no baseline run exists or the run is partial: missing evidence is never a pass.
 met: !doc.partial && byCondition.A?.no_echo_pass != null ? byCondition.A.no_echo_pass <= ceiling : null,
 categories_where_baseline_passes_every_no_echo: Object.entries(byCategoryCondition).filter(([k, v]) => k.endsWith(' A') && v.no_echo_pass === 1).map(([k]) => k.slice(0, -2))
};
console.log(JSON.stringify({
 source: file, claudeVersion: doc.claudeVersion ?? null, costUsd: doc.costUsd ?? null, partial: doc.partial ?? false,
 by_condition: byCondition,
 by_category_condition: byCategoryCondition,
 ...(ceilingCheck && { ceiling_check: ceilingCheck }),
 note: 'Judge-scored screening; not human review and not release evidence.'
}, null, 2));
