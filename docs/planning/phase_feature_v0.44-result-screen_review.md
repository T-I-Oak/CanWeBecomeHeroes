# v0.44.1 正式な試験終了画面：レビュー報告

## 再レビュー結果（2026-10-15）

修正コミット6754d04を前回レビュー時点c63d6f3と照合した。R1・R2は解消済み。今回の確認範囲に未解決指摘はなく、マージへ進めると判断する。ソースは変更していない。

- R1：AchievementTableがmode・翻訳済みentries・headingsを受ける独立したDOM生成となり、終了画面がresultモードを利用している。選定・評価・保存・翻訳は呼び出し側に残り、連続カテゴリーの結合と更新判定の色を共通部品が担当する。共通CSSはachievement_table.cssへ集約され、終了画面固有の表CSSは除去された。仕様14・15・17章とUIスタイル規約の契約も照合した。トースト・レコード画面自体は追加されていない。
- R2：主要7件は恒久ファイルEpithetExpansion.test.jsへ移動され、本番エンジンとpublic/data/epithet.jsonを直接参照している。フィルター・default・終端選択・未定義と循環エラー・本番定義・修飾位置の検証がマージ後も残る。phase_テストにはシミュレータ固有データの確認だけが残る。
- package.jsonとpackage-lock.jsonは0.44.1で一致。修正差分に終了判定・記録保存・二つ名本番定義の変更はない。src・public/dataと追加恒久テストからphase_・dev_・tmp_成果物への参照は見つからなかった。
- 承認済みの固定比率・静止ボタン・通知面は変更対象外。表の余白・字体・色の移設を照合し、日英10件表示のブラウザー検証記録を確認した。今回ブラウザーの再操作・実プレイでの期限境界再現は行っていない。表示面の再承認は不要とする既存判断を維持する。

### 再レビューの検証

- 対象11件：node --test tests/implementation/AchievementTable.test.js tests/implementation/EpithetExpansion.test.js tests/implementation/phase_epithet_simulator.test.js tests/implementation/app/TrialSession.test.js、全件成功。
- 本番ビルド：npm.cmd run build、成功、192モジュール変換。
- 差分形式：git diff --check master...HEAD、成功。
- 全テスト：npm.cmd test、523件成功、失敗0、スキップ0。

## 初回レビューの記録（v0.44.0）

以下の指摘は初回レビュー時点の記録であり、現在の判定は上記の再レビュー結果を正本とする。

## 結論

未解決指摘2件があるため、実装への差し戻しを提案する。ソースは変更していない。引継ぎ書は承認後に更新する。

## 指摘

### R1（P2）アチーブメントの共通表示境界が未実装

- 対象：src/app/TrialRunResultModal.js:41–50、src/styles/trial_result.css、docs/specifications/14.achievements.md、15.achievement_classes.md、03.ui_style_conventions.md。
- 計画の実装方針3と正式仕様14章121行・15章112行は、表示モードとエントリ一覧を受ける共通DOM生成と共通CSSを要求している。
- 現在はモーダルのshow内のscoreクロージャーがresultとlanguageを直接参照して表を生成し、CSSも.TrialResultPaper配下に閉じている。表示モードを受ける独立した境界がないため、後続画面が仕様どおり利用するにはこの画面から再抽出が必要になる。
- 終了画面から共通表示部品を利用する形に整理する。トースト・レコード画面自体は対象外のままとする。選定処理は現状どおりDOM生成から分離する。
- 正式仕様14章の冒頭は終了画面・共通表示を後続ブランチ扱いのままであり、今回の実装状況と整合させる。UIスタイル規約にも今回確定した部品の契約を反映する。画面の見た目を変える要求ではない。

### R2（P2）本番展開エンジンの主要テストがマージ時に削除される

- 対象：tests/implementation/phase_epithet_simulator.test.js:4–34、scripts/phase_epithet_simulator_engine.js。
- このテストはシミュレータ専用だけでなく、本番EpithetExpansionのフィルター、default、深さ制御、未定義要求と循環エラーを検証している。import先は本番モジュールの再exportである。
- フロー規定に従うとphase_テストもラッパーもマージ前に削除されるため、520件成功時点の本番機能の検証が恒久的には残らない。残るHeroEpithets・EpithetTagSkillテストでは上記の境界を網羅していない。
- 本番エンジンのテストをtests/implementation/EpithetExpansion.test.jsへ移し、本番モジュールを直接参照する。シミュレータ固有のデータ検証は削除対象のままでよい。本番データの構成を検証する項目はpublic/data/epithet.jsonを正本として必要なものを残す。

## 照合結果

- 成績選定は更新優先・10件・未丸めrunG・同点時定義順・重複除外・採用後定義順に対応している。
- 合格二つ名は終了メンバーの今回ラン実績の割合を用い、選定と展開を終了情報作成時に一度だけ実行する。タグスキルは既存閾値・名称・対象Hero最大保持数を使用する。循環しないperson_baseの組み立てを許容する最新合意を基準に確認した。
- 第7課題のvictoryで課題クリアーを記録し、通常はcompleteまで待つ。victory中の期限到達は合格を優先し、重複クリアー記録を防ぐ。RunController・StageController・CombatStageLifecycle・TrialRunFlowと関連テストを照合した。
- 表裏操作は確定した終了情報を表示するのみで、保存や二つ名生成を呼ばない。試験フローは最初の終了時だけ通知し、既存保存失敗時の進行を維持する。
- 固定比率の拡縮、静止した下部ボタン、ツールチップなしはオーナー指定として扱う。画面の再承認は求めない。実プレイで期限境界を再現したとは扱わない。
- 画像の生成記録は恒久READMEに保存され、本番src/publicデータにphase_成果物への依存は見つからなかった。更新履歴は空配列、バージョンは0.44.0。
- GameWorksOAKは参照のみ。確認時の作業ツリーはmasterで変更なし。リモート公開状態の照会はマージ担当の規定に従って実施する。

## 検証（2026-10-15）

| コマンド | 結果 |
| --- | --- |
| npm.cmd test | 520件成功、失敗0、スキップ0 |
| npm.cmd run build | 成功、191モジュール変換 |
| git diff --check master...HEAD | 成功 |
| git status --short --branch（報告書作成前） | feature/v0.44-result-screen、追跡対象に未コミット差分なし |

ブラウザーの見た目は実装報告・合意記録とオーナーの表示確認承認を照合した。今回ブラウザーや実プレイの再検証は行っていない。
