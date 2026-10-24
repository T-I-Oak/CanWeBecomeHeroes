# Safariの画面回転時のレコード表示：レビュー

## 判定

未解決指摘なし。計画・要求06・レコード画面仕様、共通のワークフロー・文書・コーディング・CSS・モバイル規定と、`master...459caf2`の差分を照合した。実装への差し戻しを要する問題は確認しなかった。レビューではソースを変更していない。

## 確認内容

- 製品の描画修正は`RecordScreenViewport`の`translateZ(0)`に限定される。紙面・操作部とスクロール領域を同じ外側の変換下に置き、本文の倍率・内部スクロール・背景canvas更新を維持する。撤回したz-index・isolation変更と検証用の公開入口は最終差分に含まれない。
- `RecordInformation`はbody直下へ追加され、今回の変換の子孫にはならない。既存の固定配置・アンカー座標・破棄処理は変更されていない。
- 設定とlockfileはともに0.64.4。実機確認は0.64.3で行われ、0.64.4の入口撤去で描画修正は変更されていない。公開版0.64.3と手元の0.64.4を区別した記録になっている。
- `OV-SAFARI-RECORD-01`～`03`は実装報告にオーナーの確認結果が記録されている。確認済み項目を再依頼しない。バックログから今回の不具合だけが除かれ、他の開発内容は含まれない。
- 比較ページはtests/manual配下の開発用ソースとして残り、Viteの追加エントリーやタイトル導線は残らない。本番テストでも検証ページのHTML成果物と導線の非残存を確認している。
- ブラウザー検証補助の変更は、オーナー指示による失敗原因調査のための診断情報追加と抽出である。照会上限、失敗時の不合格判定、所有プロセス照合と後処理の条件は維持されている。
- 共通部の変更は差分に含まれない。公開状態の確認、一時成果物の削除、masterへのマージとpushは実施時の確認事項であり、レビューで実施済みとは扱わない。

## 検証の照合と再実行

- 実装報告の最終結果は対象11件、全662件成功、ブラウザー4件を2回成功、本番ビルド2回成功。既存のbundle容量警告と、WebKit未実行の制約が明記されている。
- `tmp_browser_verification/2026-10-24T06-04-21-502Z/summary.json`およびrun-1の詳細を照合した。両回の終了コード0、4件成功、flaky・skip・unexpected 0、観測失敗なし、残存プロセス・待受なしの記録と報告が一致する。
- レビューで次を再実行し、17件成功、失敗・skip・cancel 0、終了コード0を確認した。
  `node --test tests/implementation/app/RecordScreenScale.test.js tests/implementation/app/RecordScreenData.test.js tests/spec/06.run_records.test.js tests/implementation/scripts/BrowserTestVerification.test.js tests/implementation/scripts/BrowserTestRun.test.js tests/implementation/scripts/WindowsBrowserInventory.test.js`
- `git diff --check master...HEAD`は成功。全テスト・本番ビルド・ブラウザー検証は実装報告の結果を採用し、レビューでは再実行していない。

## 判断の限界

実機Safariの改善は記録済みのオーナー判断に基づく。レビュー環境で物理回転や合成後の画素を再検証したものではない。WebKit内部の原因と端末・OS・Safari版別の発生範囲は未確定であり、仕様にもその限界が記載されている。自動のviewport変更・ヒット判定が実機Safariの画素の正しさを保証するとは扱わない。
