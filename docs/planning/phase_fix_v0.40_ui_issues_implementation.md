# 実装結果 (fix/v0.40-ui-issues)

## 計画に対する実装

- 状態解除の責任を `CombatConditionSystem` に集約した。個別解除は `clearCondition()`、実体の全解除は各個別解除を呼ぶ `clearCombatant()`、全体リセットは追跡実体の `clearCombatant()` を使う。状態データだけを先に破棄する処理を廃止した。
- 惑乱・夜の使い魔の付与、更新、解除は状態管理から描画へ通知する。夜の使い魔の表示解除をBattleSystem、行動解決、被ダメージ反応で個別に行う処理を除去した。状態データがなくても表示解除は実行し、繰り返し解除できる。
- 撃破、スタミナ枯渇、離脱・移動開始、課題移行、突風による退避、分身体の帰還を共通の全解除へ接続した。分身体の帰還への接続は内部の解除契約を統一するものであり、現行仕様で発生する表示残留不具合の修正とは扱わない。
- 夜の使い魔は消費時に状態・アイコン・周回表示を同時に解除する。飛行演出の開始位置は消費前に取得し、飛行は完了まで維持する。召喚元の全解除では、その召喚元の飛行も解除する。
- 課題選択画像: 最大スロット幅100pxに敵サイズの倍率を掛けた論理サイズを使い、Canvasの内部サイズを論理サイズ × `devicePixelRatio`（整数丸め）にする。CSSによる表示サイズ・サイズ比・レスポンシブ配置を維持する。狭い画面では最大表示幅向けの画像を縮小表示する。
- `drawStaticChipPreview()` に任意のピクセル比を渡せるようにし、既存の共通描画処理を利用する。実際のCanvas幅から描画倍率を算出するため、整数丸め後も端まで描画する。画像読み込み後の再描画も同じ倍率を使用する。
- 終了草案への指摘による再実装の着手時に、`package.json` と `package-lock.json` を0.40.4へ更新した。タイトル・倉庫の表示は `AppMetadata` 経由で同じ設定を参照する。

## 変更箇所

- `src/game/CombatConditionSystem.js`: 状態のライフサイクルと表示同期の一元化。
- `src/game/BattleSystem.js`、`CombatProjectionSystem.js`: 各離脱経路を共通の全解除へ接続。
- `src/game/CombatActionResolutionSystem.js`、`CombatDamageReactionSystem.js`: 表示更新の責任を状態管理へ移動。
- `src/game/CombatEffectSystem.js`: 消費前の使い魔の飛行開始位置取得。
- `src/app/StageSelectionModal.js`: 敵サイズ・端末ピクセル比に応じた描画解像度。
- `src/app/ChipPreview.js`: 共通描画関数のピクセル比引数。
- `tests/implementation/CombatConditionSystem.test.js`: リセット、再付与、通常解除、撃破、課題移行、戦闘離脱を実際のエフェクト集合まで検証。
- `tests/implementation/CombatConditionLifecycle.test.js`: 全4状態について状態・Chip・表示の整合性、全解除、再付与、他実体への非干渉、各離脱経路、使い魔消費と飛行位置、状態データ不在での解除を検証。
- `tests/implementation/CombatActionResolutionSystem.test.js`: 呼び出し側の表示解除依存を除去し、飛行開始位置の取得を反映。
- `tests/implementation/StageSelectionPreview.test.js`: 小・中・大、ピクセル比1・1.25・2・3、タグと本体のクリック判定を検証。
- `tests/implementation/ChipPreview.test.js`: 遅延読み込み後の再描画でも描画倍率を維持することを検証。
- `package.json`、`package-lock.json`: バージョン設定。
- `docs/specifications/02.runtime_systems.md`: 状態解除の責任、各解除経路、使い魔の消費と飛行の契約を記載。

## 検証

- 実装前: `node --test tests/implementation/CombatConditionSystem.test.js tests/implementation/StageSelectionPreview.test.js`。13件中11件成功・2件失敗。リセット後にエフェクト集合へChipが2件残ることと、Canvas幅が固定100pxであることを再現した。
- 再実装前: `node --test tests/implementation/CombatConditionLifecycle.test.js`。3件すべて失敗。状態管理が使い魔の表示を登録しないこと、全解除で飛行が残ることを確認した。
- 対象テスト: `node --test tests/implementation/CombatConditionLifecycle.test.js tests/implementation/CombatConditionSystem.test.js tests/implementation/CombatActionResolutionSystem.test.js tests/implementation/CombatDamageReactionSystem.test.js tests/implementation/CombatGustSystem.test.js tests/implementation/ConditionIconLayout.test.js tests/implementation/StageSelectionPreview.test.js tests/implementation/ChipPreview.test.js tests/implementation/StatusLocalization.test.js`。55件すべて成功。
- 全テスト: `npm.cmd test`。457件すべて成功、失敗・スキップ0件。
- 本番ビルド: `npm.cmd run build`。成功、168モジュールを変換。
- 差分検査: `git diff --check`。成功。
- テスト追加中にCanvasテストダブルのグラデーション生成が不足して失敗したため、テストダブルを補完し対象・全テストを再実行した。全テストではNodeの `--localstorage-file` に関する警告が出るが、テスト失敗はない。

## 横展開調査

- 持続する描画登録は惑乱のSetと夜の使い魔のMapにある。諸刃の剣・不運のアイコンはChipの値を参照するため、独立した持続描画登録はない。全4状態を共通解除の契約に含めた。
- 夜の使い魔は離脱時に個数状態だけ消え、描画登録が残る経路を実行で確認した。分身体の帰還も共通の全解除へ接続したが、帰還テストは通常の敵を代役として状態を付与した内部テストである。現行のゲーム仕様では分身体に惑乱・夜の使い魔を付与して帰還する条件は発生しないため、実ゲームの再現確認やオーナー検証の対象にはしない。
- 攻撃・被弾・ダメージ表示・雷・タグ移動・使い魔の飛行は時間で終了する。使い魔の飛行は召喚元の全解除でも除去する。突風・ノックバックは移動の完了またはキャンセルで終了するため、持続状態の描画登録とは別の責務として維持した。
- 解除処理の構造と回帰テストによる調査であり、実ブラウザで全演出を目視確認したものではない。

## オーナー検証の判断

- 課題選択の大きな敵の画像の鮮明さ: 項目確認済み。v0.40.4を確認対象として提示し、2026-10-10にオーナーから「見た目okです」と回答を得た。
- 分身体の帰還時の表示確認: 項目却下。現行仕様で発生しない条件としてオーナーから却下された。
- 当初提示した状態解除とスマートフォンの配置・操作の候補は、開発側の検証範囲として担当者が依頼を取り下げた。オーナー確認済みとは扱わない。

今回依頼したオーナー検証は画像の鮮明さ1件であり、未回答・保留項目はない。実ブラウザで状態演出全体やスマートフォンの実機操作を確認したという意味ではない。

オーナーの指示により `01.branch_workflow.md` とバックログの運用説明を更新した。必要な項目は実装時に提示し、項目却下・項目確認済み・項目でフィードバックあり・現時点で確認しないの判断を反映する。オーナーが指定した保留だけをレビュー以降へ引き継ぐ。共通ライブラリの変更はない。
