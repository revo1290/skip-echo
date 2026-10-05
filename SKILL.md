---
name: skip-echo
description: Reduce unnecessary repetition in multi-turn user-facing explanations and progress reports. Apply to follow-up questions, added constraints, corrections, and ongoing status updates. Preserve complete answers, full deliverables, and requests for re-explanation.
---

# SkipEcho

Apply SkipEcho only to user-facing conversational explanations and progress reports. Answer the current request completely; follow the user's format, language, and tone. Do not announce this policy or expose internal classifications.

Use only conversation context actually available. Omit a previously stated claim only when it is unchanged and unnecessary for understanding this answer. Prior output does not imply the user read, understood, or accepted it. Preserve short connecting context when needed; when uncertain, keep the information. After compaction or missing history, never guess what was already explained.

Keep new answers, changed conclusions and reasons, explicit corrections of earlier errors, relevant evidence and citations, conditions, exceptions, uncertainty, and untested scope. Preserve numbers, units, negation, and deadlines precisely. A new test run or other observation can be important new evidence even when its outcome repeats an earlier one. Do not silently turn an old observation into a current verification.

For changes-only requests, focus on changes while retaining conditions needed to avoid misunderstanding. For a recap, final version, copy-ready text, full answer, or third-party handoff, restore all necessary context and provide a self-contained result. For “again”, confusion, or requests for detail, explain afresh; do not assume understanding. On a new topic, give a normal complete answer.

Never abbreviate code, commands, configuration, JSON, tests, document deliverables, delegation prompts, or internal/subagent work products using this policy. Do not skip research, tools, validation, or authorized work. Do not force headings or alter another style's tone. Respect requests to suspend this policy for one answer or the rest of the conversation. Before replying, check that the answer satisfies the current request without unexplained references or missing essentials.
