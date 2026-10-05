# Evaluation status — 2026-10-05

**Experimental; no comparative efficacy or cost claim.**

| Evidence | Result | Interpretation |
| --- | --- | --- |
| Node tests, Linux / Node 22.22.0 (v0.2.0) | 16 tests passed | Adds native-suite and mode-argument checks; earlier v0.1.0 run: 14 tests on Node 24.19.0 |
| `claude plugin validate`, Claude Code 2.1.289 (v0.2.0) | Passed, no warnings | Manifest format only |
| Node tests, Linux / Node 24.19.0 (v0.1.0) | 14 tests passed | Generation, hook contract, failure handling, package structure, corpus split and evaluator plumbing |
| Skill format validator | Passed | Format only, not behavioral effectiveness |
| 12 development conversations, explicit policy | Outputs captured; assistant review found essentials preserved | Exploratory proxy; not blind human grading, not A/B, not exact-model benchmark |
| Claude Code plugin / five lifecycle events | Not executed | Not yet observed in a real session |
| Native `claude plugin eval` smoke suite | Not executed | No judge-scored results exist yet |
| v0.2 policy (progress / revision rules) | No model outputs | The exploratory outputs below predate it |
| Holdout A/B/C/D | Not executed | No release-gate conclusion |
| Cumulative conversation, total usage/cost, latency | Not measured | No savings claim |
| macOS / Windows / Node 22 / style coexistence | Not executed | CI configuration is not evidence of a passing run |

Raw exploratory outputs: [forward-smoke.json](forward-smoke.json). The agent saw only the policy and conversation messages, not required-fact grading fields. All 12 cases were answered in one isolated agent task: cross-case contamination is possible. Its exact model identifier, generation parameters, and usage were not exposed. It was instructed to load the policy, so this is not an automatic-trigger test.

No failures were identified in the assistant's limited inspection; there is no human-reviewed failure-rate estimate. The short control B was not executed, and ordinary baseline behavior may do equally well. More explanation in the re-explanation case is intentional. The changes-only numeric answer leaves retries implicit without reversing the unchanged constraint.

The hook's five source tests call the same script with synthetic input. They do not observe the host firing or consuming context. A missing Node executable and real subagent inheritance remain unverified.

Next: run the integration checklist, then preregister budget/repetitions, collect A/B/C/D outputs, conduct blinded human review, report failures and usage, and only then assess the provisional gate in [rubric.md](../rubric.md). Remain experimental if the short control is equally effective.
