# Compatibility and integration checklist

## Observed vs planned

| Surface | Status |
| --- | --- |
| Linux / Node.js 24.19.0: build and unit tests | Executed; see results |
| Node.js 22, macOS, Windows | CI matrix prepared; not executed here |
| Claude Code plugin validation | Executed 2026-10-05 with Claude Code 2.1.289 on Linux: plugin and marketplace manifests pass without warnings |
| `npx skills add` discovery | `skills add <local repo> --list` finds exactly one `skip-echo` skill; installation into each agent untested |
| Native `claude plugin eval` suite | Suite directory resolves from `experimental.evals`; no case has been run, so history replay and SessionStart firing inside eval runs are unverified |
| Cursor rule / AGENTS.md snippet | Generated only; untested in any client |
| SessionStart context inside Claude Code | Not observed |
| startup / resume / clear / compact / fork | Hook unit inputs covered; real host lifecycle untested |
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
