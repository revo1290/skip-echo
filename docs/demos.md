# Illustrative demos (not an A/B benchmark)

These synthetic intended responses explain the contract. They are not outputs from a controlled same-model comparison and cannot establish effectiveness.

## Added condition

Earlier discussion: sessions in per-process memory versus shared storage.

User: 「サーバーが3台なら？」

Intended: 「3台なら、各サーバーでセッションを共有する必要があるかが判断点です。各プロセスのメモリは自動では共有されません。共有が必要な場合も、Redisが唯一の選択肢ではありません。」

Avoid restarting the storage tutorial or asserting Redis is mandatory.

## Correction

Earlier: fictional product supports CSV. User supplies a v2 specification stating CSV is unsupported and only JSON imports work.

Intended: “My earlier statement about CSV support was incorrect. The supplied v2 specification says CSV import is unsupported; JSON import is supported.”

Do not hide the earlier error or invent a source URL.

## Complete artifact

Earlier JSON: `{"timeoutMs":1500,"retries":2,"enabled":false}`.

User: 「timeoutMsだけ2000に変更。コピペ用にJSON全文だけ出して」

Intended output:

```json
{"timeoutMs":2000,"retries":2,"enabled":false}
```

Do not replace this with a diff or omit unchanged fields. Equivalent completeness applies to a requested full README.
