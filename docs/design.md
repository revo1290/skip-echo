# Design contract

SkipEcho is a conversation-aware information-selection policy, not a universal brevity style. The editing source is `src/response-policy.md`; generated copies are byte-checked. The same compact core is used for the hook and Skill, avoiding a second abridgment with different exceptions.

The runtime does not classify messages in code. The model decides whether a repeated claim is necessary using visible context. Omission is conservative. User comprehension and consent are never inferred from previous output. Complete artifacts and internal work are excluded.

SessionStart is used instead of per-prompt injection to limit repeated instruction input. It does not restore compacted history. The hook emits only fixed JSON and ignores all input. The matcher supplies event scoping, so malformed stdin does not matter. The generated module is dynamically imported so missing/corrupt policy fails open. Failures of Node or the host remain integration questions.

The plugin uses only the default `hooks/hooks.json` registration; plugin.json deliberately does not add it again. The standalone Skill can still be discovered after hook injection, so duplicate model context is possible and must be counted. No output-style override is installed.

Positioning: terse-output skills compress wording within one reply; SkipEcho selects claims across turns. The policy states that it does not choose wording and must not drop required facts to satisfy another style, so the two can be combined. A competing claim that only `be brief` is needed is exactly what control B tests.

v0.2 adds two rules aimed at the most common repetition in agent sessions. Progress reports lead with this step's outcome and omit an unchanged plan or earlier steps. Revisions of an existing artifact show the changed part with locating context unless the user asks for the full or copy-ready version, the artifact is only a few lines, or an excerpt would be harder to apply; files already written by a tool are named, not pasted. Requested artifacts remain protected from abbreviation, and an excerpt may never be presented as complete. These rules have dedicated `progress` and `revision` cases.

Manual control uses skill arguments (`off`, `full`, `on`) rather than a separate command, so there is one user-facing name and the hook-injected policy already explains the modes. No state is stored; the mode lives in the conversation.

The generated `evals/native/` suite lets users run `claude plugin eval` themselves. It mirrors only smoke (development) cases so holdout outputs are never exposed during iteration, and its model-judged scores are screening data, not the human-graded release gate.

B is a strong one-sentence control. If C/D cannot improve on B without losing information, simplify the product. Any future Output Style experiment must be isolated from the hook and retain coding instructions; it is not shipped here. If D is no better than B at the v1.0 gate, the policy is shortened toward B and re-evaluated on a fresh holdout; if it still is not better, the project stays on 0.x as experimental (decision procedure in `evals/rubric.md`).

Names: Delta was replaced because of ambiguity with the established git pager. Public search on 2026-10-05 for SkipEcho/skip-echo plus skill/Claude did not identify the intended same-named skill, but did surface unrelated uses of Skipecho. This is neither name reservation nor trademark clearance. The chosen distribution identifier is `skip-echo`; no registry or public repository has been reserved.
