# Changelog

## 0.2.0 — Unreleased

Status: experimental. No efficacy or cost claim.

- Policy: progress reports lead with this step's outcome and skip an unchanged plan; revisions of an existing artifact show the changed part unless the full or copy-ready version is requested, the artifact is short, or an excerpt would be harder to apply; never present an excerpt as complete.
- Policy: explicit coexistence with terse styles (select claims, not wording; never drop required facts) and `off` / `full` / `on` skill arguments.
- Skill: clearer discovery description and `argument-hint`.
- Evaluation: manifest v2 adds 8 cases in `progress` and `revision` categories (68 total, v1 cases unchanged; smoke 14). A generated `claude plugin eval` suite under `evals/native/` replays smoke histories with and without the plugin.
- Distribution: verified `npx skills add` discovery; generated Cursor rule and AGENTS.md snippet; marketplace description; plugin metadata.
- Docs: README positioning against terse-output skills, in-conversation controls, self-measurement instructions.

## 0.1.0 — 2026-10-06

Status: experimental. A plain semantic version does not imply validated efficacy.

- Add shared response-selection policy, standalone skill, and SessionStart plugin.
- Add deterministic generation, fail-open hook, packaging tests, and bilingual evaluation fixtures.
- Add A/B/C/D evaluation preparation, manual scoring, installation/removal docs, and issue forms.
- No Claude Code lifecycle compatibility or cost/repetition reduction claim yet.
