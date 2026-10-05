# Evaluation protocol v1

## Corpus and split

84 synthetic conversations: 42 Japanese, 42 English; 42 bilingual pairs. Most cases contain three user turns (five messages, final response withheld); the v3 stress cases contain four (seven messages). There are 18 categories. Manifest v2 added `progress` (multi-step status reports) and `revision` (unrequested reprint of an existing artifact). Manifest v3 added four long-history stress categories: `long-revision`, `long-full` (protective: full text after several edits), `long-progress`, and `long-constraint`. No earlier case changed. These are templated fixtures, not 84 independent observations. Expand scenario diversity before broad effectiveness claims.

48 development / 36 holdout, fixed by `manifest.json` SHA-256 values before model tests. Translation pairs share their split. Because category templates occur in both splits, holdout evaluates transfer across variants rather than novel domains. Never tune on holdout outputs; replace exposed holdout cases for a future confirmatory run.

`smoke.json` selects 14 development cases, seven per language and one per category. The smoke suite is not the release gate.

`stress.json` selects the 8 development stress cases. Smoke fixtures turned out to be too easy: in the first native run, 12 of 14 scored 1.00 with and without the plugin.

`node scripts/build.mjs` generates two `claude plugin eval` suites from development cases only; neither ever contains holdout cases:

- `evals/native/` (smoke + stress): each fixed history replayed with and without the installed plugin (A versus D).
- `evals/conditions/` (stress): each case as four cases, `<id>.A` to `<id>.D`, run with `--ablation none`. A, B, and C load an empty baseline plugin shipped inside the case; B appends `control.txt` and C appends the policy to the system prompt; D loads this plugin, so the policy arrives through the SessionStart hook. Every condition shares the same chat-only system line.

`node scripts/summarize-native.mjs <aggregate-result.json>` groups results by condition. Use both suites for screening and regressions only: judge-based scores are not human review. C delivers the policy as a system prompt while D delivers it as hook context, so C versus D also measures delivery.

## Conditions

| Condition | Instruction / environment |
| --- | --- |
| A | Baseline, plugin and skill disabled |
| B | The short but strong instruction in control.txt; plugin disabled |
| C | Core policy explicitly supplied; plugin disabled |
| D | Installed plugin, no manual mention, no manually supplied policy |

For non-English prompts the same English control instruction is used to hold instruction language constant with C; prompts remain Japanese or English. Keep model, generation settings, client, tools, other system instructions, and context budget identical. If that is impossible, report the confound.

`node scripts/prepare-eval.mjs smoke 1` generates 56 jobs and a blinded output template; it does not run models. `holdout 3` generates 336 fixed-history jobs/model. Cost must be budgeted before generation using actual model prices and estimated input/output lengths. Record the chosen repetition count before seeing results. Do not silently spend on additional runs.

For fixed-history evaluation, replay the same messages via a client/API that supports proper user/assistant roles. Pasting them into one user prompt is only a proxy, not equivalent role-based evaluation. D requires the real Claude Code plugin path and evidence of injection; do not relabel C as D. If a comparable history mechanism is unavailable, report D separately.

For cumulative evaluation, use only user turns from each case, generating each assistant turn under its condition. Preserve those generated replies in that condition's subsequent context. Grade the final response and review all earlier outputs for errors. Record mode=cumulative separately; do not combine with fixed-history scores. This mode currently has a manual protocol, not an automated driver.

## Capture and blinded review

Keep raw outputs, exact model and client versions, OS, Node version, parameters, date, case hash, repetition, mode, actual usage (input/output/cache tokens) or null, actual cost or null, latency or null, and actual hook-context evidence or null. Never replace unavailable usage with character-derived token estimates.

Fill `blind-template.json` with outputs and randomize review order using prepared opaque IDs. Scorers see the case and output, but not condition/name/instruction. Keep jobs.json separate until annotations are complete. Policy hints in natural outputs can still unblind; report this limitation. Synthetic data only; never publish personal conversation traces.

Human scorers mark each predeclared required fact as present/absent, count critical omissions, and count unnecessarily repeated semantic claims. Synonyms do not create new information; repeated evidence may be necessary. Required full artifacts, requested recap, requested citations and re-explanations are not unnecessary repetition. A mentioned forbidden change is graded as preserved when explicitly rejected, not when asserted.

Check standalone adequacy for the current question, numbers/units/negation/deadlines, corrections, and executable artifact completeness. Count repeated claims, not matching n-grams. Review critical omissions and scorer disagreement manually. AI-only inspection is exploratory, never human-reviewed evidence.

## Aggregation

`node scripts/score-eval.mjs annotations.json` accepts an array with:

```json
[{
  "case_id":"artifact-01-ja", "condition":"C", "repeat":1,
  "model_exact":"record-real-model", "client_version":"record-real-client",
  "output":"record-real-output", "required":[true,true,true,true],
  "critical_omissions":0, "unnecessary_repetitions":0,
  "self_contained":true, "human_reviewed":true
}]
```

The example is a schema illustration, not result data. Annotate only observed outputs. The tool rejects missing facts and non-human-reviewed rows. It calculates required-fact retention, critical omissions, self-contained rate, paired repetition reduction versus B, and equal/worse counts when B has zero repetition. It does not automatically pass a release. Keep each model/client/mode in a separate file, with identical case coverage and repetition counts across conditions. Scores from an incomplete subset are descriptive only.

## Provisional release gate

- Zero critical omissions on the fixed critical cases; this is not a universal guarantee.
- Required retention >=98%, at most 1 percentage point below B.
- Median paired unnecessary-repetition reduction >=20% versus B where B>0; report B=0 equal/worse counts separately.
- Report full-output, re-explanation, and correction success by category and language, along with all failures.
- Evidence for all five lifecycle sources on every claimed supported environment; hook firing and model compliance separately.
- Report instruction/cache/extra-turn costs, duplicate Skill loading, latency, and possible cost increase on short conversations.

No improvement over B means simplify or remain experimental. No missing evidence may be treated as passing.
