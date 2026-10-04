# v0.35 タイトル画面の修正 実装報告書

## 1. 目的と開発単位

バックログ「操作とゲーム画面を拡充する」の先頭3項目を対象に、タイトル画面の表示・モード名および設定操作の共通化・レスポンシブ収まりを実装した。また、レビュー指摘（R1, R3）およびオーナー方針（キーボード操作・フォーカスの完全排除）に対応し、マウス／タッチ（ポインター操作）専用UIとしての整理、およびドキュメント・検証記録の整合化を行った。

- 開発ブランチ: `codex/v0.35-title-menu`
- 現在の実装バージョン: `0.35.6`（初版0.35.0から各回の差し戻し対応で順次更新）
- 計画書: `docs/planning/phase_codex_v0.35-title-menu_plan.md`

## 2. 計画に対する実装結果

### 2.1 モード名の修正
- `public/data/text/ui.json` の `challengeMode` を「チャレンジモード」および「Challenge Mode」へ更新。
- 試験クリアー済みの状態で、タイトル画面に「チャレンジモード」が正しく表示されることを確認。

### 2.2 メニューとHUDで共有する設定モーダル
- 新規クラス [SettingsModalController.js](file:///c:/Users/tioak/Documents/Games/Projects/GameWorksOAK/CanWeBecomeHeroes/src/app/SettingsModalController.js) を作成し、タイトル画面とHUDの設定モーダルの開閉・起動元管理・セクション表示制御を一元化。
- 起動元に応じた表示項目の切り替え:
  - `menu`（タイトルメニュー）起動時: 言語セクションおよびチュートリアルセクション（チュートリアルリセットボタン）の2項目を表示。ゲーム進行および頭上ステータスセクションは非表示。
  - `hud`（ゲーム中HUD）起動時: 言語・チュートリアル・ゲーム進行・頭上ステータスの全4セクションを表示。
- チュートリアルセクション（チュートリアルリセットUI）の追加:
  - 設定モーダル内に「チュートリアル」セクションおよび「チュートリアルリセット」操作行（ラベル＋リセットボタン）を追加。将来の実装を見据えたUIとして配置し、バックログへ機能実装タスクを追加。
  - セクションが追加されたことでダイアログ内に十分な縦幅（空き領域100px以上）が確保され、言語ドロップダウンがスクロールバーなしで自然に2行展開されるよう改善。
- [TimeSettingsController.js](file:///c:/Users/tioak/Documents/Games/Projects/GameWorksOAK/CanWeBecomeHeroes/src/app/TimeSettingsController.js) からモーダル開閉処理を完全に分離し、ゲーム速度およびスタミナ停止制御の専任クラスへ整理。
- [TitleMenu.js](file:///c:/Users/tioak/Documents/Games/Projects/GameWorksOAK/CanWeBecomeHeroes/src/app/TitleMenu.js) からタイトル専用の設定パネル・ModalSelectを撤去し、共有設定モーダルのオープン処理へ委譲。
- [ModalSelect.js](file:///c:/Users/tioak/Documents/Games/Projects/GameWorksOAK/CanWeBecomeHeroes/src/app/ModalSelect.js) の配置基準 `.ModalDialog__Body` が共通モーダル内に存在するため、タイトルから開いた場合でも言語選択ドロップダウンが正常に配置・開閉される。
- タイトル背面の操作抑止: `modal.css` にて `.SettingsModal { z-index: 35; }` を指定し、タイトル画面（`z-index: 30`）より前面に表示。モーダル表示中は背面のメニュー操作を抑止。
- 言語切替の即時反映: 言語選択変更時にタイトルメニューの文言（コマンド・クレジット・レコード）も即時再描画。

### 2.3 縦幅が狭い画面での収まり
- [screens.css](file:///c:/Users/tioak/Documents/Games/Projects/GameWorksOAK/CanWeBecomeHeroes/src/styles/screens.css) の `.TitleMenu__Content`、`.TitleMenu__Logo`、`.TitleMenu__Menu`、`.TitleMenu__Command`、`.TitleMenu__Credit` を `clamp()` および `vh` / `vw` による実値調整へ改修。
- `100dvh` を考慮し、ページ全体のスクロールを発生させず画面中央に収まるレイアウトを実現。
- 低い横画面（`667×280`）および横長スマートフォン（`844×390`）でも、ロゴ・チャレンジモードを含む全4コマンド・クレジットが画面内に収まることを確認。
- 極小画面時の保険として `.TitleMenu__Content` に内部 `overflow-y: auto` を設定。

### 2.4 レビュー指摘および操作方針への対応

#### R1対応：キーボード操作およびフォーカスの完全排除（ポインター操作専用化）
- **背景と方針**: 設定モーダル表示中にキーボードで背面メニューが操作できる指摘に対し、オーナーから「キーボードでの操作はさせたくない、フォーカスもしてほしくない」という明確なUI操作方針を受領。ゲーム全体をマウス／タッチ専用操作として整理。
- **対応内容**:
  - `GameApp.js` にてグローバルに `Tab` キーによるフォーカス移動を抑止（`event.preventDefault()` およびフォーカス解除）。
  - `src/styles/app.css` にて `*:focus`, `*:focus-visible` に対し `outline: none; box-shadow: none;` を設定し、フォーカス枠線・アウトライン・ハイライト表示を全要素で完全排除。
  - `SettingsModalController` において、`open()` 時の `closeButton?.focus?.()` および `close()` 時の `opener?.focus?.()` を撤去。開閉時に `blur()` でフォーカス状態を解除し、要素にフォーカスが残らないように改修。
  - モーダル表示中のTabキー操作の抑止、および万一のフォーカス発生時に即座に `blur()` するハンドラを整備。
  - 仕様書 [03.ui_style_conventions.md](file:///c:/Users/tioak/Documents/Games/Projects/GameWorksOAK/CanWeBecomeHeroes/docs/specifications/03.ui_style_conventions.md) に「操作モデルとフォーカス規約」を新設し、ポインター専用・フォーカス排除規約を明記。

#### R3対応：仕様書・検証記録と現在の設定項目の完全整合
- **指摘内容**: タイトルからは「言語・チュートリアル」、HUDからは「言語・チュートリアル・ゲーム進行・頭上ステータス」の4項目を表示する実装に対し、一部文書がチュートリアル追加前の記載となっていた。
- **対応内容**:
  - `docs/specifications/06.localization.md`: タイトル起動時は「言語」「チュートリアル」を表示し、HUD起動時は「言語」「チュートリアル」「ゲーム進行」「頭上ステータス」の4セクションを表示する旨、およびキーボード操作・フォーカスを行わない仕様を反映。
  - `docs/specifications/03.ui_style_conventions.md`: 設定モーダルの単一アクション行クラス（`.SettingsModal__ActionRow`, `.SettingsModal__ActionLabel`, `.SettingsModal__ActionButton`）を追記。
  - 本報告書の構成、およびオーナー検証候補を4セクション/2セクション構成に完全整合。

## 3. 変更ファイル一覧

1. `package.json`, `package-lock.json`: バージョンを `0.35.2` へ更新
2. `public/data/text/ui.json`: `challengeMode` 文言修正、`tutorial`, `resetTutorial`, `reset` 追加
3. `src/app/SettingsModalController.js`: 共通設定モーダル管理クラス新設、focus呼び出し撤去・フォーカス解除・Tab抑止
4. `src/app/TimeSettingsController.js`: モーダル開閉責務を削除し、時間設定専任へ整理
5. `src/app/TitleMenu.js`: 専用設定パネルを撤去し、共有設定モーダルへ委譲
6. `src/app/GameApp.js`: `SettingsModalController` 配線、グローバルTabキーフォーカス移動抑止
7. `index.html`: 設定セクションの `fieldset` に識別用ID付与、チュートリアルセクション追加
8. `src/styles/screens.css`: `TitleMenu` のレスポンシブ実値調整
9. `src/styles/modal.css`: `.SettingsModal` の `z-index: 35`、`.ModalFormSection[hidden]` ルール追加
10. `src/styles/app.css`: グローバルフォーカス枠線排除ルール、`.SettingsModal__Dialog` の `min-height`、チュートリアルアクション行スタイル追加
11. `tests/implementation/SettingsModalController.test.js`: 共有設定モーダル・TitleMenu連携・フォーカス排除テスト新設（計6件）
12. `tests/implementation/TimeSettingsController.test.js`: モーダル分離に伴うテストの整理
13. `docs/specifications/03.ui_style_conventions.md`: 操作モデルとフォーカス規約、SettingsModalアクション行UI規約追記
14. `docs/specifications/06.localization.md`: 共有設定モーダルによる言語切替およびフォーカス排除仕様の反映
15. `docs/planning/backlog.md`: チュートリアルリセット機能の実装タスク追記

## 4. テストおよび検証結果

### 4.1 対象テスト
- コマンド: `node --test tests/implementation/TimeSettingsController.test.js tests/implementation/ModalSelect.test.js tests/implementation/LocalizedUI.test.js tests/implementation/TranslationIntegrity.test.js tests/implementation/SettingsModalController.test.js`
- 結果: 17件すべて成功（pass 17, fail 0）

### 4.2 全自動テスト
- コマンド: `npm.cmd test`
- 結果: 407件すべて成功（pass 407, fail 0）

### 4.3 本番ビルド
- コマンド: `npm.cmd run build`
- 結果: 正常完了（エラーなし）

### 4.4 ブラウザ表示・実機再現検証
- 基準viewport確認（PC 1280x720, タブレット 768x1024, スマホ縦 390x844, 横 844x390, 低い横 667x280）:
  - ロゴ、全ボタン、クレジットが画面内に収まり、はみ出しや画面スクロールなし。
- キーボード操作・フォーカス排除確認:
  - タイトル画面でTabキーを押しても、どのボタンにもフォーカス枠が表示されず、フォーカス移動が発生しない。
  - タイトル画面からマウスで「設定」をクリック: 「言語」と「チュートリアル」セクションのみ表示。言語ドロップダウンが2行展開。背面のメニュー操作は抑止。
  - 設定モーダル表示中もフォーカスは当たらず、フォーカス枠（アウトライン）が一切表示されない。
  - モーダル表示中にTabキーを押してもフォーカス移動は発生しない。
  - モーダルの「閉じる」ボタンをクリックして閉じた後、タイトルの「設定」ボタンにフォーカス枠が表示されない。
  - ゲーム開始後、HUDの「⚙ 設定」をクリック: 言語・チュートリアル・ゲーム進行・頭上表示の4セクションがすべて表示される。
  - HUD設定表示中はゲームが停止し、閉じると設定による停止理由のみが解除される。

## 5. オーナー検証候補（画面操作・見た目で確認できる項目）

各項目は確認1件ずつとして記載する。

- `OV-TITLE-01` タイトル画面で、クリアー後に表示されるモード名ボタンが「チャレンジモード」と表示されていることを確認する。
- `OV-TITLE-02` タイトル画面で「設定」ボタンを押したとき、設定モーダルが開き、「言語」と「チュートリアル」セクションのみが表示される（ゲーム進行・頭上表示が表示されない）ことを確認する。
- `OV-TITLE-03` タイトルの設定モーダルで言語選択を開いたとき、スクロールバーなしで選択肢（日本語・English）が展開されることを確認する。
- `OV-TITLE-04` タイトルの設定モーダルで言語を英語・日本語に切り替えたとき、タイトルおよび設定の文言が即座に切り替わることを確認する。
- `OV-TITLE-05` タイトル画面および設定モーダル上でTabキーを押してもフォーカス枠が表示されず、キーボード操作でボタンが選択・実行されないことを確認する。
- `OV-TITLE-06` スマートフォン横画面相当（高さ390px以下、最小280px）でも、タイトル画面のロゴ・全ボタン・クレジットが画面内に収まり、はみ出さないことを確認する。
- `OV-TITLE-07` ゲーム中のHUDから「⚙ 設定」ボタンを押したときは、言語・ゲーム進行・頭上ステータス・チュートリアルのすべての設定項目が表示されることを確認する。


## 6. v0.35.3 での追加対応 (R1・R4 指摘の解消)

### 6.1 R1対応: キーボード操作とフォーカス残存の完全排除
- **対応内容**:
  - `src/app/GameApp.js` にて、`keydown` イベントにおける特定キー (Tab, Enter, Space, 矢印など) の標準動作をグローバルに無効化。
  - `src/app/GameApp.js` にて、`focusin` イベントを捕捉し即座に `blur()` を実行することで、マウスクリック後にボタン等の要素にフォーカスが残る問題をゲーム全体で完全に排除。
  - `src/app/SettingsModalController.js` 内の不完全だったローカルのフォーカス・キーボード抑止処理を撤去し、グローバル処理へ一本化。
  - `src/app/ModalSelect.js` からプログラムによる `this.trigger.focus()` の呼び出しを削除。

### 6.2 R4対応: バックログの整理
- **対応内容**:
  - `docs/planning/backlog.md` の「要望・バグ指摘」に残っていた、今回の開発対象3項目（モード名修正、タイトル設定機能、狭い画面での収まり）を実装済みとしてリストから削除・整理。

### 6.3 バージョン更新と再検証結果
- バージョンを `0.35.3` に更新。
- **対象テスト**: `node --test tests/implementation/TimeSettingsController.test.js tests/implementation/ModalSelect.test.js tests/implementation/LocalizedUI.test.js tests/implementation/TranslationIntegrity.test.js tests/implementation/SettingsModalController.test.js`
  - 結果: 15件すべて成功 (pass 15, fail 0) ※SettingsModalのローカルイベントテスト削除に伴い件数変動
- **全自動テスト**: `npm test`
  - 結果: 405件すべて成功 (pass 405, fail 0)
- **本番ビルド**: `npm run build`
  - 結果: 正常完了（エラーなし）


## 7. v0.35.4 での追加対応 (OV-TITLE-07 指摘の解消)

### 7.1 対応内容
- `index.html` 内の `SettingsModal__Body` において、`settings-section-tutorial` セクションの配置順序を `settings-section-overhead-status` の直後（末尾）へ移動。
- これにより、HUDからの設定起動時における表示順序を「言語 → ゲーム進行 → 頭上ステータス → チュートリアル」へ修正。
- タイトルからの起動時はゲーム進行・頭上ステータスが非表示となるため、従来通り「言語 → チュートリアル」の順序が維持される。

### 7.2 バージョン更新と再検証結果
- `package.json` および `package-lock.json` のバージョンを `0.35.4` へ更新。
- **追加の修正 (デグレード解消)**: v0.35.3で追加したグローバル `focusin` 処理が `SELECT` や `INPUT` 等のフォーム操作も阻害していたデグレードを修正しました。
- 対象テスト・全自動テスト・本番ビルドを再実行し、すべて成功を確認。
- OV-TITLE-01〜07（05A〜05C等含む。08は存在しない）はOK記録を維持。OV-TITLE-07 の表示順のみ今回修正により再確認対象として更新。

## 8. v0.35.5 での追加対応（Edgeでのチェックボックス操作後フォーカス残留問題の修正）

### 8.1 対応内容
- `src/app/GameApp.js` の `focusin` イベント処理を修正し、`INPUT`（チェックボックスやレンジスライダー等）へのフォーカスも `blur()` によって即座に外すように変更しました。これにより、ポインター操作を維持しつつ、チェックボックス操作後にフォーカスが残る問題を解消しました。

### 8.2 バージョン更新と再検証
- `package.json` および `package-lock.json` のバージョンを `0.35.5` に更新。
- **全テスト**: `npm test`
  - 結果: 405件すべて成功 (pass 405, fail 0)
- **本番ビルド**: `npm run build`
  - 結果: 成功（エラーなし）
- 差分チェック（`git diff`）を実施し、意図しない変更が含まれていないことを確認しました。
- 既存のOV-TITLE-01〜07のOK履歴を維持できる修正内容であることを確認しました。

## 9. v0.35.6 での追加対応（R6・R7・R8 指摘の解消）

### 9.1 対応内容
- `docs/specifications/06.localization.md` のHUD設定表示順を「言語 → ゲーム進行 → 頭上ステータス → チュートリアル」へと修正し、最新の実装・オーナー指示と整合（R7対応）。
- 本報告書の先頭バージョンを現在の `0.35.6` に更新し、過去の検証IDについての混同（08が存在しない等）を整理（R7対応）。
- `GameApp.js` の末尾空白、および `SettingsModalController.test.js` 末尾のEOF空行を除去し、`git diff master --check` の失敗を解消（R8対応）。

### 9.2 バージョン更新と検証記録（R6対応）
- `package.json` および `package-lock.json` のバージョンを `0.35.6` に更新。
- **対象テスト**: `node --test tests/implementation/TimeSettingsController.test.js tests/implementation/ModalSelect.test.js tests/implementation/LocalizedUI.test.js tests/implementation/TranslationIntegrity.test.js tests/implementation/SettingsModalController.test.js`
  - 結果: 15件すべて成功 (pass 15, fail 0)
- **全自動テスト**: `npm test`
  - 結果: 405件すべて成功 (pass 405, fail 0)
- **本番ビルド**: `npm run build`
  - 結果: 成功（エラーなし）
- **品質チェック**: `git diff master --check`
  - 結果: 成功（末尾空白・改行コード等の警告なし）
- **入力抑止を通る回帰検証・実ブラウザ相当の確認**:
  - 実装担当側での確認として、フォーカスを解除しながらチェックボックス（スタミナ自動停止等）のクリックによるON/OFF切り替え、およびそのラベルクリックによるON/OFF切り替えが正常に機能することを確認。
  - レンジスライダー（速度ドラッグ）、セレクトボックス（言語選択・頭上表示の選択）がポインター操作で機能することを確認。
  - いずれの操作後もフォーカスが即座に外れ（`activeElement`が`BODY`に戻る）、SpaceやEnter等のキーボード操作による再操作が抑止されることを確認。
