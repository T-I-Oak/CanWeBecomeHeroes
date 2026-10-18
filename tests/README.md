# テストの構成と実行

ゲームの起動・画面責務は[アプリケーション構成](../docs/architecture/01.application_structure.md)、開発時の検証条件は[ブランチ作業フロー](../docs/planning/01.branch_workflow.md)を参照する。

## 実行

- 全テスト: `npm.cmd test`
- 実装テスト: `node --test "tests/implementation/**/*.test.js"`
- 要求仕様テスト: `node --test "tests/spec/*.test.js"`
- 本番ビルド: `npm.cmd run build`

ワイルドカードはNodeのテストランナーへ渡す。ディレクトリ名をテストファイルの代わりに指定しない。ゲームルートを作業ディレクトリとし、隣接する`GameWorksOAK`の共通ライブラリを使用する。

## 配置と責務

`implementation/`は`src/`と同じ責務で分ける。同名モジュールの単体テストは元のファイル名を維持する。

| ディレクトリ | 対象 |
| --- | --- |
| `implementation/app/` | 画面、入力、描画、配置、セッション接続 |
| `implementation/chips/` | Chipの物理・描画・画像契約 |
| `implementation/game/` | ゲームルール、状態、集計、言語リソース |
| `implementation/simulation/` | 戦闘シミュレーション、タグ比較・分析 |

複数モジュールをつなぐ結合テストは、主な責務のディレクトリへ置き、対象を示す名前を使う。`Factories`・`StatisticsHooks`・`CombatConditionLifecycle`・`ShoppingBag`・`VignetteLineAction`は`game`、`DragControls`・`EntityDetailLayout`・`LogHistory`・`StageSelectionPreview`・`Tutorial`は`app`、画像契約2件は`chips`へ置く。`StatusLocalization`・`TranslationIntegrity`はゲーム側の言語リソース契約である。

## 要求と自動テストの対応

`spec/`の番号は`docs/requirements/`に対応する。仕様の全項目を自動化済みという意味ではなく、見た目や実機入力は手動確認と併用する。

| 要求文書 | 主な自動検証 |
| --- | --- |
| `01.game_settings.md` | `spec/01.game_settings.test.js`、`game/RunScenario`・`StartPartySelection`・`TrialRunResult` |
| `02.hero_item_interaction.md` | `spec/02.hero_item_interaction.test.js`、`game/ItemPickupController`・`ShoppingBag`・`ShopSystem`・`GuildSystem`・`TrainingSystem`、`app/DragControls` |
| `03.unique_skills.md` | `game/UniqueSkillEffectSystem`・`UniqueSkillTrigger`・`CombatConditionSystem`・`CombatDamageReactionSystem`・`CombatAttributeReactionSystem`・`CombatGustSystem`・`CombatKnockbackSystem` |
| `04.combat.md` | `spec/04.combat.test.js`、`game/Combat*`・`BattleSystem`・`EncounterDefinitions`・`StageController` |
| `05.information_window.md` | `app/InformationWindow*`・`EntityDetailLayout`、`game/EntityRegistry`・`StatusLocalization` |
| `06.run_records.md` | `spec/06.run_records.test.js`、`game/GameStatistics`・`StatisticsHooks`・`RunRecordsRepository`・`RunRankings`・`Achievements`、`app/RecordScreenData`・`AchievementTable` |

表内の短い名前は`implementation/`以下の`*.test.js`を示す。03・05には独立した`spec/`の受入テストはなく、現在は実装・結合テストで対応する。仕様単位の受入テストの整備は[バックログ](../docs/planning/backlog.md)で管理する。

## 手動確認

[画面確認用入口](manual/README.md)と[操作・モバイル表示の確認](manual/controls.md)を参照する。実機・見た目について未確認の項目とオーナーの保留判断は[バックログ](../docs/planning/backlog.md)を正本とする。自動テスト成功を実機確認済みとは扱わない。
