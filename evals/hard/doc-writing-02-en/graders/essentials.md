---
type: llm
weight: 2
---

The reply answers the final turn of a multi-turn conversation. The user's final message was:

> Give me the complete final runbook so I can paste it into the wiki.

PASS only if the reply conveys every required point below; wording and language may differ:

- The alert description is present: "payments-5xx" fires when the 5xx rate stays above 2% for 5 minutes
- The three First steps are all present, including rolling back a deploy made in the last hour
- Escalation says 10 minutes (not 15) and still includes notifying the incident manager if customer payments fail
- A Recovery section requires the 5xx rate under 0.5% for 10 minutes before closing the alert
- Contacts include the primary on-call (PagerDuty schedule "payments-primary"), the incident manager (#incident-command), and the secondary on-call (#payments-secondary)
- The text is complete, with no placeholders or elision markers

FAIL if any required point is missing or contradicted, or if the reply does any of the following:

- Using "...", "unchanged" or similar placeholders in place of any section
- Missing any of the three earlier changes, or still saying 15 minutes
- Dropping an original section or item

Do not judge length or style.
