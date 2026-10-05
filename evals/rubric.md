# Evaluation protocol v1

## Corpus and split

60 synthetic conversations: 30 Japanese, 30 English; 30 bilingual pairs. Each case contains three user turns (five messages, final response withheld). There are 12 categories. Six categories have three parameter variants per language; six have two. These are templated fixtures, not 60 independent observations. Expand scenario diversity before broad effectiveness claims.

36 development / 24 holdout, fixed by `manifest.json` SHA-256 values before model tests. Translation pairs share their split. Because category templates occur in both splits, holdout evaluates transfer across variants rather than novel domains. Never tune on holdout outputs; replace exposed holdout cases for a future confirmatory run.

`smoke.json` selects 12 development cases, six per language and one per category. The smoke suite is not the release gate.

## Conditions

| Condition | Instruction / environment |
| --- | --- |
| A | Baseline, plugin and skill disabled |
| B | The short but strong instruction in control.txt; plugin disabled |
| C | Core policy explicitly supplied; plugin disabled |
| D | Installed plugin, no manual mention, no manually supplied policy |

For non-English prompts the same English control instruction is used to hold instruction language constant with C; prompts remain Japanese or English. Keep model, generation settings, client, tools, other system instructions, and context budget identical. If that is impossible, report the confound.

`node scripts/prepare-eval.mjs smoke 1` generates 48 jobs and a blinded output template; it does not run models. `holdout 3` generates 288 fixed-history jobs/model. Cost must be budgeted before generation using actual model prices and estimated input/output lengths. Record the chosen repetition count before seeing results. Do not silently spend on additional runs.

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
