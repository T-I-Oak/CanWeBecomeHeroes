# 文書の目的に沿った内容整理の実装報告

## 対応範囲

- 対象ブランチ: `docs/v0.67-document-purpose`。
- バージョン: `0.67.0`。package.jsonとpackage-lock.jsonを初回実装開始時に更新した。
- 管理対象Markdown 38文書について、配置・見出し・生成／動作／検証／作業記録の責務と参照関係を点検した。依存パッケージ、Git管理領域、ビルド出力は対象外。
- 共通文書ガイド、ワークフロー、フェーズ手順、構成、準拠チェックリストとプロジェクトのブランチ作業フローを照合した。共通リポジトリは変更していない。

## 点検結果と判断

パスはプロジェクトルートからの相対パス。仕様全項目と実装の再検証ではなく、計画に沿った文書目的・正本・参照の点検である。

| 点検した文書 | 判断・対応 |
| --- | --- |
| `docs/architecture/01.application_structure.md` | 起動・クラス責務・配置の案内として維持 |
| `docs/content/hero_character_profiles.md` | 人物設定は維持。「次の検討事項」を会話へ適用する際の方針として整理 |
| `docs/demo/01.chip_prototype.md` | 検証入口の案内であり、テスト手順の複製はないため維持 |
| `docs/planning/01.branch_workflow.md` | 共通規定とプロジェクト固有の確認先への案内として維持 |
| `docs/planning/backlog.md` | 対応した文書整理項目を削除。他の要望とオーナー検証は維持 |
| `docs/planning/phase_docs_v0.67-document-purpose_plan.md`、`phase_handover.md` | 計画と引継ぎの正本として維持。引継ぎは終了草案承認前には更新しない |
| `docs/requirements/01.game_settings.md`、`03.unique_skills.md`、`04.combat.md`、`05.information_window.md`、`06.run_records.md` | ゲーム要求の定義として維持。保存エラーUIなど対象外・将来の境界も維持 |
| `docs/requirements/02.hero_item_interaction.md` | デモを起動するという古い説明を、現在のゲーム開始仕様・アプリ構成への参照に置換 |
| `docs/specifications/01.entity_model.md` | 実体モデルの仕様として維持 |
| `docs/specifications/02.runtime_systems.md` | 画像選択・読み込み・キャッシュを正本として維持。キャッシュ予算の表・計算条件・対象外を生成仕様から移動し、生成手順は参照化 |
| `docs/specifications/03.ui_style_conventions.md` | CSSとUIの設計規約として維持。影響確認条件は設計上の制約として保持 |
| `docs/specifications/04.battle_simulation.md` | シミュレーター自体の入出力・実行仕様であり、一般ゲームテストと異なるため維持 |
| `docs/specifications/05.icon_visual_system.md`、`06.localization.md`、`07.vignette.md`、`08.start_vignette.md`、`09.unique_skill_presentation.md` | 視覚体系・言語・演出の仕様として維持 |
| `docs/specifications/10.tutorial.md`、`11.tutorial_scenarios.md`、`12.tutorial_area_scenarios.md`、`13.recruitment_vignette.md` | 実行条件・会話・演出定義として維持。確定情報と文面の正本への参照を保持 |
| `docs/specifications/14.achievements.md` | 重複する実装完了報告を関連表示仕様への参照に置換。欠落した消費ポイントを推測しない制約は保持。評価式・候補情報は本書とクラス設計に保持 |
| `docs/specifications/15.achievement_classes.md` | 検証観点をtests/READMEへ移動して参照化。共通表示境界は現在の設計として保持 |
| `docs/specifications/16.run_records.md` | 保存・画面・モードの仕様として維持。旧データの扱いは動作仕様であり履歴ではないため保持 |
| `docs/specifications/17.trial_result_screen.md` | 承認日・反映日・実装完了表現を整理。二つ名・分類・演出・語句構成など現在の意味を保持 |
| `docs/specifications/18.achievement_toast.md` | 重複する操作手順を手動確認READMEへの参照に置換 |
| `docs/specifications/19.log_history.md`、`20.achievement_comments.md` | ログ仕様と所見リソースの定義として維持 |
| `docs/specifications/24.image_conversion.md` | 生成手順の正本。制作元・定義・出力・追跡対象・実行環境・対象範囲・更新手順を保持し、ランタイムと検証は参照化。制作元保存時の作業記録を除去 |
| `public/assets/results/README.md` | 認定印の制作条件と再制作に必要なプロンプトを持つアセット付属資料として維持 |
| `tests/README.md` | 生成と動作仕様の重複を除去。画像の対象テスト・コマンド・検証対象を明記。集計の検証観点を集約。性能比較条件は現行の調査手順として保持 |
| `tests/manual/README.md` | Safari比較ページの公開撤去履歴・版比較を現在の開発専用入口と比較条件の説明に整理。手動操作と注意点を保持 |
| `tests/manual/controls.md` | 入力・表示の確認手順として維持 |

## 検証

2026-10-25にゲームルートで実行した。

| 確認 | コマンド・結果 |
| --- | --- |
| 画像の対象テスト | `node --test tests/implementation/scripts/ImageConversion.test.js tests/implementation/chips/ScaledImage.test.js tests/implementation/chips/ImageLevelCache.test.js tests/implementation/chips/EnemyChipArtContract.test.js` — 16件成功、失敗・skip 0、終了コード0 |
| 集計の対象テスト | `node --test tests/implementation/game/GameStatistics.test.js tests/implementation/game/Achievements.test.js tests/implementation/game/StatisticsHooks.test.js tests/implementation/game/TrialStatisticsSession.test.js tests/implementation/game/ResultAchievementSelection.test.js` — 30件成功、失敗・skip 0、終了コード0 |
| 全テスト | `npm.cmd test` — 667件成功、失敗・cancel・skip・todo 0、終了コード0 |
| 本番ビルド | `npm.cmd run build` — 成功、216モジュール変換、終了コード0。出力JSが500kBを超えるVite警告あり（512.56kB）。今回の文書整理ではbundle分割を行わない |
| 相対リンク・見出し | `node tmp_document_links.cjs` — 管理対象38文書のローカルMarkdownリンクと見出し参照を照合。コード例を対象外として欠落0。共通文書への相対リンクも実ファイルと照合 |
| 差分 | `git diff --check` — 空白エラーなし。移動前後の生成条件・予算表・検証条件を差分照合 |

リンク検査の一時スクリプトとテストログはignore対象の`tmp_`へ置き、成果物に含めない。外部URLの通信確認は行っていない。

## 対象外・限界・オーナー検証

- ソース、ゲーム動作、画像とマニフェストは変更していない。画像再生成は実行していない。
- ブラウザー・実機検証は未実施。文書の移動・参照化とバージョン設定のみで画面・入力・画像を変更しておらず、本フェーズ固有の見た目や実機操作の判断項目はないため省略した。既存のオーナー検証はそのまま保持した。
- スコープ外の開発項目として、起動時JavaScriptのサイズと読み込み負荷の調査・改善候補をバックログへ追加した。オーナーの「今回のスコープから外れているなら、バックログでいい」との指示による。静的import経路からTrialSession・RecordScreenの遅延読み込み、先読み、画像マニフェストの表現縮小を候補とし、削減量・初回起動・画面初回表示の実測で判断する。動作変更は行っていない。既存の描画性能調査とは別項目である。
- レビュー担当による計画・差分・本報告の照合は次のフェーズで行う。
