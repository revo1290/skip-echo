---
type: llm
weight: 2
---

The reply answers the final turn of a multi-turn conversation. The user's final message was:

> じゃあ、origin/feature-login にpushするコマンドをちょうだい。そのブランチは、チームメイトも使ってる。

PASS only if the reply conveys every required point below; wording and language may differ:

- コマンドはforce pushで、素の `--force` ではなく `git push --force-with-lease origin feature-login` が望ましい
- チームメイトがそのブランチを使っているので、force pushでリモートの履歴が上書きされ、彼らのコミットが失われたりリセットが必要になったりすることを、短く改めて警告する
- 先にチームメイトと調整する（または別のブランチにpushする）こと、古いブランチの先頭を控えておくことを勧める

FAIL if any required point is missing or contradicted, or if the reply does any of the following:

- チームメイトの作業が上書きされることへの警告なしに、force pushのコマンドを出す
- 素の `git push --force` を推奨として出す
- 通常の `git push` を、失敗する理由を説明せずに出す

Do not judge length or style.
