# Compatibility and integration checklist

## Observed vs planned

| Surface | Status |
| --- | --- |
| Linux / Node.js 24.19.0: build and unit tests | Executed; see results |
| Node.js 22 and 26, macOS, Windows | CI matrix prepared; not executed here |
| Claude Code plugin validation | Executed 2026-10-05 with Claude Code 2.1.289 on Linux: plugin and marketplace manifests pass without warnings |
| `npx skills add` discovery | `skills add <local repo> --list` finds exactly one `skip-echo` skill; installation into each agent untested |
| A/B/C/D condition suite (`evals/conditions`) | Pilot executed 2026-10-05: all four conditions load and run; the empty baseline plugin must sit inside each case directory |
| Native `claude plugin eval` suite | Executed 2026-10-05, Claude Code 2.1.289, Linux: synthetic `history.jsonl` accepted and replayed; `SessionStart:resume` fired with the plugin and injected the policy, absent without it |
| History with `tool_use` / `tool_result` blocks in `claude plugin eval` | Executed 2026-10-06, Claude Code 2.1.292, Linux: a prototype and `evals/hard/tool-report-01-en` replay and are answered from the tool history, with and without the plugin; one case, no other client |
| Cursor rule / AGENTS.md snippet | Generated only; untested in any client |
| SessionStart context inside Claude Code | Observed inside `claude plugin eval` child sessions (resume source), and on 2026-10-12 with Claude Code 2.1.296 on Linux at startup through `claude --debug-file <file> --init-only` with an isolated config directory: the debug log shows the hook finishing with status 0 in 59 to 126 ms and `provided additionalContext (3905 chars)`. Interactive sessions not observed |
| `SKIP_ECHO=off` | Same setup: from the shell, from `--settings` `env`, and from a project's `.claude/settings.local.json`, the hook ran and no context was delivered; settings `env` `on` overrode shell `off`; unrecognized values injected the policy. Workspace-trust behavior for project `env` in interactive sessions untested |
| `claude plugin disable ... --scope local` | Same setup, plugin installed at user scope from a local marketplace: no SkipEcho hook ran in the disabled project; another project still received the policy |
| Duplicate hook registration | Same setup: the hook added to `--settings` as well as the plugin ran twice and delivered the policy twice at one startup; the doctor's `--debug-log` check reports it |
| `/skip-echo:doctor` command | Loads in Claude Code 2.1.296 (debug log: 1 command from plugin skip-echo); `claude plugin validate --strict commands` passes. A model run of the command is untested |
| `scripts/doctor.mjs` | `tests/doctor.test.mjs` passed locally on Linux with Node 22.22.0, and the CI matrix runs it on Linux, macOS, and Windows. Its checks run outside the host, except `--debug-log` |
| startup / resume / clear / compact / fork | Hook unit inputs covered. In the host: startup observed through `--init-only` (above), resume inside eval child sessions; clear, compact, and fork untested |
| Standalone skill format | Local skill validator checked; discovery is client-specific |
| Agent forward tests | Explicit policy, development-only; not Claude Code auto-application |
| Subagent inheritance / output-style coexistence | Untested |
| Native Claude Code installer without Node | Untested; standalone route available |
| Combined with caveman / genshijin / yomiyasu | Untested; the policy forbids dropping required facts to meet a terse style |
| `/skip-echo off\|full\|on` arguments | Documented skill-argument behavior; model compliance untested |

## Per-client release evidence

Record OS, Node version, exact Claude Code version, model, plugin version, installation scope, other skills/styles, and timestamp. Never publish private transcript contents. Use a disposable project and synthetic conversations.

1. Run `claude plugin validate .`; retain its output.
2. Register local marketplace and install user-scoped plugin; inspect `/hooks` for exactly one SessionStart entry.
3. Trigger a new session, resume, clear, compact, and fork separately. Capture host diagnostic evidence that the hook ran AND that additionalContext reached model context. Do not infer injection solely from a short answer or the model saying it received it. If the client cannot expose injection, record that field as unknown.
4. Ask synthetic follow-ups without naming SkipEcho. Record behavior separately from injection. Run enough turns to check persistence and any second Skill load.
5. Ask for code/JSON/full text, a correction, and re-explanation. Confirm protected output completeness.
6. Create a subagent handoff with all required fields. Confirm internal output is not shortened. Record actual policy inheritance rather than assuming it.
7. In an isolated plugin copy, remove its generated module; verify a diagnostic and continued work. In a test environment without Node, record host failure behavior.
8. Disable and start a new conversation; confirm no new injection. Re-enable once; confirm no duplicate hook registration. Uninstall and confirm disappearance.
9. Test one other style at a time, with full versions and configurations recorded. Never assume coexistence from successful JSON parsing.

Only mark an environment supported after these checks. Until then the plugin is experimental and no minimum Claude Code version is promised.
