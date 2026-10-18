# 成績表の評価項目選定順の調整

## 合意内容

- 開発ブランチ：`feature/v0.49-result-achievement-priority`
- 予定バージョン：`0.49.0`。実装開始時にpackage.jsonとpackage-lock.jsonを更新する。
- 成績表に採用する評価項目の優先順位を変更する。
- 実装済みの正式な終了通知・二つ名について、バックログと要求・仕様に残る未実装扱いの記述を整理する。

## 開発スコープ

選定は次のキーを左から比較し、同順の場合だけ次のキーを使う。

1. グレード更新の有無：更新ありを優先する。
2. 累積G値の増加量：大きい順にする。
3. 累積G値：0以外を小さい順にし、0を最後にする。
4. 上記がすべて同じならアチーブメント定義順にする。

累積G値は終了後の`G`、増加量は既存の`deltaG`、更新有無は既存の`updated`を使用する。上昇したグレード段階数は選定キーへ追加しない。G値0を最後にするのは第3キーであり、更新有無や増加量を越えて一律に末尾へ送る意味ではない。

重複IDを採用せず、上位10件を選定する。選定後は全件を定義順へ戻して描画する。入力データを変更しない。赤い判定、所見、カテゴリ結合、紙面の配置は既存の仕様を維持する。

要求・仕様の選定順を同じ内容へ更新する。正式な終了通知と二つ名については、現行実装と17.trial_result_screen.mdを照合し、古い未実装・検討中記述と重複バックログを整理する。未完了の課題とオーナーが保留した検証項目は維持する。

## 対象外

- チャレンジモードの進行・終了画面。
- 課題選択画面への課題記録表示の適用。
- 共有、ファビコン、公開情報・公開フローの整備。
- 戦闘バランス調整、加入演出の追加。
- 二つ名の選定・語句や終了通知のデザイン変更。
- 集計式、保存形式、ランキング、レコード画面の選定順の変更。
- GameWorksOAKの変更。

## 完了条件

- 更新有無、増加量、終了後G値、G値0、定義順の優先関係が合意内容に一致する。
- 上位10件の選定と定義順での表示を区別し、重複排除と入力の不変性を維持する。
- 要求・仕様・バックログと実装の記述が対象範囲で一致する。
- 対象テスト、全テスト、本番ビルドの結果を実装報告に記録する。失敗時は原因と対応または対象外とする根拠を記録する。
- 必要なオーナー検証は実装中に提示し、判断と対応を記録してから終了草案を提示する。

## 実装・テスト方針

- `src/game/ResultAchievementSelection.js`で既存の選定処理に第3キーを追加する。描画処理や集計処理への責務移動は行わない。
- `tests/implementation/ResultAchievementSelection.test.js`に先に期待結果を追加し、同増加量での正のG値昇順、G値0の後回し、キー間の優先関係、全キー同値の定義順、上限境界を確認する。
- 既存の重複ID、入力不変性、定義順への復帰、上限0の検証を維持する。
- 対象テストは`node --test tests/implementation/ResultAchievementSelection.test.js`を実行する。終了結果への接続確認には`node --test tests/implementation/TrialRunResult.test.js`を使用する。
- 終了草案の提示前に`npm.cmd test`と`npm.cmd run build`を実行する。
- 画面確認では選定による表示項目の変化を確認し、必要なオーナー検証は再現手順と期待結果を添えて提示する。既存の確認済み項目を再依頼しない。

## 主な参照先

- `docs/planning/01.branch_workflow.md`
- `docs/planning/backlog.md`
- `docs/requirements/06.run_records.md`
- `docs/specifications/14.achievements.md`
- `docs/specifications/17.trial_result_screen.md`
- `src/game/Achievements.js`
- `src/game/ResultAchievementSelection.js`
- `src/game/TrialRunResult.js`
