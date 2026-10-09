# 実装報告: v0.40 定期見直し

## 対象と方針

- ブランチ: `review/v0.40-periodic`。バージョン: `0.40.2`。
- 計画書の開発ルール、文書、テスト、ソース、バックログを点検した。
- GameWorksOAKの共通文書は参照のみ。新規機能、ゲームバランス、既存のゲーム内バグの修正は行っていない。オーナー指示によるCIビルド不具合の修正を追加した。

## 開発ルール

- 共通の01〜07、90、99とプロジェクトのブランチ作業フローを参照した。
- 実装フェーズのバージョン更新、10回ごとの定期見直し、phase成果物の保存・承認・コミットはプロジェクト規定を適用した。
- ブランチ作業フローの旧版0.34に関する経過記述を整理した。
- オーナーの運用変更指示に基づき、マージ・フェーズにorigin/masterへのpushを含めた。追加承認不要、共通ライブラリの状態確認、ローカル・リモートのコミットID照合、push失敗時の未完了報告を明記した。実装フェーズではマージ・pushを実行していない。
- 共通規定との差は、このリポジトリの実験適用として作業フローに明記した。該当する範囲はローカル規定を優先し、それ以外は共通規定を参照する。共通workflowの未コミット差分は正式な共通規定として扱わない。
- 定期見直しの範囲をローカル規定に定義し、計画書の共通定期見直し節への参照を修正した。
- バックログ末尾へ、共通ルールへの正式採用をオーナーが判定し、採用時にはこちらの規定も改正して二重管理を解消する項目を追加した。共通側の復元・変更は行っていない。

## 共通リポジトリの公開状態確認

- 共通90.common_library.mdには、GameWorksOAKのHEADがmasterでない状態でのゲームpush禁止と、GameWorksOAK担当者による公開状態確認が定められている。
- ゲーム側手順に、マージ前・push直前のstatus、ブランチ、HEADと実リモートmasterの照合、src/libの未コミット・未追跡変更確認を追加。古いorigin/masterの表示だけでは判定しない。
- コマンド失敗を未確認とし、担当者の確認が未取得なら依頼する。共通側の状態をゲーム担当が変更して解消しない。共通ライブラリが検証時から変わった場合は再テスト・再ビルドする。
- 今回の確認: master、HEADとGitHubのmasterはともに `c9b153a8ad5f2422f5cc9f27a0a939e5590b9df0`。src/libの未コミット・未追跡変更なし。docs/common/03.workflow_guide.mdに未コミット変更あり。共通側は変更していない。
- GitHub照会はサンドボックス内の接続失敗後、許可された再実行で成功した。上記は今回の観測結果であり、将来のpushの確認を代替しない。GameWorksOAK担当者による確認結果は今回取得していない。

## 文書とテストの整合性

- アプリケーション構成: 存在しないDemoScenarioの構成説明をRunScenarioによる本番の初期配置へ修正。Chipタップによる情報表示、固有スキルの参照先、TrialSessionの責務を更新。
- デモ仕様: 存在しないデモの起動・初期状態の説明を、現行の自動テスト・手動確認の参照へ置き換え。
- Hero・Item要件: 章番号を整理し、情報ウィンドウを05.information_window.mdへ分離。実装済みの多言語表示を将来扱いする記述を修正。
- 情報ウィンドウ: 閉じるボタン、子孫を閉じる操作、ピン止め、ピン止めしていないウィンドウだけを対象とする時間停止を現行実装へ合わせた。InformationWindowLayer、Manager、TreeとManagerのテストを照合。手動確認の閉じるボタン操作は現行実装と一致するため維持。
- チュートリアル: 410行の文書を責務・開始条件、導入と最終説明、エリア別会話の3文書へ分割。仮ID・未確定という記述を実装済みのシナリオ定義に合わせた。会話本文は維持。
- 要件01・02・04に対応するspecテストと、情報ウィンドウ・チュートリアル・固有スキルのimplementationテストを確認。実行した既存テストの期待値は変更していない。分割後の接続処理を直接検証するTrialSessionの結合テストを追加した。
- 文書リンクの存在を点検。検出されたcombatの `difficulties[種別](level)` はコード表記であり、リンクではない。
- docsのMarkdownはすべて300行以下。短い独立文書は水増ししない。

## ソース

- GameApp（539行）から試験ランの構築・更新・描画と専用ヘルパーをTrialSessionへ移動した。
- Gitの変更前ソースと比較し、startGame、startTrial、専用ヘルパーの関数本体が同一であることを確認した（startTrialのexport追加を除く）。
- 全srcのimport識別子・関数識別子を検索し、呼び出しのないPreparationPanelHitTestのgetPreparationInformationOrigin、isPreparationPanelPointを削除。
- UniqueSkillEffectSystemのUNIQUE_SKILL_TRIGGER、UniqueSkillLogのentityTextの未使用importを削除。
- src・scriptsのJS/MJS/CSSはすべて500行以下。未使用判定は検索による静的点検であり、汎用APIや動的呼び出しを推測で削除していない。

## バックログ

- オーナー検証70件を点検。各項目は画面操作・画像・文言・演出を対象にした1件の判断として維持し、回答がない項目を完了扱いにしていない。
- 先頭の既知バグ2件を維持し、シナリオ、記録と結果、公開、バランスの順を保持。見出し番号の欠番を解消し、会話設定資料の整理を加入時シナリオ実装の前へ移動。
- 実装済みの使い魔調整を未対応の箇条書きから除き、ログ履歴の情報ウィンドウに関する古い着手条件を更新。
- バランス調整の経過報告を現在の作業内容へ整理。
- 惑乱エフェクト残留と課題選択画像の粗さは既に要望・バグ指摘にあるため重複追加せず、今回の対象外とした。

## GitHub Actionsのビルド修正

- 提示ログは0.39.0のビルド。deploy.ymlはゲームだけをcheckoutし、相対import先である隣接GameWorksOAKを配置していなかった。ローカル成功は隣接リポジトリが存在するためであり、CIと配置が異なっていた。
- ゲームcheckoutはワークスペース直下の従来配置を維持し、T-I-Oak/GameWorksOAKのmasterをpath: .ci/GameWorksOAKへcheckoutするステップと、隣接位置../GameWorksOAKへのシンボリックリンクを追加。共通側の認証情報はpersist-credentials: falseとした。
- デプロイActionの公式ソースではGITHUB_WORKSPACEをGit操作の作業ディレクトリにするため、ゲームのGitルートを移動する案を取りやめた。run、npmキャッシュ、デプロイのfolder: distは従来のゲームルート配置を維持。
- tmp_ci_layout/CanWeBecomeHeroesへ作業ソースをコピーし、共通ライブラリ未配置でnpm.cmd run buildを実行。i18n.jsの相対import解決失敗を再現した（提示ログのdataManager.jsと同じ欠落原因）。
- GameWorksOAKのHEAD c9b153a8ad5f2422f5cc9f27a0a939e5590b9df0のsrc/libだけをgit archiveでtmp_ci_layout/GameWorksOAKへ配置し、同じコマンドを再実行。168モジュール変換で成功した。依存パッケージは既存node_modulesを利用した。
- GitHub Actions実機とLinux runnerでの成功は未確認。pushしていないためGitHubでの再実行はまだ行っていない。隣接参照の解決を隔離配置で確認し、最終的なcheckoutとリンク設定・デプロイの作業ルートは設定差分および公式ソースで確認した。Linuxのln実行そのものは未実施。
- 検証用tmp_ci_layoutは点検後に削除した。共通リポジトリは変更していない。
- 承認後の終了コミット2f32106は履歴に保持し、追加修正は未コミットとして再承認待ちとする。保存済み引継ぎ書のレビュー移行内容は、追加修正を反映した草案の承認後に更新する。

## 検証

| 区分 | コマンド | 結果 |
| --- | --- | --- |
| 対象テスト | `node --test tests/implementation/InformationWindowManager.test.js tests/implementation/UniqueSkillEffectSystem.test.js tests/implementation/Tutorial.test.js tests/spec/01.game_settings.test.js tests/spec/02.hero_item_interaction.test.js tests/spec/04.combat.test.js` | 74件合格、失敗0 |
| 全テスト | `npm.cmd test`（出力末尾をSelect-Objectで表示） | 447件合格、失敗0、skip0 |
| 本番ビルド | `npm.cmd run build` | 成功、168モジュール変換 |
| 差分検査 | `git diff --check` | 成功（空行の指摘を整理後） |

- 初回の全テストでも446件が合格した。変更後の全テスト・ビルドの結果を上表に記載した。
- Nodeのlocalstorage-fileに関する環境警告は対象テストで出たが、テスト失敗はない。
- public/data/update_history.jsonはv0運用の空配列を維持。package.jsonとpackage-lock.jsonを0.40.2へ更新。終了草案提示後の修正に着手したため、プロジェクト規定に従ってPatchを更新した。
- 実機操作・公開環境・新規の画面目視確認は実施していない。

## ソース分割後のテスト対応

| 責務 | ソース | 対応する検証 |
| --- | --- | --- |
| ランの構築、課題選択、入力対象、更新・描画の接続 | src/app/TrialSession.js | tests/implementation/app/TrialSession.test.js（追加） |
| パーティと開始配置 | StartPartySelection、RunScenario | StartPartySelection.test.js、RunScenario.test.js（既存） |
| ラン終了・加入・課題遷移のルール | TrialRunFlow | TrialRunFlow.test.js（既存） |
| 情報ウィンドウの状態と停止理由 | InformationWindowManager | InformationWindowManager.test.js（既存） |
| Canvas入力 | GameCanvasInput | GameCanvasInput.test.js、specの操作テスト（既存） |
| 起動シェル、タイトルと試験ランの呼び出し | GameApp | 本番ビルドによる解決確認。DOMでの起動・終了を通した自動テストは今回未追加 |

- 既存テストにGameAppを直接対象とするものはなく、移動した接続処理を既存446件が直接検証していなかった。テストファイルを機械的に改名せず、追加テストをsrc/appに対応するimplementation/appへ配置した。
- 追加テストは実際のstartTrialと各ゲームシステムを実行し、DOM・Canvas・画像のブラウザ境界だけを代替する。選択した2名の初期配置、課題選択中の停止、選択後の敵出現、Hero情報対象の実体解決、時刻進行と一時停止中の更新を検証する。画面の見た目は検証しない。
- 初回実行でHeroDirectionIndicatorRendererのimport欠落によるReferenceErrorを検出した。ソース分割時の誤削除であり、今回の変更が原因なのでimportを復元した。既存テストと本番ビルドの成功だけでは検出できない接続上の欠陥だった。
- 追加対象テスト: `node --test tests/implementation/app/TrialSession.test.js`。1件合格。上表の全テスト・本番ビルドはCI修正後の0.40.2で再実行した結果。

## オーナー検証候補

今回の変更による新規候補はなし。既存70件はバックログに維持する。
