# SkipEcho（スキップエコー）

**同じ説明は減らす。必要な答えは残す。**

[English](README.md) · MIT · **0.2.0／experimental**

Claudeとの長いセッションでは、追加質問のたびに前提を説明し直し、作業報告のたびに計画を並べ直し、設定を1行変えるだけでファイル全体が返ってきます。SkipEchoは、会話の流れを見て**既に伝えた主張の繰り返し**を減らすClaude Code／Agent Skills向けの方針です。今回の答え、訂正、条件、未検証の範囲、求められた成果物の全文は残します。

## 位置づけ

caveman や genshijin のような圧縮系スキルは、**1回の返答の中の言葉**（冠詞、つなぎ言葉、敬語、クッション言葉）を削ります。SkipEchoは、会話でもう伝わっていることを踏まえて、**この返答にどの主張を入れるか**を決めます。削る対象が違うので、一緒に使えます。

| | 圧縮系（caveman、genshijin、「簡潔に」） | SkipEcho |
| --- | --- | --- |
| 削るもの | 冠詞・つなぎ言葉・敬語・前置き | 既に述べていて変わっていない主張 |
| 判断の単位 | 1文ごと | それまでの会話全体 |
| 新しい話題の最初の回答 | 短くなる | 普通の完全な回答 |
| 「README全文ちょうだい」 | 圧縮されたまま | 自己完結した全文 |
| 「もう一回説明して」 | 圧縮されたまま | 改めて説明し直す |
| 複数ステップ作業の報告 | 全経緯を圧縮して再掲 | 結果、変わったこと、今回確認したこと、残っていること |
| 長いファイルの1か所修正 | 全文を圧縮して再掲 | 変更箇所＋「ほかは変更なし」（全文の依頼があれば全文） |
| 併用 | | 前提として設計。ほかのスタイルの文字数に合わせるために必要な事実を落とさない |

圧縮系スキルで減る出力トークンは限られていて、「be brief.」の1文でもほぼ同じ効果が出るという第三者の検証があります（[implicator.ai](https://www.implicator.ai/caveman-claude-code-skill-cuts-output-20-your-bill-barely-notices-2/)、[Hacker News](https://news.ycombinator.com/item?id=47954745)）。SkipEchoの評価には、この「短くて強い1文の指示」を対照条件Bとして最初から入れてあります。Bを上回れなければ、仕組みのほうを簡素にすると決めています。評価が終わるまで、トークン削減や優位性はうたいません（[評価状況](evals/results/README.md)）。

## 応答の扱い

| 要求 | 狙う動作 |
| --- | --- |
| 条件を1つ追加 | 説明をやり直さず、その条件の影響に答える |
| 以前の回答が誤り | 誤りを認め、正しい結論を明示する |
| 作業の途中・完了報告 | 結果を先に。変わったこと、今回確認したこと、残りだけを報告する |
| 既存ファイルやコードの1か所変更 | 変更箇所と「ほかは変更なし」を示す。全文の依頼があるとき、数行程度のとき、抜粋だと適用しにくいときは全文 |
| 全文・最終版・コピペ用・引き継ぎ | 必要な既出情報も入れて自己完結させる。省略記号は使わない |
| もう一度・詳しく・分からない | 理解済みと決めつけず、説明し直す |
| 新しい話題・compact後の履歴不足 | 見えている文脈だけで完全に答える |

求められたコード、コマンド、設定、テスト、文書、委任文、subagentの成果物は短くしません。調査・ツール実行・検証も省きません。例は[デモ](docs/demos.md)を参照してください。

## 導入

### Claude Codeプラグイン（推奨）

SessionStart hookで全セッションに自動適用します。hookを実行する環境のPATHにNode.js **22以上**が必要です。

```sh
claude plugin marketplace add revo1290/skip-echo
claude plugin install skip-echo@skip-echo-marketplace --scope user
```

導入後は新しいセッションを開始してください。単体スキルとの同時導入や、同じhookの手動追加はしないでください。

### 単体スキル（Agent Skills対応クライアント、Node.js不要）

```sh
npx skills add revo1290/skip-echo
```

または `skills/skip-echo/` だけを `~/.claude/skills/skip-echo/` に置きます。単体スキルは関連性で読み込まれるため、毎回の適用は**保証されません**。

### Cursor・Codexなど

同じ方針を収めたルールファイルを生成しています。

- Cursor: [`integrations/cursor/skip-echo.mdc`](integrations/cursor/skip-echo.mdc) を `.cursor/rules/` にコピー
- Codexなど `AGENTS.md` を読むエージェント: [`integrations/AGENTS.md`](integrations/AGENTS.md) の内容を `AGENTS.md` に貼り付け

これらのクライアントでは動作未確認です。

## 会話中の切り替え

| コマンド | 効果 |
| --- | --- |
| `/skip-echo off` | この会話の残りでは使わない |
| `/skip-echo full` | 次の回答を自己完結した全文にする |
| `/skip-echo on` | 再開する |

ほかのコマンドと名前がぶつかるときは `/skip-echo:skip-echo` を使います。「今回は全文で」「ここから重複抑制をやめて」のような普通の言い方でも効きます。

無効化・アンインストール:

```sh
claude plugin disable skip-echo@skip-echo-marketplace --scope user
claude plugin uninstall skip-echo@skip-echo-marketplace --scope user
```

すでに入った指示は今の会話に残ることがあります。確認は新しいセッションで行ってください。

## 自分で効果を測る

凍結済みのスモーク14会話から生成した、[`claude plugin eval`](https://code.claude.com/docs/en/plugin-evals) 用の評価スイートを同梱しています。各ケースで決まった会話履歴を再生し、プラグインあり・なしを比べます。

```sh
claude plugin eval . --ablation with-without --runs 3 --max-cost-usd 5
```

履歴を再生するケースは、指定しないとプラグインありの側だけ実行されるので、`--ablation with-without` が必要です。実行と採点のモデル呼び出しはすべてご自身のアカウントに課金されます。上限額を必ず指定してください。採点はモデルが行います（`essentials` は必要事実と致命的な欠落を見て重み2、`no-echo-N` は事前に決めた不要な再掲を1項目ずつ見ます）。なので結果は**目安であって、リリース判断の根拠にはなりません**。holdoutケースは意図的に外してあります。短い指示を対照に入れた、人間が採点するA/B/C/D評価の手順は [evals/rubric.md](evals/rubric.md) にあります。

## 仕組み

方針の元は `src/response-policy.md` の1か所だけです。`node scripts/build.mjs` で2つのSKILL.md、hook用モジュール、Cursor・AGENTS.md用ファイル、ネイティブ評価スイートを生成し、`--check` で生成物とのずれを検出します。hookは固定の方針だけを返します。入力も会話ログも読まず、通信・ユーザーデータの保存・追加のモデル呼び出しは行いません。方針を読み込めなかった場合も作業を止めません。

指示を入れる分、入力トークンは増えます。短い会話や新しい会話では総コストが増えることがあります。方針は約3,400文字（517語）で、トークン数は未計測です。スキルの自動読み込みと重なって同じ方針が2回入る可能性があり、その影響も未計測です。

## 開発

npmの依存もインストール手順もありません。

```sh
node scripts/build.mjs
node scripts/build.mjs --check
node --test tests/*.test.mjs
claude plugin validate .
node scripts/prepare-eval.mjs smoke 1
```

評価用の会話は日英68ケース（34組の対訳、開発40／holdout28、14カテゴリ）です。`prepare-eval` は履歴固定のA/B/C/Dジョブを作るだけで、モデルは呼び出しません。テンプレートを共有しているので、68件の独立した観測ではありません。

省略しすぎ・繰り返し・発火不良のIssueフォームがあります。実会話や機密情報は投稿しないでください。
