# テストの構成と実行

ゲームの起動・画面責務は[アプリケーション構成](../docs/architecture/01.application_structure.md)、開発時の検証条件は[ブランチ作業フロー](../docs/planning/01.branch_workflow.md)を参照する。

## 実行

- 全テスト: `npm.cmd test`
- 実装テスト: `node --test "tests/implementation/**/*.test.js"`
- 要求仕様テスト: `node --test "tests/spec/*.test.js"`
- 本番ビルド: `npm.cmd run build`
- ブラウザー検証の初回準備: `npm.cmd ci`、`npx.cmd playwright install chromium`（Linux CIでは`--with-deps`も指定）
- 主要フロー・本番起動: `npm.cmd run test:browser`

ワイルドカードはNodeのテストランナーへ渡す。ディレクトリ名をテストファイルの代わりに指定しない。ゲームルートを作業ディレクトリとし、隣接する`GameWorksOAK`の共通ライブラリを使用する。

## 配置と責務

`implementation/`は`src/`と同じ責務で分ける。同名モジュールの単体テストは元のファイル名を維持する。

| ディレクトリ | 対象 |
| --- | --- |
| `implementation/app/` | 画面、入力、描画、配置、セッション接続 |
| `implementation/chips/` | Chipの物理・描画・画像契約 |
| `implementation/game/` | ゲームルール、状態、集計、言語リソース |
| `implementation/simulation/` | 戦闘シミュレーション、タグ比較・分析 |
| `implementation/scripts/` | 画像変換、計測用ビルド、ブラウザー検証の実行補助 |
| `browser/` | 実ブラウザーでの主要画面遷移と本番ビルドの起動・アセット読込 |

複数モジュールをつなぐ結合テストは、主な責務のディレクトリへ置き、対象を示す名前を使う。`Factories`・`StatisticsHooks`・`CombatConditionLifecycle`・`ShoppingBag`・`VignetteLineAction`は`game`、`DragControls`・`EntityDetailLayout`・`LogHistory`・`StageSelectionPreview`・`Tutorial`は`app`、画像契約2件は`chips`へ置く。`StatusLocalization`・`TranslationIntegrity`はゲーム側の言語リソース契約である。

## 要求と自動テストの対応

`spec/`の番号は`docs/requirements/`に対応する。仕様の全項目を自動化済みという意味ではなく、見た目や実機入力は手動確認と併用する。

| 要求文書 | 主な自動検証 |
| --- | --- |
| `01.game_settings.md` | `spec/01.game_settings.test.js`、`game/RunScenario`・`StartPartySelection`・`TrialRunResult`、`browser/01.game_settings.pw.js` |
| `02.hero_item_interaction.md` | `spec/02.hero_item_interaction.test.js`、`game/ItemPickupController`・`ShoppingBag`・`ShopSystem`・`GuildSystem`・`TrainingSystem`、`app/DragControls` |
| `03.unique_skills.md` | `spec/03.unique_skills.test.js`、`game/UniqueSkillEffectSystem`・`UniqueSkillTrigger`・`CombatConditionSystem`・`CombatDamageReactionSystem`・`CombatAttributeReactionSystem`・`CombatGustSystem`・`CombatKnockbackSystem` |
| `04.combat.md` | `spec/04.combat.test.js`、`game/Combat*`・`BattleSystem`・`EncounterDefinitions`・`StageController` |
| `05.information_window.md` | `spec/05.information_window.test.js`、`app/InformationWindow*`・`EntityDetailLayout`、`game/EntityRegistry`・`StatusLocalization` |
| `06.run_records.md` | `spec/06.run_records.test.js`、`game/GameStatistics`・`StatisticsHooks`・`RunRecordsRepository`・`RunRankings`・`Achievements`、`app/RecordScreenData`・`CroppedEnemyLine`・`AchievementTable` |

表内の短い名前は`implementation/`以下の`*.test.js`を示す。

`spec/03.unique_skills.test.js` は実際のBattleSystem・ChipBoard・Factory・装備・入力後の移動制御を接続し、全15種の固有スキルを確認する。Enemy専用・Exの共通規則、撃破時召喚、ダメージ時の宝珠・反撃・属性・ゲージ、行動に伴う首・使い魔・諸刃の剣・タグ消去／移転・水会心・惑乱・不運・突風、加護の戦闘開始／行動後／被弾後の再抽選を対象とする。乱数を制御し、Ex差と主要な不発・解除条件を検証する。補助コードは`spec/helpers/uniqueSkillsFixture.js`に置く。

受入テストは全条件の組合せや乱数分布、Canvasの見た目を網羅しない。反応計算・対象選択・状態解除の細部は既存の実装テストと併用する。暴風の翼はHeroの上昇・等倍維持・倉庫での装備との同時落下・着地後の目的地とEnemyへの不発を自動検証し、見た目は実ゲームまたは一時的な確認ページで判断する。

`spec/05.information_window.test.js` は実際のManager・描画層・文言リポジトリ・GameClock・EntityRegistry・生成したHero/Enemy/Itemを接続する。最小限のDOMで装備→タグ→ステータスのリンク、子の置換、ピンと閉じるボタン、内外のフォーカス、時間停止の独立性、定義と実体の表示差、スタミナ・HPの再描画、実体消滅を確認する。内外タップは入力側から渡されるウィンドウIDをManagerへ直接通知する境界で検証し、座標のヒット判定・実機タップ・Canvas画像・CSSの見た目は対象外とする。全対象・全表示文言・固有スキルの効果計算を網羅するものではない。

中ボス・ボス全30定義のExボタン、子ウィンドウへの固有スキル説明表示と親の維持、通常敵での非表示、戦闘中の実体からの同じ導線も要求05のテストで確認する。レコード画面固有の開閉・破棄・拡縮配置を網羅するものではない。

## ブラウザー検証と公開前の実行順

専用サーバー、Windowsでの権限申請・正常終了の確認、各テストの対象、公開前の実行順は
[ブラウザー検証](02.browser_verification.md)を参照する。

## PCでの性能調査

`node scripts/measure-performance.js --list` で条件一覧を確認する。
`node scripts/measure-performance.js idle-dpr3 idle-cpu4 idle-cpu4-dpr1` のように条件名を指定する。
条件名を省略すると全条件を実行する。
ゲームルートで実行し、4186・4187ポートを空ける。既定はインストール済みChromeのheadless実行。
`PERF_CHANNEL=chromium` でPlaywright付属ブラウザーに切り替えられるが、描画デバイスを結果で確認する。

このスクリプトだけがViteの計測用変換を読み込み、`tmp_performance_dist/` へローカル専用ビルドを作る。
通常の `npm.cmd run build` はローカル用の `__perf`・`__session` を含まない。
`*-normal-build` 条件は通常ビルド、`*-no-probe` は変換あり・詳細計測なしであり、両者を区別する。
ビルドと配信サーバーの起動・終了はスクリプトが行い、push・公開は行わない。

既定は各条件5秒のウォームアップ後、30秒を3回測定する。
PowerShellでは `$env:PERF_SECONDS='8'`、`$env:PERF_REPEATS='1'` のように予備測定へ変更できる。
`PERF_WARMUP` はウォームアップ秒数、`PERF_OUTPUT` は出力先を変更する。
既定の生データは `tmp_performance/results.json`。条件ごとの各反復終了時に保存する。
Playwrightが清掃する `test-results/` は性能データの保存先に使わない。
`PERF_PROFILE=1` は追加調査用のCPUプロファイルを保存する。主要比較では無効にする。
`node scripts/summarize-performance.js 出力.json 入力.json [...]` で毎フレームの生データを除いた結果を保存できる。

画面は既定390×844 CSS px、画素密度3、時間設定1倍、固定乱数、チュートリアル完了状態で開始する。
`PERF_SETTLED_INFORMATION=1` はゲーム生成・課題候補生成の直前に乱数をseed=54へ戻し、タイトル演出による乱数消費を分離する。
idle画面で敵の初期出現完了（stage=battleかつ出現待ち0件）を待ってから情報を開き、ウォームアップを行う。
情報表示の比較では全条件に同じ指定を使い、開始時の敵数・チップ数・stageが一致することを結果で確認する。
情報ウィンドウの比較は「情報を開いても停止しない」設定であり、既定の停止設定とは区別する。
満杯条件は実際の倉庫容量まで同一種の武器を追加した負荷試験。
戦闘条件は1人のスタミナを3にして、実際の選択・出発処理を呼ぶ初期化を行う。
`drag-zoom` はPCマウスのドラッグ・ホイール操作で、実機のタッチ・ピンチ検証ではない。
`small-icons` は読み込み済みのタグ・ステータス画像を128pxのPNGへ一度変換した比較実験で、画質の採用判断を含まない。
`idle-original-images` は同じソースで画像の段階選択だけを無効化した比較ビルドを使う（4190ポート）。
`idle-dpr3` と同じCanvas寸法・zoom・乱数・シーンで比較する。通常ビルドの設定は変更しない。
`information-paired` は同一画面で情報更新あり→省略→ありを切り替える。
`information-batching-paired`・`information-cpu4-batching-paired` は標準CPU・CPU4倍で旧方式→フレーム集約方式→旧方式を比較する。
旧方式の復元は計測用変換だけで行い、通常ビルドはフレーム集約方式で動作する。どの区間も更新を省略しない。
1反復の計測時間を3分割するため、既定は各10秒を3反復とし、各区間の結果を `phaseMetrics` に保存する。
区間別に更新・描画回数、LayoutCount・LayoutDuration等の差分、開始・終了時のtick・チップ数・対象実体を記録する。
CDPとゲーム状態の取得は逐次実行のため、区間境界には取得中のフレームが含まれる。短い予備測定の区間値は主要比較に使わない。
情報更新時間は描画層の時間を内包するため、両者を加算しない。
`information-incremental-paired`・`information-cpu4-incremental-paired` は、通知集約済みの全再生成方式と
差分描画方式を同一ページでA1→B→A2の順に切り替える。各区間10秒×3反復を既定とする。
旧Layer・旧EntityRendererは計測専用ビルドで`cb55fad55e49045630aa0456c2858dcf9c5bf274`から取得し、
通常ビルドに旧方式の復元処理を含めない。`phaseMetrics`にはDOM生成・置換・数値書込・境界取得の回数と、
境界時点のゲージ・重量が実体と一致するかも記録する。DOM計数はLayer.renderの同期実行内が対象であり、
それ以外のゲームDOMや後続のブラウザーレイアウトを表さない。Layout全体はCDPの指標で照合する。
ヘッダーを含めてスクロールする旧配置の高さ制約も、計測専用の`is-performance-legacy`へ限定したCSSで復元する。
`information-no-probe`・`information-cpu4-no-probe` は同じ情報表示条件で詳細計測だけを無効にする。
フレーム採取とローカル変換は残るため、通常ビルドそのものの計測とは区別する。
画像の `rgbaBytesEstimate` は寸法から計算した32bit RGBAの概算で、実測メモリー使用量ではない。

描画呼出時間には後続処理での待ちが現れる場合があるため、関数別時間だけで原因を断定しない。
処理省略前後の全体時間・フレーム間隔・ブラウザーのTaskDurationも比較する。
CPU負荷制限や小画面設定をモバイル実機の再現とは扱わない。

主要比較中はテストや別のビルドを並行実行せず、短い予備測定は別の出力へ保存する。
画像の読み込み完了、敵数・チップ数・課題構成・速度・停止状態・情報対象と実行時エラーを照合する。
同一ページの往復比較を優先し、別時点の測定値の差だけから改善率を算出しない。
`main`はGameAppの同期コールバック時間であり、GPU描画完了や別ループのタイトル演出全体を表さない。
CDPのTaskDuration・LayoutDurationはページ全体の区間差分で、実CPU使用率そのものではない。
ゲーム進行は経過tickを60で割り、実秒で除した値で比較する。分位点は昇順配列の`floor((n - 1) × 分位)`を使う。
各反復の分位点とそのばらつきを報告し、全反復を結合した分位点と区別する。
採取JSON・CPUプロファイル・集計出力は`tmp_`配下へ置く。過去の測定結果を永続資料として保存しない。
今回の検証結果・条件・限界とオーナー判断はフェーズ実装報告へ記録する。

## 起動時の読み込み負荷調査

[調査用ビルド・警告確認・測定手順](01.startup_loading.md)を参照する。

## チップの接触候補の検証

`node --test tests/implementation/chips/ChipContactPairs.test.js tests/implementation/chips/ChipBoardPerformance.test.js tests/implementation/chips/ChipBoard.test.js`で、静止組の省略、変化したチップの走査、残った重なり、次更新への伝播、追加・削除・入替え、描画順を確認する。

性能比較は`chips-100-implementation-cpu1`・`chips-100-implementation-cpu4`、少数移動は`chips-100-sparse-implementation-cpu1`・`chips-100-sparse-implementation-cpu4`、密集移動は`chips-100-moving-implementation-cpu1`・`chips-100-moving-implementation-cpu4`を使う。
旧処理は計測専用にGitコミット`7960292`から取得する。通常ビルドと通常のテストはこの履歴取得を必要としない。
各反復は旧処理A1→現処理B→旧処理A2、既定では各10秒。移動条件では各区間の開始時に同じ物理状態・重なり順へ戻す。
少数移動は1枚を50msおきに左右0.25座標単位動かす。密集移動は1枚に1秒おきの移動を指示し、周囲との接触を起こす。実機タッチ入力や全チップの一斉移動を再現する条件ではない。
`contactChanged:ground`・`contactChanged:render`は各描画フレームに含まれる追跡器呼出しでの変化検出数の合計で、チップの実数や接触判定回数ではない。

## 集計・評価の検証

```powershell
node --test tests/implementation/game/GameStatistics.test.js tests/implementation/game/Achievements.test.js tests/implementation/game/StatisticsHooks.test.js tests/implementation/game/TrialStatisticsSession.test.js tests/implementation/game/ResultAchievementSelection.test.js
```

[集計・評価のクラス設計](../docs/specifications/15.achievement_classes.md)に対し、以下を確認する。

- 連続G値から整数達成グレードを求め、終了画面の候補選定と定義順表示を分ける。
- 同じ事実でラン・累積が更新され、獲得ptが消費で減らない。
- 課題の最高レベルは最大値で更新され、イベント履歴は増えない。
- トースト用の直前比較と、結果画面用の開始前比較が独立する。
- ラン・累積の集計が独立し、グレード評価が前回表とラン開始前の表を変更しない。
- グレード判定だけを追加する場合、既存の収集情報で足りる限りゲーム処理の変更が不要。

## 画像関連の検証

生成手順は[配信用画像の生成](../docs/specifications/24.image_conversion.md)、選択・読み込み・キャッシュの動作仕様は[ランタイム仕様](../docs/specifications/02.runtime_systems.md#canvas画像の段階描画)を正本とする。

```powershell
node --test tests/implementation/scripts/ImageConversion.test.js tests/implementation/chips/ScaledImage.test.js tests/implementation/chips/ImageLevelCache.test.js tests/implementation/chips/EnemyChipArtContract.test.js
```

- `ImageConversion.test.js`: パス、縦横比、拡大拒否、制作元ハッシュ、全画像の寸法と段階。
- `ScaledImage.test.js`: 配信用画像のハッシュ、段階PNGの実寸、描画時の段階選択。
- `ImageLevelCache.test.js`: 容量超過の固定集合、フレーム境界、ズーム切替、読み込み中の保護、容量不足からの静止Canvas再描画。
- `EnemyChipArtContract.test.js`: 敵画像のsafe-circle・輪郭サイズ契約。

盾と炎・水・雷の属性リングも上記のハッシュ・実寸・段階選択の対象とする。
最大ズーム1.5・DPR 3・付与値7では段階不足時に元画像へ戻ることを確認する。
初回表示とズーム変更時は読み込み待機、使用中の他画像の保護、24MiB上限も確認する。

画像サイズ変更後は実ブラウザーで画質を確認する。自動検証だけを実機の画質確認とは扱わない。

## チップ数に伴う負荷調査

`node scripts/measure-performance.js --list`で条件名を確認し、実行する条件を明示する。
例えば`node scripts/measure-performance.js chips-normal-cpu1 chips-100-cpu1`で、通常個数と満杯を比較する。
既定はウォームアップ5秒、30秒×3反復。`PERF_WARMUP`、`PERF_SECONDS`、`PERF_REPEATS`で変更できる。
`PERF_OUTPUT`は`tmp_performance/`配下を指定する。生データ、一時ビルド、CPUプロファイルを永続資料へ含めない。

`chips-`条件は固定seed・六角配置・同一課題を使用する人工的な比較条件であり、通常プレイの分布を再現するものではない。
実容量と初期アイテムを含む目標数、画像と縮小画像キャッシュの読込完了、反復前後の個数・課題・敵構成を検査する。
CPU4倍制限や小画面はモバイル実機の測定ではない。ドラッグ指標はDOMイベントからガイド描画命令の発行までで、画面への実表示を含まない。
詳細計測なし条件でもフレームprobeの記録と関数ラッパーは残る。処理省略は診断用であり、実装可能な改善率として扱わない。
計測は専用ビルドで行い、通常ビルドに`__perf`・`__session`や省略機能を含めない。測定中は別テストやビルドを並行実行しない。

集計例: `node scripts/summarize-performance.js tmp_performance/summary.json tmp_performance/results.json`。
反復別のフレーム間隔、同期処理、CDP TaskDuration、tick/実秒と、入力・処理省略区間を併記して判断する。

`chips-100-implementation-cpu1`や`chips-100-implementation-cpu4`は、同じシーンを旧処理→修正処理→旧処理に切り替える。
旧処理は`PerformanceBuild.js`に固定したコミットから診断ビルドへ読み込むため、その履歴がローカルに必要となる。
両方の画像段階をウォームアップし、通常ビルドへ切替機能や旧クラスを含めない。

## 手動確認

タッチドラッグのルーペは、`app/TouchDragLoupe`・`app/DragControls`・要求02で座標、表示条件、終了条件、指位置による確定を検証する。`browser/tutorial-landing.pw.js`の後半では実セッションを一時停止してChipを配置し、390×844のCanvasへ合成Pointer Eventsを送り、対象前・対象上・画面端・ピンチ解除・マウス非表示を確認する。スクリーンショットは`tmp_touch_drag_loupe/`へ保存する。これは実機タッチの検証ではない。拡大率・配置・狙いやすさは実機で判断する。

手動確認は実ゲームで行い、必要な確認ページ・サンプル・専用手順は`tmp_`配下の一時成果物とする。Gitの恒久的なテスト資産へ追加せず、マージ前に削除する。判断・結果はフェーズ報告、オーナーが明示的に保留した項目は[バックログ](../docs/planning/backlog.md)へ記録する。自動テスト成功を実機確認済みとは扱わない。
