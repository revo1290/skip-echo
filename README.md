# SkipEcho

**Less repetition. Complete answers.**

[日本語](README.ja.md) · MIT · **0.1.0 / experimental**

A conversation-aware Agent Skill that aims to stop re-explaining unchanged background on every follow-up. It keeps the new answer, necessary context, explicit corrections, and complete deliverables. Shorter is not automatically better.

## What it does

| Request | Intended behavior |
| --- | --- |
| Add one constraint | Address its effect without restarting the entire explanation |
| Correct an earlier answer | Acknowledge the error and explain the corrected conclusion |
| Full text / final version / handoff | Include all necessary context and complete artifacts |
| Explain again / in more detail | Explain afresh; never assume the user understood |
| New topic / lost history | Give a complete answer using only available context |

These are design goals, not a measured superiority claim. See [evaluation status](evals/results/README.md), [illustrative demos](docs/demos.md), and [limitations](docs/compatibility.md).

## Try the Claude Code plugin locally

Requires Node.js **22+** on PATH in the environment that runs hooks, plus a Claude Code version supporting the documented plugin and SessionStart interfaces. The minimum compatible Claude Code version has not been established. A native Claude Code installation does not imply Node.js is installed.

From this project's root:

```sh
node scripts/build.mjs --check
node --test tests/*.test.mjs
claude plugin validate .
claude --plugin-dir .
```

`claude plugin validate` and `--plugin-dir` are documented commands; they have not been executed in the development environment. Ask ordinary follow-up questions; invoking the skill manually is not needed for the plugin's SessionStart injection. Hook execution does not guarantee model compliance.

## Install for your user account

From the project root, register the local marketplace and install:

```sh
claude plugin marketplace add .
claude plugin install skip-echo@skip-echo-marketplace --scope user
```

Start a new session to exercise SessionStart. Do not simultaneously install a standalone copy or add the same hook to settings. No CLAUDE.md or output style is edited by this project. Install from GitHub with `claude plugin marketplace add revo1290/skip-echo`, then `claude plugin install skip-echo@skip-echo-marketplace --scope user`.

To disable or remove:

```sh
claude plugin disable skip-echo@skip-echo-marketplace --scope user
claude plugin uninstall skip-echo@skip-echo-marketplace --scope user
```

Previously injected context may remain in the current conversation. Start a fresh session after disabling to test absence of injection. You can also say “Give the full answer this time” or “Stop applying repetition reduction for the rest of this conversation.”

## Standalone skill

For Claude Code without Node.js, copy **only** `skills/skip-echo/` into `~/.claude/skills/skip-echo/` (do not overwrite an existing installation unintentionally). Remove that folder to uninstall. The file follows the [Agent Skills format](https://agentskills.io/specification). Other clients need their own skill installation procedure.

Standalone discovery is relevance-based and is **not** guaranteed on every response. The bundled root `SKILL.md` is an equivalent copy for personal-skill hosts; Claude Code's plugin layout uses the nested `skills/` directory. Runtime consumers do not need to read this README or evaluation files.

## How it works

`src/response-policy.md` is the only policy source. `node scripts/build.mjs` generates both SKILL.md copies and `scripts/policy.generated.mjs`. A single SessionStart hook injects this fixed policy for startup, resume, clear, compact, and fork. It ignores stdin, stores no user data, and does not access transcripts, network, or another model. It fails open if the bundled policy cannot load. The host can show diagnostics if Node is missing.

Skill discovery can load the same policy again; duplicate model context has not been measured. There is no per-prompt injection, post-processing, external memory, or cache-extension feature. Instructions add input tokens; total costs can increase in short or new conversations.

## Development and evaluation

No npm dependencies or install step. Node.js is a runtime dependency.

```sh
node scripts/build.mjs
node scripts/build.mjs --check
node --test tests/*.test.mjs
node scripts/prepare-eval.mjs smoke 1
```

Preparation creates 48 fixed-history jobs (12 cases × A/B/C/D); **it does not call a model**. See [rubric and procedure](evals/rubric.md). The corpus contains 60 synthetic cases in 30 bilingual pairs, split into 36 development and 24 holdout cases. Variants share templates and are not 60 independent real-world observations.

Do not advertise token savings or superiority to a short instruction until a controlled evaluation supports it. Full Claude Code lifecycle tests, independent human scoring, A/B/C/D comparisons, and cumulative-conversation evaluation remain outstanding.

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), [compatibility](docs/compatibility.md), [design](docs/design.md), and [sources](docs/sources.md). Issue forms cover over-omission, repetition, and activation failures. Submit only synthetic or redacted examples.
