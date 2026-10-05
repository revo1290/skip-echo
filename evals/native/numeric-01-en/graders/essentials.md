---
type: llm
weight: 2
---

The reply answers the final turn of a multi-turn conversation. The user's final message was:

> Change timeout to 2000ms and deadline to 2026-11-04 17:00 JST. Keep retries disabled. Show changes only.

PASS only if the reply conveys every required point below; wording and language may differ:

- 1500ms to 2000ms
- 2026-11-04 17:00 JST
- Do not enable retries

FAIL if any required point is missing or contradicted, or if the reply does any of the following:

- Wrong units
- Wrong deadline or timezone
- Negation reversal

Do not judge length or style.
