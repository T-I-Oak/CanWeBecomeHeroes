# Safariの画面回転時のレコード表示：実装報告

## 他画面への影響確認と修正範囲の合意

オーナーはゲーム中のログ履歴・情報ウィンドウでは再現しないと報告した。canvasのサイズ更新と内部スクロールの併存だけでは発生条件を説明できず、レコード固有の親子構造・重なりの単位も関係する可能性がある。非再現は報告された操作範囲の結果であり、全条件での非発生を保証するものではない。他画面で発生していないため、現時点ではレコード本体の修正範囲に留める方針をオーナーと合意した。設定・チュートリアルを含めた他画面へ予防的なtransform指定は追加しない。

公開WebKit #261302（https://bugs.webkit.org/show_bug.cgi?id=261302 ）はスクロール内の描画順の不具合で修正済み。#216701（https://bugs.webkit.org/show_bug.cgi?id=216701 ）はスクロール要素のstacking contextによる合成方法の違いの説明が参考になる。#217154は負のz-indexが重要な条件であり、今回と同一とは断定できない。#199258は現在RESOLVED WORKSFORMEで、修正を特定して終了したものではない。下記の過去記述の「いずれも修正済み」はこの区別に訂正する。今回の詳細な発生条件とWebKit内部の原因は未確定のままとする。


## 検証用の公開入口の撤去

必要な実機確認3項目の回答が揃ったため、v0.64.4でタイトルの検証リンク・文言・スタイルとViteの追加HTMLエントリーを撤去した。TitleMenu.js・screens.css・ui.json・vite.config.jsは今回の計画開始時点と差分がない。RecordScreenViewportのtranslateZ(0)はv0.64.3から変更せず残し、canvas更新・スクロール・本文拡縮の動作も維持する。比較ページのソースは開発用に残し、本番ビルドには含めない。不要になった比較ページへの本番テスト導線を外し、通常の回転テストと、検証リンク・HTML成果物の非残存を確認するテストを残した。確認を終えたSafari項目をバックログ先頭から外した。

最終の対象テストはnode --test tests/implementation/app/RecordScreenScale.test.js tests/implementation/app/RecordScreenData.test.js tests/implementation/app/SettingsModalController.test.js tests/spec/06.run_records.test.jsで11件成功、終了コード0。npm.cmd testは662件成功、失敗・skip・cancel 0、終了コード0。node scripts/verify-browser-tests.jsはtmp_browser_verification/2026-10-24T06-04-21-502Z/に保存した。2026-10-24 JSTの1回目15:04:24.759〜15:04:51.697、2回目15:04:59.564〜15:05:27.506。両回4件成功、失敗・skip・flaky 0、exitCode: 0、timedOut: false、interrupted: false、observationError: null、remaining: []、listeners: []、passed: true。検証コマンドも終了コード0。本番ビルドは検証内のnpm run buildで2回成功し、検証用HTMLがdistに残らないことも確認した。単一エントリーへ戻したため以前の約507kBのbundle警告は再び出るが、今回の修正による容量増加とは扱わない。git diff --checkは成功。

実機確認の対象は公開中のv0.64.3。v0.64.4は検証用入口の撤去であり、確認済みの描画修正は変更していない。v0.64.4は未コミット・未配信の状態で引継ぎ草案を提示する。草案承認後に通常の終了コミットを行う。公開版はv0.64.3のままであり、v0.64.4の公開済みとは報告しない。

## v0.64.3のオーナー確認

オーナーから「Eで改善しています」と回答があった。検証ページEでの回転後の表示改善をOV-SAFARI-RECORD-01の確認結果として記録する。内部スクロール・タブ切替・閉じる操作（OV-SAFARI-RECORD-02）と、閉じた後の落下チップ演出（OV-SAFARI-RECORD-03）は回答を得ていないため、表示改善の回答から操作・演出の確認まで推測しない。これらの確認後に検証用入口を撤去し、通常の成績表の修正を残す。

続いてオーナーから「それは問題ありません」と回答があり、OV-SAFARI-RECORD-02の回転後の操作とOV-SAFARI-RECORD-03のタイトル演出も問題ないことを確認した。必要な3項目の実機確認結果が揃った。実機報告と比較で確認できた条件は、Safariでレコードを開いたまま横→縦へ戻し、canvasの描画寸法更新と表の内部スクロールが有効な状態。Bでも発生しC・Dで消失するため、本文のscaleは必要条件ではない。Eの外側transformで改善することから合成レイヤーの更新・前後関係の不整合が有力だが、WebKit内部の原因や全ての必要十分条件を特定したわけではない。OS・Safariの版、特定端末への限定、縦→横だけでの発生、ブラウザーUI変化やウィンドウリサイズでも起こるかは未確認。

## 実機比較を受けたv0.64.3の修正候補

オーナーからBでは改善せず、C・Dでは問題がなくなったと回答があった。C・Dの「改善」は完全解消を指すとの補足を得た。これは各検証条件での結果であり、通常の機能を維持した修正の確認済みとは扱わない。

RecordScreenViewportへtranslateZ(0)を指定する候補を実装した。画像で紙・操作部と表の前後関係が分かれたこと、canvas描画サイズ更新かスクロールのどちらかを外すと問題が消えることから、レコード全体の外側を合成対象とする方法を試す。z-indexの数値やタイトル全体のisolationは変更しない。canvasのResizeObserver・描画サイズ更新・演出、表のoverflow: auto、本文の縮小を維持する。identity変換であるため拡縮座標は増やさず、body直下の情報ウィンドウも従来の座標系を使う。

検証ページへEを追加し初期選択とした。A〜Dでは検証ページ内だけ外側のtransformをnoneに戻し、以前の条件を保つ。通常ゲームはEと同じ候補を使う。比較記録にも外側のtransformを含める。Eの自動検証には内部スクロールと関連情報ウィンドウの画面内配置・破棄を追加した。

WebKitの類似報告 https://bugs.webkit.org/show_bug.cgi?id=199258 と https://bugs.webkit.org/show_bug.cgi?id=217154 はいずれも過去の問題で、修正済みとされている。今回と同じエンジン不具合だと断定せず、外側の合成を促す候補を考える参考に留める。追加レイヤーの実機性能・メモリーは未測定であり、候補を無条件に採用済みとしない。

v0.64.3のnpm.cmd testは662件成功、失敗・skip・cancel 0、終了コード0。本番ビルドはブラウザー検証内のnpm run buildで2回成功した。node scripts/verify-browser-tests.jsの結果はtmp_browser_verification/2026-10-24T05-48-51-023Z/。2026-10-24 JSTの1回目14:48:54.686〜14:49:24.898、2回目14:49:31.672〜14:50:02.580。両回4件成功、失敗・skip・flaky 0、exitCode: 0、timedOut: false、interrupted: false、observationError: null、remaining: []、listeners: []、passed: true。検証コマンドも終了コード0。URLへのバージョン番号付加・キャッシュ動作の変更は含まない。

公開コミットa82cd025df5d89e842ea0e83bcc1e4d46682826cを開発ブランチへpushし、remoteと一致することを確認した。Deploy to GitHub Pages #40（https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/40067939520 ）はSuccess 1分15秒、Pages反映 #40（https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/40068013687 ）は成功52秒。公開タイトルのv0.64.3と、同じ画面の「Safari回転検証」からEが初期選択された比較ページ・サンプル表10行を開けることをEdgeで確認した。画面記録はtmp_deployment/v0.64.3-record-group.png。実機SafariでのE・通常成績表の結果は未回答。

## 実機の比較結果

v0.64.2の比較ページについて、オーナーから「CとDは改善しました」、続いて「Bは改善しません」「C/Dは問題がなくなりました」と回答があった。Cは初回以降のcanvas描画サイズ更新を停止する条件、Dは表の内部スクロール領域のoverflowをvisibleへ変える条件であり、両条件で問題が消失した。B（本文の拡縮なし）では不具合が残る。A（通常）は比較基準だが個別の結果は明示されておらず、回答を推測で補わない。OV-SAFARI-RECORD-01に対する調査フィードバックとして記録し、通常機能を維持した製品修正の確認済みにはしない。

次の調査対象は、canvasのbacking store更新と内部スクロール領域の合成の組合せ。両条件はそれぞれ別の動作を外しているため、この結果だけで単一の原因と断定しない。canvasの画面追従・本文の可読性・縦横スクロールを維持する修正が必要であり、CまたはDの条件をそのまま通常実装に適用していない。

## 公開確認で判明したラベル取得エラー（原因未確定）

v0.64.2のソース配信（Deploy to GitHub Pages #39、https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/40065695402 、Success 1分24秒）とPages反映（https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/40065782947 、Success 1分33秒）を確認した。その後、以前の版を開いたEdgeタブを再読み込みすると、タイトルが表示されず、RangeError: Unknown localized label: recordRotationDiagnosticsが発生した。確認できたのはラベル未取得のエラーであり、取得したJSONの本文・応答ヘッダー・配信元との照合は未実施だった。キャッシュが原因と断定した説明は撤回する。

バージョン番号をURLパラメーターへ付ける案は、オーナーの禁止指示により撤回した。関連する実装・テスト・仕様追記も取り除き、別のキャッシュ回避策や文言の同梱へ置き換えていない。この案はコミット・push・配信していない。未公開の0.64.3への設定変更も取り消し、設定・公開版とも0.64.2を維持した。

再調査では、パラメーターなしの公開ui.jsonをHTTPで取得し、200・application/json、recordRotationDiagnosticsの日英文言が存在することを確認した。log.jsonには同名キーがなく、組立時の同名上書きは見つからなかった。同じEdgeでもui.jsonを直接開き、ラベルの存在を確認した。その後、コード・配信を一切変えず通常ページを再読込するとv0.64.2のタイトルと「Safari回転検証」が表示され、リンクから専用ページへ移動してA〜Dの選択肢・表10行が表示されることを確認できた。画面記録はtmp_deployment/v0.64.2-title-entry.png。現在の公開版のラベル取得から描画までの処理は動作している。以前の失敗時の応答本文を保存していなかったため、キャッシュ・配信反映の過程など、当時ラベルが欠落した理由を遡って確定できない。現在再現していない現象に対する追加の回避策は入れない。実機では普段のゲームを再読込し、左下v0.64.2を確認してタイトルの入口から比較ページへ進む。

## 実機から検証ページへ進む入口

チャットのURLをクリックしても実機側で開けるわけではないとの指摘を受け、v0.64.2で通常ゲームのタイトルに「Safari回転検証」へのリンクを追加した。実機でいつものゲームを再読込し、同じ画面から専用ページへ進める。日英の文言と配信ベースパスを反映し、解放済みモードの有無にかかわらず表示する。ゲームの状態を変更するボタンではなく、専用ページへ通常遷移するリンクである。レコード閲覧中は既存メニューと一緒に隠れる。調査完了時に検証入口とともに撤去する。以前の「ゲーム本体のクラスは変更していない」という記述はv0.64.1時点の内容であり、この版ではTitleMenuのリンクとスタイル・ラベルを追加した。

本番ブラウザーテストも、専用ページへの直アクセスから、通常タイトルのリンクをクリックして移動する確認へ変更した。比較条件の内容はv0.64.1から変更していない。

初回の全テストは、既存のTitleMenuテスト用DOMがappendを提供していなかったため1件失敗した。テスト用DOMに実際のDOM APIに対応するappendを補い、対象のSettingsModalController・TranslationIntegrity計5件成功、全テスト662件成功へ再検証した。ブラウザー上の実際のリンク遷移は成功している。検証補助は変更していない。

v0.64.2のnode scripts/verify-browser-tests.jsはtmp_browser_verification/2026-10-24T05-13-15-775Z/に結果を保存した。2026-10-24 JSTで1回目14:13:19.858〜14:14:07.684、2回目14:14:17.770〜14:15:10.184。両回4件成功、失敗・skip・flaky 0、終了コード0、上限到達・中断・照会エラーなし、remaining: []、listeners: []。総合passed: true、検証コマンドも終了コード0。本番ビルドは両回の検証内のnpm run buildで成功した。

## 実機用の比較ページ

オーナー提供画像では、紙面と上部操作部の前に落下チップがあり、表の見出し帯・罫線はチップより前にある。ウィンドウ全体が同じ順序で背面へ移る状態と断定できない。本文だけのtransform: scale、canvasリサイズ、overflowの組合せを別々に比較するため、一度の公開で条件を切り替えられる検証ページの作成・配信が承認された。

v0.64.1のtests/manual/record-rotation.htmlに本番TitleMenu・RecordScreen・TitleChipRain・CSSを使う専用入口を作った。Aは撤回後の通常実装、Bは本文のtransformを除去して占有寸法を等倍に整合、Cは初回以降のcanvas backing store更新を抑止、Dは表のスクロール領域のoverflowだけvisibleとする。これらの変更は検証ページ内に閉じ、ゲーム本体のクラスは変更していない。Viteの複数HTMLエントリーで専用ページも公開ビルドへ含める。通常ゲームに診断UIを追加せず、調査後に追加入口を撤去する。

各条件はGETフォームによる再読込で開始し、前条件の合成状態を引き継がない。同一seedの落下演出とサンプルランキング10件を使い、DataManagerを作らずゲーム保存キーを読取・変更しない。診断専用sessionStorageに最大100件の寸法・条件・判定を保存し、同じタブ内の各条件の結果をまとめる。自動送信しない。回転中の記録はDOMを更新しない。パネルを開く前のスクリーンショットと、条件ごとの異常有無を比較する。Aで再現しない場合は専用ページの結果から原因を判断しない。

自動テストでは本番preview上で全条件の選択・再読込・縦横往復、設定されたtransform・overflow・canvas描画寸法、判定ログ、ゲーム保存キーが不変であることを確認する。実機Safariの描画異常の解消を確認したものではない。最新のnpm.cmd testは662件成功、終了コード0。公開ビルドは成功し、追加エントリーによる共通チャンク分割後は500kBの警告は出なかった。

最新のブラウザー検証はnode scripts/verify-browser-tests.jsをREADMEどおりサンドボックス外で実行し、tmp_browser_verification/2026-10-24T04-52-09-659Z/に保存した。2026-10-24 JSTの1回目13:52:13.325〜13:52:46.066、2回目13:52:54.700〜13:53:32.276。両回4件成功、失敗・skip・flaky 0、exitCode: 0、timedOut: false、interrupted: false、observationError: null、remaining: []、listeners: []、passed: true。検証コマンド自体も終了コード0で正常終了した。

公開コミットはc17c2ae4b4b3d9883b4e45c1769330ce99c54859。共通部の公開状態を再確認したうえで開発ブランチへpushし、同ブランチを指定してDeploy to GitHub Pages #38を手動実行した。https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/40064401237 はSuccess、1分25秒。続くPages側の反映処理 https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/40064480659 の開始を確認し、公開URL https://t-i-oak.github.io/CanWeBecomeHeroes/tests/manual/record-rotation.html でv0.64.1・サンプル表10行・A〜Dの選択肢が表示されることを確認した。Edgeでの読込みエラーは0件、表示記録はtmp_deployment/v0.64.1-comparison.png。A〜Dの実機Safariでの異常有無はオーナーの確認待ち。実装フェーズの終了・レビュー・masterへのマージは行っていない。

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

再確認バージョンは0.64.3。package.json、タイトルと倉庫左下のv0.64.3が一致する環境で確認する。実機SafariのOS・ブラウザー版と端末を結果に添える。自動検証で代替できない実機の合成・回転後の操作を確認するために必要。v0.64.2のB・C・Dは上記の比較結果に記録し、現在の修正候補の確認済みとは扱わない。

| ID | 操作と期待結果 | オーナー判断・対応 |
| --- | --- | --- |
| OV-SAFARI-RECORD-01 | 実機Safariでタイトルのレコードを開き、縦→横→縦へ回転する。紙面が落下チップ演出より前面に表示され続ける。 | v0.64.3のEで表示改善を確認したとオーナー回答。以前のz-index・isolation候補は撤回済みであり、その候補への確認と混同しない。 |
| OV-SAFARI-RECORD-02 | 回転後に全タブを切り替え、成績表を縦横へスクロールし、「タイトルへ戻る」を押す。操作が届き、末尾へ到達でき、閉じられる。 | v0.64.3で問題なしとオーナー回答。 |
| OV-SAFARI-RECORD-03 | レコードを閉じてタイトルへ戻り、落下チップ演出を見る。正常に描画・移動を続ける。 | v0.64.3で問題なしとオーナー回答。 |

オーナー判断を得るまで終了草案の提示・引継ぎ書更新・終了コミットは行わない。

## 実機確認用のリモート配信

オーナーから、実機Safariで確認するためリモートへ公開する指示を受けた。実装途中の保存コミットを開発ブランチへpushし、既存deploy.ymlを同ブランチ指定のworkflow_dispatchで実行する。これは実機確認用の配信であり、実装の終了承認・レビュー・masterへのマージを行った扱いにはしない。バージョンは0.64.0を維持し、引継ぎ書も変更しない。

共通側はmaster、HEADとremote masterがe4974f86606374fb81dae4e57644f051085c2c45で一致し、src/libの未コミット・未追跡変更がないことを確認した。配信先は既存のGitHub Pages（https://t-i-oak.github.io/CanWeBecomeHeroes/）。配信結果と公開画面の確認結果は実行後に追記する。

配信コミットはecd248ee6f785b0fed8f90e01d2d0ef3b4e635b2（実装途中の保存）。開発ブランチのローカルとremoteが同じIDであることを確認した。2026-10-24 13:00 JSTに同ブランチから手動実行したDeploy to GitHub Pages #37はSuccess（1分25秒）。実行URL：https://github.com/T-I-Oak/CanWeBecomeHeroes/actions/runs/40060612404 。その後、公開URLを直接開いてタイトルのv0.64.0、成績表からレコード表示、アチーブメントタブ切替、タイトル復帰をEdgeで確認した。画面の記録はtmp_deployment/v0.64.0-public.png。実機SafariのOV-SAFARI-RECORD-01〜03は引き続き未回答であり、配信成功と解消確認は区別する。
