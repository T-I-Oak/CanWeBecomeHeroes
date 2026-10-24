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

受入テストは全条件の組合せや乱数分布、Canvasの見た目を網羅しない。反応計算・対象選択・状態解除の細部は既存の実装テストと併用する。暴風の翼はHeroの上昇・等倍維持・倉庫での装備との同時落下・着地後の目的地とEnemyへの不発を自動検証し、見た目は[演出確認ページ](manual/README.md#暴風の翼)で判断する。

`spec/05.information_window.test.js` は実際のManager・描画層・文言リポジトリ・GameClock・EntityRegistry・生成したHero/Enemy/Itemを接続する。最小限のDOMで装備→タグ→ステータスのリンク、子の置換、ピンと閉じるボタン、内外のフォーカス、時間停止の独立性、定義と実体の表示差、スタミナ・HPの再描画、実体消滅を確認する。内外タップは入力側から渡されるウィンドウIDをManagerへ直接通知する境界で検証し、座標のヒット判定・実機タップ・Canvas画像・CSSの見た目は対象外とする。全対象・全表示文言・固有スキルの効果計算を網羅するものではない。

中ボス・ボス全30定義のExボタン、子ウィンドウへの固有スキル説明表示と親の維持、通常敵での非表示、戦闘中の実体からの同じ導線も要求05のテストで確認する。レコード画面固有の開閉・破棄・拡縮配置を網羅するものではない。

## ブラウザー検証と公開前の実行順

`playwright.config.js`が専用のVite開発サーバー（4174）と本番ビルドのpreview（4175）を起動・終了する。両ポートは事前に空ける。ブラウザーテストは`*.pw.js`とし、Nodeの`*.test.js`と別に実行する。ローカルのインストール済みChromeを使う場合はPowerShellで`$env:PLAYWRIGHT_CHANNEL = 'chrome'`を設定できる。CIの既定はPlaywright付属のChromium。

### WindowsのCodex環境での実行方針

このプロジェクトのWindowsのCodex環境では、AI担当が`npm.cmd run test:browser`を
サンドボックス外で実行する権限を申請し、承認された範囲で実行する。
オーナーによる通常のPowerShellでの手動実行を毎回の手順とはしない。
`npm.cmd test`と`npm.cmd run build`は通常の実行環境で実行する。

WindowsではPlaywrightが`taskkill /T /F`で起動用シェルとサーバーの子プロセスを終了する。
この操作が制限される実行環境では、各テストが成功しても終了待ちになる場合がある。
プロセス終了の権限を持つ環境で標準コマンドを実行し、テスト結果に加えてコマンドの終了コード0と、
4174・4175の待受およびその実行が起動した子プロセスの解放を確認する。
調査時は`DEBUG=pw:webserver`でサーバーの起動・終了ログを取得できる。
待機を打ち切った実行は正常終了に数えず、残存する自分のテスト用プロセスだけを終了してから再実行する。

#### 正常完了の確認手順

ゲームルートで、AI担当が次のコマンド全体のサンドボックス外実行を申請し、承認範囲で実行する。
ツールがセッションIDを返したら同じセッションの完了を待つ。待機は1回60秒以内とし、進捗を伝える。

```powershell
node scripts/verify-browser-tests.js
```

Windows専用のこのコマンドは、次の処理を自動で実行する。

1. 専用ポート4174・4175の待受を照会する。使用中や照会失敗ならテストを開始せず失敗にする。
   事前照会中に中断された場合もテストを起動しない。
2. `npm.cmd run test:browser -- --reporter=line,json`を起動し、開始時刻・ルートPIDを記録する。
   標準の全テストを実行し、表示用と結果取得用のレポーターを指定する。
   `DEBUG=pw:webserver`と`PLAYWRIGHT_JSON_OUTPUT_FILE`を実行プロセスに設定する。
3. 起動後90秒を上限とし、実行中にPID・親PID・作成時刻・コマンドラインを照会する。
   ルートから子孫をたどって保存し、照会失敗を「残存なし」にしない。
4. 終了コードと終了時刻、JSONレポートを取得する。全5件成功・失敗0・skip0・flaky0・
   実行エラーなし・終了コード0・上限到達なし・中断なしを確認する。
5. 専用ポートの待受と今回のルート・子孫プロセスが残っていないことを確認する。
   PIDと作成時刻で識別し、TCPのTIME_WAITは待受に数えない。
6. 1回目が正常完了した場合だけ、同じ条件で2回目を実行して同じ確認を行う。
   両方正常完了した場合だけ検証コマンド自身も終了コード0で戻る。

失敗・上限到達・中断時は観測結果を記録する。今回のプロセスが残る場合は、
記録したPIDと作成時刻を照合してそのプロセスだけを終了し、後処理後の状態も記録する。
後処理で解放できても失敗を成功に変えない。照会や後処理の失敗も報告する。
別用途のプロセスは停止しない。
最初の起動後照会が失敗した場合は、後処理時の照会でルートPID・親PID・作成時刻を
今回のspawnの記録と照合して識別を回復する。確認できなければ終了対象を推測せず、後処理失敗を記録する。

結果は実行時に表示される`tmp_browser_verification/<実行日時>/`に保存する。
終了後、表示された実際のディレクトリ名で`<実行日時>`を置き換えて次を実行する。
ファイル閲覧は通常の実行環境でよい。

```powershell
Get-Content -Raw -Encoding UTF8 tmp_browser_verification/<実行日時>/summary.json
Get-Content -Raw -Encoding UTF8 tmp_browser_verification/<実行日時>/run-1.json | ConvertFrom-Json |
  Select-Object run,started,ended,exitCode,timedOut,interrupted,observationError,observationFailure,stats,errors,remaining,listeners,afterCleanup,passed | ConvertTo-Json -Depth 6
Get-Content -Raw -Encoding UTF8 tmp_browser_verification/<実行日時>/run-2.json | ConvertFrom-Json |
  Select-Object run,started,ended,exitCode,timedOut,interrupted,observationError,observationFailure,stats,errors,remaining,listeners,afterCleanup,passed | ConvertTo-Json -Depth 6
```

1回目失敗時は2回目のファイルは作られない。詳細ログは`run-N.log`、Playwright結果は
`run-N.playwright.json`。総合の`passed: true`、両実行の`passed: true`、
各`exitCode: 0`、`remaining: []`、`listeners: []`と実行ツールの終了コード0を照合する。
実装報告には実行条件、開始・終了時刻、テスト件数・成否、終了コード、上限到達・中断、
待受・プロセス残存、再実行結果、結果ディレクトリを記録する。

実行補助自体を変更した場合は、まず次の対象テストを通常の実行環境で実行し、全10件の成功を確認する。

```powershell
node --test tests/implementation/scripts/BrowserTestVerification.test.js tests/implementation/scripts/BrowserTestRun.test.js tests/implementation/scripts/WindowsBrowserInventory.test.js
```

BrowserTestRunは実際の実行フローへ照会・起動・終了処理を注入し、最初の起動後照会失敗からの後処理、
事前照会中のSIGINT/SIGTERM、所有者・作成時刻の異なるPIDを終了しないことを制御して確認する。
続いて次の上限到達の検証をサンドボックス外で行う。環境変数はこのコマンド内だけで変更し、元へ戻す。
期待結果は検証コマンドの終了コード1、`timedOut: true`・`passed: false`、
`afterCleanup.remaining: []`・`afterCleanup.listeners: []`であり、2回目は実行されない。
結果ファイルの読み方は上記と同じ。90秒はテストプロセスの待機上限で、観測・後処理時間は別にかかる。
各プロセス照会の上限は15秒、各終了コマンドは5秒である。

事前照会で失敗した場合は、テスト未起動とテスト自体の失敗を区別する。
`run-N.json`と`summary.json`の`observationError`・`observationFailure`を読む。
`rootPid: null`ならテスト用プロセスはまだ起動しておらず、テスト結果は未取得である。
この場合の`remaining: []`・`listeners: []`だけで解放確認済みとは判断しない。
`observationFailure`には照会の所要時間・上限・終了コード・シグナル・強制終了の有無・
標準出力・標準エラーを保存する。`stage`は最後に開始した処理で、
`startup`（PowerShell起動）、`processes`（プロセス照会）、`listeners`（ポート照会）、
`serialize`（JSON生成・読取）のいずれか。`killed`・`signal`と所要時間を照合し、
エラー文だけから権限不足やタイムアウトと断定しない。
原因調査後に同じ`node scripts/verify-browser-tests.js`をサンドボックス外で再実行する。
失敗した実行の記録も保持し、後続の成功で上書きしない。

```powershell
$previousBrowserVerifyTimeout = $env:BROWSER_VERIFY_TIMEOUT_MS
try {
  $env:BROWSER_VERIFY_TIMEOUT_MS = '1000'
  node scripts/verify-browser-tests.js
  $browserVerificationExitCode = $LASTEXITCODE
} finally {
  $env:BROWSER_VERIFY_TIMEOUT_MS = $previousBrowserVerifyTimeout
}
exit $browserVerificationExitCode
```

### ブラウザー検証の対象と公開前の実行順

- `browser/tutorial-landing.pw.js`: 初期Heroの実際の落下・跳ね返りと全員の着地後の導入開始、課題選択の説明、既読抑止、リセット、手動一時停止の維持を確認する。開発ブラウザーでTutorialControllerの呼出しと状態を観測し、物理更新・開始条件・シナリオ定義は本番実装を使用する。

- `browser/01.game_settings.pw.js`: 要求01の開始から終了までの接続。タイトルで開始し、選択順を変更した2名、開始劇、課題選択、戦闘開始、勝利後の次課題、最終課題の合格と期限切れ、結果を閉じた後のタイトル復帰・再開始を検証する。結果の見出し・保存内容と、終了後に更新を繰り返しても結果表示・記録が1件であることを確認する。
- 時間と乱数、チュートリアル完了状態はブラウザー内で制御する。戦闘開始までは実際の出現・物理更新を使い、勝利はテスト側から実際の敵撃破処理・戦闘終了境界を操作する。戦闘計算は既存の要求04・実装テストに任せる。合否判定、課題番号、結果生成・保存、モーダルとアプリのループは本番実装を通す。本番コードにテスト用フックは設けない。
- `browser/production.pw.js`: 本番ベースパス`/CanWeBecomeHeroes/`で、ビルド済みのタイトル・バージョン、メンバー選択、開始劇、課題選択を操作する。共通ライブラリを含むbundle、文言、ロゴを読み込み、HTTPエラー・通信失敗・コンソールエラー・実行時例外がないことを確認する。開発用モジュールの差し替えは行わない。
  レコード表示中に390×844→844×390→390×844、768×1024→1024×768→768×1024へ変更し、canvas寸法の追従、前面のヒット判定、タブ切替、成績表の縦横スクロール、閉じる・再表示、タイトル演出の継続を確認する。スクリーンショットは`tmp_record_rotation/`へ保存する。viewport変更とヒット判定は実機Safariの回転や合成後の画素の正しさを保証しないため、実機確認を別途行う。
  実機比較用ページは確認完了後に公開対象から外した。通常の本番テストでは、タイトルの検証リンクとビルド成果物の検証ページが残らないことも確認する。比較ページのソースは[開発用の手動確認](manual/README.md#safariのレコード画面回転の切り分け実機確認用)に残す。A〜E・関連情報ウィンドウ・ゲーム保存キー維持の比較検証結果は実装報告に記録する。

GitHub Pagesの公開ワークフローは`npm ci`→`npm test`→Chromium準備→`npm run test:browser`→`npm run build`→配信の順とする。ブラウザー検証自身もpreview用の本番ビルドを作る。失敗時に後続の配信は実行しない。ローカルでの本番preview確認はGitHub Pagesへ配信済みであることの確認とは区別する。

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

## 手動確認

現行の画像選択とキャッシュは[ランタイム仕様](../docs/specifications/02.runtime_systems.md)、生成手順とサイズ定義は[配信用画像の生成](../docs/specifications/24.image_conversion.md)を参照する。

### 段階画像の再生成

`npm.cmd run generate:images`（旧名 `generate:image-levels` も利用可）はPlaywrightとインストール済みChromeを使い、
`assets/images/source/` と `assets/image-sizes.json` から配信用PNG・縮小段階・マニフェストを一括生成する。
areas/heroes/tags/status/enemies/itemsと戦闘枠の地面画像が対象。
`IMAGE_LEVELS_CHANNEL=chromium` でPlaywright付属ブラウザーを使える。
制作元・サイズ定義・生成した配信用PNG・`public/assets/image-levels/`・`src/chips/image-levels.json` を追跡する。
通常のbuild・実機では生成しない。制作元は上書きせず、公開成果物に含めない。
制作元の更新・追加時はサイズとSHA-256の定義を確認し直して再生成する。
`ImageConversion.test.js` と `ScaledImage.test.js` で制作元・定義・配信用画像・段階画像の整合性を確認する。
画面のCSS寸法、DPR、zoom、回転を反映した変換行列から必要サイズを求め、足りる最小段階を選ぶ。
元画像も含めて十分な大きさがなければ元画像を使う。縮小画像を引き伸ばして代用しない。
未ロードの段階画像は読み込み完了まで描画を待つ。読み込み失敗時は元画像を使う。
静止プレビューは読み込み完了・失敗時に描き直す。
24MiBの容量不足時は元画像へ戻さず取得・描画を省略する。
前回・今回のフレームで要求した画像を保護し、それより古い完了済み画像だけを破棄する。
`ImageLevelCache.test.js` で容量超過の固定集合、フレーム境界、ズーム切り替え、
読み込み中の保護、容量不足からの静止Canvas再描画を確認する。

[画面確認用入口](manual/README.md)と[操作・モバイル表示の確認](manual/controls.md)を参照する。実機・見た目について未確認の項目とオーナーの保留判断は[バックログ](../docs/planning/backlog.md)を正本とする。自動テスト成功を実機確認済みとは扱わない。
