# Design contract

SkipEcho is a conversation-aware information-selection policy, not a universal brevity style. The editing source is `src/response-policy.md`; generated copies are byte-checked. The same compact core is used for the hook and Skill, avoiding a second abridgment with different exceptions.

The runtime does not classify messages in code. The model decides whether a repeated claim is necessary using visible context. Omission is conservative. User comprehension and consent are never inferred from previous output. Complete artifacts and internal work are excluded.

SessionStart is used instead of per-prompt injection to limit repeated instruction input. It does not restore compacted history. The hook emits only fixed JSON and ignores all input. The matcher supplies event scoping, so malformed stdin does not matter. The generated module is dynamically imported so missing/corrupt policy fails open. Failures of Node or the host remain integration questions.

The plugin uses only the default `hooks/hooks.json` registration; plugin.json deliberately does not add it again. The standalone Skill can still be discovered after hook injection, so duplicate model context is possible and must be counted. No output-style override is installed.

B is a strong one-sentence control. If C/D cannot improve on B without losing information, simplify the product. Any future Output Style experiment must be isolated from the hook and retain coding instructions; it is not shipped here.

Names: Delta was replaced because of ambiguity with the established git pager. Public search on 2026-10-05 for SkipEcho/skip-echo plus skill/Claude did not identify the intended same-named skill, but did surface unrelated uses of Skipecho. This is neither name reservation nor trademark clearance. The chosen distribution identifier is `skip-echo`; no registry or public repository has been reserved.
