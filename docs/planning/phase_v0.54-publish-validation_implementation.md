# 公開ビルドの検証整備：実装結果

## 実装範囲

- ブランチ: `feature/v0.54-publish-validation`。
- バージョン: `package.json`・`package-lock.json`を`0.54.0`へ更新。
- `.github/workflows/deploy.yml`: 依存インストール後にNodeの全テスト、Chromiumの準備、ブラウザー検証を実行してからビルド・配信する。失敗を無視する設定はない。公開済みGameWorksOAKのmasterをcheckoutし、隣接パスへリンクする既存処理は維持。
- `playwright.config.js`・`package.json`: ゲーム内の開発依存としてPlaywrightを追加。専用の開発サーバーと、本番ビルドを配信するpreviewを自動起動・終了する。結果と失敗時traceはGit対象外。
- `tests/browser/01.game_settings.pw.js`: タイトル→選択順を変更した開始メンバー→開始劇→課題選択→戦闘→勝利後の次課題→最終課題の合格、または期限切れ→結果→タイトル→再開始を実ブラウザーで検証。実際の見出し・保存結果と、終了後の反復更新で表示・記録が重複しないことを確認。
- `tests/browser/production.pw.js`: `/CanWeBecomeHeroes/`上の本番bundleでタイトル・バージョン・メンバー選択・開始劇・課題選択を確認。共通ライブラリを含むbundle、文言、ロゴの読込と、通信・HTTP・コンソール・実行時エラーがないことを検証。
- `tests/README.md`: 要求01との対応、Node・ブラウザーテストの責務、初回準備、実行方法と公開前の順序を記載。
- `backlog.md`: 完了した主要フローの受入テスト整備を外す。紹介文・タグ・コンセプト画像と、独立した要求03・05の受入テスト整備は残す。

## 既存テストとの分担

`spec/01.game_settings.test.js`はゲーム設定・合否・解放などの要求を、`TrialSession`はDOM・Canvasの代替環境でセッション内部の接続を、`TrialRunFlow`は進行と終端通知を検証する。追加テストは実際のボタン操作、アプリの開始・終了ループ、結果モーダル・永続化までの接続に集中する。

主要フローテストは開発ブラウザー内で実モジュールを計測し、乱数、時計の加速、チュートリアル完了状態を制御する。敵の出現・戦闘開始を待ってから敵撃破処理と戦闘終了境界を操作する。ダメージ計算や勝ちやすさの検証ではなく、勝利から先の接続を検証する。本番の合否判定・最終課題番号は変更せず、本番コードへのテスト用フック追加もない。本番起動テストには計測・差し替えを入れない。

## 検証結果

| コマンド | 結果 |
| --- | --- |
| `node --test tests/implementation/app/TrialSession.test.js tests/implementation/app/TrialRunFlow.test.js tests/spec/01.game_settings.test.js` | 21件成功、失敗0 |
| `npm.cmd test` | 570件成功、失敗0 |
| `npm.cmd run test:browser` | PlaywrightのChromiumで3件成功、失敗0（30.6秒） |
| `npm.cmd run build` | 成功。212モジュールをbundleへ取り込み |
| `git diff --check` | エラーなし |

ブラウザー検証の初回はChromium未取得で起動に失敗したため、取得後に再実行した。主要フローの初回実行では敵出現・着地を待つ既定5秒を超えたため、テスト内の時計を20倍速とし、戦闘開始の待機上限を15秒にした。その後、Chromeでも3件成功し、最終版は付属Chromiumで上表のとおり成功した。

開発サーバーは既存ソースの`public/`内JSON importについて警告を出すが、主要フローのブラウザー例外はない。本番bundleはその警告を出さず、通信・HTTP・コンソール・実行時エラーもない。既存のデータ配置の変更は今回の対象に含めない。

## 共通ライブラリと確認範囲

GameWorksOAKは参照のみ。検証時のローカルはmaster、HEADは`9e57b0943e208e53e01c45e49f3fcd52da82fe63`で、作業ツリーと`src/lib`の未コミット・未追跡変更はない。公開リモートとの一致確認はマージフェーズの所定手順で行う。

GitHub ActionsやGitHub Pagesへの実配信は実行していない。今回の本番確認はローカルpreviewに対するもの。画面全体の見た目、実機入力、戦闘バランスの受入完了とは扱わない。

## オーナー検証

新規に依頼する項目はない。ゲームの画面・操作・合否条件を変えず、対象の接続を実ブラウザーで自動確認したため。既存の保留項目は再依頼せず、バックログの記録を維持した。

紹介データ整備、正式公開への切り替え、GameWorksOAK側の変更は行っていない。
