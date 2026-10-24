# 情報ウィンドウ更新負荷の調査・改善 実装報告

## 計画に対する変更範囲

- package.json・package-lock.jsonを0.63.1へ更新した。調査終了草案の提示後、オーナーがこのブランチで性能改善まで行うよう指示したため、計画を拡張しPatchを更新した。
- src/app/TrialSession.jsの動的通知を、分割更新ごとからフレームの計算完了後1回へ集約した。ゲーム状態を更新しなかったフレームでは動的再描画を行わない。
- scripts/lib/PerformanceBuild.jsのローカル専用変換でInformationWindowLayer.renderを計測する。
- scripts/measure-performance.jsへ情報表示の詳細計測なし条件、同一画面の区間別ブラウザー指標・開始終了状態・更新回数を追加した。
- PERF_SETTLED_INFORMATION=1でゲーム生成・課題候補生成直前に乱数を初期化し、敵の出現待ちがなくなってから情報を開く。Vite設定は変更しない。
- scripts/summarize-performance.jsで指標のサンプル数・最大値も残し、生配列を除いた集計から回数と状態を照合できるようにした。
- tests/README.mdへ条件・境界取得の限界・計測時間の内包関係を記載した。
- GameWorksOAKは参照のみ。画像・解像度変更、多数チップの改善、公開・pushは対象外。

## 予備調査と条件の統一

最初の予備測定で情報表示と更新省略による差を確認したが、開始時点の出現数が揃わなかった。
既存の固定乱数はタイトル演出でも消費され、画面遷移までのフレーム数で課題候補が変わる。
またstage=battleは最初の敵出現でも成立し、出現完了を意味しない。
このため乱数の再初期化とenemySpawn.pending.length=0の待機を加えた。
これは比較条件の統一であり、通常のゲーム挙動を変える性能修正ではない。

予備測定はPERF_SECONDS=3・PERF_WARMUP=1・PERF_REPEATS=1。
tmp_information_preliminary/、tmp_information_settled_preliminary/、tmp_information_settled_preliminary_complete/は条件調整中の結果。
tmp_information_main/は条件を統一する前の実行で、idle-dpr3の3反復保存後に中断した。成功した主要比較には含めない。
tmp_information_final_preliminary/は乱数再初期化・出現完了待ちを適用した確認結果で、4条件とも29チップ・敵4体・stage=battleが一致した。
この予備実行中に全テスト・ビルド等も実行したため、短時間の性能値は主要比較へ混ぜない。

## 調査段階の検証（0.63.0）

- `node --test tests/implementation/scripts/PerformanceBuild.test.js`: 3件成功。乱数再初期化の期待値を先に追加して未実装での失敗を確認後、実装して成功した。
- `node --test tests/spec/05.information_window.test.js tests/implementation/app/InformationWindowManager.test.js tests/implementation/app/InformationWindowPositioner.test.js tests/implementation/app/InformationWindowTitleLayout.test.js tests/implementation/app/InformationWindowScale.test.js tests/implementation/app/InformationWindowDragController.test.js tests/implementation/app/InformationWindowChipPreview.test.js tests/implementation/app/EntityDetailLayout.test.js`: 43件成功。
- `npm.cmd test`: 初回・最終差分での再実行とも659件成功、失敗・skip 0、終了コード0。ログ: tmp_information_tests.log・tmp_information_final_tests.log。
- `npm.cmd run build`: 初回・最終差分での再実行とも成功、終了コード0。506.67kBのchunkに対するViteの500kB警告あり。情報表示の調査用フックとは独立した通常bundleの容量警告であり、分割は今回の対象外。
- `rg -n '__perf|__session|settledInformationScene' dist`: 該当なし。通常ビルドへのフック・処理省略の混入なし。
- 最終測定終了後、NodeのTCP接続で4186・4187・4190の全ポートがECONNREFUSEDとなり、待受解放を確認した。

### ブラウザー検証

`node scripts/verify-browser-tests.js`をサンドボックス外で実行した。総合passed=true、終了コード0。
結果: tmp_browser_verification/2026-10-24T01-48-37-318Z/。

| 実行 | 開始→終了（日本時間、2026-10-24） | 結果 |
| --- | --- | --- |
| 1 | 10:48:40.670→10:49:09.305 | 4件成功、終了コード0 |
| 2 | 10:49:16.994→10:49:47.645 | 4件成功、終了コード0 |

両実行ともtimeout=false・interrupted=false、失敗・skip・flaky・実行エラー0。
remaining=[]・listeners=[]を確認し、4174・4175と起動した子孫プロセスは解放された。
開発サーバー側に既存テストの/public/data参照に関するVite警告、NO_COLOR/FORCE_COLORの環境警告がある。
テストの通信・実行時エラー判定は成功しており、今回変更した計測スクリプトは標準ブラウザーテストから読み込まれない。
テスト補助やアセット参照の修正へ範囲は広げない。

## オーナー検証

利用者向けの挙動・見た目は変更しない。計画どおり新規のオーナー検証項目は設けない。
既存のオーナー検証項目は維持する。

## 初期調査の結果と判断（0.63.0）

- 調査文書: docs/analysis/05.information_window_performance.md。
- 集計JSON: docs/analysis/information_window_performance_measurements.json。フレームごとの生配列は含めない。
- 主要生データ: tmp_information_settled_main/results.json。SHA-256: 9555a4535e16d82ccbacdc90bb6774597020fabad236fa023f469515101828b2。
- 実行条件: PERF_SETTLED_INFORMATION=1、PERF_OUTPUT=tmp_information_settled_main/results.json、時間・反復・warmupの上書きなし。
- 実行コマンド: `node scripts/measure-performance.js idle-dpr3 idle-cpu4 information information-cpu4 information-no-refresh information-paired information-no-probe information-cpu4-no-probe`。
- 標準CPU・CPU4倍の非表示/表示、CPU4倍の更新省略、標準・CPU4倍の詳細計測なし、同一画面の往復比較を各3反復、合計24反復完了。終了コード0、実行時・consoleエラー0。
- 全反復で課題構成regular/pattern10/level5・敵4体・29チップ・主要Canvas寸法が一致した。測定中も29チップ・速度1倍・停止なしを維持した。
- 標準CPUの表示時はp95=66.6～83.3ms、50ms超率8.16～22.22%、進行0.883～0.949ゲーム秒/実秒。非表示はp95=33.3～50.0ms、50ms超率0～2.27%、進行約1.0だった。
- 同一画面のA1/B/A2は平均フレーム間隔212.4→110.9→200.9ms、Layout時間160.5→12.1→159.1ms/実秒、進行0.237→0.454→0.248ゲーム秒/実秒。3反復とも往復の方向が一致した。
- 情報更新時間のほぼ全てをLayer.renderが占め、CPU4倍では1フレーム3回の通知・再構築が一致した。情報更新経路には対策が必要と判断する。
- 推奨順は分割更新後の通知集約、変更部分だけの更新、必要時だけの寸法計算。候補の実装効果は未検証。表示の現在値・装備・タグ・ピン・親子・位置・拡縮・スクロール・実体消滅時閉鎖を維持する条件を整理した。
- CPU4倍は更新を完全省略しても50ms超率がほぼ100%。情報更新だけで全体の負荷が解消するとは判断しない。PCのCPU制限を実機の再現と扱わない。
- 詳細計測なしでも負荷は残る。CPU4倍の反復変動が大きく、計測オーバーヘッドを一定の割合として推定できないことも記録した。
- backlog.md先頭の調査候補を、根拠へのリンクを持つ対策候補へ更新した。既存オーナー検証項目は変更していない。

### 集計と整合性の検証

`node scripts/summarize-performance.js docs/analysis/information_window_performance_measurements.json tmp_information_settled_main/results.json`で集計した。
`node tmp_information_analyze.mjs`で全24反復の条件・フレーム数・p95/p99・呼出対応・省略区間・状態を照合し、終了コード0。
追加のNode assertで集計JSONと生データの全24反復を比較し、全指標のn/mean/p95/max、区間別指標、フレーム間隔、ゲーム進行率の一致とsamplesの除外を確認した。

整合性検証の初回は全Canvas一致を要求して失敗した。情報表示がプレビューCanvasを追加する既存仕様によるため、
共通Canvas寸法の一致と、情報表示時だけの追加Canvas1枚を別々に検証するよう検証条件を修正した。
アプリの不具合や条件不一致ではなく、再測定を必要とする変更はない。

共通チェックリストの今回該当範囲（宣言・開始合意、版、対象範囲、配置、500行制限、検証、参照専用）を照合した。
利用者向け仕様・CSS・公開情報の変更はなく、マージ・pushの公開状態確認は次の担当フェーズで扱う。
引継ぎ書は終了草案の承認後にだけ保存し、変更一式のローカル終了コミットを行う。

## 改善実装と検証（0.63.1）

通知のフレーム集約を実装した。開閉・ピン・位置・拡縮等の直接通知と、分割処理内での実体消滅時閉鎖は維持する。
Manager・Layer・EntityRendererの描画内容は変更しない。
全更新の省略や時間間隔による制限を行わず、フレーム内の計算の最終値を表示する。

`tests/implementation/app/TrialSession.test.js`へ先に期待値を追加し、通常試験・挑戦の両方で旧実装の3回通知により失敗することを確認した。
修正後は1回通知・最終tickとスタミナ・停止中0回・途中の自動停止でも最終値を通知することが成功した。
GameClock.advanceの戻り値は途中停止時に実施済みステップ数を返さないため、コールバックが実行されたことを明示して判断する。

対象コマンド: `node --test tests/implementation/app/TrialSession.test.js tests/spec/05.information_window.test.js tests/implementation/scripts/PerformanceBuild.test.js`。
12件成功、終了コード0。Nodeのlocalstorage-file警告はテスト環境由来で、失敗ではない。
性能変換の初回はcloseInvalidEntriesのマーカーが複数箇所に一致して失敗したため、stageController.updateとの連続部分で一意に識別し、再実行で成功した。

計測用変換へ旧方式の復元を追加した。同一ページのA1/A2は旧方式、Bは修正方式で、全区間とも動的更新を行う。
`information-batching-paired`・`information-cpu4-batching-paired`が標準CPU・CPU4倍の比較条件。
通常ビルドに旧方式復元や切替フックは含めない。

予備実行: PERF_SETTLED_INFORMATION=1・PERF_SECONDS=3・PERF_WARMUP=1・PERF_REPEATS=1で両比較条件を実行し終了コード0。
tmp_information_optimized_preliminary/results.jsonで、敵4体・29チップと、修正区間の描画回数=フレーム数を確認した。

`npm.cmd test`: 659件成功、失敗・skip 0、終了コード0。tmp_information_optimized_tests.log。
`node scripts/verify-browser-tests.js`: サンドボックス外で2回正常終了、各4件成功、総合passed=true・終了コード0。
結果: tmp_browser_verification/2026-10-24T02-22-28-318Z/。
1回目は2026-10-24 11:22:31.577～11:23:03.117、2回目は11:23:10.277～11:23:36.211（日本時間）。
両実行とも失敗・skip・flaky・実行エラー0、timeout=false・interrupted=false・remaining=[]・listeners=[]。
Viteのpublic/data参照・chunkサイズ、NO_COLOR/FORCE_COLOR警告は初期調査と同じで、今回の修正による失敗はない。

主要比較はPERF_SETTLED_INFORMATION=1・PERF_OUTPUT=tmp_information_optimized_main/results.json、時間等の上書きなしで次を実行した。
`node scripts/measure-performance.js information information-cpu4 information-cpu4-no-probe information-batching-paired information-cpu4-batching-paired`。
5条件×3反復、計15反復を完了し終了コード0。実行時・consoleエラーと採取開始時の未完了画像は0件。
全反復で敵4体・29チップ・同じ課題・主要Canvas寸法が一致し、測定中も速度1倍・停止なしを維持した。

生データ: tmp_information_optimized_main/results.json。
SHA-256: 99d80cba2ebb7c8251d31ef1c3a086fcaf8ec97d889abdd5dc604d8279496936。
調査文書: docs/analysis/06.information_window_performance_improvement.md。
保存用集計: docs/analysis/information_window_performance_improvement_measurements.json。

`node tmp_information_analyze.mjs tmp_information_optimized_main/results.json`が終了コード0。
全フレームの旧方式の通知回数=分割回数、修正方式の通知回数=1、通知と描画回数の一致、ゲーム状態・フレーム数・分位点を確認した。
`node scripts/summarize-performance.js docs/analysis/information_window_performance_improvement_measurements.json tmp_information_optimized_main/results.json`で保存用集計を生成した。
追加のNode assertで全15反復のn/mean/p95/max・phaseMetrics・intervals・進行率の一致と、生フレーム配列の除外を確認し終了コード0。

同一ページの旧方式A1/A2の平均に対し、修正Bは標準CPUでmain 42.8%・平均フレーム間隔15.2%・Layout時間49.3%短縮。
CPU4倍はmain 52.9%・平均フレーム間隔34.9%・Layout時間50.3%短縮。
全3反復でBの各指標はA1/A2の双方より小さかった。情報更新の完全省略による結果とは区別し、実装した通知集約の効果として記録する。
標準CPUの修正方式30秒測定はp95約33.4ms・50ms超率0%、進行はほぼ1.0。
CPU4倍は50ms超率100%が残り、この対策だけで全体の遅いフレームが解消するとは判断しない。

バックログは通知集約を実装済みとし、変更部分だけの描画・必要時だけの寸法計算を未実装候補として残した。
Safari回転時のレコード画面と準備チュートリアルの開始時期の2件はオーナー指示でバックログへ記録し、今回の性能改善へ混ぜて実装していない。

最終差分での`npm.cmd test`: 659件成功、失敗・skip 0、終了コード0。ログ: tmp_information_optimized_final_tests.log。
`npm.cmd run build`: 成功、終了コード0。通常bundleは506.69kB、既存の500kB警告は範囲外として維持した。
対象テスト・全テスト・本番ビルド・ブラウザー検証はいずれも成功し、必須検証の失敗は残っていない。
`rg -n '__perf|__session|compareBatching|batchInformation' dist`は該当なし。旧方式復元・切替・計測用フックの通常ビルドへの混入はない。
測定用ポート4186・4187・4190はNodeのTCP接続が全てECONNREFUSEDとなり、待受解放を確認した。
GameWorksOAKの差分はなく、引継ぎ書は承認待ちの草案段階で更新していない。
