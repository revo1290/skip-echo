# SkipEcho（スキップエコー）

**同じ説明は減らす。必要な答えは残す。**

[English](README.md) · MIT · **0.1.0／experimental**

会話の追加質問や作業報告で、既に説明した内容の不要な繰り返しを減らすAgent Skillです。今回の答え、変更理由、訂正、必要な前提を残します。短くすること自体を目的にしません。

## 応答の扱い

| 要求 | 狙う動作 |
| --- | --- |
| 条件を1つ追加 | その条件の影響に答える |
| 以前の回答が誤り | 訂正と正しい結論を明示する |
| 全文・最終版・引き継ぎ | 必要な既出情報も再掲し、自己完結させる |
| 分からない・もう一度・詳しく | 理解済みと決めつけず、説明し直す |
| 新しい話題・compact後の履歴不足 | 見えている文脈だけを使い、完全な回答を優先する |

コード、JSON、コマンド、文書完成稿、委任文、subagent内部成果物の省略には使いません。調査・検証・ツール実行も省きません。

## Claude Codeで試す

Node.js **22以上**がhookの実行環境のPATHに必要です。Claude Codeの最小対応バージョンは未確定です。ネイティブ版Claude Codeを入れただけでNode.jsも使えるとは限りません。

プロジェクトのルートで実行します。

```sh
node scripts/build.mjs --check
node --test tests/*.test.mjs
claude plugin validate .
claude --plugin-dir .
```

後半2つは公式の手順に沿ったコマンドですが、この開発環境ではClaude Code本体がなく未実行です。

## ユーザー全体へ導入・解除

プロジェクトルートでローカルマーケットプレイスを登録します。

```sh
claude plugin marketplace add .
claude plugin install skip-echo@skip-echo-marketplace --scope user
```

導入後、新しいセッションを開始します。通常の質問で利用できる設計で、毎回のスキル呼び出しは不要です。ただしhookの投入とモデルの遵守は別です。既存のCLAUDE.mdや出力スタイルは変更しません。同じhookを設定へ手動追加したり、単体Skillを同時に導入したりしないでください。

無効化・アンインストール:

```sh
claude plugin disable skip-echo@skip-echo-marketplace --scope user
claude plugin uninstall skip-echo@skip-echo-marketplace --scope user
```

すでに投入した指示は現在の会話に残る可能性があります。解除後の確認は新しいセッションで行ってください。会話中の「今回は全文」「ここから重複抑制をやめて」も尊重する方針です。

GitHubから導入する場合:

```sh
claude plugin marketplace add revo1290/skip-echo
claude plugin install skip-echo@skip-echo-marketplace --scope user
```

## Skill単体

Node.jsを使えない場合は `skills/skip-echo/` だけを `~/.claude/skills/skip-echo/` に配置します。既存の同名フォルダを誤って上書きしないでください。解除はそのフォルダを削除します。ほかのAgent Skills環境では各クライアントの導入方法に従います。

単体スキルの関連性による読込は、毎応答への適用を保証しません。ルートのSKILL.mdは個人スキル環境向けの同内容コピーで、Claude Codeプラグインは `skills/` 配下を使います。

## 実装・検証状況

- 1か所の方針からSkillとhook用定数を生成し、差異を検査。
- startup / resume / clear / compact / fork向けのSessionStart設定。
- hookは固定文だけを返し、入力・会話ログを読まず、通信・ユーザーデータ保存・追加LLM呼び出しを行わない。
- 方針ロード失敗時は作業をブロックしない。Node未導入時のクライアント動作は未確認。
- 日英60ケース（30組の対訳、開発36／holdout24）と12ケースのスモーク用選定を同梱。
- [実測・未検証の区別](evals/results/README.md)、[例示デモ](docs/demos.md)、[互換性と適合試験](docs/compatibility.md)を公開用文書として同梱。

**短い対照指示より有効か、Claude Codeで自動適用が続くか、総費用が減るかは未検証です。** 新規会話や短い会話では指示分のコストが増え得ます。日本語・英語以外や他スキルとの併用も保証しません。

## 開発

Node.js以外のパッケージ依存はありません。npm installは不要です。

```sh
node scripts/build.mjs
node --test tests/*.test.mjs
node scripts/prepare-eval.mjs smoke 1
```

最後のコマンドはA/B/C/Dの48ジョブを準備するだけで、モデルを呼び出しません。[評価手順](evals/rubric.md)に従って出力・利用量・失敗例を記録します。省略しすぎ・繰り返し・発火不良のIssueフォームを同梱しています。実会話や機密情報は投稿しないでください。
