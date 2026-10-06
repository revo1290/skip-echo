# Changelog

## 0.2.0 — Unreleased

Status: experimental. No efficacy or cost claim.

- Policy: progress reports lead with this step's outcome and skip an unchanged plan; revisions of an existing artifact show the changed part unless the full or copy-ready version is requested, the artifact is only a few lines, or an excerpt would be harder to apply; never present an excerpt as complete.
- Policy: explicit coexistence with terse styles (select claims, not wording; never drop required facts) and `off` / `full` / `on` skill arguments.
- Skill: clearer discovery description and `argument-hint`.
- Evaluation: manifest v2 adds 8 cases in `progress` and `revision` categories (68 total, v1 cases unchanged; smoke 14). A generated `claude plugin eval` suite under `evals/native/` replays smoke histories with and without the plugin.
- Distribution: verified `npx skills add` discovery; generated Cursor rule and AGENTS.md snippet; marketplace description; plugin metadata.
- Docs: README positioning against terse-output skills, in-conversation controls, self-measurement instructions.
- Evaluation: manifest v3 adds 16 long multi-turn stress cases (`long-revision`, `long-full`, `long-progress`, `long-constraint`; 84 total, earlier cases unchanged) and `evals/stress.json`. A generated `evals/conditions/` suite runs the 8 dev stress cases under A/B/C/D with `claude plugin eval`; `scripts/summarize-native.mjs` groups results by condition.
- Verified with Claude Code 2.1.289: native suite runs end to end, history replay works, and SessionStart:resume injects the policy in eval runs. Screening shows a ceiling effect (Δ 0.00 on all 14 smoke cases, n=1); see evals/results.
- Evaluation: manifest v4 adds 64 cases (148 total, v1 to v3 unchanged) in eight families aimed at agent sessions: `tool-report` (tool_use / tool_result histories), `rerun-report`, `review-response`, `infra-ops`, `data-analysis`, `doc-writing`, `long-session` (11 user turns after a compaction summary) and `safety`. 32 development and 32 holdout cases, frozen by SHA-256. Case messages may now hold Messages API blocks.
- Evaluation: generated `evals/hard/` suite (the 32 development cases, with/without the plugin), `npm run eval:hard`, and `summarize-native.mjs --ceiling <share>` for the corpus ceiling check. Not yet run at full scale: a first single-case run scored 1.00 with and without the plugin, so the set may still be too easy.

## 0.1.0 — 2026-10-06

Status: experimental. A plain semantic version does not imply validated efficacy.

- Add shared response-selection policy, standalone skill, and SessionStart plugin.
- Add deterministic generation, fail-open hook, packaging tests, and bilingual evaluation fixtures.
- Add A/B/C/D evaluation preparation, manual scoring, installation/removal docs, and issue forms.
- No Claude Code lifecycle compatibility or cost/repetition reduction claim yet.
