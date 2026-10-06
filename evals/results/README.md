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
| Native `claude plugin eval` smoke suite, Claude Code 2.1.289 (v0.2.0) | 14 cases × 1 run: Δ 0.00 on every case; 12 cases score 1.00 in both arms | Ceiling effect: the default model already passes most fixtures without the plugin. Judge-scored screening, not human review. [Raw outputs](native-smoke-2026-10-05.json) |
| `revision-01-en`, 2 extra runs per arm | With plugin 2/2 showed only the changed `cache` block; without plugin 2/2 reprinted all 14 lines | The revision rule changed behavior here, but the 14-case run reverted to a full reprint (2 of 3 with-plugin runs followed it). The then-combined `no-echo` grader still failed the excerpt runs, which led to splitting it into one grader per item |
| `added-constraint-01-ja` | Both arms re-explained the storage overview | No measurable effect on this case |
| SessionStart inside eval runs | `SessionStart:resume` fired and injected the policy in the with-plugin arm only | First host-level observation of hook injection; still not an interactive session |
| A/B/C/D pilot, 2 stress cases × 1 run (v0.2.0) | `long-revision-01-en`: all four conditions 1.00. `long-progress-01-ja`: A 0.33, B 0.50, C 0.33, D 1.00; A and B restated step 1 details, D reported only this step's changes and open checks | Harness check only, n=1, judge noise visible (C passed essentials but failed all no-echo graders). [Raw outputs](conditions-pilot-2026-10-05.json) |
| Corpus v4 (`evals/hard`, 32 development cases), `tool-report-01-en`, 1 run per arm, Claude Code 2.1.292 | Replays end to end. Both arms scored 1.00 and the baseline passed all 3 no-echo graders; cost $0.078 for the two runs. [Raw result](hard-check-2026-10-06.json) | Harness check only, n=1. It shows the family can still be too easy for the baseline; the ceiling check below has not been run |
| Corpus ceiling check (baseline passes at most 60% of no-echo graders on the 32 v4 development cases) | Not executed | See the procedure below. A full run is roughly 192 runs, about $8 at the measured $0.04 per run, which is why `eval:hard` is capped at $10 |
| Short-instruction control B, full run | Not executed | Whether a one-line instruction matches SkipEcho remains open |
| Holdout A/B/C/D | Not executed | No release-gate conclusion |
| Cumulative conversation, total usage/cost, latency | Not measured | No savings claim |
| macOS / Windows / Node 22 / style coexistence | Not executed | CI configuration is not evidence of a passing run |

Raw exploratory outputs: [forward-smoke.json](forward-smoke.json). The agent saw only the policy and conversation messages, not required-fact grading fields. All 12 cases were answered in one isolated agent task: cross-case contamination is possible. Its exact model identifier, generation parameters, and usage were not exposed. It was instructed to load the policy, so this is not an automatic-trigger test.

No failures were identified in the assistant's limited inspection; there is no human-reviewed failure-rate estimate. The short control B was not executed, and ordinary baseline behavior may do equally well. More explanation in the re-explanation case is intentional. The changes-only numeric answer leaves retries implicit without reversing the unchanged constraint.

The hook's five source tests call the same script with synthetic input. They do not observe the host firing or consuming context. A missing Node executable and real subagent inheritance remain unverified.

Next: run the integration checklist, then collect A/B/C/D outputs, conduct blinded human review, report failures and usage, and only then assess the [v1.0 release gate](../rubric.md#v10-release-gate-final), whose model, repetitions, thresholds, and decision procedure were preregistered on 2026-10-06. Remain experimental if the short control is equally effective.
