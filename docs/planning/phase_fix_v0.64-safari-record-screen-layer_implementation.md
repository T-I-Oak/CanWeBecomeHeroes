# Safariの画面回転時のレコード表示：実装報告

## 実機用の比較ページ

オーナー提供画像では、紙面と上部操作部の前に落下チップがあり、表の見出し帯・罫線はチップより前にある。ウィンドウ全体が同じ順序で背面へ移る状態と断定できない。本文だけのtransform: scale、canvasリサイズ、overflowの組合せを別々に比較するため、一度の公開で条件を切り替えられる検証ページの作成・配信が承認された。

v0.64.1のtests/manual/record-rotation.htmlに本番TitleMenu・RecordScreen・TitleChipRain・CSSを使う専用入口を作った。Aは撤回後の通常実装、Bは本文のtransformを除去して占有寸法を等倍に整合、Cは初回以降のcanvas backing store更新を抑止、Dは表のスクロール領域のoverflowだけvisibleとする。これらの変更は検証ページ内に閉じ、ゲーム本体のクラスは変更していない。Viteの複数HTMLエントリーで専用ページも公開ビルドへ含める。通常ゲームに診断UIを追加せず、調査後に追加入口を撤去する。

各条件はGETフォームによる再読込で開始し、前条件の合成状態を引き継がない。同一seedの落下演出とサンプルランキング10件を使い、DataManagerを作らずゲーム保存キーを読取・変更しない。診断専用sessionStorageに最大100件の寸法・条件・判定を保存し、同じタブ内の各条件の結果をまとめる。自動送信しない。回転中の記録はDOMを更新しない。パネルを開く前のスクリーンショットと、条件ごとの異常有無を比較する。Aで再現しない場合は専用ページの結果から原因を判断しない。

自動テストでは本番preview上で全条件の選択・再読込・縦横往復、設定されたtransform・overflow・canvas描画寸法、判定ログ、ゲーム保存キーが不変であることを確認する。実機Safariの描画異常の解消を確認したものではない。最新のnpm.cmd testは662件成功、終了コード0。公開ビルドは成功し、追加エントリーによる共通チャンク分割後は500kBの警告は出なかった。

最新のブラウザー検証はnode scripts/verify-browser-tests.jsをREADMEどおりサンドボックス外で実行し、tmp_browser_verification/2026-10-24T04-52-09-659Z/に保存した。2026-10-24 JSTの1回目13:52:13.325〜13:52:46.066、2回目13:52:54.700〜13:53:32.276。両回4件成功、失敗・skip・flaky 0、exitCode: 0、timedOut: false、interrupted: false、observationError: null、remaining: []、listeners: []、passed: true。検証コマンド自体も終了コード0で正常終了した。

## 最新の対応：修正候補の撤回

オーナーから「それは原因ではなかったので修正を戻してください」と指示された。フィードバックによる再実装として0.64.1へ更新し、screens.cssのisolation追加・z-index変更と、それを記載した仕様書の追加段落を撤回した。両ファイルは計画時点の3afbf80と差分がないことをgit diffで確認した。検証補助・READMEの診断改善とブラウザーの回転操作テストは維持する。元の不具合は未解消であり、原因調査が必要。以下の0.64.0に関する調査・検証・配信内容は撤回前の履歴である。

0.64.1のnpm.cmd testは662件成功、失敗・skip・cancel 0、終了コード0。npm.cmd run buildは成功、終了コード0（既存の500kB警告あり）。git diff --checkも成功。実機確認用の公開版にも撤回を反映する。共通側のmaster・HEAD・remote masterがe4974f86606374fb81dae4e57644f051085c2c45で一致し、src/libに未コミット・未追跡変更がないことをpush前に確認した。

## 実装内容

- 設定・lockfileを0.63.1から0.64.0へ更新した。画面表示は既存のAppMetadata経由で設定を参照する。
- screens.cssでTitleMenu__Stageにisolation: isolateを指定し、canvasを0、暗幕を1、内容・クレジットを2の順にした。タイトル内の重なりを閉じた境界で管理する。RecordScreenの本文拡縮・内部スクロール、TitleChipRainのリサイズ・演出継続は変更していない。
- 本番ブラウザーテストにスマートフォン・タブレット相当の縦横往復、canvas寸法更新、レコード内3点の前面ヒット判定、全タブ切替、成績表スクロール、閉じる・再表示、閉じた後のcanvas描画更新を追加した。既存の全4件の構成を維持した。
- 仕様書・テストREADME・バックログ先頭を実際の確認範囲に合わせて更新した。
- GameWorksOAKは変更していない。

## 調査と制約

TitleMenuのcanvas・暗幕は絶対配置でz-index未指定、内容はz-index: 1だった。RecordScreenは本文のみtransform: scaleを使い、親のサイズ変更をResizeObserverで監視する。TitleChipRainは別のResizeObserverでcanvasのCSS寸法とDPRに合わせてbacking storeを更新する。本文とcanvasの寸法更新に、相互のz-indexを書き換える処理はなかった。

WebKitにはoverflowと絶対配置の重なり順に関する類似報告がある（https://bugs.webkit.org/show_bug.cgi?id=263886）。今回と同じ原因だと断定する根拠はなく、今回のCSS変更は重なりの境界と順序を明示する修正候補である。元のSafari不具合はこのWindows環境では再現・原因確定できていない。Playwright WebKitは未インストールで未実行。実機Safariは未確認。

Chromiumのviewport変更は端末の物理回転を再現せず、elementFromPointは合成後の画素の正しさを保証しない。390×844・844×390のスクリーンショットを目視し、レコードの紙と操作部が表示されていることは確認した。実機Safariの解消確認とは区別する。

## ブラウザー検証手順の失敗と対応

2026-10-24の初回はREADMEのWindows向け手順に従い、サンドボックス外でnode scripts/verify-browser-tests.jsを実行した。結果はtmp_browser_verification/2026-10-24T02-58-29-994Z/にある。11:58:29〜11:58:48 JSTの事前照会で失敗し、rootPid: null、exitCode: null、stats: null、passed: false。テストもサーバーも未起動だった。照会上限は15秒だったが、元の記録はerror.messageしか残さず、code・signal・killed・stdout・stderrを欠いていたため、タイムアウト・アクセス拒否などの原因を特定できない。観測失敗時の空配列を解放確認成功として扱わない。

再実行の権限申請は一度拒否され、その実行は開始されなかった。その後、オーナーから原因調査と手順修正を指示され、診断・再検証を実施した。

個別診断ではPowerShell起動267ms、Win32_Process照会886ms、TCP待受照会3256msで成功した。元と同一の結合照会も2822msで成功した。最初の失敗は再現しなかったため、原因は未確定のままとする。

WindowsBrowserInventoryへ実処理を抽出し、PowerShell起動・プロセス照会・待受照会・JSON生成/読取の段階と所要時間、上限、code、signal、killed、stdout、stderrを失敗時に保存するよう修正した。BrowserTestRunとsummaryにもobservationFailureを保存し、後処理中の照会失敗にも診断情報を残す。照会の上限15秒、成功条件、PID・親PID・作成時刻の照合は維持した。READMEには失敗記録の読み方、テスト未起動との区別、原因を推測で断定しないこと、調査後の再実行を追記した。黙って再試行したり照会失敗を成功に変えたりしない。

## 自動検証

- 対象：node --test tests/implementation/app/RecordScreenScale.test.js tests/implementation/app/RecordScreenData.test.js tests/spec/06.run_records.test.js — 7件成功、終了コード0。
- 検証補助：node --test tests/implementation/scripts/BrowserTestVerification.test.js tests/implementation/scripts/BrowserTestRun.test.js tests/implementation/scripts/WindowsBrowserInventory.test.js — 10件成功、終了コード0。診断情報の保存、JSON読取失敗、既存の安全な後処理・誤った所有者や作成時刻のPIDを停止しない条件を確認した。
- 全テスト：npm.cmd test — 最終実行662件成功、失敗・skip・cancel 0、終了コード0。
- 本番ビルド：npm.cmd run build — 成功、終了コード0。約507kBのJS bundleに対するViteの500kB警告は残る。今回のCSSと検証補助の変更はbundle分割を扱わない。
- git diff --check — 成功。

### 通常のブラウザー検証

node scripts/verify-browser-tests.jsをサンドボックス外で実行。Windows、Node v25.6.1、Playwright Chromium、channel未指定、上限90000ms。結果：tmp_browser_verification/2026-10-24T03-44-43-310Z/。

| 実行 | 開始〜終了（2026-10-24 JST） | 結果 |
| --- | --- | --- |
| 1 | 12:44:46.552〜12:45:19.141 | 4件成功、失敗・skip・flaky 0、exitCode: 0 |
| 2 | 12:45:28.179〜12:45:58.993 | 4件成功、失敗・skip・flaky 0、exitCode: 0 |

両回ともtimedOut: false、interrupted: false、observationError: null、remaining: []、listeners: []、passed: true。総合passed: true、検証コマンドの終了コード0。viewportは390×844→844×390→390×844、768×1024→1024×768→768×1024。タイトルのv0.64.0も本番テストで確認した。画像はtmp_record_rotation/へ保存した。

開発サーバーからpublic内JSONのimportに関する警告が出た。既存の主要フローテストで使用する開発時のimport経路に関するもので、今回は変更していない。本番起動テストはHTTP・通信・コンソール・実行時エラーなしの条件で成功した。

### 上限到達時の検証

READMEのtry/finally手順でBROWSER_VERIFY_TIMEOUT_MSを1000へ一時変更し、元の値へ戻した。結果：tmp_browser_verification/2026-10-24T03-47-08-563Z/。12:47:11.813〜12:47:25.130 JST、検証コマンド終了コード1、timedOut: true、passed: false。2回目は起動しなかった。停止前のremaining・listenersは保存し、今回のツリーだけを停止した後のafterCleanup.remaining: []、afterCleanup.listeners: []を確認した。Playwrightレポートは停止のため未生成。これは期待どおりの異常系結果であり、通常検証の成功には数えない。

## オーナー検証項目

全項目、確認バージョンは0.64.0。package.json、タイトルと倉庫左下のv0.64.0が一致する環境で確認する。実機SafariのOS・ブラウザー版と端末を結果に添える。自動検証で代替できない実機の合成・回転後の操作を確認するために必要。

| ID | 操作と期待結果 | オーナー判断・対応 |
| --- | --- | --- |
| OV-SAFARI-RECORD-01 | 実機Safariでタイトルのレコードを開き、縦→横→縦へ回転する。紙面が落下チップ演出より前面に表示され続ける。 | フィードバックあり：オーナーからCSSの重なり順は原因ではなかったと報告され、修正を戻すよう指示された。下記の撤回対応を実施。解消済みとは扱わない。 |
| OV-SAFARI-RECORD-02 | 回転後に全タブを切り替え、成績表を縦横へスクロールし、「タイトルへ戻る」を押す。操作が届き、末尾へ到達でき、閉じられる。 | 未回答。確認済み・保留とは扱わない。 |
| OV-SAFARI-RECORD-03 | レコードを閉じてタイトルへ戻り、落下チップ演出を見る。正常に描画・移動を続ける。 | 未回答。確認済み・保留とは扱わない。 |

オーナー判断を得るまで終了草案の提示・引継ぎ書更新・終了コミットは行わない。

## 実機確認用のリモート配信

オーナーから、実機Safariで確認するためリモートへ公開する指示を受けた。実装途中の保存コミットを開発ブランチへpushし、既存deploy.ymlを同ブランチ指定のworkflow_dispatchで実行する。これは実機確認用の配信であり、実装の終了承認・レビュー・masterへのマージを行った扱いにはしない。バージョンは0.64.0を維持し、引継ぎ書も変更しない。

共通側はmaster、HEADとremote masterがe4974f86606374fb81dae4e57644f051085c2c45で一致し、src/libの未コミット・未追跡変更がないことを確認した。配信先は既存のGitHub Pages（https://t-i-oak.github.io/CanWeBecomeHeroes/）。配信結果と公開画面の確認結果は実行後に追記する。

配信コミットはecd248ee6f785b0fed8f90e01d2d0ef3b4e635b2（実装途中の保存）。開発ブランチのローカルとremoteが同じIDであることを確認した。2026-10-24 13:00 JSTに同ブランチから手動実行したDeploy to GitHub Pages #37はSuccess（1分25秒）。実行URL：https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/40060612404 。その後、公開URLを直接開いてタイトルのv0.64.0、成績表からレコード表示、アチーブメントタブ切替、タイトル復帰をEdgeで確認した。画面の記録はtmp_deployment/v0.64.0-public.png。実機SafariのOV-SAFARI-RECORD-01〜03は引き続き未回答であり、配信成功と解消確認は区別する。
