# Troubleshooting

Observations on this page come from Claude Code 2.1.296 on Linux, run with `--init-only` and an isolated configuration directory on 2026-10-12. Other versions, platforms, and interactive sessions are untested; see [compatibility](compatibility.md).

## Is SkipEcho active?

Three questions, each with its own evidence. A yes to one does not answer the next.

| Question | How to check |
| --- | --- |
| Is this copy of the plugin intact, and would its hook inject the policy? | `/skip-echo:doctor`, or run the doctor script from a terminal |
| Did Claude Code run the hook and receive the policy? | A debug log from `claude --debug-file <file> --init-only`, checked with the doctor |
| Does the model follow the policy? | Behavior only. The first two checks cannot show it, and neither can the model saying it received the policy |

### 1. Run the doctor

Inside Claude Code:

```text
/skip-echo:doctor
```

Claude runs one local command, `node ".../scripts/doctor.mjs"`, and shows its output; your permission settings decide whether it asks first. The model never loads this command on its own. Claude Code 2.1.296 loads the command; a model run of it has not been observed yet. From a terminal, run the same script from the installed plugin directory, which `claude plugin list --json` prints as `installPath`, for example:

```sh
node ~/.claude/plugins/cache/skip-echo-marketplace/skip-echo/0.2.0/scripts/doctor.mjs
```

Add `--json` for machine-readable output. The doctor exits with 1 when a check fails.

| Check | What it means |
| --- | --- |
| `node` | The Node.js that ran the doctor. Hooks use the first `node` on Claude Code's PATH, which can differ when you run the doctor from another shell |
| `plugin` | The plugin manifest and the directory the doctor checked |
| `hook-registration` | `hooks/hooks.json` registers one SessionStart hook for startup, resume, clear, compact, and fork |
| `policy` | The generated policy module loads; its length and a short SHA-256 identify the version |
| `hook-run` | The doctor ran the hook script the way Claude Code does and checked its output |
| `skip-echo-env` | Whether `SKIP_ECHO` turns injection off for this shell or session |
| `session-env` | Shown outside Claude Code only: settings files can set `SKIP_ECHO` that a plain terminal does not see |
| `standalone-skill` | A standalone `skip-echo` skill in `~/.claude/skills/` (or `$CLAUDE_CONFIG_DIR/skills/`) or in the project's `.claude/skills/` can load the policy a second time |

The doctor reads the plugin's own files, `SKIP_ECHO`, and whether those two skill files exist. It prints no policy text and writes the home directory as `~` or `$HOME`, so its output can be pasted into an issue.

### 2. Check what Claude Code did at session start

```sh
claude --debug-file skip-echo-debug.log --init-only
node <installPath>/scripts/doctor.mjs --debug-log skip-echo-debug.log
```

`--init-only` runs Claude Code's start-up, including every SessionStart hook of every enabled plugin, and exits without a model call. The doctor then reports each SkipEcho run it finds in the log:

```text
  ok    debug-log          startup: hook finished with status 0 in 64 ms (plugin skip-echo@skip-echo-marketplace); policy delivered (3234 characters)
```

Claude Code 2.1.296 writes two lines for this: `Hooks: SessionStart:<source> [...session-start.mjs] (plugin ...) finished with status 0 (...ms)` when the hook ran, and `Hook SessionStart (...) provided additionalContext (<n> chars)` when its output was accepted as context. With `SKIP_ECHO=off` only the first line appears. Earlier versions may not write them.

To check a real session instead, start it with `claude --debug-file <file>` (or `claude --debug`, which writes to `~/.claude/debug/<session-id>.txt`) and pass that file to the doctor. A debug log holds your paths and the context every hook added, so share the doctor's summary, never the log.

## Turn it off

| For | Do this | What stops |
| --- | --- | --- |
| The rest of this conversation | `/skip-echo off` | The model is asked to stop applying the policy. The mode lives in the conversation: `/clear` starts a new one and the hook injects the policy again; whether a compaction summary keeps the mode is untested |
| One terminal or one run | `SKIP_ECHO=off claude` | The hook injects nothing |
| This project, for you | `.claude/settings.local.json`: `{"env": {"SKIP_ECHO": "off"}}` | The hook injects nothing |
| This project, for everyone | The same `env` entry in the committed `.claude/settings.json` | The hook injects nothing |
| The whole plugin in this project | `claude plugin disable skip-echo@skip-echo-marketplace --scope local` | Hook, skill, and `/skip-echo:doctor` |
| The whole plugin everywhere | `claude plugin disable skip-echo@skip-echo-marketplace --scope user` | Hook, skill, and `/skip-echo:doctor` |

Observed with the `--init-only` setup above: `SKIP_ECHO=off` from the shell, from a `--settings` `env` block, and from a project's `.claude/settings.local.json` each left the hook running with no policy delivered; a settings `env` value of `on` overrode `off` exported in the shell; and `--scope local` kept the plugin out of that one project while another project still received the policy.

- `SKIP_ECHO` accepts `off`, `0`, or `false` to turn injection off, and `on`, `1`, `true`, or an empty value for the default, in any letter case. Any other value is ignored with a note in the debug log, and the policy is injected.
- Claude Code applies most `env` values from a project's settings files only after you trust the folder. In an untrusted folder, set the variable in your shell or user settings instead.
- The hook runs only at startup, resume, `/clear`, compaction, and fork. A changed setting takes effect at the next of those; context already injected stays in the current conversation. Start a new session to confirm a change.
- `SKIP_ECHO=off` stops only the automatic injection. The skill still loads when you type `/skip-echo` (or `/skip-echo on`), and Claude Code can still load it when a request looks relevant. That gives an opt-in mode: keep `SKIP_ECHO=off` and invoke `/skip-echo` when you want it. To remove the skill as well, disable the plugin.

## The policy is loaded twice

| Cause | How to see it | Fix |
| --- | --- | --- |
| A standalone `skip-echo` skill installed next to the plugin | Doctor: `standalone-skill` warning | Remove the standalone copy |
| The hook copied into a settings file as well | Doctor with `--debug-log`: "the hook ran twice for one startup event" | Remove the copy from settings |
| Claude Code loading the plugin's own skill after the hook already injected the policy | Not detectable by the doctor; frequency unmeasured ([#9](https://github.com/revo1290/skip-echo/issues/9)) | None yet |

A hook copied into settings was observed to deliver the 3,905-character policy twice at one startup.

## Node.js is missing or old

The hook runs `node` from Claude Code's PATH. Node.js 22 or later is what CI tests. Without Node.js the host behavior is untested ([#21](https://github.com/revo1290/skip-echo/issues/21)); the standalone skill needs no Node.js.

## The hook is slow

Claude Code stops the hook after 5 seconds and continues without the policy. Runs observed for this page took 59 to 126 ms. The doctor warns when its own run takes more than half of that limit.

## Reporting a problem

Use the [activation issue form](https://github.com/revo1290/skip-echo/issues/new?template=activation.yml) and paste the doctor's output, with `--debug-log` if you have a log. See [SUPPORT](../SUPPORT.md) for what else to include.
