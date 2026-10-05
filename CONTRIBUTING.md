# Contributing

Use Node.js 22 or later. No npm install is needed.

Edit `src/response-policy.md`, run `node scripts/build.mjs`, then `node --test tests/*.test.mjs`.
Never edit generated policy files directly. Keep runtime instructions separate from project documentation.

Behavior changes need a synthetic regression conversation with required facts and critical omissions defined before outputs are inspected. See `evals/rubric.md`. Do not tune on holdout cases; if their outputs influence a change, replace the holdout set before the next confirmatory evaluation.

Do not claim savings from character counts. Report raw outputs, model and client versions, actual usage when available, failures, and missing observations. Changes should preserve scope: conversational information selection, not forced terseness.

Run the integration checklist in `docs/compatibility.md` before expanding compatibility claims. CI checks JavaScript and packaging, not Claude Code integration or model quality.
