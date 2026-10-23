# モバイル性能調査の実施内容

## 計画に対する実施

2026-10-23の追加合意により、以下の当初調査に加え、実機向け計測画面を実装した。
終了草案が承認されず実装を変更するため、設定を `0.61.1` に更新した。
Canvasの解像度とzoomを維持する。情報ウィンドウの対策は今回の修正対象から外す。
一度の計測版公開で得た結果を基に、同じブランチで範囲合意後の修正まで行う。
以下の「通常コードを変えていない」「公開していない」は当初のPC調査時点の記録である。

### 追加した実機計測

- オーナーの追加指示に従い、計測用バージョンとして通常URLで計測画面を読み込む。
  パラメータ分岐・別URL・追加の起動ボタンは不要とされたため取り除いた。測定は「測定開始」から行う。
- 通常動作2区間、更新と時刻を止めた描画9区間。区間時間とRAF間隔をメモリ上へ件数制限して採取する。
- 画像の実際の変換行列から必要な物理画素数を見積もり、切り上げた段階サイズのPNGを事前生成する。
- 基準→事前縮小→基準、画像・輪郭線・クリップ・描画命令省略→基準を比較する。
- 画像縮小時も元画像を保持するためメモリ削減の因果比較ではない。GPU完了時間・CanvasのGPU使用は取得できない。
- 開発者ツール不要でJSON保存・コピーを用意。自動送信なし。中止・画面変更・失敗時に描画関数と停止理由を復元する。
- 初回ブラウザー検証で動的importとトップレベルawaitの循環待ちを発見。バージョン情報を引数で渡して解消した。
- モバイル幅で計測パネルが開始劇のSkipを覆う問題を発見。上部配置へ修正した。
- 対象テスト: `node --test tests/implementation/scripts/MobilePerformance.test.js`、3件成功。
- 全テスト: `npm.cmd test`、644件成功・失敗0。ログ: `tmp_performance/mobile-node-tests.log`。
- 本番ビルド: `npm.cmd run build`、218 modules、成功。ブラウザー検証・公開結果は確定後追記する。
- 実機計測画面の通し検証: `node tmp_performance/check-mobile-diagnostics.mjs` 成功。
  11区間完了、45画像を事前縮小、停止区間のtick・camera・Canvas寸法不変、実行時例外0、中止後の復元を確認した。
  起動方法変更後は通常URLで自動表示する構成を再検証する。
- 通常URLで自動表示する最終構成も全11区間完走、43画像の事前縮小、中止後の復元、例外0を確認した。
  最終ログ: `tmp_performance/mobile-diagnostic-final.log`。`npm.cmd test` は644件成功、
  管理ハーネスによるブラウザー検証は新しい通常URL起動テストを含む4件成功（25.8秒）。
  最終PC集計は `docs/analysis/mobile_diagnostics_pc.json` に保存した。基準1/2/3は8.81/10.65/8.53ms、
  事前縮小1.58ms。後半の一部区間では変動が大きく、単純な順位づけはしない。
- 公開用の中間スナップショットを作成する。フェーズの終了コミットではなく、
  引継ぎ書は更新せず、実機採取後の原因分析・方針合意・修正を同じブランチで続ける。
  通常URLを使うとの指示に従い、開発ブランチを既存のworkflow_dispatchで公開する。masterへのマージは行わない。
- 通常のブラウザー検証: `node tmp_performance/run-browser-check.mjs`、既存3件成功、終了コード0。
  既知のwebServer終了問題を避けるため前述の管理ハーネスを使用した。ログ: `tmp_performance/mobile-browser-tests.log`。
- 今回のPC・同一停止画面では基準1/2/3の主処理平均8.44/8.54/8.59ms、事前縮小1.52ms、画像省略1.35ms。
  ただし基準のRAF間隔自体は約16.7msであり、モバイルの改善を保証する結果ではない。
  事前縮小区間の平均間隔は18.35msで、外れ値を含むため主処理時間だけで採用を決めない。
  この結果は従来の「タグ・状態アイコンだけを128pxへ縮小」とは対象・条件が異なる。

- バージョンを `0.61.0` に更新した。
- 描画・シミュレーション・DOM更新・チップ組合せ処理・画像保持・終了時の破棄を調査した。
- 通常公開コードを変えず、ローカル専用のVite変換とブラウザー計測スクリプトを追加した。
- PCのGPUを使うChromeで本番ビルドの性能を測定し、画素密度・CPU制限・処理省略を比較した。
- 同一画面の更新あり→省略→ありの比較で、反復間の負荷変動と情報更新の寄与を区別した。
- 恒久修正、実機向け計測画面、push・公開は実施していない。

## 変更箇所

| ファイル | 内容 |
| --- | --- |
| `package.json` / `package-lock.json` | 計画したバージョンへ更新 |
| `scripts/lib/PerformanceBuild.js` | 計測専用ビルドへのフック挿入、採取上限、処理群の時間計測 |
| `scripts/measure-performance.js` | ローカルビルド・配信、Chromeの条件別計測、JSON保存 |
| `scripts/summarize-performance.js` | 生のフレーム配列を除いた追跡用JSONの出力 |
| `tests/implementation/scripts/PerformanceBuild.test.js` | 変換箇所の整合性、計測の透過性と件数制限 |
| `tests/README.md` | 計測手順、調査条件、結果の読み方と制限 |
| `docs/analysis/01.mobile_performance.md` | 実装根拠、測定結果、改善計画、未確定事項 |
| `docs/analysis/mobile_performance_measurements.json` | 3データセット・17条件・27反復の環境と集計値 |

通常の `src/`、画像、ゲームルールは変更していない。
測定結果は[調査報告](../analysis/01.mobile_performance.md)と、その参照先の集計JSONへ記録した。

## 結果

- CPU4倍・同じCSS寸法で画素密度3→1とすると、主処理の3回平均は44.2→20.0ms。
- 情報ウィンドウの実体情報更新は1フレーム平均約64.4ms、約3回/フレーム呼ばれる。
- 同一画面の切り替えでも、更新あり→省略→ありで主処理が戻る。反復間の絶対値は大きく変動する。
- 満杯では描画・描画順・物理の負荷が増える。物理計算だけの省略では解消を確認できない。
- 通常画面で62画像、寸法の32bit RGBA換算約161.5MiB。実際のメモリー使用量ではない。
- 解像度管理、情報ウィンドウの更新方式、多数チップの描画・計算の順で改善を検討する。
- 恒久修正の候補をバックログへ記録し、チャットで通知した。既存のオーナー検証項目は維持した。

## 検証

- 対象テスト: `node --test tests/implementation/scripts/PerformanceBuild.test.js`
  - 変換マーカーのCRLF差で失敗したため、計測用変換で改行を正規化して修正した。
  - 3件成功。最終の全テストにも含まれる。
- 性能計測: `node scripts/measure-performance.js <条件名...>`
  - 最初のPlaywright付属ChromiumはSwiftShaderであったため、主要結果には使わない。
  - Chrome 155.0.8059.86、Intel Iris Xe（ANGLE/D3D11）で採取した27反復のconsole/page errorは0件。
  - 初期の追加武器の位置が倉庫外だったため、配置を倉庫内に修正した。採用データには修正後だけを含める。
  - `test-results/` 配下の生データがPlaywright起動時の清掃で削除されたため、出力を `tmp_performance/` へ変更した。
  - 主要4条件・同一画面の比較・補助確認を再採取し、追跡用JSONを再生成して確認した。削除された生データは根拠に使わない。
- 全テスト: `npm.cmd test` 成功。641件成功、失敗・skip 0件。
- ブラウザー検証: `PLAYWRIGHT_CHANNEL=chrome` で標準の `npm.cmd run test:browser` を実行した。
  - テスト本体3件は成功したが、webServerの終了処理が完了せずコマンドを中断した。このコマンド全体を成功とは扱わない。
  - 一時検証スクリプトでVite dev（4174）・preview（4175）をプロセス内から管理して、既存の同じ3テストを再実行した。
  - 元の設定のtestDir・testMatch・timeoutを維持し、webServerだけを外し、Chromeを指定した。
  - `node tmp_performance/run-browser-check.mjs` は3件成功（19.2秒）、終了コード0。アサーションとテスト対象ソースは変更していない。
  - dev側で既存のpublicアセットimport警告が出るが、ゲーム側の例外・HTTP失敗検査を含むテストは成功した。
  - 終了処理の問題は今回の性能調査の修正範囲外として記録する。サーバー管理方法の恒久変更はしていない。
- 本番ビルド: `npm.cmd run build` 成功（213モジュール）。
- 通常bundleを検査し、`__perf`・`__session`・計測用プラグインが含まれないことを確認した。
- 保存JSONを検査し、3データセット・17条件・27反復、全エラー0、全条件Intel GPUであることを確認した。
- `git diff --check` 成功。`src/`・`public/` とGameWorksOAKに変更なし。

### 採用した性能計測コマンド

`PERF_WARMUP=5` を共通とし、各コマンドは順に実行した。シェル変数の設定方法は調査報告を参照する。

```text
PERF_SECONDS=30 PERF_REPEATS=3 PERF_OUTPUT=tmp_performance/confirmation.json
node scripts/measure-performance.js idle-cpu4 idle-cpu4-dpr1 information-cpu4 information-no-refresh
PERF_SECONDS=30 PERF_REPEATS=3 PERF_OUTPUT=tmp_performance/paired.json
node scripts/measure-performance.js information-paired
PERF_SECONDS=8 PERF_REPEATS=1 PERF_OUTPUT=tmp_performance/supplemental.json
node scripts/measure-performance.js title-dpr3 selection-dpr3 idle-dpr3 idle-desktop idle-cpu4-no-probe idle-cpu4-normal-build warehouse-full warehouse-full-no-overlaps idle-speed4 battle-speed4 drag-zoom idle-cpu4-small-icons
node scripts/summarize-performance.js docs/analysis/mobile_performance_measurements.json tmp_performance/confirmation.json tmp_performance/paired.json tmp_performance/supplemental.json
```

主要原因の4条件は標準の30秒・3回とし、反復変動を切り分ける同一画面の比較を追加した。
他の条件は補助確認に位置づけ、8秒・1回として精度の違いを明記した。
一時検証スクリプト・生配列・ログはGit追跡対象に含めず、結果と追試手順を追跡する。

## オーナー検証

今回の成果はPC上の調査結果と改善計画であり、恒久的なUI・ゲーム動作の変更を含まない。
調査途中の実機確認は依頼しない。
実機での最終確認は恒久修正・PC検証・公開後に行う。
未回答の実機検証を今回の完了条件として新設せず、既存の保留項目も確認済みとは扱わない。

## 制限と次の判断

PCの結果は報告端末そのものの原因確定や、修正後の実機での性能保証ではない。
恒久修正は調査報告をもとに範囲を別途合意する。
