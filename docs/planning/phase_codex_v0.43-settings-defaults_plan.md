# HUD設定の初期値見直し計画

## 開発スコープ

- ブランチ: `codex/v0.43-settings-defaults`
- 初回実装の予定バージョン: `0.43.0`。計画中は `0.42.1` を維持する。
- 設定データが一度も保存されていない場合のHUD設定の初期値を、オーナー指定の値にする。
- 保存済み設定は現行仕様どおり読み込み、上書き・リセット・移行は行わない。

## 実装から確認した現在の初期値

保存済み設定がない場合の値。

| 項目 | 現在値 |
| --- | --- |
| 言語 | 日本語（共通i18n） |
| 通常速度 | 1倍 (`speedLog: 0`) |
| 加速速度 | 2倍 (`acceleratedSpeedLog: 1`) |
| 情報ウィンドウ表示時の停止 | ON |
| 準備エリアのHeroのスタミナ満タン時の停止 | OFF |
| 準備エリアにHeroがいない時の自動加速 | OFF |
| 頭上情報 | 武勇・魔導・軽業・信用・幸運・スタミナ/HP・重量の全項目OFF |
| 頭上情報の表示条件 | 常時。ただし全項目OFFのため情報は表示されない。 |

確認元: `src/game/GameSpeedSettings.js`、`src/game/OverheadStatusSettings.js`、`index.html`、共通 `src/lib/core/i18n.js`。

チュートリアルのリセットは操作ボタンであり、初期値を選ぶ設定ではない。

## オーナー指定の初期値

| 項目 | 指定値 |
| --- | --- |
| 言語 | アプリケーションでは初期値を指定しない。共通i18nに委ねる。 |
| 通常速度 | 1倍 (`speedLog: 0`) |
| 加速速度 | 2倍 (`acceleratedSpeedLog: 1`) |
| 情報ウィンドウ表示時の自動停止 | ON |
| スタミナ満タン時の自動停止 | OFF |
| 準備エリアにHeroがいない時の自動加速 | OFF |
| 頭上情報 | スタミナ/HP (`durability`) のみON |
| 頭上情報の表示条件 | 戦闘時 (`battle`) |

ゲーム側は現在も共通の `setupLanguageSelector` を利用し、言語の初期値を渡していない。共通i18n内部の初期言語 `ja` はアプリケーションが指定した値として扱わず、共通側は変更しない。

頭上情報について `DEFAULT_OVERHEAD_STATUS_SETTINGS` と未保存時の読み込み結果を合わせて変更する。時間設定の指定値は現在値と一致する。

## 保存データとの関係

- 時間設定と頭上設定は共通 `DataManager.getValue/setValue` を利用する。保存キーがない場合は `undefined` が返り、ゲーム側で初期値を適用する。
- 保存済みの頭上設定は、空の選択配列も含めて維持する。
- 保存済みデータの欠落項目・不正値に対する現行の正規化は維持する。新しい初期値を既存データへ補う仕様変更は行わない。
- メジャーバージョンによる `getSavedData` のマイグレーションは今回導入しない。

## 実装と検証の共通方針

- 実装開始時に `package.json` と `package-lock.json` を予定バージョンへ更新する。
- `src/game/OverheadStatusSettings.js` の初期値を変更し、保存キーがない場合にその値を返す。設定UIと描画側への反映を確認する。
- `docs/specifications/02.runtime_systems.md` の関連箇所へ確定した初期値を記載し、バックログの対象項目を整理する。
- 対象テストとして `node --test tests/implementation/OverheadStatusSettings.test.js tests/implementation/GameSpeedSettings.test.js tests/implementation/TimeSettingsController.test.js tests/implementation/SettingsModalController.test.js` を実行する。
- 未保存時の初期値、保存済みの選択・空配列の維持、既存の正規化について検証する。
- 実装終了草案提示前に `npm.cmd test` と `npm.cmd run build` を実行し、結果を記録する。
- 必要なオーナー検証は実装中に提示して判断を記録する。
- オーナー検証は未保存状態の設定UI、戦闘時のスタミナ/HP表示、戦闘外で表示されないことをそれぞれ提示する。通常の保存データを消さず、独立したブラウザー環境で確認できる手順を用意する。
- 必要な判断とフィードバック対応を記録し、全テスト・本番ビルドの結果を実装報告に残してから実装終了草案を提示する。
- 共通ライブラリ、新しい設定項目、画面再デザイン、戦闘バランスは対象外。

## 着手時の既存差分

`docs/planning/backlog.md` に着手前から未コミットの整理と設定見直しの追加がある。差分を保持し、計画終了コミットに含める場合は承認対象として明示する。
