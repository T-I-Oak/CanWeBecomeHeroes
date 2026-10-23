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

追加合意に基づき `OV-MOBILE-PERF-01` を提示する。確認バージョンは `0.61.1`。
通常URLでタイトルと倉庫左下のバージョンを確認し、情報ウィンドウを開かない通常画面で測定開始する。
約80秒、zoom・向き・アプリを切り替えずに待ち、結果JSONを保存する。
期待結果は11区間の採取完了、条件比較後の通常表示・操作への復帰、JSON保存である。
オーナーからJSONと端末名・OS・ブラウザーを受け取り、測定結果を分析する。現時点では判断待ち。
途中中止・失敗の場合も保存したJSONで状況を確認する。自動検証成功を実機確認済みとは扱わない。
既存の保留項目を確認済みとは扱わない。実機採取後も同じブランチで方針合意・修正を続ける。

## 計測版の公開

- 公開用スナップショット: `738bcf3695ecafe1fe2be10392ad5b19cad47388`。
- 開発ブランチをpushし、既存の `Deploy to GitHub Pages` をworkflow_dispatchで起動した。
- [公開ワークフロー](https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/39906571480): completed / success。
- 公開先は通常URL `https://t-i-oak.github.io/CanWeBecomeHeroes/`。masterへのマージ・フェーズ終了は行っていない。
- 参照専用の共通側はmaster、HEADとremote masterが `e4974f86606374fb81dae4e57644f051085c2c45` で一致し、src/lib変更なし。

## 制限と次の判断

### 採取結果に基づく画像描画の改善

オーナーから「測定を維持したまま改善」と指示を受け、`0.61.2` へ更新して実装した。

- `scripts/generate-image-levels.js` で元画像を上書きせず113種類・734枚・25,889,368 bytesの段階PNGを開発時に生成した。
  元画像のハッシュをパスへ含め、通常build・実機での一括縮小を不要にした。新しい外部依存は追加していない。
- `ScaledImage` を各Canvasの画像描画へ適用した。現在の変換行列と描画寸法から両辺に足りる最小段階を選ぶ。
  足りる段階がなければ元画像を使う。Canvas寸法・zoom・配置・当たり判定は変えていない。
- 元画像・模様背景・DOM表示・共有画像生成は保持した。情報ウィンドウの更新方式は変更していない。
- 段階画像のキャッシュはRGBA寸法換算24MiBを上限とし、古い使用済み段階を破棄する。
  ロード中は画像描画を待ち、失敗時は元画像へ戻す。失敗パスと画像選択方式を測定JSONへ追加した。
- 測定画面・11区間・JSON保存・中止と復元を維持した。改善後の基準区間は段階画像を使用するため、
  `imageLevels.policy` とバージョンで旧版と区別する。`small-images` は追加縮小なしになる場合がある。
- 元画像だけを使う比較ビルド `idle-original-images` をローカル計測へ追加した。
  同一PC・Chrome・390×844 CSS px・DPR3・チップ29枚・同じzoomと乱数で、各5秒warmup・15秒×3反復。
  元画像主処理平均は11.60/9.36/10.23ms、段階画像は2.96/3.06/2.96ms（各反復平均の平均で約71%減）。
  フレームp95は元画像16.8〜33.3ms、段階画像16.8〜33.3ms。PCのフレームレート向上や実機性能の保証とは区別する。
  集計は `docs/analysis/image_level_comparison.json`、生データとログは `tmp_performance/` に保持した。
- DPR3、zoom0.133/0.5/1.5で元画像と段階画像を同じ座標へ描画し、PNGで確認した。
  全体表示・中間倍率では縮小フィルターによる差はあるが、必要物理画素数を満たしている。
  最大倍率のHeroは元画像が選ばれ、比較画素は完全一致した。取得失敗・実行時例外0。
  根拠: `tmp_performance/image-quality/results.json` と同フォルダーの比較PNG。
- 対象テスト `node --test tests/implementation/chips/ScaledImage.test.js`: 4件成功。
  生成元ハッシュ・PNG寸法・カタログ網羅、DPR/zoom/回転での選択、読み込み待ち・再利用・拡大時切替・失敗時復帰を確認した。
- `npm.cmd test`: 648件成功・失敗0。`node tmp_performance/run-browser-check.mjs`: 既存＋計測起動の4件成功（19.5秒）。
  本番buildは220 modulesで成功。マニフェスト追加によりJS非圧縮サイズが約512kBとなりViteの500kB警告が出る。
  gzipでは約136kB（従来約131kB）。警告閾値変更や無関係な分割はしていない。

測定画面の改善後の通し確認も成功した（`tmp_performance/image-level-diagnostics-final.log`）。
11区間完走、JSON生成、例外0、失敗画像0、中止後の復帰を確認した。
既に適正な段階を使っているため、診断用の追加縮小画像は0枚となった。
追加したキャッシュ上限・再取得テストを含め、対象テストは5件成功。
最終の全テストは649件成功・失敗0（`tmp_performance/image-level-tests-publish.log`）。実機での最終確認と公開結果は確定後に追記する。

### 改善版の公開操作

- 公開用コミット: `9f4ed83b3832769263807dda0382d44fd6698ce7`。開発ブランチへpush済み。
- [アプリの公開ワークフロー](https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/39915422878)はsuccess。
- 後続の[GitHub Pages配信](https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/39915572101)でdeployジョブのみfailureとなった。
  Pagesのbuild・artifact uploadは成功し、注釈は `Deployment failed, try again later.`。
  詳細ログ取得は503（Egress is over the account limit）となり、注釈APIで確認した。
- 同じ成果物で失敗ジョブだけを再実行した。ソース変更・再pushはしていない。
  再実行はrun_attempt 2でqueued→waiting→in_progress→completed / failureとなった。
  通常URLの再確認もv0.61.1だったため、改善版が公開反映済みとは扱わない。
  アプリの実装・ローカル検証・gh-pagesへの反映は完了し、Pagesの配信工程の失敗が残る。
  根拠なしにソースや公開設定を変更して回避しない。以後の実機最終確認はv0.61.2の反映後に行う。
- オーナーからPRとの関係を質問された。今回PR作成・masterへのマージは行っていない。
  GitHub APIでopen PRを確認した結果は0件。公開は開発ブランチのworkflow_dispatchで、PRを経由していない。
- push直前の共通側はmaster、HEADとremote masterは `e4974f86606374fb81dae4e57644f051085c2c45` で一致、src/lib変更なし。

### Pages配信の復旧確認

- 通常URL未反映の指摘を受け、アプリ側ワークフローと後段のPages配信を再確認した。
  同じファイルの配置だけでは新しいPages配信が始まっていなかったため、設定・ソース・公開用ブランチを変更せず、
  GitHubのPagesビルドAPI（`POST /repos/{owner}/{repo}/pages/builds`）で配置済み成果物の新規ビルドを起動した。
- 配信対象コミットは `64b49730d7404af9acf6d0ae81812f0a3fe7850d`。
  新規ビルドは2026-10-23 07:48:08 UTC開始、07:48:53 UTCに `built`、error.messageはnullになった。
- 通常URL `https://t-i-oak.github.io/CanWeBecomeHeroes/` をChromeの新規コンテキストで確認し、
  HTTP 200、タイトル `v0.61.2`、測定パネル `性能測定 v0.61.2`、ゲーム開始・測定・中止後の復帰を確認した。
- 初期読み込み途中の画像を完了と取り違えないよう、公開確認スクリプトで実際の通信完了を待機した。
  最終確認では段階画像78枚、loading 0、failures 0、HTTP/実行時エラー0。
  根拠: `node tmp_performance/verify-mobile-publication.mjs` 成功、`tmp_performance/mobile-diagnostics/published.png`。
- 先の配信失敗記録は履歴として残す。現在は改善版の通常URL反映を確認済み。
  実機での速度・画質の最終判断は引き続きオーナー確認待ちである。

最終確認は `OV-MOBILE-PERF-02`（改善版で同じ手順の測定とJSON保存）、
`OV-MOBILE-PERF-03`（全体表示・ピンチ拡大時の速度と画質）とする。確認バージョンは0.61.2。
タイトルと倉庫左下のバージョン一致を確認して通常画面で試す。
期待結果は旧版の秒単位の停止が解消し、拡大しても小さい段階画像の引き伸ばしにならず、
測定・保存・復帰ができること。PC検証を実機確認済みとは扱わない。現時点では判断待ち。

### オーナーによるPC・モバイル採取

`OV-MOBILE-PERF-01` についてPC・モバイル両方のJSONを受領した。
両方とも11区間完了・例外0、停止比較中のtick・camera・Canvas寸法・チップ数は一定。
測定完了・JSON保存は実ファイルにより確認できた。復帰後の操作感そのものはJSONから確認済みとはしない。
詳細は[実機採取の分析](../analysis/02.mobile_device_measurements.md)を参照する。
モバイルは元画像で約2.2秒/フレーム、事前縮小で約24.5ms/フレームとなり、元画像へ戻すと再び遅くなる。
画像準備には約287秒かかるため、製品向けには事前生成と段階選択の方式を提案する。
この時点ではソース・アセット変更や再公開は行っていない。方針合意後に同じブランチで恒久修正する。

PCの結果は報告端末そのものの原因確定や、修正後の実機での性能保証ではない。
恒久修正は調査報告をもとに範囲を別途合意する。

### 静止プレビュー欠落の修正・実機確認用公開 v0.61.3

オーナーの画像により、パーティー選択の未選択勇者と課題選択の店タグに画像欠落を確認。
段階画像の非同期読み込み後、静止Canvasが再描画されないことが原因だった。
段階画像の読み込み成功・失敗時の再描画通知を追加し、チッププレビューと店タグに適用した。
共有読み込みの通知は重複排除し、完了時に解除する。描画中のポーズは維持する。
全Canvas描画箇所を確認し、他の段階画像利用箇所は継続描画で更新されることを確認した。
Chromeでタグ15種類と勇者8種類の静止Canvas画像描画を確認（23件、欠落0）。
回帰テストを含むNodeテスト650件成功、本番ビルド成功。
測定機能・解像度・zoomの仕様は維持。オーナーの実機確認希望を受けて公開する。
これは実装途中の公開用スナップショットであり、フェーズ終了ではない。
v0.61.2採取結果の分析は docs/analysis/03.mobile_improvement_measurements.md を参照。
後半の低fpsは未解決であり、今回の変更は静止画像欠落への対応である。
共通ライブラリはmaster、HEADとリモートmasterがe4974f86606374fb81dae4e57644f051085c2c45で一致、src/lib変更なし。

v0.61.3公開結果: 開発ブランチの14db7a61ef2f5f450b1053234d5d094200336b71をpush。
アプリ公開run39926075074とPages配信run39926238015はともにsuccess。
gh-pages成果物はd253a4638fa3d3911ef2dc0da60978fbadadd255。
通常URLを新規Chromeコンテキストで検証しHTTP200、タイトルv0.61.3、性能測定v0.61.3を確認。
ゲーム開始・測定開始と中止・段階画像80枚の読み込みを確認し、未完了0・失敗0・実行時エラー0。
ブラウザー受入・本番smokeテストも4件成功。
OV-MOBILE-PERF-02/03の今回確認対象はv0.61.3。タイトルと倉庫左下の版を確認して通常URLで試す。
静止プレビューの画像欠落、速度・画質、測定保存と復帰を確認する。実機の判断は未完了。
