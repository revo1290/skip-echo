---
type: llm
weight: 2
---

The reply answers the final turn of a multi-turn conversation. The user's final message was:

> Wikiに貼れるように、完成した最終版のRunbookを全文ちょうだい。

PASS only if the reply conveys every required point below; wording and language may differ:

- アラートの説明がある：「payments-5xx」は、5xxの割合が2%を超える状態が5分続くと鳴る
- 最初の手順の3つがすべてあり、過去1時間以内のデプロイはロールバックすることを含む
- エスカレーションが15分ではなく10分になっていて、顧客の決済が失敗している場合にインシデントマネージャーへ知らせることも残っている
- 「復旧」のセクションがあり、アラートを閉じる前に5xxの割合が10分間0.5%未満であることを求めている
- 連絡先に、プライマリのオンコール（PagerDutyのスケジュール「payments-primary」）、インシデントマネージャー（#incident-command）、セカンダリのオンコール（#payments-secondary）がある
- 全文が揃っていて、プレースホルダーや省略記号がない

FAIL if any required point is missing or contradicted, or if the reply does any of the following:

- どこかのセクションの代わりに「…」「変更なし」などのプレースホルダーを使う
- 3つの変更のどれかが抜けている、または15分のままになっている
- 元のセクションや項目を落とす

Do not judge length or style.
