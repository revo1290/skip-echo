---
type: llm
weight: 2
---

The reply answers the final turn of a multi-turn conversation. The user's final message was:

> Give me the complete final docker-compose.yml so I can paste it over the old one.

PASS only if the reply conveys every required point below; wording and language may differ:

- web replicas is 3
- db memory limit is 1g
- Every other line of the original file is present (images, ports, environment, depends_on, healthcheck, volumes)
- No elision markers or placeholders

FAIL if any required point is missing or contradicted, or if the reply does any of the following:

- Using "..." or "unchanged" placeholders
- Missing either earlier change

Do not judge length or style.
