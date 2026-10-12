# Governance

SkipEcho is an experimental project with one maintainer. This page states who decides and how, using only rules that already exist in this repository. It will be extended if the project gains maintainers.

## Maintainer

[@revo1290](https://github.com/revo1290) maintains the repository: pull requests, releases, and the issue tracker. [CODEOWNERS](.github/CODEOWNERS) requests their review on every change, and in particular on the policy and the evaluation corpus. There is no process yet for adding maintainers. If the maintainer and a contributor disagree, the maintainer decides.

## How decisions are made

- **Scope.** SkipEcho selects which claims belong in a reply, across turns. It does not force terseness or choose wording. Changes must preserve that scope ([CONTRIBUTING](CONTRIBUTING.md)).
- **Policy text.** `src/response-policy.md` changes only together with a synthetic regression conversation whose required facts and critical omissions were defined before any output was inspected. Any change to it is at least a minor version, even a rewording ([evals/rubric.md](evals/rubric.md)).
- **Claims.** A claim about effectiveness, cost, or compatibility needs recorded evidence ([evaluation status](evals/results/README.md), [compatibility](docs/compatibility.md)). Character counts are not evidence. Missing evidence is reported as "not measured" or "untested", never as a pass.
- **Holdout cases.** No one tunes on them. If their outputs influence a change, the holdout set is replaced before the next confirmatory run.
- **v1.0.** The release gate in [evals/rubric.md](evals/rubric.md#v10-release-gate-final) decides, applied as written. Its thresholds, model, repetition count, and budget are not changed after outputs have been generated; a change needs a dated amendment committed before the next run. If the project cannot beat the one-line control, it stays on 0.x as experimental.
- **Security.** See [SECURITY](SECURITY.md).

Questions and reports: [SUPPORT](SUPPORT.md).
