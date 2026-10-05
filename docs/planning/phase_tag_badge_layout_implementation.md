# 実装報告: tag_badge_layout

## 計画に対する実装結果

- Hero・Enemy共通の情報ウィンドウCSSで、ステータスとタグを等幅7列・間隔8pxに統一した。
- 通常タグ15個は表示順を維持して左5列に3行で配置する。バッジの固定最小幅を解除し、対応するステータス列と幅を揃えた。
- Exバッジは6列目から2列分、縦に3行分を占める。Exがない場合も7列を維持し、通常タグを広げない。
- Itemバッジ、準備パネル、各タグの機能、ステータス計算は変更していない。

## 変更箇所

- `src/styles/information-window-detail.css`: 共通グリッド、通常タグの列指定、Exの列範囲。
- `docs/specifications/03.ui_style_conventions.md`: 情報ウィンドウの7列対応を追記。
- `package.json` / `package-lock.json`: masterの0.36.0から新規開発版0.37.0へ更新。計画書にMinor指定がないため、ブランチ作業フローと共通規約に従い次のMinorを使用した。

## 検証

- 対象テスト: `node --test tests/implementation/TagDisplayLayout.test.js tests/implementation/InformationWindowScale.test.js tests/implementation/InformationWindowManager.test.js` — 26件成功。
- 全テスト: `npm.cmd test` — 410件成功、失敗0件。
- 本番ビルド: `npm.cmd run build` — 成功（Vite 7.3.6）。
- 表示確認: `node tmp_tag_badge_verify.cjs` — Playwrightとインストール済みEdgeを使用。実際の情報ウィンドウCSSを読み込んだ検証用DOMで、画面幅320 / 375 / 768 / 1280px、Exあり・なしの8ケースを確認。通常タグ15個の左端と幅が対応ステータス列と一致し、Exの両端が右2列と一致することを1px以内の精度で確認した。375px・Exありのスクリーンショットも確認した。
- Playwright標準Chromiumが未導入だったため、ブラウザー確認はEdgeで実施した。検証用DOMによる配置確認であり、実ゲームでのアイコン・数値を含む見た目とタッチ操作はオーナー検証候補とする。
- `git diff --check` — 成功。

## オーナー検証結果

- スマートフォン幅でHero情報ウィンドウの通常タグ5列がステータス左5列と揃い、右2列が空白になること。
- スマートフォン幅でExを持つEnemy情報ウィンドウのExがステータス右2列分の幅で表示されること。
- 情報ウィンドウを拡大・縮小しても通常タグとExの列対応が維持されること。

上記3項目は、0.37.0でオーナーから「すべて確認済み」と回答を受け、すべてOKとして記録した。未確認項目はない。対応済みのタグバッジ列調整項目をバックログから削除した。
