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
| `03.unique_skills.md` | `game/UniqueSkillEffectSystem`・`UniqueSkillTrigger`・`CombatConditionSystem`・`CombatDamageReactionSystem`・`CombatAttributeReactionSystem`・`CombatGustSystem`・`CombatKnockbackSystem` |
| `04.combat.md` | `spec/04.combat.test.js`、`game/Combat*`・`BattleSystem`・`EncounterDefinitions`・`StageController` |
| `05.information_window.md` | `app/InformationWindow*`・`EntityDetailLayout`、`game/EntityRegistry`・`StatusLocalization` |
| `06.run_records.md` | `spec/06.run_records.test.js`、`game/GameStatistics`・`StatisticsHooks`・`RunRecordsRepository`・`RunRankings`・`Achievements`、`app/RecordScreenData`・`AchievementTable` |

表内の短い名前は`implementation/`以下の`*.test.js`を示す。03・05には独立した`spec/`の受入テストはなく、現在は実装・結合テストで対応する。仕様単位の受入テストの整備は[バックログ](../docs/planning/backlog.md)で管理する。

## ブラウザー検証と公開前の実行順

`playwright.config.js`が専用のVite開発サーバー（4174）と本番ビルドのpreview（4175）を起動・終了する。両ポートは事前に空ける。ブラウザーテストは`*.pw.js`とし、Nodeの`*.test.js`と別に実行する。ローカルのインストール済みChromeを使う場合はPowerShellで`$env:PLAYWRIGHT_CHANNEL = 'chrome'`を設定できる。CIの既定はPlaywright付属のChromium。

- `browser/01.game_settings.pw.js`: 要求01の開始から終了までの接続。タイトルで開始し、選択順を変更した2名、開始劇、課題選択、戦闘開始、勝利後の次課題、最終課題の合格と期限切れ、結果を閉じた後のタイトル復帰・再開始を検証する。結果の見出し・保存内容と、終了後に更新を繰り返しても結果表示・記録が1件であることを確認する。
- 時間と乱数、チュートリアル完了状態はブラウザー内で制御する。戦闘開始までは実際の出現・物理更新を使い、勝利はテスト側から実際の敵撃破処理・戦闘終了境界を操作する。戦闘計算は既存の要求04・実装テストに任せる。合否判定、課題番号、結果生成・保存、モーダルとアプリのループは本番実装を通す。本番コードにテスト用フックは設けない。
- `browser/production.pw.js`: 本番ベースパス`/CanWeBecomeHeroes/`で、ビルド済みのタイトル・バージョン、メンバー選択、開始劇、課題選択を操作する。共通ライブラリを含むbundle、文言、ロゴを読み込み、HTTPエラー・通信失敗・コンソールエラー・実行時例外がないことを確認する。開発用モジュールの差し替えは行わない。

GitHub Pagesの公開ワークフローは`npm ci`→`npm test`→Chromium準備→`npm run test:browser`→`npm run build`→配信の順とする。ブラウザー検証自身もpreview用の本番ビルドを作る。失敗時に後続の配信は実行しない。ローカルでの本番preview確認はGitHub Pagesへ配信済みであることの確認とは区別する。

## 手動確認

[画面確認用入口](manual/README.md)と[操作・モバイル表示の確認](manual/controls.md)を参照する。実機・見た目について未確認の項目とオーナーの保留判断は[バックログ](../docs/planning/backlog.md)を正本とする。自動テスト成功を実機確認済みとは扱わない。
