# 起動時読み込み・チャンク警告調査のレビュー

## 対象と結論

- ブランチ: `chore/v0.69-startup-loading-investigation`
- 実装コミット: `0e090be`
- 確認バージョン: `0.69.0`
- レビュー対象: `master...HEAD`の差分、計画書、実装報告と測定別紙、保存済み計測結果・ブラウザー検証記録。
- 未解決指摘: `RV-STARTUP-01` 本番のチャンクサイズ警告が未解消。オーナーの本番実装指示により、実装へ差し戻す。

調査コードと測定結果は従来の計画に対応しているが、オーナーから「実装しないと意味ないです」と本番適用の指示を受けた。目的を満たすには通常の本番ビルドで警告を解消する必要がある。画像マニフェストだけを静的チャンクへ分割する案には再現可能なビルド結果と主要画面の操作記録があるため、この構成を本番へ適用する。警告上限は変更しない。

## 照合した内容

- `src/`、`vite.config.js`とゲーム仕様への差分はなく、本番の読み込み構成は維持されている。計測プラグインは調査スクリプトからだけ読み込む。
- 初回実装のバージョンはpackage.json・package-lock.jsonのルートとpackagesの双方で`0.69.0`へ更新されている。v0の利用者向け更新履歴は空配列を維持している。
- TrialSession・RecordScreenの単独遅延化と併用、先読み、マニフェスト縮小を比較し、共有依存・全JS量・初回入力の待ちを区別している。静的分割も追加比較されている。
- 遅延化で生じる入口のトップレベルawaitとの依存問題は、調査専用変換とbootstrap対照で扱われ、本番へimport文の変更だけを適用できるという結論にはしていない。
- 変換対象の一意性と全対象の処理確認、マニフェスト全件の実行時同等性、トレース区間の切詰めと同カテゴリ・同スレッド内の重複除去は、実装とテストが対応している。
- 通信量は完了済みリソース、画面到達はDOM生成の観測、解析・実行はトレースの対象イベントである。未完了通信・画像decode・画面提示・実機性能を測定済みとする主張はなく、計測負荷・順番固定・再訪キャッシュの限界も報告されている。
- バックログ先頭は完了した調査から本番適用判断へ更新されている。オーナー検証欄の既存項目は変更されていない。今回新規の未回答検証項目や未対応フィードバックは報告にない。
- 共通ワークフロー、フェーズ手順、文書・構成・コーディング規定と共通仕様準拠チェックリストを今回の差分に照合した。GameWorksOAKの作業ツリーに差分はなく、参照専用の担当範囲を維持している。

## レビューで再実行した検証

1. `node --test tests/implementation/scripts/StartupLoading.test.js tests/implementation/chips/ScaledImage.test.js tests/implementation/chips/ImageLevelCache.test.js tests/implementation/app/RecordScreenData.test.js tests/implementation/game/TrialStatisticsSession.test.js`: 23件成功、失敗0、終了コード0。
2. `npm.cmd test`: 687件成功、失敗0、skip0、終了コード0。
3. `npm.cmd run build`: 成功、終了コード0。Vite 7.3.6、入口514500byte、既知の500kB警告1件を再現した。
4. PowerShellで`STARTUP_OUTPUT=tmp_startup_review`を設定し、`node scripts/measure-startup-loading.js --build-only normal static`: 成功、終了コード0。通常は514500byte・警告1件、静的分割は入口447429byteと画像マニフェスト67326byte・警告0件となり、実装報告と一致した。
5. 通常distの全JavaScriptについて`__startup`・`startup:title-ready`・`__perf`・`__session`が含まれないことと、バージョン設定の一致をNodeで確認した。
6. `git diff --check master...HEAD`: 成功。

レビューで性能の全反復とブラウザー操作は再実行していない。実装担当による保存済み記録を次のとおり照合した。

- `tmp_startup_loading/results.json`: 9条件・198回、全runがvalidated=trueで完了し、失敗記録なし。主要チャンクサイズが報告と一致した。
- `tmp_startup_controls/results.json`: normal・baseline・staticのレコード操作18回が成功し、警告数は1・1・0。
- `tmp_startup_static_flows/results.json`: 静的分割の通常試験・挑戦モード、cold/warmの4回が成功。
- `tmp_startup_warning_check/results.json`: 通常1件、静的分割0件、trial0件、records1件、compact0件の警告記録が報告と一致した。
- `tmp_browser_verification/2026-10-26T05-21-45-686Z/summary.json`: 2回ともpassed=true、各5件成功、skip・失敗・flaky0、終了コード0、残存プロセス・待受なし、観測エラーなし。報告の実行時刻と一致した。

生データ・比較ビルドは一時成果物であり、今回のレビューで作った`tmp_startup_review/`も含め、マージ時の削除対象となる。

## 残る判断

`RV-STARTUP-01`への対応として、同じブランチの実装で`vite.config.js`へ画像マニフェストの静的分割を適用する。バージョンは再実装開始時に`0.69.1`へ更新する。通常ビルドの警告0件、主要画面・画像描画・言語切替の維持、全テストとブラウザー検証を確認し、実装報告とバックログへ反映する。遅延読み込み・先読み・マニフェスト内容変更は含めない。

レビューでソース・設定は変更していない。保存済み引継ぎ書は、実装への差し戻し草案の承認後に更新する。
