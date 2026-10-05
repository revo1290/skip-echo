# SkipEcho

**Less repetition. Complete answers.**

[日本語](README.ja.md) · MIT · **0.2.0 / experimental**

Long Claude sessions re-explain things: every follow-up restates the background, every status report replays the plan, and a one-line config change comes back as the whole file. SkipEcho is a conversation-aware policy for Claude Code and other Agent Skills clients that drops **repeated claims** across turns, and keeps what the user needs **this turn**: the new answer, corrections, conditions, unverified scope, and complete deliverables when they are asked for.

## Where it fits

Terse-output skills such as caveman and genshijin compress **wording inside one reply**. SkipEcho decides **which claims belong in this reply**, based on what the conversation already established. They address different waste, so they can be combined.

| | Terse styles (caveman, genshijin, “be brief”) | SkipEcho |
| --- | --- | --- |
| What gets removed | Articles, filler, honorifics, politeness | Claims already stated and still unchanged |
| Unit of decision | Each sentence | The conversation so far |
| Turn 1 of a new topic | Shorter | Unchanged: a normal complete answer |
| “Give me the full README” | Still terse | Complete and self-contained |
| “Explain that again” | Still terse | Explained afresh |
| Status report after multi-step work | Compressed full replay | Outcome, what changed, what was verified now, what remains |
| One-value edit of a long file | Whole file, compressed | Changed part plus “rest unchanged”, unless full text is requested |
| Combined use | | Supported by design: never drops required facts to meet another style's word budget |

Independent write-ups have found that terse styles cut a modest share of output tokens and that a one-line “be brief” instruction does about as well ([implicator.ai](https://www.implicator.ai/caveman-claude-code-skill-cuts-output-20-your-bill-barely-notices-2/), [Hacker News](https://news.ycombinator.com/item?id=47954745)). SkipEcho is designed to be tested against exactly that: the evaluation includes a strong one-sentence control (condition B), and the project commits to simplifying itself if it cannot beat that control. No savings or superiority claim is made until that evaluation is done. See [evaluation status](evals/results/README.md).

## What it does

| Request | Intended behavior |
| --- | --- |
| Add one constraint | Address its effect without restarting the explanation |
| Correct an earlier answer | Acknowledge the error and state the corrected conclusion |
| Progress or completion report | Lead with the outcome; report only what changed, what was verified now, and what remains |
| Change one value in an existing file or block | Show the changed part and say the rest is unchanged; give the full version if requested, if it is only a few lines, or if an excerpt would be harder to apply |
| Full text, final version, copy-ready, handoff | Restore all necessary context; never elide |
| Explain again, more detail, confusion | Explain afresh; never assume the user understood |
| New topic, or history lost after compaction | Complete answer using only the context actually available |

It never shortens requested code, commands, configuration, tests, documents, delegation prompts, or subagent work, and never skips research, tools, or verification. Illustrative examples: [demos](docs/demos.md).

## Install

### Claude Code plugin (recommended)

Applies automatically to every session through a SessionStart hook. Requires Node.js **22+** on the PATH that runs hooks.

```sh
claude plugin marketplace add revo1290/skip-echo
claude plugin install skip-echo@skip-echo-marketplace --scope user
```

Start a new session. Do not also install the standalone skill or add the same hook to your settings.

### Standalone skill (any Agent Skills client, no Node.js hook)

```sh
npx skills add revo1290/skip-echo
```

Or copy only `skills/skip-echo/` to `~/.claude/skills/skip-echo/`. A standalone skill is loaded by relevance, so it is **not** guaranteed to apply to every reply.

### Cursor, Codex, and other agents

Generated rule files carry the same policy:

- Cursor: copy [`integrations/cursor/skip-echo.mdc`](integrations/cursor/skip-echo.mdc) to `.cursor/rules/`.
- Codex and other `AGENTS.md` readers: paste [`integrations/AGENTS.md`](integrations/AGENTS.md) into your `AGENTS.md`.

These clients are untested; the files are provided for convenience.

## Control it in a conversation

| Command | Effect |
| --- | --- |
| `/skip-echo off` | Suspend for the rest of the conversation |
| `/skip-echo full` | Give the next answer as a complete, self-contained version |
| `/skip-echo on` | Resume |

If the bare name is taken by another command, use `/skip-echo:skip-echo`. Plain language works too: “Give the full answer this time” or “Stop reducing repetition for the rest of this conversation.”

To disable or remove the plugin:

```sh
claude plugin disable skip-echo@skip-echo-marketplace --scope user
claude plugin uninstall skip-echo@skip-echo-marketplace --scope user
```

Previously injected context can remain in the current conversation; start a new session to confirm it is gone.

## Measure it yourself

The repository ships a native [`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals) suite generated from the 14 frozen smoke conversations. Each case replays a fixed multi-turn history, then compares runs with and without the plugin:

```sh
claude plugin eval . --ablation with-without --runs 3 --max-cost-usd 5
```

`--ablation with-without` is required because history-replay cases otherwise run with the plugin only. Every run and judge call is billed to your account; set a cost ceiling. Graders are model-judged (`essentials` checks required facts and critical omissions, weighted 2; one `no-echo-N` grader per predeclared unnecessary repetition), so treat results as **screening, not release evidence**. Holdout cases are excluded from this suite on purpose. The human-graded A/B/C/D protocol, including the short-instruction control, is in [evals/rubric.md](evals/rubric.md).

## How it works

`src/response-policy.md` is the only policy source. `node scripts/build.mjs` generates both SKILL.md copies, the hook's policy module, the Cursor and AGENTS.md rule files, and the native eval suite; `--check` fails on any drift. The SessionStart hook injects the fixed policy for startup, resume, clear, compact, and fork. It ignores stdin, stores no user data, reads no transcripts, makes no network or model calls, and fails open if the policy cannot load.

Instructions add input tokens. In short or new conversations total cost can increase; the policy is about 3,400 characters (517 words), and its token count has not been measured. Skill discovery can load the same policy a second time; that duplicate has not been measured. There is no per-prompt injection, post-processing, or external memory.

## Development

No npm dependencies or install step.

```sh
node scripts/build.mjs
node scripts/build.mjs --check
node --test tests/*.test.mjs
claude plugin validate .
node scripts/prepare-eval.mjs smoke 1
```

The corpus has 68 synthetic cases in 34 bilingual pairs (40 development, 28 holdout) across 14 categories. `prepare-eval` creates fixed-history A/B/C/D jobs and does not call a model. Variants share templates, so they are not 68 independent observations.

See [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), [compatibility](docs/compatibility.md), [design](docs/design.md), and [sources](docs/sources.md). Issue forms cover over-omission, repetition, and activation failures. Submit only synthetic or redacted examples.
