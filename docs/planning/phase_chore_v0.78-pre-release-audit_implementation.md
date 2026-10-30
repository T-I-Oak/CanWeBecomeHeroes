# v0.78 公開前総点検の実装報告

## 計画と実施範囲

[計画](phase_chore_v0.78-pre-release-audit_plan.md)に従い、共通ルールと固有規定、既存仕様・実装・検証資産を点検した。
package.json/package-lock.jsonを `0.77.1 → 0.78.0` へ更新し、点検成果物を作成した。オーナーの修正指示後にAUD-078-01/03〜09と追加承認の10を是正し、対応するソース・文言・仕様・テストも変更した。HUD縮小・アセット・公開設定・共通リポジトリは変更していない。
基準ゲームHEADは `f5eacdca286d065a3a06c2b5df120f88470768ad`、計画基準masterは `76ee014`。
参照した共通HEADは `e4974f86606374fb81dae4e57644f051085c2c45`、masterで作業ツリーに変更なし。正式なコミット済みルールとして扱い、未コミット規定を取り込んでいない。

## 点検成果物

- [全104項目の点検表](phase_chore_v0.78-pre-release-audit_checklist.md): 元チェック項目・親/下位項目の全文・判定・根拠・不足事項。
- [指摘と残る確認](phase_chore_v0.78-pre-release-audit_findings.md): AUD-078-01〜10、重要度、公開への影響、対応、未確認事項。
- 本報告: 要求・テスト対応、実行条件と結果、点検の限界、オーナー判断の記録。

修正後の判定は適合62件、適用外23件、未確認19件（計104件）。初回の要対応20行は親項目を含み、独立した指摘9件に対応した。追加点検でAUD-078-10を抽出し、明示指示後に是正した。設計原理の親項目は既知の不適合を直しただけで全面的適合とせず、下位の精読不足を踏まえ未確認へ再分類した。
全項目へ分類を付けたが、未確認を解消済みとはしていない。自動テスト成功だけで全面的準拠・公開可と判定しない。

## 共通・固有規定の点検範囲

| 規定 | 照合先・結果 |
| --- | --- |
| 共通01理念 | 意味・統一・デグレード防止を、全テストと責務分割、重複・文書不整合の指摘へ対応付けた |
| 共通02文書 | Markdown行数・分割・命名・相対リンクを走査。番号と古い寸法をAUD-078-05/06へ記録 |
| 共通03 workflow/phase | 本チャットでフェーズ宣言後に停止し、ok後に着手。修正範囲・文言・検証判断を別に記録。計画・引継ぎ・Git履歴を照合。過去チャット承認は未確認 |
| 共通04構成 | assets/data/index、ignore/追跡、テストの責務配置、公開JSONと素材を確認 |
| 共通05コード | 全追跡コードの規模・import参照と主要app/game/chipsの責務を点検。起動復帰・重複等を指摘。全ガードの個別精読は未確認 |
| 共通06 CSS | important/inline、動的計算例外、クラス用途、固有UI規約03と照合。ゲーム所有の状態接頭辞を統一。共通側DOM契約は変更しない |
| 共通07モバイル | viewport/dvh/内部scroll/input/safe area/scale、既存回転検証と小画面HUD実寸を確認。Safari実機は未確認 |
| 共通08〜11 lifecycle/setup/preparation/release | 現在はv0未公開・予告準備の状態。公開指示とv1指示、実デプロイ確認など実操作時の残件を整理 |
| 共通90とlibrary文書 | env/fetch/dataManager/i18n/tutorial_managerの責務を主要呼出側と照合。相対importとCIの隣接リンク・bundleを確認 |
| 固有branch_workflow | 共通部参照専用、文言事前合意、バージョンquery禁止、旧保存移行禁止を照合。旧フラグ引継ぎをAUD-078-03として抽出 |
| 固有architecture/仕様03/06/16/17/21等 | UI・保存・言語・scale・共有の責務を照合し、文言配置・保存通知・明示focusを是正。新しいエラー表示の仕様は21へ分割 |

URLへのバージョンquery追加なし。ハッシュ付き画像ファイル名は仕様24による生成物であり、禁止されたバージョンURLパラメーターとは別である。
読み込み異常をキャッシュと推測せず、追加調査では実リクエストの503と例外・DOM結果を照合した。

## 要求・仕様・実装・テストの主要対応

| 要求 | 仕様・実装の確認点 | 対応する既存自動検証と限界 |
| --- | --- | --- |
| 01 ゲーム設定 | RunScenario/StartPartySelection/GameClock/GuildTime/TrialRunResult、開始2名・期限・pt・モード | spec01、RunScenario/StartPartySelection/TrialRunResult、browser01の開始→課題→勝利/期限切れ→記録→再開始。数値全組合せや面白さの評価は含まない |
| 02 Hero/Item操作 | entity_model/ランタイム、HeroItemInteractionController/ItemPickupController/施設System/ChipBoard | spec02、DragControls/ShoppingBag/施設/物理テスト、tutorialの合成タッチ。実機指入力は別途 |
| 03 固有スキル | UniqueSkillSystem/EffectSystem、Combat各hook・状態解除、仕様09 | spec03全15種と各実装テスト、owner_verificationテスト。Canvasの実画質や乱数分布全体の保証ではない |
| 04 戦闘 | BattleSystem/CombatActionResolution/Damage/Attribute/Encounter/Stage | spec04とCombat各テスト。ブラウザー勝利はテストで敵撃破境界を操作し、戦闘数式はNode側で確認する構成 |
| 05 情報 | Manager/Tree/Layer/EntityRegistry、仕様02/05/06 | spec05、InformationWindow/EntityDetailLayout/StatusLocalization。全表示と実機タップを網羅しない |
| 06 記録 | GameStatistics/Collector/Achievements/Repository/RunRankings/RecordScreen、仕様14〜21 | spec06、StatisticsHooks/TrialStatisticsSession/ResultAchievementSelection/RunRecords、production回転。旧フラグの引継ぎを削除し、保存失敗の通知/再試行を追加 |

要求番号01〜06とspec番号、テストREADMEの対応表は一致。specのファイル名は共通の例示prefix形式そのものではないが、要求と厳密に番号対応している。
implementationはapp/chips/game/simulationに対応し、scriptsの検証補助と結合テストの例外はtests/READMEに説明がある。
要求・仕様の全文章、全表の値、全ゲーム状態の組合せを個別に証明したものではない。

## 機械走査と静的確認

- `rg --files`、`git ls-files`、一時スクリプト `node tmp_audit_scan.mjs` で配置・行数・相対リンク/import候補を走査。
- 点検成果物追加前の追跡1494ファイル、Markdown38件、JS/MJS/CSS/HTML404件。コード500行超0件、文書300行超0件（最大はUI規約300行）。
- Markdownの存在しない相対リンク候補1件は、要求04のコード表記 `difficulties[種別](level)` を正規表現がリンクと誤認したもの。実リンク切れとは判定しない。
- import不存在候補18件はPerformanceBuild/StartupLoadingBuildとそのテスト内の生成ソース・置換用文字列。実行時importではなく、生成先を前提とする。該当スクリプトの既存テストも成功。
- srcの他JSから未参照候補はmain.jsのみで、index.htmlのmodule入口から参照される。ファイル単位の孤立は検出なし。未使用export/メソッド、動的参照、アセット全件の未使用性の証明はしていない。
- アセットの存在・PNG実寸・制作元/配信用ハッシュ・段階画像・敵safe-circleは既存画像テストが成功。制作元はassets、公開配信用はpublic/assetsという仕様24の区分を確認。
- `rg` でimportant、style属性、状態クラス、保存/通信、共通import、拡縮・viewport・safe areaを確認。SVGのfont-style属性はHTML style属性と区別。
- `git check-ignore local_audit.tmp dev_audit.tmp tmp_audit.tmp docs/planning/phase_audit.md` は前3件のみ出力。phase_はignoreされない。
- `git diff --check` は成功。ゲーム内の通常表示は設定からAPP_VERSIONを取得し、タイトル/倉庫の一致は既存ブラウザー/単体テストで確認。

## 全テスト・本番ビルド

| コマンド | 結果 | 補足 |
| --- | --- | --- |
| `npm.cmd version 0.78.0 --no-git-tag-version` | 成功 | packageとlockの版更新のみ。タグ・コミットは作成しない |
| `npm.cmd test` | 終了コード0、711/711成功、fail/cancel/skip/todoは0 | 約9.88秒。出力はtmp_audit_test.log。対象ロジック変更なしのため対象テストは全体に包含 |
| `npm.cmd run build` | 終了コード0、218 modules | Vite7.3.6、index JS449.54kB/gzip133.75kB、CSS57.96kB、image-levels70.66kB。chunk size警告なし |
| `node scripts/verify-browser-tests.js` | 終了コード0、5件×2回とも成功 | 以下に詳細。実行補助は変更していないため補助変更時用のtimeout強制試験は対象外 |

報告書作成後にも `npm.cmd test` を再実行し711/711成功（約13.32秒、tmp_audit_final_test.log）、`npm.cmd run build` も終了コード0で再確認した。出力bundleのハッシュと寸法は同じ。

## 規定ブラウザー検証の詳細

Windowsで標準の検証スクリプト全体をサンドボックス外で実行。channel未指定のPlaywright Chromium、専用Vite4174・production preview4175。
テスト設定は1 worker、基本1280×900、reducedMotion reduce。productionテストは390×844/844×390、768×1024/1024×768も使用する。
証拠ディレクトリは `tmp_browser_verification/2026-10-30T12-59-44-690Z/`。

| 回 | 開始〜終了（UTC、2026-10-30） | 件数/成否 | 終了/上限/中断 | 解放確認 |
| --- | --- | --- | --- | --- |
| 1 | 12:59:49.788〜13:00:52.132 | expected5、unexpected/skip/flaky0 | exit0、timeout false、interrupted false | remaining[]、listeners[]、照会失敗なし |
| 2 | 13:01:03.758〜13:02:06.734 | expected5、unexpected/skip/flaky0 | exit0、timeout false、interrupted false | remaining[]、listeners[]、照会失敗なし |

日本時間では1回目21:59:49〜22:00:52、2回目22:01:03〜22:02:06。summaryと各run JSONを読み戻し、errors[]・observationError null・observationFailure null・passed trueを確認した。
両回ともcleanupを要する残存はなく、afterCleanupはnull。TIME_WAITを待受と取り違えていない。
起動中のECONNREFUSEDはサーバー待機のログで、起動後のHTTP200と全件成功を確認した。

開発用ブラウザーからpublic内JSONをmodule importする既存instrumentationに、Viteが「Assets in public directory cannot be imported from JavaScript」を出力する。テストは成功し、本番smokeでのHTTP/console/pageerror検査も成功しているため、本番読込障害とは扱わない。
NO_COLOR/FORCE_COLOR警告は表示設定の警告。今回コードを変えて抑制していない。

## 追加対象調査

`npm.cmd run test:browser -- --config tmp_audit_extra.config.js --reporter=line` を一時的な本番preview4176で実行した。
一時資産は `tmp_` 配下相当のignore対象とし、恒久テストへ追加していない。

- 初回: 1成功・1失敗、終了コード1。起動失敗画面の本文を空文字と予想したが、静的な歯車が残り実際は `⚙` だった。これは一時調査の期待値誤りで、既存ゲームテストの失敗ではない。HUD測定の初回はチュートリアル表示中だったため、最終根拠には使わない。
- 再実行: 初回の実測を踏まえ、503例外・本文歯車・開始コマンド0件を確認し、HUDは現形式の既読tutorialStateを入れて課題選択後に可視状態で測定。2/2成功、終了コード0。ゲームコードや既存テストを変更していない。
- 失敗の実測とスクリーンショットはAUD-078-01、HUD倍率・実寸と目視はAUD-078-02に記録。
- Nodeで実RunRecordsRepositoryへ旧heroProgressを渡す調査は `legacyClear:true, clearCount:0` を出力し、AUD-078-03を確認。
- 一時previewの終了はPlaywrightに任せ、終了後に4174/4175/4176の待受を再照会し `[]` を確認。通常環境のCIM照会はアクセスエラーだったため、サンドボックス外で再照会し終了コード0を確認した。規定4174/4175の2回検証の子孫PID追跡とは区別し、一時previewでは全子孫PIDの独立追跡まではしていない。

## 公開準備の確認と限界

ローカルproject_infoは日英タイトル/説明/tags、PNGロゴ、thumbnail、pending/COMING SOON/11月予定、正しい公開URL。update_historyは[]。
共通側の `public/data/project_list.json` にCanWeBecomeHeroesの登録あり。公開一覧への登録は読み取りのみ確認し、共通側は編集していない。
deploy.ymlはgame→共通master checkout→隣接link→Node22→npm ci→全テスト→Chromium準備→browser→build→gh-pages転送の順。失敗時に続行する指定なし。
CIのpush先はmaster、公開先baseは `/CanWeBecomeHeroes/`。pendingはポータルボタンを無効にするもので、URL直アクセスを制限するものではない。
Webツールで公開JSON3件を開こうとしたが全て取得不可だった。公開先の現在のJSON/素材・ポータル画面・デプロイ結果は未確認で、ローカル成功を公開成功に置き換えていない。
初回公開のv1指示・公開指示、公開バッジの日付と強調期間、公開URL実動作は実操作時に確認する。

## オーナー判断と残る作業

本チャットで実装開始へのokを受領。指摘の一覧を提示後、02は修正不要、他の修正指示を受領し計画へ反映した。
01は専用JSON案を採用せず、オーナーの単純化・非i18n・起動時だけの広い受け皿という指示と、固定英文の承認後に実装した。09は提示した日英文言・画面下部の通知案を承認後に実装した。
追加の10は4件の明示focus削除を個別に提案し、「今回削除する」の回答後に変更した。

| 検証ID | 理由・操作・期待結果・確認版 | オーナー判断 |
| --- | --- | --- |
| OV-LIGHTNING-06 | 既存の雷龍Chip画像確認 | 本チャットのokを確認済みとしてbacklogから削除 |
| OV-AUD-078-01 | 新しい起動案内。0.78.0の障害注入画像で英文とRetryの配置を確認。障害解除後のRetryでタイトルへ復帰し、通常タイトル/倉庫の版表示は設定と一致すること | 項目確認済み。画像と自動結果による判断を実機Safari確認と混同しない |
| OV-AUD-078-09 | 新しい未保存通知。0.78.0の画像で画面下部の通知と設定の閉じるボタンが重ならないことを確認。課題選択/終了時の保存失敗だけで表示、成功で解除。通常タイトル/倉庫の版表示は設定と一致すること | 表示タイミングの質問へ説明後、項目確認済みを受領 |

既存保留はOV-CLOTH-07/OV-WATER-03/OV-REPUTATION-07の3件を維持。新たな保留項目は追加していない。
実機Safari・現在の公開先・過去チャット・全ガード等の証拠不足は、指摘一覧UC-078-01〜04とチェック表の未確認として残す。今回の画面確認済みをそれらの確認へ転用しない。
引継ぎ書は終了草案承認後にだけ更新する。今回の指摘への対応を、レビュー担当による評価やゲーム公開の許可へ読み替えない。

## 是正後の最終検証

主な変更は、index/main/GameAppの起動境界、RunRecordsSaveController/RecordSaveNoticeと通知CSS、旧フラグ削除、状態クラス統一、UIElement共通化、共有文言のリソース化、文書名・準備幅の説明・明示focus4件の是正。
01の画面と09の通知は[環境エラー仕様](../specifications/21.environment_errors.md)を参照する。確認後に表示や動作を変えていない。
同じ実装フェーズ内の修正範囲合意であり、終了草案の差し戻しではないため、予定版0.78.0を維持した。

| コマンド・対象 | 結果 |
| --- | --- |
| RunRecords/共有/TranslationIntegrity/TimeSettings/spec05/StatusLocalizationの対象テスト | 30/30成功 |
| StartupRecovery/RunRecordsSaveController/StartupLoading/PerformanceBuildの対象テスト | 13/13成功。記録保存制御はテスト先行で未実装moduleの失敗を確認し、実装後に成功 |
| `npm.cmd test`（最終、tmp_audit_final_fixed_test.log） | 終了コード0、715/715成功、fail/skip/cancel/todo0、約11.98秒 |
| `npm.cmd run build` と最終browser内の同コマンド | 終了コード0、221 modules。JS449.84kB/gzip133.82kB、CSS59.47kB/gzip12.62kB、image-levels70.66kB。警告上限未満 |
| `node scripts/verify-browser-tests.js`（最終、tmp_audit_final_browser.log） | 終了コード0、5件×2回成功。追加の障害注入はproductionテスト内の独立contextで実行し、恒久テスト件数は5件を維持 |

focus削除前にも同じbrowserコマンドが5件×2回成功。証拠はtmp_browser_verification/2026-10-30T13-32-31-813Z/。
最終版の証拠は `tmp_browser_verification/2026-10-30T13-37-13-912Z/`。

| 回 | 開始〜終了（UTC、2026-10-30） | 結果・後処理 |
| --- | --- | --- |
| 1 | 13:37:18.179〜13:38:12.187 | exit0、5成功、unexpected/skip/flaky0、timeout/interrupted false、errors[]、remaining[]、listeners[] |
| 2 | 13:38:21.564〜13:39:19.578 | exit0、5成功、unexpected/skip/flaky0、timeout/interrupted false、errors[]、remaining[]、listeners[] |

日本時間では22:37:18〜22:38:12、22:38:21〜22:39:19。summaryと各run JSONを読み戻し、passed true、照会失敗なし、afterCleanup nullを確認した。残存がないので強制後処理は不要。
障害試験はJSON/ロゴ/JS/CSSの503、起動時SecurityError、記録保存Quota、再失敗、日英切替、通知とmodalの縦横非重複、再試行後の保存値と通知解除を含む。
スクリーンショットtmp_audit_startup_*.png/tmp_audit_save_*.pngを目視した。CSS取得失敗時は標準HTML表示が残りRetryで復帰する。
最終走査は1505ファイル、Markdown42件、JS/MJS/CSS/HTML411件。500行超コード/300行超文書は0、JSファイル孤立候補はHTML入口のmainだけ。正規表現リンク候補のlevelはコード表記による誤検出で、実リンクは別途確認する。
