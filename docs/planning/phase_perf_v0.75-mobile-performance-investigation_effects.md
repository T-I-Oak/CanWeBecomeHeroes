# 演出・常時処理の調査対象

## 調査範囲

現在のV1前の判断対象はゲームプレイ中の小変更だけである。
下表のタイトル・開始劇・結果等は追加合意前の調査履歴で、以後の追加比較や改善提案の対象から外す。
小変更そのものの比較と採否は[V1前の小変更候補](phase_perf_v0.75-mobile-performance-investigation_v1.md)にまとめる。

調査対象はゲーム側HEAD `6ab5aecedc9b616fdfb8be0ab38c8162b92ccfb8`。
通常ソースは変更せず、一時ビルドで処理時間・描画省略の比較を行う。
計測値と改善候補は[実装報告](phase_perf_v0.75-mobile-performance-investigation_implementation.md)に記載する。
本資料の「候補」はコード読解上の仮説であり、実測した改善率ではない。

## 演出一覧と計測の対応

| 演出・状態表示 | 実装経路と処理 | 今回の比較／未計測の範囲 |
| --- | --- | --- |
| 攻撃移動 | `CombatActionResolutionSystem` → `CombatEffectSystem.attack/update` → Chipのoffset → `ChipRenderer.drawBody` | 通常戦闘条件に含む。攻撃件数の個別追跡・固定比較は対象外 |
| 被弾移動・回転 | `CombatDamageSystem` → `CombatEffectSystem.damage/update`、0.34秒で復帰 | ダメージ文字12件のfixtureで同時更新。単独の移動量比較は未計測 |
| ダメージ・会心・ミス文字 | `CombatEffectSystem.popups/draw`、文言解決・strokeText/fillText、0.8～0.9秒 | ダメージ12件、混在12件。会心色・ミス単独は未計測 |
| 雷伝播 | `CombatAttributeSystem`・`CombatDamageReactionSystem` → `lightningPropagation`、0.22秒、6分割の折線・shadowBlur=10 | 1本／12本／混在、混在時のshadowBlur=0（shadowColor維持） |
| タグ転送 | 行動・武器効果 → `tagTransfer`、0.32秒、枠付きタグの放物線移動 | 混在12件。単独件数比較は未計測 |
| 夜の使い魔の公転 | `CombatConditionSystem.summonNightFamiliars` → Map内の個数だけsprite描画、出現時0.45秒で軌道拡張 | 1体／12体／混在、混在時のfilter省略 |
| 使い魔の飛行 | 行動解決 → `launchNightFamiliar`、0.28秒の放物線移動。同じsprite/filter経路 | 飛行単独は未計測。公転の結果を飛行全体の実測値とは扱わない |
| 惑乱 | `CombatConditionSystem` → `bewilder`、1対象につき3枚の回転sprite | 1対象／12対象／混在 |
| 物理盾 | `ChipRenderer.drawEffects` → `drawPhysicalShieldOverlay`、付与量に応じた透過・拡縮 | 12対象に物理盾＋3属性の計48枚。盾単独は未計測 |
| 属性リング | `ChipRenderer.drawAttributeOverlays`、付与値を列挙・filter・sortして属性ごとに拡縮描画 | 上記48枚の条件。属性単独・全強度の比較は未計測 |
| スタミナ満タンの波 | `drawStaminaPauseWaves`、3輪×2回stroke | 待機の通常描画に含む。単独比較は未計測 |
| 状態アイコン | `getConditionIconEntries` → `layoutConditionIcons` → `drawConditionIcon` | コード調査。全条件・件数の固定比較は未計測 |
| 頭上ステータス | `drawOverheadStatuses`、対象ごとに文言・値を解決して縁取り文字描画 | 通常待機・戦闘の計測に含む。表示設定ごとの比較は未計測 |
| 施設利用・準備中の揺れ | `FacilitySwingSystem.update` → `chip.poseTilt` | 常時更新の候補。単独比較は未計測 |
| アイテム転送・吸収・落下 | `HeroItemInteractionController`・`ChipBoard`、転送用Chipや物理更新 | 通常処理のコード調査。多数転送の固定比較は未計測 |
| 方向表示・選択ガイド | 別Canvas上の`HeroDirectionIndicatorRenderer`、world上の`SelectionGuideRenderer` | 通常計測。対象数・選択状態別の比較は未計測 |
| タイトルのChip雨 | `TitleChipRain.start`の独立RAF、面積/32000で個数を決定、移動・全組の接触・全描画 | タイトル通常／雨の更新・描画省略。GameAppのmainだけで評価しない |
| 開始メンバーのプレビュー | `StartPartySelectionModal.startPreviewAnimation`の独立RAF、選択したHeroを描画 | コード調査。開始ボタンで停止することを確認。単独負荷は未計測 |
| 開始劇・加入劇 | `VignetteModal.play`の独立RAF、背景・Chip・会話描画。再生中はclockを停止 | コード調査。全シナリオの負荷比較は未計測 |
| フロートログ | `GameLog.logLocalized` → `FlowLog.show` → `renderLogMessage`、DOM・画像参照・computedStyle取得・RAF・CSS移動・animationendで削除 | 初回は毎秒1/10/30件・60件一括・影省略・duration読取省略・Canvas演出との混在。追加で全ログ・CSS由来の時間を維持する集約試作、info/会心/失敗/警告混在、60/180件一括、CPU 4倍低速化を比較。改善率は追加実測資料に限定して記載 |
| 評価トースト | `AchievementToast.update`、DOM生成・scrollHeight読取・高さ書込・grade変化 | コード調査。大量評価の固定比較は未計測 |
| 結果画面の登場・反転 | `TrialResultEntrance`・`TrialRunResultModal`のWeb Animations、opacity・scale・rotateY | コード調査。登場直後・反転中の個別計測は未実施 |
| 結果の紙吹雪 | `TrialResultConfetti`、98要素中18要素が継続落下、疑似要素はrotateY・brightnessを反復 | 同じ98要素を表示／非表示。単独CSS層の人工比較で、結果画面全体の計測ではない |
| 結果の共有画像作成 | 結果表示時に`createTrialResultShareImage`を先行実行。全子孫のcomputedStyle列挙、画像再取得・dataURL化、SVG foreignObject、1776×2680 Canvas、PNG化 | 発生時負荷の候補。今回の定常フレーム比較では未計測 |

## コードから確認できる負荷候補

### Canvasの状態と原寸画像

`CombatEffectSystem.draw`は関数全体でsave/restoreする。
雷の描画で設定したshadowColor・shadowBlurは雷ループの後に戻していないため、
同じ呼出しのタグ転送・使い魔・惑乱・文字にも継承される。
雷がないフレームにはこの設定を行わない。別の描画呼出しへ永続するという意味ではない。

`drawNightFamiliar`は各spriteで`grayscale(1) brightness(0.32)`を設定する。
`drawEffectSprite`は原画像を直接`drawImage`し、`drawScaledImage`を経由しない。
使い魔1254×1254、惑乱1024×1024の画像を、通常は数十world pxへ縮小する。
これら2画像は現在の画像段階manifestに登録されていない。
物理盾・属性リングは`drawScaledImage`を呼ぶが、対応画像がmanifestにない場合は原寸画像となる。
縮小画像や色変換済み画像の採用は、今回の通常ビルドへは反映しない。

### フロートログ

各ログはarticle・p・spanを作り、参照は画像・ラベルの追加要素を持つ。
appendした直後に`getComputedStyle(entry)`で`--flow-duration`を読む。
大量ログを同じタスクで順に生成すると、DOM変更とstyle確定の往復が起きる可能性がある。
この読取が常にlayoutを起こすとは断定せず、RecalcStyleとLayoutを別々に観測する。

この候補はコード読解だけで終えず、0.75.1の計測用ビルドで実際の集約案を試した。
全記事のCSS読取を先に終えてから全styleを書き、1個のRAFで開始する。
CSS読取の単純な削除や表示省略の結果と混ぜず、[集約試作の実測](phase_perf_v0.75-mobile-performance-investigation_prototype.md)を採否の根拠とする。

表示中件数の上限はなく、通常6秒・会心等9秒・警告10秒へランダム係数0.85～1.15を掛ける。
継続的に毎秒30件出れば、通常ログだけでも平均約180件が同時に残る条件になる。
実ゲームで毎秒30件発生することを確認した値ではなく、負荷を増やす人工条件である。
text-shadowは白い縁2本と色付きblur、警告には追加scaleアニメーションがある。
animationendでMap・DOMから取り除く。通常どおり完走する条件での削除を観測する。

`GameLog.records`は表示終了後も記録を保持し、`getRecords`は配列を複製する。
表示DOMの残存と履歴保存の増加を混同しない。
DOM画像は同じURLでも各ログにimg要素を持つが、decoded画像を毎回独立確保するとは断定できない。
長い文字列・多数の合成層によるGPUメモリー消費は今回直接測定しない。

### 常時描画とDOM

`GameApp`は毎RAFで入力・trial更新を行う。
`GameClock`の停止中も`TrialSession`のCanvas clear・world描画・HUD更新は続く。
高倍率ではsimulationDeltaを1/60秒以下に分けるため、1フレーム内のsimulation処理回数が増える。
壁時計deltaは最大0.05秒に制限され、長いフレームが続くとゲーム時間が壁時計より遅くなる。

`TimeSettingsController.updateStatus`は文字列・classNameを毎回書き込む。
書込時間だけでなく、その後のブラウザー処理を含めた比較が必要である。
`InformationWindowLayer`は既に保持DOMを更新し、位置・寸法等が変わった場合にlayoutを行う。
旧方式であるという前提の改善候補は挙げない。

`WorldSurfaceRenderer`は毎フレームcreatePattern・領域塗りを繰り返す。
`TouchDragLoupe`は160×128 CSS pxの表示用Canvasを作り、拡大したworld全体の描画関数を再実行する。
CanvasのclipはJavaScript側のオブジェクト走査や描画命令の発行を省かない。
ルーペ表示中に演出も再描画する可能性はあるが、今回の固定演出比較ではルーペを出していない。

## 実機で追加する確認

- Android端末の型番、Android・Vivaldiのバージョン、画面寸法・DPR、発熱・省電力状態を記録する。
- 大量ログの発生場面、時間倍率、Hero・Enemy数、固有スキル、同時に出ているCanvas演出を記録する。
- 同一場面でフロートログだけを計測用に省略し、ログ件数を維持した影・durationの切分けを照合する。
- 自然戦闘でのログ発生数・最大同時表示数を計測し、人工的な毎秒30件・60件一括と対応させる。
- GPU描画完了・compositor・rasterの内訳、GC pause、メモリーの長時間推移は追加のtrace等で確認する。
- 今回未計測の演出や組合せを、この一覧に載っているという理由で計測済みと扱わない。
