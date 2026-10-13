# Contributing

Use Node.js 22 or later. No npm install is needed.

Edit `src/response-policy.md`, run `node scripts/build.mjs`, then `node --test tests/*.test.mjs`.
Never edit generated files directly: both SKILL.md copies, `scripts/policy.generated.mjs`, `integrations/`, `evals/native/`, `evals/conditions/`, and `evals/hard/` are rebuilt from sources. Keep runtime instructions separate from project documentation.

Behavior changes need a synthetic regression conversation with required facts and critical omissions defined before outputs are inspected. See `evals/rubric.md`. Do not tune on holdout cases; if their outputs influence a change, replace the holdout set before the next confirmatory evaluation.

Do not claim savings from character counts. Report raw outputs, model and client versions, actual usage when available, failures, and missing observations. Changes should preserve scope: conversational information selection, not forced terseness.

`claude plugin eval . --ablation with-without --max-cost-usd <budget>` runs the generated smoke and stress suite against Claude Code, and `claude plugin eval . --eval-dir evals/conditions --ablation none --max-cost-usd <budget>` compares A/B/C/D; judge scores are screening only and must not be reported as human-reviewed results.

Versioning: any change to `src/response-policy.md` is at least a minor version, even if it only rewords. Patch releases never change the policy text. Changing a mode name, the installation route, or the hook contract is a major change after 1.0. See the versioning rules in `evals/rubric.md`.

Run the integration checklist in `docs/compatibility.md` before expanding compatibility claims. CI checks JavaScript, packaging, manifest validation (`claude plugin validate --strict`), and relative Markdown links (`node scripts/check-links.mjs`), not Claude Code integration or model quality.

`node scripts/echo-meter.mjs results <file>` gives a free, judge-free repetition measure for recorded outputs; report it next to judged scores, never as a substitute or as evidence that a repeat was unnecessary.

`node scripts/measure-cost.mjs --runs 3 --max-cost-usd 2` measures the input-token and cost overhead of the plugin on your account (billed). Rerun it whenever the policy, the skill description, or a command description changes, and replace the numbers in the README with the new record.

`node scripts/doctor.mjs` checks a plugin copy and, with `--debug-log`, what Claude Code did at session start; see [troubleshooting](docs/troubleshooting.md). Keep the hook's inputs to the bundled policy module and `SKIP_ECHO`; any new input needs the same review as a hook contract change.

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). Pull requests use the [template](.github/pull_request_template.md), and [CODEOWNERS](.github/CODEOWNERS) asks GitHub to request the maintainer's review on pull requests from others. [GOVERNANCE](GOVERNANCE.md) describes how decisions are made; [SUPPORT](SUPPORT.md) covers questions and bug reports.
