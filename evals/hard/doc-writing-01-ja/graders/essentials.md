---
type: llm
weight: 2
---

The reply answers the final turn of a multi-turn conversation. The user's final message was:

> じゃあ、リリースを4月から5月に動かして、「スケジュール案」の見出しを「スケジュール」に変えて。

PASS only if the reply conveys every required point below; wording and language may differ:

- 見出しが「## スケジュール」になっている
- リリースの行が4月ではなく5月になっている
- ほかは変えていないと述べていて、変更箇所が分かる（スケジュールの見出しの下）

FAIL if any required point is missing or contradicted, or if the reply does any of the following:

- 提案書のほかの行を変える
- 部分的な抜粋を提案書の全文として示す
- リリースの月が4月のままになっている

Do not judge length or style.
