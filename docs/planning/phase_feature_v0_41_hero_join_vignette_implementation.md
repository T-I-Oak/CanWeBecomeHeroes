# Hero加入寸劇の実装結果

## 計画に対する実装

- バージョンは `0.41.0`。基本シナリオ「戦いぶりを見ていた」を1件実装した。基本シナリオの一覧全N件から均等抽選し、候補を追加すると抽選対象が増える。
- 呼び出し側が `RecruitmentCast` で戦闘スロット2→3→1→4、続いて準備枠順でA・B・Cを決定する。ジェネレーターは所在を参照せず、確定した役とHero ID、討伐済みの敵構成を受け取る。
- 2人ではA→B→X→B→X→A、3人ではA→B→X→C→X→A。6発言役×8人の日本語台詞をオーナーと決定し、英語訳も用意した。仮セリフは残っていない。
- 会話設定資料の確定情報と初稿を区別し、台詞の個性を残して接続を調整した。初対面の距離感、人数に依存しない表現、試験に参加済みである前提を反映した。
- 背景は平原と森の横長パノラマ。基本シナリオは平原を表示する。共通背景コマンドの `offsetX` で表示開始位置を指定できる。
- 味方・敵の足元、横間隔、サイズを同じ遠近投影で求める。敵はスロット1～6を左から右へ交互に置き、奥列を半枠右へずらす。スロット3はAとBの中間。中ボスと雑魚のサイズ比は1.5。追加の接地影はオーナー指示により使用しない。
- 枠の開閉、味方と敵の踏み込み、敵の飛び去り、右からのX登場を既存プレイヤーで再生する。話者の動きは `line.action` のhopで指定し、座標指定から分離した。
- 中ボス課題完了→加入候補抽選→加入劇→Heroと装備の追加・加入数更新→次の課題選択の順とする。Skipも劇完了と同じ加入確定処理を行う。既存のHeroが候補なら劇を再生しない。終了したランでは次の選択や加入劇へ進まない。
- 知り合い同士の合流劇は今回は実装しない。必要性を将来再検討する項目を、バックログの要望・バグ指摘の後方に追加した。必要と決めたときに専用シナリオと明示的な選択分岐を追加する。

## 検証

- 対象テストは加入候補と確定の分離、劇完了まで仲間が増えないこと、二重確定防止、既存Hero候補の扱い、役の選択、人数による話者変更、6役割×8人の言語リソース、遠近投影とスロット順、line.action、開始劇への影響を確認した。
- 対象コマンド: `node --test tests/implementation/RecruitmentController.test.js tests/implementation/TrialRunFlow.test.js tests/implementation/RecruitmentVignette.test.js tests/implementation/RecruitmentVignetteLayout.test.js tests/implementation/VignetteLineAction.test.js tests/implementation/VignettePlayer.test.js tests/implementation/StartVignette.test.js`。全件成功。
- 全テスト: `npm.cmd test`。確認用画面削除後に472件成功、失敗0件。
- 本番ビルド: `npm.cmd run build`。確認用画面削除後に成功。
- ブラウザーではPC、スマートフォン縦横、2人・3人Party、敵6スロット、Xの登場とSkipを確認した。ランダム設定30回で人物の重複防止と全6発言の表示を確認した。
- 途中のテスト失敗は英語テスト用localStorageと投影計算の浮動小数点比較に起因し、テスト環境と許容誤差を修正した。共通ライブラリを変更していない。

## オーナー検証と対応

- `OV-JOIN-01` 背景、配置、サイズ: 遠景に浮く配置、消失点、半枠ずらし、スロット3の位置の指摘を反映。背景を平原に指定し、影を削除した。
- `OV-JOIN-02` 動作、敵の退場、X登場: 確認画面でレビューを進め、今回の基本加入劇で終了する方針を得た。
- `OV-JOIN-03` 人数、話者、吹き出しと台詞: 2人・3人の切り替えを確認可能にし、全6発言の日本語台詞を順次承認・反映した。話者の動きはlineのオプションへ変更した。
- ゲーム内の加入順序は、劇の後に準備エリアへ追加するよう修正し、オーナーより「確認ok」を得た。
- 最後に、知り合い劇を将来の必要性判断へ回し、今回はここまでで終了するとのオーナー指示を得た。未対応のフィードバックや今回の加入劇の保留項目はない。

## 確認用画面の削除

- `dev_recruitment.html`、`src/dev_recruitment.js`、`src/styles/dev_recruitment.css`を削除した。台詞作成用の一時スクリプトも削除した。
- 本番ソースに確認用画面の参照やランダム設定ボタン、台詞一覧の専用処理が残っていないことを検索で確認した。
- 保存済みの引継ぎ書は変更していない。次のフェーズの引継ぎ草案はチャットに提示し、承認後に保存する。

## 背景制作

保存先: `public/assets/vignette/trial-field.png`。組み込みimagegenを使用した。

最終生成プロンプト:

> Expand this game-background reference into a continuous ultrawide horizontal painted panorama. Required aspect ratio 2.8:1, intended 1120x400 pixels (twice a 560x400 game viewport). Reference is style and scene reference. LEFT HALF is open pastoral trial battlefield like current image: broad empty grassy trampled-earth clearing with distant hills and blue cloudy sky, clear foreground and midground for circular game character overlays. RIGHT HALF is dense lush forest: many trunks, layered canopy, dark green understory, depth through woodland, a visible earthy forest floor. A large tree trunk and especially a BIG foreground bush mark transition around x=750-850 of total 1120, so a viewport spanning x=280..840 shows grassy ground on left and woodland edge/tree/bush on right like reference. Far-left crop x=0..560 should work as a plains scene; far-right crop x=560..1120 should work as forest scene. Maintain continuous ground perspective and soft painted muted green ochre fantasy illustration style throughout. Put big near bush at transition, lower right of central crop, enough to hide character before it hops out. No people, enemies, animals, icons, circles, text, UI, frames. Deliver wide PNG panorama with aspect ratio 2.8:1, not a square or tall image. Return local saved path.
