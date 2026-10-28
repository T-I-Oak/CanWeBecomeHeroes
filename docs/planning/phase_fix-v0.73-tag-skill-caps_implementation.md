# タグスキル上限と実績・説明の整合：実装報告

## 対象

- ブランチ：`fix/v0.73-tag-skill-caps`
- バージョン：`0.73.1`（package.json・package-lock.json）。文言のオーナーフィードバック対応開始時にPatchを更新した。
- GameWorksOAKは参照のみ。共通側のファイルは変更していない。

## 実装内容

- `StatisticsCollector` は同じ時点の装備込みタグ列とMAXから、生タグ数とスキルタグの有効数を1回計算してラン・累積へ配信する。
- `GameStatistics.heroes[heroId].tags` は全15種類の生タグ最高値、`effectiveTags` は10種類のスキルタグの最高有効値を保持する。有効値は所持数・対応MAX・7の最小値。
- タグアチーブメントは最高有効値から評価する。従来の7判定・4所見・通知段階を維持し、所見が実際に到達したスキルLvと一致する。
- 二つ名は、ステータス系タグの寄与率・スキル名とも今回ランの最高有効値を参照する。属性タグの寄与率は生タグ最高値を使う。武器・施設・討伐の扱いは維持する。
- 訓練のMAX更新直後にもタグ状態を記録する。装備解除前の生タグ最高値と、解除後に上がったMAXを合成しない。
- Hero・EnemyのLv判定は、表示と同じ`getTagSkillLevelForCount`へ集約した。戦闘・ショップ・ギルドは既存の有効タグ数／Lvアクセサーを利用する。
- 共通の「タグスキル」の用語説明に、対応ステータスMAXを超えた分はカウントされない旨を日英で追記した。個別タグの効果説明は元の文を維持する。実績の条件表示も有効数であることを示す。スキル名・効果量・所見の原文は変更していない。
- オーナーの指示により、判定にも画面表示にも使われない`achievement.json.conditions`一式、定義生成での`resources.condition`、終了画面への受け渡しを削除した。成績表で使用する`recordConditions`とその表示処理は保持した。キーを選ぶ引数は`recordConditionKey`に整理し、既存のリソース検証は実際に使う`recordCondition`を確認するよう修正した。
- 要求01・06、仕様14・15・17・20、計画書を実装と整合させ、完了した要望をバックログから除去した。

## 保存データの方針とオーナー指示

v0系は未公開であり、旧localStorageデータの引継ぎ・移行・補正・旧評価維持を追加しない。現在の形式での記録・保存・再読込を検証する。この指示はプロジェクトのブランチ作業フローにも記録した。

`OV-TAG-CAPS-01` で旧評価の扱いを相談した後、オーナーから上記の方針が明示された。直前の「取得済み評価を維持」の選択はこの指示で置き換えられた。試作した互換処理、旧評価の下限値、専用文言、互換性テストは撤去済み。保存キー変更や自動削除も追加していない。

## 自動検証

### 対象テスト

```powershell
node --test tests/implementation/game/TagSkillCaps.test.js tests/implementation/game/GameStatistics.test.js tests/implementation/game/Achievements.test.js tests/implementation/game/StatisticsHooks.test.js tests/implementation/game/TrialStatisticsSession.test.js tests/implementation/game/TrainingSystem.test.js tests/implementation/game/HeroEpithets.test.js tests/implementation/game/EpithetTagSkill.test.js tests/implementation/game/StatusLocalization.test.js tests/spec/01.game_settings.test.js tests/spec/05.information_window.test.js tests/spec/06.run_records.test.js
```

0.73.1では72件成功、失敗・skip・cancelなし、終了コード0。個別タグへの追加文言を前提としたテスト1件を削除し、共通の用語説明の表示は既存の情報・翻訳テストで検証する。0.73.0の対象テストは73件成功していた。

- 10スキルタグ×MAX3〜7×生タグ0・1・3・5・7・9個で、Hero・Enemy・ラン・累積・判定・所見が一致する。
- 情報ウィンドウの全10タグの有効数・Lv表示がMAX更新に追従する。
- 装備・解除・訓練の時点ごとの集計、現在形式の保存・再読込、有効数が増えない場合の通知抑止、新しい到達時の昇格を確認した。
- 日英のスキル由来の二つ名と、情報表示・翻訳の接続を確認した。
- 新規テストは実装前に失敗を確認してから実装した。既存テストは実績入力を生タグから有効タグに修正し、初期MAX3の7タグ記録は判定3となる期待へ合わせた。

### 全テスト・本番ビルド

- `npm.cmd test`：0.73.1で705件成功、失敗・skip・cancelなし、終了コード0。0.73.0は削除した文言テストを含め706件成功。
- `npm.cmd run build`：0.73.1で成功、218モジュール、終了コード0。
- `git diff --check`：成功。

不要定義の削除後にも`npm.cmd test`（705件）、`npm.cmd run build`（218モジュール）を再実行し、双方とも終了コード0。関連箇所は`node --test tests/implementation/game/Achievements.test.js tests/implementation/app/RecordScreenData.test.js tests/implementation/app/AchievementTable.test.js tests/spec/06.run_records.test.js`で23件成功。未使用文言の参照がソース・関連テストに残っていないことも確認した。

### ブラウザー

`node scripts/verify-browser-tests.js` が`npm.cmd run test:browser -- --reporter=line,json`を2回連続実行する。サンドボックス外で実行。

不要定義削除後の0.73.1の再検証も、2回とも5件成功、失敗・skip・flakyなし、終了コード0。上限到達・中断・照会失敗なし。各回の終了後は`remaining: []`、`listeners: []`、検証コマンド全体も終了コード0。

- 1回目：2026-10-28 16:00:58〜16:01:39 JST。
- 2回目：2026-10-28 16:01:48〜16:02:28 JST。
- 結果：`tmp_browser_verification/2026-10-28T07-00-55-316Z/summary.json`と各`run-N.json`・Playwrightレポート。

0.73.1の最終検証も2回とも5件成功、失敗・skip・flakyなし、終了コード0。上限到達・中断・照会失敗なし。各回の終了後は`remaining: []`、`listeners: []`、検証コマンド全体も終了コード0。

- 1回目：2026-10-28 15:54:44〜15:55:22 JST。
- 2回目：2026-10-28 15:55:31〜15:56:11 JST。
- 結果：`tmp_browser_verification/2026-10-28T06-54-40-961Z/summary.json`と各`run-N.json`・Playwrightレポート。

0.73.0の再実行は2回とも5件成功、失敗・skip・flakyなし、終了コード0。上限到達・中断・照会失敗なし。各回の終了後は`remaining: []`、`listeners: []`、検証コマンド全体も終了コード0。

- 1回目：2026-10-28 15:40:50〜15:41:24 JST。
- 2回目：2026-10-28 15:41:32〜15:42:08 JST。
- 結果：`tmp_browser_verification/2026-10-28T06-40-46-969Z/summary.json`と各`run-N.json`・Playwrightレポート。
- 合格・不合格の開始→終了→再開始、本番ベースパス・バージョン・アセット読込、レコード画面の縦横切替、チュートリアルを確認した。

開発サーバーでは、既存構成のpublic JSON直接importに対するVite警告が表示される。起動・アセット読込・テストの失敗ではなく、今回の変更対象外。本番ビルドは成功している。

## オーナー検証

反映バージョンは`0.73.1`。実ゲームではタイトルと倉庫左下の`v0.73.1`を照合する。自動テストの成功を見た目や文言の確認済みとは扱わない。

### OV-TAG-CAPS-02：日本語のタグスキル共通説明

- 理由：上限の説明を新たに追加したため、ゲーム内の表現と記載位置を確認する。
- 操作：日本語でタグ情報の「タグスキル」を開き、共通説明を読む。
- 期待：`同じタグを1・3・5・7個持つと、そのタグに応じた効果が自動で発動する。タグの数に応じて、効果は強化される。ただし、対応するステータスのMAXを超えた分はカウントされない。効果を持たないタグもある。`と説明される。
- 判断：項目確認済み。個別タグへの追記を取りやめ、共通説明へMAX制限の一文だけを追記する案を提示し、「数えない」を「カウントされない」に直した全文にオーナーが「誤解されなさそうです。okです」と承認した。
- 対応：承認済みの文を0.73.1へ反映。個別タグの日英の追記を撤去した。文言は反映前に修正前後を示してレビューする方針をブランチ作業フローへ記録した。

### OV-TAG-CAPS-03：英語のタグスキル共通説明

- 理由：承認済みの日本語と同じ上限を説明するため、反映前に英文案を確認する。
- 操作：英語へ切り替え、タグ情報の「Tag Skills」を開く。
- 期待：既存の効果強化の説明の直後に`However, tags beyond the corresponding stat's MAX are not counted.`が入る。
- 判断：項目確認済み。追加する一文と挿入位置を提示し、オーナーが「この英文でよい」と承認した。
- 対応：承認後、共通の用語説明に0.73.1で反映した。

### OV-TAG-CAPS-04：実績の条件表示

- 理由：成績表の条件文も変更されているため、承認対象を漏らさないよう全文比較を提示する。
- 操作：成績表のタグ実績条件を読む。
- 成績表・日本語：`いずれかの受験者で{tag}タグを集める`→`いずれかの受験者で{tag}の有効タグ数を増やす`。
- 成績表・英語：`Collect {tag} tags with any examinee`→`Increase effective {tag} count with any examinee`。
- 判断：項目確認済み。オーナーが「（対応ステータスMAXまで）」の表示を不要と指定したため、日英の対応する注記を削除した。修正後の日本語全文と検証結果を再提示し、オーナーが「ok」と承認した。
- 対応後の検証：`npm.cmd test`は705件成功、`npm.cmd run build`も成功し、双方とも終了コード0。`git diff --check`も成功した。
- 対象整理：当初一緒に提示した`conditions`の説明文は、調査で判定にも表示にも使用されていないことが分かった。オーナーが不要定義の削除を指示したため、この文言は対象から除外し、定義と受け渡し処理を削除した。

## 挙動の確認例

武勇の生タグ9個を保持した同じ時点のMAXで記録する。

| パワーMAX | 有効タグ数 | スキルLv | 実績判定 | スキル名 |
| --- | --- | --- | --- | --- |
| 3 | 3 | 2 | B | 急所見切り |
| 4 | 4 | 2 | A | 急所見切り |
| 5 | 5 | 3 | A＋ | 一撃必殺 |
| 6 | 6 | 3 | S | 一撃必殺 |
| 7 | 7 | 4 | S＋ | 英雄の一閃 |

二つ名がスキル語句を選んだ場合も、この段階の名前を使用する。例えばMAX3の記録なら`「急所見切り」の匠`となり、`「英雄の一閃」の匠`にはならない。生タグ最高保持数9は別に保持する。
