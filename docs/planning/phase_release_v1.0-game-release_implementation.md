# v1.0 ゲーム本体の配信準備 実装報告

## 計画への対応

- 対象ブランチ: `release/v1.0-game-release`。
- 初回実装開始時に`package.json.version`、`package-lock.json.version`、同`packages[""].version`を`0.80.0`から`1.0.0`へ更新した。
- 依存物、ゲーム処理、文言、CSS、アセット、保存形式は変更していない。
- `public/data/project_info.json`と`public/data/update_history.json`は変更していない。masterとの差分もなく、予告文言・`pending`・空の更新履歴を維持する。
- GameWorksOAKは参照専用を維持した。確認時はmaster、HEADは`e4974f86606374fb81dae4e57644f051085c2c45`、作業ツリーに未コミット変更はなかった。マージ時の公開状態照会は後続担当が行う。

## バージョン表示

- `src/game/AppMetadata.js`が`package.json.version`を参照し、`TitleMenu`と`WarehouseMetadataRenderer`が同じ`APP_VERSION`を表示する経路を確認した。
- 本番ブラウザーテストがタイトルの`v1.0.0`を検証し、対象単体テストが倉庫のメタデータ配置とリンク判定を検証した。
- オーナーが本番ビルドのタイトル・倉庫の両表示を確認済み。詳細は以下の確認IDに記録する。

## 自動検証

2026-10-31、Windows / Node.js `v25.6.1`、プロジェクトルートで実行した。

| 区分 | コマンド | 結果 |
| --- | --- | --- |
| 対象テスト | `node --test tests/implementation/app/WarehouseMetadataRenderer.test.js` | 1件成功、失敗・cancel・skip・todoなし、終了コード0。 |
| 全テスト | `npm.cmd test` | 719件成功、失敗・cancel・skip・todoなし、終了コード0。約11.3秒。 |
| 本番ビルド | `npm.cmd run build` | 終了コード0。222モジュール、本体449.61kB、画像マニフェスト70.66kB。約1.73秒。 |
| ブラウザー検証 | `node scripts/verify-browser-tests.js`（サンドボックス外） | 5件を2回連続成功。検証コマンドの終了コード0、総合`passed: true`。 |
| 差分 | `git diff --check` | 終了コード0。 |
| 公開用JSON | `git diff master -- public/data/project_info.json public/data/update_history.json` | 差分なし。 |

## ブラウザー検証の詳細

- 結果ディレクトリ: `tmp_browser_verification/2026-10-31T06-10-47-507Z/`。
- `summary.json`、`run-1.json`、`run-2.json`と実行コマンドの終了結果を照合した。
- 既定のPlaywright Chromium、1 worker。各テストのviewport等は既存テストの設定に従った。

| 項目 | 1回目 | 2回目 |
| --- | --- | --- |
| 開始（日本時間） | 2026-10-31 15:10:52.011 | 2026-10-31 15:12:11.737 |
| 終了（日本時間） | 2026-10-31 15:12:01.050 | 2026-10-31 15:13:22.003 |
| 件数 | 5成功・失敗0・skip0・flaky0 | 5成功・失敗0・skip0・flaky0 |
| 終了コード | 0 | 0 |
| 上限到達・中断 | いずれもfalse | いずれもfalse |
| 実行・観測エラー | なし | なし |
| 残存プロセス・専用ポート待受 | いずれも空配列 | いずれも空配列 |
| 判定 | passed: true | passed: true |

開始から終了、パーティ選択、開始劇、課題・戦闘・結果と再開始、本番ベースパスでの共通bundle・文言・画像、起動・保存失敗の復帰、小画面・回転時の記録画面、導入と入力など、既存5件の範囲を検証した。実機Safariの挙動を再現・保証するものではない。

ログには既存の開発サーバー側のpublic配下JSONのimportに関する案内と、`NO_COLOR`・`FORCE_COLOR`併用警告がある。全5件の成功と、通常本番操作の通信・console・実行時エラー検査の成功を確認した。これらを本番アセット欠落やテスト失敗として扱わず、今回テスト用のimportや環境設定は変更していない。

## オーナー検証

| ID | 理由・操作・期待結果 | 確認版 | 判断・対応 |
| --- | --- | --- | --- |
| OV-V1-VERSION-01 | 本番ビルドの表示確認。`http://127.0.0.1:4180/CanWeBecomeHeroes/`を開き、タイトル左下と試験開始後の倉庫左下がともに`v1.0.0`と表示される。 | 1.0.0 | オーナーから「項目確認済み」の回答。追加修正なし。 |

- この確認はローカル本番previewの確認であり、公開先へのデプロイ確認とは区別する。
- 新規機能・操作・見た目の変更はなく、今回追加した検証項目は上記1件。未回答・未対応・明示保留はない。バックログ追加なし。
- ローカル確認用previewはポート4180で起動した。標準ブラウザー検証の専用ポート4174・4175とは別であり、上記の解放判定に混同していない。

## 後続担当への注意

- レビューとマージは未実施。未解決指摘の有無はレビュー担当が判定する。
- GitHub Actionsのデプロイ、公開URLでの動作・バージョン・公開用JSONの取得確認はマージ・push後に行う。
- 本体配信後に準備する公開用JSONを、このブランチや今回のpushへ含めない。
- 実装終了草案の承認後に承認内容を引継ぎ書へ保存し、変更一式をローカルコミットする。
