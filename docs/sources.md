# Sources and verification scope

Reviewed 2026-10-05. Live documentation is not a pinned client release. Implementation choices and measured behavior are separate from documented interfaces.

- Claude Code skills: https://code.claude.com/docs/en/skills — relevance-based Skill use and file format.
- Hook reference: https://code.claude.com/docs/en/hooks#sessionstart — SessionStart sources and additionalContext.
- Plugin manifest: https://code.claude.com/docs/en/plugins-reference — default skills/ and hooks/hooks.json locations; plugin-root path quoting.
- Marketplace setup: https://code.claude.com/docs/en/plugin-marketplaces — marketplace manifest and local installation flow.
- Plugin management: https://code.claude.com/docs/en/discover-plugins — user scope, disabling and uninstalling.
- Skill arguments and invocation: https://code.claude.com/docs/en/skills — `argument-hint`, appended `ARGUMENTS:` fallback, plugin skill namespacing.
- Plugin evals: https://code.claude.com/docs/en/plugin-evals — case layout, `context.history_file`, `--ablation with-without`, `experimental.evals`.
- Agent Skills specification: https://agentskills.io/specification — standalone SKILL.md conventions.

Related projects referenced for positioning only (reviewed 2026-10-05; their code was not used): caveman (terse English output), genshijin https://github.com/interfacex-co-jp/genshijin (terse Japanese output), yomiyasu (Japanese readability rewriting). Third-party analyses of terse styles: https://www.implicator.ai/caveman-claude-code-skill-cuts-output-20-your-bill-barely-notices-2/ and https://news.ycombinator.com/item?id=47954745. These are cited as reported claims, not reproduced measurements.

No competitive superiority or absence-of-competition claim is made. Related projects in the original proposal are not reproduced in this project, and their code was not used.
