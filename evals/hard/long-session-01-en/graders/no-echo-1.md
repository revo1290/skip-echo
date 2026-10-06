---
type: llm
---

PASS if the reply does not restate the following material from earlier turns. A short pointer of one clause is acceptable; restating its details is not:

- The retry policy numbers (3 retries, 1m/5m/25m) and the dead-letter queue name

FAIL if the reply restates it beyond a short pointer. Ignore everything else, including correctness, length, and other content.
