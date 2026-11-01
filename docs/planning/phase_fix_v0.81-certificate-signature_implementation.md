# v0.81 合格通知サイン修正の実装報告

## 変更内容

- `package.json`と`package-lock.json`を`1.0.0`から`0.81.0`へ変更した。
- 計画前に変更して計画終了コミットへ保存した`TrialResultPaper.js`と試験終了画面仕様を再確認した。サインは文字・飾り線ともSVGパス3本で描き、フォント描画を使用しない。通知と共有画像で共通の描画処理を使用する。先行差分を採用し、追加のソース変更は行っていない。
- 公開用JSON、他の機能・ゲーム内文言・認定印、共通リポジトリは変更していない。

## 自動検証

- `node --test tests/implementation/app/TrialResultShareService.test.js tests/implementation/app/TrialPaperScale.test.js tests/implementation/app/TrialResultEntrance.test.js tests/implementation/game/TrialRunResult.test.js`: 14件成功、終了コード0。
- `npm.cmd test`: 全719件成功、失敗・skip・cancelなし、終了コード0。
- `npm.cmd run build`: 成功、222モジュール、終了コード0。
- `node scripts/verify-browser-tests.js`: サンドボックス外で実行。標準5件を2回連続成功、両回とも失敗・skip・flaky・実行エラーなし、終了コード0、上限到達・中断なし。総合終了コード0。
  - 結果: `tmp_browser_verification/2026-11-01T01-05-56-098Z/`。
  - 1回目: 2026-11-01 10:06:01〜10:07:21 JST。
  - 2回目: 2026-11-01 10:07:31〜10:08:55 JST。
  - 両回の`remaining`と`listeners`は空配列、照会エラーなし。後処理による成功への読み替えはない。
- `git diff --check`: 成功。

## 描画確認

- 一時スクリプト`tmp_signature_check.mjs`で実際の`renderTrialResultPaper`と`createTrialResultShareImage`をChromium上で呼び、通知・サイン拡大・共有PNGを生成した。見た目を画像で確認し、サインの欠けや文字と線の分離は見られなかった。
- タイトル表示と倉庫描画に渡す実際のレイアウト値はいずれも`v0.81.0`。倉庫の文字描画はこのレイアウト値を使用する。
- サイン内の`text`要素0、パス3本。パスの境界はx=15、y=15.44、幅156.71、高さ41.56で、viewBox 190×65内に収まる。
- 画像は`tmp_signature_paper.png`、`tmp_signature_detail.png`、`tmp_signature_share.png`。架空の確認データによる表示で、ゲームの保存内容は変更していない。
- 一時検証の初回はサンドボックスのブラウザー参照先不在、次はサンドボックス内外の接続タイムアウトで失敗。同じ実行環境でViteとChromiumを起動する方式へ変更した。検証データの存在しないHero IDも実在する`Avery`へ修正した。製品コードの問題ではない。
- 開発サーバーでは既存のpublic配下JSON importに関するViteの警告が出る。標準ブラウザー検証と本番ビルドは成功しており、今回のサイン・バージョン変更に関係しないため変更しない。
- Chromiumの確認をSafari実機での確認済みとは扱わない。

## オーナー検証

確認バージョン: `0.81.0`。公開先のv1.0ではなく、このブランチの確認環境を使用する。

| ID | 確認内容と理由 | 操作手順 | 期待結果 | 判断・対応 |
| --- | --- | --- | --- | --- |
| SIGN-081-01 | Safariの合格通知。報告されたフォント置換と線の分離が解消したか確認する | タイトルのv0.81.0を確認し、勇者認定試験に合格して通知の署名を見る | Zaneの文字と飾り線が一体のサインとして表示され、欠けや離れた線がない | 未回答 |
| SIGN-081-02 | Safariで生成する共有画像。DOMから画像への変換後も署名が保たれるか確認する | 同じ合格通知から共有操作を行い、生成画像の署名を見る | 通知と同じサインになり、欠けや文字・線の分離がない | 未回答 |

未回答を保留とは扱わず、実装フェーズの終了草案はまだ提示しない。引継ぎ書は変更していない。
