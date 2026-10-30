# v0.78 公開前総点検の指摘と残る確認

## 判断基準

対象は `chore/v0.78-pre-release-audit`、確認バージョンは `0.78.0`。
P1は主要操作・開始を妨げる問題、P2は規定・設計契約・環境エラーへの対応不足、P3は保守性・文書の問題とする。
重要度は点検担当の提案であり、修正範囲や公開判断の合意を代替しない。
以下は初回点検で見つかった既存実装の指摘であり、バージョン更新が発生原因ではない。オーナーの修正指示後の対応は次の表に記録する。

## オーナー判断と対応

| ID | 判断・対応 |
| --- | --- |
| AUD-078-01 | 固定英文とRetryを承認。起動時だけの広い受け皿として、index.htmlの先行scriptとmainの初期化失敗を同じ画面へ接続。JSON・初期画像・JS・CSS・保存領域アクセス失敗とRetry復帰を自動確認。表示検証OV-AUD-078-01は項目確認済み |
| AUD-078-02 | オーナー指示「修正不要」。HUDの縮小・寸法・操作を変更していない。指摘を修正済みや実機確認済みへ読み替えない |
| AUD-078-03 | 旧heroProgressからlegacyClearを生成する処理を削除。要求・仕様・テストを現在の形式に揃えた。現在のheroProgressの解放責務は維持 |
| AUD-078-04 | ゲーム所有のis-*をstate-*へ統一。共通TutorialManager所有のhidden/arrow-up/arrow-downは外部DOM契約のため変更せず、固有規約へ境界を明記 |
| AUD-078-05 | 準備エリア幅の説明を現在の算出元GAME_AREAS.preparation.width（744px）へ修正。Cameraテストの古い説明も修正 |
| AUD-078-06 | docs/content/01.hero_character_profiles.mdへ改名。通常文書・ソースに旧名参照なしを確認 |
| AUD-078-07 | UIElement.createElementへ集約。指摘5件に加え同一処理のInformationWindowElementFactory/RecordScreen/TrialRunResultModalも同じ生成処理を利用 |
| AUD-078-08 | 共有する結果の一文をui.jsonのlang-storeへ移し、Repositoryで解決。日英の既存文言・URL・ハッシュタグは維持 |
| AUD-078-09 | 提示した日英文言を承認。画面下部へ未保存通知・保存再試行を追加。通知をアプリで保持し、再試行はRepository.saveだけを呼ぶ。表示タイミングを説明後、OV-AUD-078-09の項目確認済みを受領 |
| AUD-078-10 | 追加点検でTitleMenu.closePanel、RecordScreen.open/selectTab/順位基準切替の明示focus()4件を発見。オーナーの「今回削除する」に従い削除。固有UI規約03第2節への是正で、文言・ゲームルールの変更なし |

## 指摘一覧

| ID | 重要度 | 事象 | 公開への影響 | 推奨対応 |
| --- | --- | --- | --- | --- |
| AUD-078-01 | P1 | 起動時の文言JSON取得失敗で開始画面が出ず復帰UIもない | 一時的通信障害・503・404でゲームを開始できない | 起動エラーの表示と再試行を設計・実装し、障害注入で確認 |
| AUD-078-02 | P1 | 小画面のHUDを操作部ごと縮小し、停止ボタンが高さ約10pxになる | スマートフォンで読みにくく操作しにくい | 操作部の可読性・操作寸法を確保するレイアウトへ変更 |
| AUD-078-03 | P2 | 旧クリアーフラグを新しい記録へ引き継ぐ処理と仕様・テストが残る | v0の旧データ移行禁止という固有指示と不整合 | 不要な旧フラグ引継ぎと対応仕様・テストを整理する範囲を合意 |
| AUD-078-04 | P2 | 状態クラスに `is-*` 等を使い、`state-*` と混在 | 通常プレイの停止は観測なし。CSS契約への不適合 | ゲーム所有の状態クラスと参照・テストを一括して規約へ揃える |
| AUD-078-05 | P3 | ランタイム仕様に準備エリア幅796pxとあるが実装は744px | 表示計算の修正時に誤った定数を使うおそれ | 仕様02のHUD説明を現在の算出元に一致させる |
| AUD-078-06 | P3 | 通常文書hero_character_profiles.mdに順序番号がない | 文書命名の不適合。ゲーム動作には影響しない | 通常文書へ番号を付け、参照を更新 |
| AUD-078-07 | P3 | 同一DOM生成ヘルパーが5モジュールで重複 | 共通化原則に不適合。変更時に差異が生じるおそれ | 小さいUI共通ヘルパーへ集約する範囲を合意 |
| AUD-078-08 | P2 | 共有結果の静的な日英文をJSで言語別に保持する | 言語文言をpublic/data/textへ集約する固有仕様と不整合 | 原文を変えずにリソース化し、Repository経由で解決する |
| AUD-078-09 | P2 | 記録保存の環境エラーをconsoleにだけ報告する | 利用者が未保存を認識できず、終了すると記録を失う可能性 | 既存のUI対象外方針と共通ルールを照合し、通知・再試行の扱いを決定 |

## 個別の根拠と確認方法

### AUD-078-01 起動失敗

- 規定: 共通05第2節、CC-4.25〜27。環境エラーを放置せず復帰手段・代替表示を設ける。
- 実装: `src/main.js:6` → `src/app/GameApp.js:29` の文言読込await → `src/game/GameTextRepository.js:16` のPromise.all。起動側に失敗UI・再試行の境界がない。
- 共通通信ラッパーはHTTP異常を例外にする責務を果たす。ゲーム側で利用者への通知が必要であり、共通部の例外を握り潰す修正では解決しない。
- 一時本番ブラウザー調査で `/CanWeBecomeHeroes/data/text/ui.json` だけ503へ置換。`CommonFetch: Failed to fetch ... Status: 503 Service Unavailable` がpageerrorに出て、bodyの文字は歯車だけ、開始コマンドは0件だった。
- 証拠: `tmp_audit_failure.json`、`tmp_audit_failure.png`、一時調査 `tmp_audit_extra.pw.js`。
- 文言追加が必要になるため、実装前に場所と変更前後の全文の合意を取る。

### AUD-078-02 HUDの縮小

- 規定: 共通07第6節。scaleでも可読性・操作性を維持し、維持できなければ配置・内部スクロール等を調整する。数値の最低操作高は共通規定の直接引用ではない。
- 実装: `GameApp.js` の `syncHudScale` は `min(1, GAME_AREAS.preparation.width * camera.zoom / 296)`、`styles/app.css` のHudPanelが全体へscaleを適用する。カメラのズームを下げると操作部も際限なく小さくなる。
- 本番390×844で既読チュートリアル状態を設定し、開始・劇スキップ・課題選択後の可視HUDを測定。倍率0.327336、停止ボタン28.3401×9.8201 CSS px。13pxの文字の見かけは約4.26px。
- `tmp_audit_hud.png` を目視し、左上操作部が極端に小さいことを確認。DPRを上げてもCSS上のタップ面積は増えない。
- 根拠: `tmp_audit_hud.json`。合成viewportでの測定であり、実機Safariの操作を確認済みとはしない。
- 修正時には日英・縦横・最小ズームで、停止/再開・ログ履歴・画面端Hero操作が維持されることを確認する。

### AUD-078-03 旧フラグ引継ぎ

- 固有指示: `docs/planning/01.branch_workflow.md` はv0の旧localStorageデータの引継ぎ・移行・補正・旧評価維持を禁止する。
- `src/game/RunRecordsRepository.js:8` は新規記録へ旧heroProgressを受け取り、14行の `legacyClear` へ旧hasClearedTrialを写す。33行で旧データを渡す。
- 仕様16の9行と要求06の34行に旧クリアーフラグ維持、`tests/implementation/game/RunRecordsRepository.test.js:20` に引継ぎ期待がある。
- Nodeで実Repositoryへ `heroProgress={hasClearedTrial:true}`、runRecords未保存を入力し、`legacyClear:true, clearCount:0` を確認。新規記録生成時に旧状態を引き継ぐ事実を再現した。
- `heroProgress` 自体は現在の解放にも使われるため、その全削除は提案しない。旧フラグ引継ぎと現在の保存責務を区別する必要がある。
- テストが成功しても固有指示との矛盾は解消しない。テストを都合よく変えず、仕様・対応範囲をオーナーと確認する。

### AUD-078-04 状態クラス

- 規定: 共通06の状態は `state-*`。機能のUpperCamelCaseと固有03の `__` 要素名・`--` variantは区別する。
- `styles/app.css:287` とTimeSettingsControllerの `is-raised`、information-window.cssの `is-pinned/is-compact`、information-window-detail.cssの `is-active/is-available`、tutorial.cssの `is-tutorial-hidden/is-centered` を確認。
- tutorialの `.hidden`・`.arrow-up/.arrow-down` も表示状態・向きとしての役割を持つ。共通TutorialManagerが生成するクラスとの境界を確認し、ゲーム担当だけで共通ソースを変更しない。
- `rg -n 'is-|state-|classList' src` でCSSと生成・切替・検索を照合。置換では本番描画と既存テストを併せて確認する。

### AUD-078-05 現在の幅と説明の不一致

- 共通02は現在の意味・意図を記す。`docs/specifications/02.runtime_systems.md:243` は準備エリアを796pxと説明する。
- `src/game/GameAreas.js` は `PREPARATION_PANEL_WIDTH` を参照し、実値は744px。要求02の準備幅も744px、実行中のHUD計算もこの値を使う。
- HUDそのものの仕様変更とは分け、算出元の現在値を正しく記述する。

### AUD-078-06 文書番号

- 共通02第1節の命名、CC-1.04/05。通常文書 `docs/content/hero_character_profiles.md` は無番号。
- README、backlog.md、phase_*は別に正式名称が定められているため同じ指摘には含めない。
- `rg --files -g '*.md'` で確認。改名時はMarkdownとソース・テスト内の参照も検索する。

### AUD-078-07 DOMヘルパーの重複

- 共通05第1/4節は同じ目的の処理の共通化を求める。
- TitleMenu.js:7、ModalDialog.js:1、ModalSelect.js:1、StageSelectionModal.js:15、StartPartySelectionModal.js:12 のcreateElementは同じ引数・既定値・処理本体。
- modal構造自体はcreateModalDialogへ共通化済み。残る小さい生成ヘルパーの重複だけを指摘し、大規模なUI再設計は提案しない。

### AUD-078-08 共有文の配置

- 固有仕様 `docs/specifications/06.localization.md` 第1/2/5節は、静的表示文言をpublic/data/textのlang-storeへ置き、UIは解決済み文言を受け取る。
- `src/app/TrialResultShareService.js:6` のMESSAGESはja/en別オブジェクトで結果の一文を保持し、createTrialResultShareTextが言語を選ぶ。
- 共有文の内容は仕様17に定義済みで日英テストもある。翻訳内容の誤りは指摘していない。文言リソースの配置・解決責務だけが不整合。

### AUD-078-09 保存失敗の利用者通知

- 共通05第2節、CC-4.25/27。`TrialSession.js:99` のattemptSaveはQuotaExceededError/SecurityErrorをconsole.errorで報告してゲームを継続する。
- Repositoryはメモリと未保存状態を保持し、再保存の二重集計を防ぐ。既存RunRecordsRepositoryテストで保存例外と再試行を確認済み。
- ただし利用者に未保存であることを示す表示と再試行操作がない。要求06、仕様16/17はこれを後続UIまたは対象外と明記しており、通常フローだけのバグとして無断修正しない。
- 共通規定への適合と既存の個別スコープの整理を相談する。今回、実ブラウザーでQuotaの自然発生・端末ストレージ拒否は再現していない。
- 共通DataManagerのconstructorはlocalStorage.getItemのSecurityErrorを受け止めない。ゲーム起動時のストレージ不可も、AUD-078-01の環境エラー境界を設計する際の確認対象とする。共通部の変更は行わない。

## 未確認事項と公開時に残る確認

| ID | 不足する証拠・確認 | 次に必要な作業 |
| --- | --- | --- |
| UC-078-01 | Safari実機の回転・アドレスバー伸縮・safe area・タッチ/ピンチ/長押し・共有描画 | 修正範囲を決めた後、必要な実機検証を操作単位のID・手順・期待結果・版付きで提示する。未回答を保留へ移さない |
| UC-078-02 | 現在配信中のJSON・素材、ポータル表示、合意済み公開予定の原チャット、リモートCI/デプロイ結果 | ローカルにpending/11月予定と一覧登録はある。Web取得はツールから取得不可で、404・公開成功のどちらとも断定できない |
| UC-078-03 | 過去フェーズの開始・合意・終了承認の原チャット | Git成果物と終了コミットはあるが、承認そのものは履歴から推測しない |
| UC-078-04 | 全コードの不要ガード・副作用・マジックナンバー・全文章装飾意図の個別精読 | 主要構造と全体機械走査の結果を越えて、全面的適合としない。該当CC行は未確認 |

公開時には `11.game_release.md` に従い、公開指示とMajor v1への明示指示、版と表示一致、履歴作成、共通6コマンド、削除とマージ・push、デプロイと公開URLの実動作、publishedへの切替・実日付バッジ・強調期間の合意を確認する。
今回のv0.78点検は公開許可やこれらの実操作を含まない。

## オーナー検証

`OV-LIGHTNING-06` は本チャットの「ok」で確認済みとし、backlogから削除した。
`OV-CLOTH-07`、`OV-WATER-03`、`OV-REPUTATION-07` は既存保留を維持し、再依頼していない。
新規の `OV-AUD-078-01` と `OV-AUD-078-09` は実装と画像・自動検証結果を添えて提示し、両件とも項目確認済みを受領した。保留欄へ追加していない。

## 合意した対応範囲

AUD-078-02は修正せず、01/03〜09と追加承認した10を今回是正する。起動エラーは起動時だけ、固定英文で多言語化しないというオーナー指示を優先する。
個別根拠の節は初回点検時の観測を記録したもので、修正後の状態は本表と実装報告の検証結果を参照する。
公開先・実機・過去チャット等の未確認は自動検証成功と混同しない。点検担当から公開可能とは判定しない。
