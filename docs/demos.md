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

## Progress report

Earlier turns: a three-step plan for signup validation, then a password rule. The user now reports that 4 messages moved to `t("signup.*")` keys in `locales/en.json`, that `npm test` passed 49 tests, and that `locales/ja.json` has no keys yet.

Intended: “Per your run, the 4 signup messages now use `t()` keys in `locales/en.json` and the suite passes 49/49. Remaining: `locales/ja.json` still needs the `signup.*` keys, so Japanese users would see missing translations.”

Avoid replaying the original plan, re-describing the validators, or implying the tests were run by the assistant.

## Revision without a full-text request

Earlier: a 14-line `config.yaml` and a question about `cache.ttl`. User: “Change cache.ttl to 600. Leave everything else as is.”

Intended:

```yaml
cache:
  enabled: true
  ttl: 600
  max_entries: 1000
```

“Only `cache.ttl` changed (300 → 600); the rest of the file is unchanged.”

If the user had asked for the full or copy-ready file, all 14 lines would be returned with no elision.
