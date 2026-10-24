# 情報ウィンドウ更新負荷の調査・改善 レビュー報告

## 対象と結論

- 対象ブランチ: chore/v0.63-information-window-performance
- 対象HEAD: 8d28a18
- バージョン: 0.63.1
- masterとの差分、および計画終了コミットb2d8bc6以降の変更を確認した。
- 未解決指摘なし。今回の差分について実装へ戻す必要のある不具合は確認されなかった。

## 計画・仕様との照合

- 計画書と実装報告に、調査終了草案後のオーナー指示による性能改善への範囲拡張とPatch更新が記録されている。更新後の計画に沿って通知集約までを扱い、多数チップ・画像・解像度・他画面の修正を混ぜていない。
- TrialSessionはGameClockのコールバックが実行されたことを記録し、全分割更新後に動的通知する。途中の自動停止でも通知を失わず、計算がないフレームは再描画しない。GameClock.advanceの戻り値に依存しない判断は、途中停止時の戻り値の仕様と整合する。
- 開閉・ピン・フォーカス・位置・拡縮等のManager通知、分割処理内のcloseInvalidEntriesを維持する。表示内容を作るManager・Layer・EntityRendererには変更がなく、要求05の現在値更新と既存操作を維持する構成である。
- 通知集約の仕様がruntime_systemsへ記載され、計測手順・区間境界取得の時間差・指標の内包関係がtests/README.mdに記録されている。
- package.jsonとpackage-lock.jsonの版は0.63.1で一致する。利用者向け更新履歴・CSS・共通ライブラリは変更していない。

## 計測結果の照合

- 初期24反復と改善15反復の生データからsummarize-performance.jsで別のtmp_ファイルへ再集計し、保存済み集計JSONとの完全一致をNode assertで確認した。
- 生データのSHA-256は実装報告記載の9555a4535e16d82ccbacdc90bb6774597020fabad236fa023f469515101828b2および99d80cba2ebb7c8251d31ef1c3a086fcaf8ec97d889abdd5dc604d8279496936と一致した。
- `node tmp_information_analyze.mjs tmp_information_optimized_main/results.json`は終了コード0。15反復の出現完了・課題構成・29チップ・主要Canvas・エラーなし・分位点・通知回数・同一画面の情報対象維持を照合した。
- ローカル変換による旧方式の復元は、元の分割処理内へ通知を戻し、フレーム末通知を抑止する。同一ページのA1/B/A2が更新完全省略の実験と区別されている。
- 調査文書06の表と改善率は保存データの傾向と整合する。標準CPU・CPU4倍とも往復比較で改善し、CPU4倍で長いフレームが残ることも明記されている。PC制限条件の結果を実機の保証としていない。
- 長時間の性能測定自体はレビューで再実行していない。保存された生データ・集計・変換コード・分析を根拠とした。

## 検証記録と再実行

- `node --test tests/implementation/app/TrialSession.test.js tests/spec/05.information_window.test.js tests/implementation/scripts/PerformanceBuild.test.js`: 12件成功、終了コード0。通常試験・挑戦で複数ステップの最終値、途中停止時の通知、停止中の通知なしを確認した。既存の要求05テストで装備・タグ・親子・ピン・閉鎖・停止理由を確認した。
- `npm.cmd test`: 全659件成功、失敗・skip・cancelled 0。レビュー再実行で確認した。
- `npm.cmd run build`: 終了コード0。506.69kBのbundleに対する既存の500kB警告のみ。分割は今回の範囲外で、実装報告と一致する。
- `rg -n '__perf|__session|compareBatching|batchInformation' dist`: 該当なし。通常ビルドへの計測・旧方式復元フックの混入は確認されなかった。
- ブラウザー検証は実装時のtmp_browser_verification/2026-10-24T02-22-28-318Z/summary.jsonを照合した。passed=true、4件×2回成功、終了コード0、skip・unexpected・flaky 0、remainingとlistenersは空。レビューでは再実行していない。
- `git diff --check master...HEAD`: 成功。Nodeのlocalstorage-file警告は対象テストでも再現したが、検証失敗はない。

## オーナー検証と共通規定

- 新規の見た目・操作仕様を設けておらず、今回新規のオーナー検証を設けない計画・実装判断に矛盾はない。実機操作性は未検証の限界として維持する。
- オーナーが確認済みとしたOV-CONTROLS-06とOV-RESULT-READABILITY-04は削除済みで、実装差分による復活はない。他の既存保留項目を新たに確認済みとする変更はない。
- Safari回転時のレコード画面と準備チュートリアルの2件は、実装報告にあるオーナー指示の範囲でバックログへ記録され、今回のコードへ混在していない。
- 共通チェックリストの該当範囲（フェーズ、版、範囲、成果物配置、ソース構造、検証、参照専用）を照合した。ソースは変更していない。
- 共通ライブラリの公開状態確認、全フォルダーのdev_・tmp_・phase_の安全確認と削除、削除コミット、masterへのマージ・pushはマージ担当が実施する。
