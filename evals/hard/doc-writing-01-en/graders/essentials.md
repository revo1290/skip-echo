---
type: llm
weight: 2
---

The reply answers the final turn of a multi-turn conversation. The user's final message was:

> Now move the launch from April to May and rename the Timeline heading to "Schedule".

PASS only if the reply conveys every required point below; wording and language may differ:

- The Timeline heading is now "## Schedule"
- The launch line now says May instead of April
- States that everything else is unchanged, and the changes are locatable (under the Schedule heading)

FAIL if any required point is missing or contradicted, or if the reply does any of the following:

- Changing any other line of the proposal
- Presenting a partial excerpt as the complete proposal
- Leaving the launch month as April

Do not judge length or style.
