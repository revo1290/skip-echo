# Contributing

Use Node.js 22 or later. No npm install is needed.

Edit `src/response-policy.md`, run `node scripts/build.mjs`, then `node --test tests/*.test.mjs`.
Never edit generated files directly: both SKILL.md copies, `scripts/policy.generated.mjs`, `integrations/`, `evals/native/`, and `evals/conditions/` are rebuilt from sources. Keep runtime instructions separate from project documentation.

Behavior changes need a synthetic regression conversation with required facts and critical omissions defined before outputs are inspected. See `evals/rubric.md`. Do not tune on holdout cases; if their outputs influence a change, replace the holdout set before the next confirmatory evaluation.

Do not claim savings from character counts. Report raw outputs, model and client versions, actual usage when available, failures, and missing observations. Changes should preserve scope: conversational information selection, not forced terseness.

`claude plugin eval . --ablation with-without --max-cost-usd <budget>` runs the generated smoke and stress suite against Claude Code, and `claude plugin eval . --eval-dir evals/conditions --ablation none --max-cost-usd <budget>` compares A/B/C/D; judge scores are screening only and must not be reported as human-reviewed results.

Run the integration checklist in `docs/compatibility.md` before expanding compatibility claims. CI checks JavaScript and packaging, not Claude Code integration or model quality.
