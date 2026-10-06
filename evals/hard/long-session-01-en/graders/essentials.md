---
type: llm
weight: 2
---

The reply answers the final turn of a multi-turn conversation. The user's final message was:

> I ran it in staging for a day: all 4 migrated jobs ran on schedule, export_report had 1 retry that succeeded, and the dead-letter alert never fired. Production is untouched. Where are we and what is left? Base it only on what I just said.

PASS only if the reply conveys every required point below; wording and language may differ:

- Staging, one day (as reported by the user): all 4 migrated jobs ran on schedule, and export_report had 1 retry that succeeded
- The dead-letter alert never firing does not show that the alert works, because it was never triggered
- Production is untouched, so nothing is verified in production and the production rollout is still to do
- rotate_keys is still on cron, not migrated, pending making it idempotent or locked

FAIL if any required point is missing or contradicted, or if the reply does any of the following:

- Saying production is verified or migrated
- Saying all five jobs are migrated
- Saying the alert was tested and works

Do not judge length or style.
