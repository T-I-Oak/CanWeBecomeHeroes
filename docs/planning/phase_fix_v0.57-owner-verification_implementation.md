# v0.57 オーナー検証フィードバック対応 実装報告

## 対象と状態

- ブランチ: `fix/v0.57-owner-verification`
- バージョン: `0.57.2`。終了草案提示後の実装修正着手時にPatchを更新。package.json、package-lock.jsonのルートとpackagesの設定を同期。
- 計画: `phase_fix_v0.57-owner-verification_plan.md`
- 実装フェーズ開始の宣言後、オーナーの`ok`を受領して着手。
- 引継ぎ書は未更新。終了草案の承認前にコミットしない。

## オーナー判断の反映

| ID | 判断 | 対応 |
| --- | --- | --- |
| OV-EXAM-NAME-09/10 | 項目確認済み | バックログから削除 |
| OV-FORTUNE-01 | 項目確認済み | バックログから削除 |
| OV-ARCANE-01 | 項目確認済み | バックログから削除 |
| OV-CLOTH-03/13 | 項目確認済み | バックログから削除 |
| OV-WATER-01/04 | 意味不明。却下。 | 確認済みとせずバックログから削除 |
| OV-FORTUNE-06 | 文言修正後、項目確認済み | 指定文言へ修正。いったん保留の判断を受領した後、2026-10-20に`ok`を受領。保留を解除しバックログから削除 |

確認済みは6項目、却下は2項目。これらの再検証は依頼しない。

## 文言と仕様書

`public/data/text/information/unique-skill.json`の日本語Ex説明を修正し、表示仕様書の対応文言も同期した。

- Ex1: 不運状態の攻撃者の会心ダメージは半分自身に跳ね返る。
- Ex2: 不運状態の攻撃者の会心ダメージはすべて自身に跳ね返る。

戦闘計算は変更していない。

## 指定20項目の自動検証

追加ファイル: `tests/spec/03.unique_skill_owner_verification.test.js`。
以下のテスト名は同ファイルの名前に対応する。Ex1・Ex2の7群14件と復帰条件2件の計16件。
各IDの自動検証が成功した後、該当20項目をバックログから削除した。

| ID | テスト名の識別部分 | 検証内容 | 結果 |
| --- | --- | --- | --- |
| OV-FORTUNE-03 | OV-FORTUNE-03/14 Ex1 | 会心4の自傷2・相手2、両者にcombatCriticalと量200のポップアップ | 成功 |
| OV-FORTUNE-12 | OV-FORTUNE-12/14 Ex2 | 会心4の自傷4・相手0、自身だけにcombatCriticalと量400のポップアップ | 成功 |
| OV-FORTUNE-14 | 上記両Ex | 付与中のひび割れた四つ葉の描画、行動後の状態解除・画像描画消失 | 成功 |
| OV-ARCANE-03 | OV-ARCANE-03/13/14 | 炎・水・雷それぞれ8を4/2へ軽減、4/6を反射。ChipRendererで属性リングの縮小・反射先の描画 | 成功 |
| OV-ARCANE-13 | 同上 | 弱い再付与後も受け手のアイコン値・色・リングサイズを維持。反射先の既存値9も維持 | 成功 |
| OV-ARCANE-14 | 同上 | 双方が反照持ちでも反応解決は元の付与1回だけ。ポップアップ・雷光・タグ移動・攻撃演出を追加しない | 成功 |
| OV-WATER-06 | OV-WATER-06/07 | 水0から実際の攻撃でタグ数に応じた水を付与、アイコンと属性リングへ同期 | 成功 |
| OV-WATER-07 | 同上 | 命中した複数武器を集約し対象にcombatCriticalポップアップ1件、正のダメージ | 成功 |
| OV-FIRE-02 | OV-FIRE-02/12 Ex1 | ヘルハウンドへの剣・杖攻撃で攻撃者に炎0.2、アイコンとリング描画 | 成功 |
| OV-FIRE-10 | OV-FIRE-10/12 Ex2 | フェニックスへの剣・杖攻撃で攻撃者に炎0.8、アイコンとリング描画 | 成功 |
| OV-FIRE-12 | 上記両Ex | 既存炎9のアイコン値・色・リングサイズが再攻撃でも低下しない | 成功 |
| OV-LIGHTNING-02 | OV-LIGHTNING-02/12 | 雷を帯びたHeroの攻撃で5のゲージから0.5/1を奪い、所有者の1へ加算 | 成功 |
| OV-LIGHTNING-12 | 同上 | BattleSystem.updateの参加者構成を使い、雷光1本の始点が戦闘Hero、終点が発動者。待機Heroは含まない | 成功 |
| OV-REPUTATION-12 | OV-REPUTATION-12/14/15 | 付与されたEx1/Ex2の惑乱アイコンを実描画し、背景色rgb(0,51,255)/rgb(230,0,0)と画像を確認 | 成功 |
| OV-REPUTATION-14 | 同上 | 行動後の実際の継続判定を成功側の乱数に固定し、惑乱レベルと色が維持される | 成功 |
| OV-REPUTATION-15 | 同上 | 他の味方候補がいないと自分を選択。実際に攻撃してスタミナ減少・自傷イベント・正のポップアップを確認 | 成功 |
| OV-FEATHER-03 | OV-FEATHER-03/14 | 発動時点の全武器命中数を記録し、攻撃完了後に一度だけHeroを運ぶ。Enemyには発動しない | 成功 |
| OV-FEATHER-14 | 同上 | 両手・頭・胴・足の5装備すべてを解除し、倉庫に同一Itemを散乱 | 成功 |
| OV-FEATHER-12 | OV-FEATHER-12 | スタミナ2.99で着地後拾得を開始せず準備へ歩き、実際に到着。武器は倉庫に残る | 成功 |
| OV-FEATHER-13 | OV-FEATHER-13 | スタミナ3で第1武器を最初に選び、盾も回収して戦闘スロットへ実際に到着 | 成功 |

### 表示・演出の根拠と限界

- 共有fixtureへ任意のeffectsを渡せるようにし、実際のCombatEffectSystemを使用する。
- ダメージは内部数値だけでなく、画面用ポップアップの対象Chip・文言キー・量を確認する。
- 状態アイコンと属性リングは実際のChipRendererへ同期後のChipを渡し、Canvas呼び出しの画像パス・サイズ・背景色を記録する。
- Canvasの記録用contextと読み込み済み画像を用いた自動検証であり、ブラウザのピクセルや目視での美観を確認したものではない。
- 関連既存テストで白抜き画像の実PNG内容、アイコン配置、演出集約、全5装備の散乱方向・距離と倉庫内への収まりも検証する。
- 雷光テストは戦闘更新の参加者構成をそのまま使い、updateActorで攻撃だけを固定する。待機者のゲージ表示は通常の戦闘離脱処理によりnullへ消去される。
- 自傷テストは命中・ダメージ乱数を0にし、継続判定を実行するときだけ乱数を0.999へ変える。継続の実装自体は置き換えない。

### 暴風の翼の条件照合

`docs/requirements/03.unique_skills.md`の「暴風の翼」は、着地後のスタミナ3未満なら準備へ歩き、3以上なら第1武器を行き先として通常の再装備へ進むと定めている。
OV-FEATHER-12と13はこの別条件として検証でき、要求仕様と矛盾しない。
武器回収後の行き先は通常処理に従うため、常に戦闘へ戻るという仕様には変更していない。

## 実行結果

- 対象テスト: 下記コマンドで67件成功、失敗0。

```powershell
node --test tests/spec/03.unique_skills.test.js tests/spec/03.unique_skill_owner_verification.test.js tests/implementation/game/CombatEffectSystem.test.js tests/implementation/chips/ConditionIconLayout.test.js tests/implementation/chips/ConditionIconAssetContract.test.js tests/implementation/game/CombatGustSystem.test.js
```

- 全テスト: `npm.cmd test` 636件成功、失敗0。
- 本番ビルド: `npm.cmd run build` 成功。
- 差分検査: `git diff --check` 成功。

## 追加フィードバックと未完了事項

- OV-FORTUNE-06は、修正文言提示後の保留判断に続いて2026-10-20に`ok`を受領した。現在は確認済みであり、保留は解除済み。
- 2026-10-20、以下9項目についてオーナーの`ok`（項目確認済み）を受領し、バックログから削除した。再検証は依頼しない。
  - OV-EXAM-NAME-01
  - OV-BLESSING-06、OV-BLESSING-07
  - OV-IRON-03、OV-IRON-06、OV-IRON-07、OV-IRON-12
  - OV-FEATHER-06、OV-FEATHER-07
- 今回の追加判断は確認済みの反映のみで、実装変更はない。同じ修正版の作業中としてバージョン0.57.1を維持する。
- 2026-10-20、さらにOV-ARCANE-06、OV-LIGHTNING-09、OV-FORTUNE-06、OV-FORTUNE-07の4項目について`ok`（項目確認済み）を受領し、バックログから削除した。再検証は依頼しない。
- 2026-10-20、さらにOV-IRON-01、OV-CLOTH-01、OV-FIRE-01、OV-FIRE-05、OV-EXAM-NAME-02、OV-EXAM-NAME-03、OV-FEATHER-01、OV-ARCANE-07の8項目について`ok`（項目確認済み）を受領し、バックログから削除した。再検証は依頼しない。
- 実装フェーズは継続中。終了草案を更新して提示する前に、追加判断を含む最終状態で全テストと本番ビルドを再実行する。
- オーナーの「タイトルだけ残さないでください」の指示に従い、項目削除で空になった鉄・魔導・幸運・羽の見出しを削除した。以後も項目の削除時に空の見出しを残さない。
- 終了草案の承認後に引継ぎ書と変更一式をローカルコミットする。
- OV-EXAM-NAME-08について「勇者認定試験は危険ではない」との指摘を受領した。勇者になれば好きなだけ魔法を使えると考えて受験する人物像を確認し、以下の日本語案に`ok`を受領して情報ウィンドウと人物設定資料へ反映した。
  - 机上の術式より、実地で確かめる方が好き。勇者になれば好きなだけ魔法を使えると考え、勇者認定試験を受けに来た。
- OV-EXAM-NAME-08の文章承認と画面での表示・収まりの検証は区別する。英語も以下の案に「この案で承認」を受領し、そのまま反映した。同じ修正版の作業中として0.57.2を維持する。表示検証は下記のとおり実施し、項目をバックログから削除した。
  - Casey prefers testing spells in the field to studying formulas at a desk. Believing that becoming a hero would let her use magic as much as she liked, she came to take the hero exam.
- 日本語文言修正後、`node --test tests/spec/05.information_window.test.js`は5件成功、`npm.cmd test`は636件成功、`npm.cmd run build`と`git diff --check`も成功した。人物設定の動機欄には、承認された日本語紹介文の第2文をそのまま反映した。
- 承認済み英語文言を含む状態でも、`node --test tests/spec/05.information_window.test.js`は5件成功、`npm.cmd test`は636件成功、`npm.cmd run build`と`git diff --check`は成功した。

### OV-EXAM-NAME-08のブラウザ表示検証

- オーナーから「確認してください」の指示を受領。文言承認とは別に、担当AIがChromiumで実際のDOM・CSSを描画して検証した。オーナーにサイレントで再確認を課さない。
- v0.57.2のViteサーバーで、実際のInformationWindowLayer、Manager、GameTextRepositoryを使用。画面の情報ウィンドウ領域へケイシーの静的定義と実体（魔法使い）をそれぞれ開いた。
- 日本語・英語 × 静的定義・実体 × 1280×900、390×844、844×390、320×568の計16条件で成功。
- DOM Rangeで本文の折り返し位置を測定し、行の横はみ出し・段落下端の文字切れなし。本文の省略・line-clampなし。情報ウィンドウは全条件で画面内に収まり、内容領域に横スクロールなし。
- 静的紹介文は日本語3〜4行、英語5〜6行。実体の紹介文も全文を表示する。
- 実体の横画面844×390と小幅320×568では、装備・ステータスの下部に内部縦スクロールが必要。最下部へスクロールできることを確認した。紹介文は最初の表示で全文を読める。
- PC・スマートフォン縦横のスクリーンショットで紹介文を目視確認した。英語の小幅表示と内部スクロール後の下部も確認した。実機Safariの確認を行ったとは扱わない。
- 計測値と画像: `test-results/casey-layout/metrics.json`、同ディレクトリのPNG。実行用の一時スクリプト: `tmp_casey_layout.mjs`。ゲームの実装変更はない。
- OV-EXAM-NAME-08は承認済み文言と担当AIによる表示検証が揃ったため、バックログから削除した。オーナーによる表示確認済みと記録したものではない。

### 試験名称統一の開発側検証

- オーナーから、OV-EXAM-NAME全体は「勇者試験」から「勇者認定試験」へのリソース統一と表示の収まりを開発側で検証すべき項目、との指摘を受領した。以後、機械的な表記確認や担当AIが確認可能な収まりをオーナーへ委ねて完了としない。
- `rg -n '勇者試験' public/data src`で旧表記の残存0件を確認した。合格証明書の見出し・認定文、不合格本文、開始劇、施設・人物紹介の該当リソースが「勇者認定試験」であることを照合した。
- OV-EXAM-NAME-04: 実際のcreateStartVignetteで盗賊・狩人の開始劇を生成し、VignettePlayerを対象台詞まで再生してVignetteModalのCanvas描画を確認した。1280×900、390×844、844×390、320×568の4条件で、描画文字列が台詞全文と一致し、行の欠落・ステージ外へのはみ出しがない。縦横スクリーンショットでも確認した。
- OV-EXAM-NAME-05/06/07: 試験場・訓練場・ブライアーの実際の情報ウィンドウを日本語・英語、上記4画面サイズで検証。DOM Range、内容領域のスクロール幅、画面内の境界を照合し、文字切れ・横はみ出しなし。小幅320pxのスクリーンショットでも全文を確認した。
- 既に確認済みのエリス・フィンリーの紹介文も同じ方法で含め、情報ウィンドウは計40条件で成功した。確認済み判断を再依頼したものではない。
- 計測値と画像: `test-results/exam-name-layout/metrics.json`、`vignette-metrics.json`、同ディレクトリのPNG。一時実行スクリプトは`tmp_exam_layout.mjs`と`tmp_exam_vignette.mjs`。
- 残っていたOV-EXAM-NAME-04/05/06/07を開発側検証の完了として削除し、空になった「試験名称の表示確認」見出しと導入文も削除した。OV-EXAM-NAME項目の追加のオーナー検証は依頼しない。
- 表示確認はChromiumの指定viewportによる検証であり、スマートフォン実機の検証とは区別する。ゲームの実装・文言・バージョンは変更していない。

### 終了結果共有の判断と検証項目の整理

- OV-RESULT-SHARE-01/02についてオーナーの`ok`（項目確認済み）を受領し、バックログから削除した。個々の確認へ分割して再依頼しない。
- 「各項目は確認1件である。複数の確認を1件にまとめない。」が共有項目より後ろに埋もれ、共有項目自体も複数の確認をまとめていたとの指摘を受領した。ルールと運用説明を「オーナー検証」直下、全項目より前へ移した。
- 旧OV-RESULT-SHARE-03の端末共有は、画像が渡る確認（03）と本文が渡る確認（04）へ分割した。既存の後日確認の判断を引き継ぐ。新たな検証範囲・期限を追加したものではない。分割内容とID対応はチャットで提示する。
- 旧03に混在していたキャンセル後の再共有・裏返し・タイトル復帰、縦横のボタンの収まりは開発側の検証責務として取り出した。実施結果を記録するまで確認済みとはしない。
- 開発側検証: `node --test tests/implementation/app/TrialResultShareService.test.js`は7件成功。実画面の確認用ページでは、日本語・英語 × 合格・不合格・実力判定 × 390×844・844×390の12条件が成功した。
- ブラウザ検証は共有APIをAbortErrorでキャンセルする代替実装とし、2回連続で共有できること、失敗表示が残らないこと、裏返して内容が変わること、タイトルへ戻るボタンでモーダルが閉じること、3ボタンの矩形が画面内に収まることを確認した。タイトル復帰先のアプリ全体の遷移は既存の全体テストの対象であり、確認用ページのモーダル閉鎖だけと混同しない。
- 画像は`test-results/share-cancel/`、計測値は同ディレクトリの`metrics.json`、一時スクリプトは`tmp_share_cancel.mjs`。端末のネイティブ共有画面への実際の受け渡しを検証したものではなく、03/04は後日確認の判断を維持する。

### 運用記述の削除と終了時の状態

- オーナーの指示により、確認時期・条件を記録するルールをバックログ、ブランチ作業フロー、計画書から削除した。バックログの「日時未指定」や、項目を残した経緯だけを繰り返す説明も削除した。
- オーナーから実装フェーズをここまでとする意向を受領した。既存バックログに残る指定外のオーナー検証を新たに今回の必須作業とはせず、受領済みの判断・文言修正・開発側検証を引き継ぐ。
- 現在のバージョンは0.57.2。未対応の受領済みフィードバックはない。端末共有などの既存残項目はバックログを参照する。
- 最終確認結果: 下記の対象テスト79件成功、`npm.cmd test`636件成功、`npm.cmd run build`成功、`git diff --check`成功。失敗0件。

```powershell
node --test tests/spec/03.unique_skills.test.js tests/spec/03.unique_skill_owner_verification.test.js tests/spec/05.information_window.test.js tests/implementation/game/CombatEffectSystem.test.js tests/implementation/chips/ConditionIconLayout.test.js tests/implementation/chips/ConditionIconAssetContract.test.js tests/implementation/game/CombatGustSystem.test.js tests/implementation/app/TrialResultShareService.test.js
```

- ゲーム側の変更のみをコミット対象とし、GameWorksOAKは変更していない。保存済み引継ぎ書は終了草案の承認まで更新しない。
