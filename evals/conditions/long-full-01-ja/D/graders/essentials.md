---
type: llm
weight: 2
---

The reply answers the final turn of a multi-turn conversation. The user's final message was:

> 上書き用に、最終版のdocker-compose.ymlを全文ちょうだい。

PASS only if the reply conveys every required point below; wording and language may differ:

- webのreplicasが3
- dbのメモリ上限が1g
- 元ファイルのほかの行がすべてある（image、ports、environment、depends_on、healthcheck、volumes）
- 省略記号やプレースホルダーがない

FAIL if any required point is missing or contradicted, or if the reply does any of the following:

- 「...」や「変更なし」での省略
- 以前の変更のどちらかの欠落

Do not judge length or style.
