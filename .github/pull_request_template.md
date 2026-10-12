## Summary

<!-- What changes and why. Link the issue: "Refs #123" or "Closes #123". -->

## Type of change

- [ ] Documentation, tooling, CI, or tests only
- [ ] Policy change (`src/response-policy.md`; at least a minor version)
- [ ] Evaluation corpus or scoring change (`evals/`)
- [ ] Packaging, hook, or manifest change

## Checklist

- [ ] I ran `node scripts/build.mjs` and committed the generated files; `node scripts/build.mjs --check` passes
- [ ] `node --test tests/*.test.mjs` passes
- [ ] I did not edit generated files by hand (both `SKILL.md` copies, `scripts/policy.generated.mjs`, `integrations/`, `evals/native/`, `evals/conditions/`, `evals/hard/`)
- [ ] Policy change only: the regression conversation, required facts, and critical omissions were defined before I inspected any output (`evals/rubric.md`)
- [ ] I did not tune on holdout cases or their outputs
- [ ] Any result I cite comes with raw outputs and the exact model and client versions; no savings are claimed from character counts
- [ ] Examples are synthetic or redacted: no tokens, private code, or personal transcripts
