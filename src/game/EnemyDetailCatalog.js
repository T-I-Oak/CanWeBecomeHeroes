export const ENEMY_DETAILS = Object.freeze({
  'small-valor': Object.freeze({ description: '小柄でも、剣を振るう勢いだけは一人前の小鬼。仲間がそろうと、ますます強気になる。', combatStyle: '剣による物理攻撃を得意とする。' }),
  'small-iron': Object.freeze({ description: '誰もいないはずの鎧に、古い守りの意志だけが残っている。鈍重だが、簡単には崩れない。', combatStyle: '盾で物理攻撃を受け止め、受けた力を相手へ返す。' }),
  'small-arcane': Object.freeze({ description: '淡い光をまとって漂う、いたずら好きのゴースト。壁も鎧も、するりと抜ける。', combatStyle: '防御されない魔法攻撃を放つ。' }),
  'small-reputation': Object.freeze({ description: '山の工房から出てきた、商売熱心なドワーフ。手に入れた品の値打ちは、誰より気にしている。', combatStyle: '宝珠で相手の動きを鈍らせる。' }),
  'small-lightning': Object.freeze({ description: '雷鳴と一緒に駆け抜ける、青白い毛並みの狼。獲物を追い詰めると、仲間へ電撃をつなぐ。', combatStyle: '雷を付与し、受けた攻撃を周囲へ伝わりやすくする。' }),
  'small-cloth': Object.freeze({ description: '乾いた包帯を引きずる、墓所からの迷子。炎も水も雷も、何重もの布でやわらげる。', combatStyle: '属性付与の影響を軽減する。' }),
  'small-dexterity': Object.freeze({ description: 'すばしこく走り回る、手癖の悪いコボルト。目についた物は、隙を見て持ち去ろうとする。', combatStyle: '相手の装備を盗み、自分の装備にする。' }),
  'small-feather': Object.freeze({ description: '高い場所から獲物を見つける、翼を持つ狩人。風向きが変われば、もう姿を捉えにくい。', combatStyle: 'すばやく行動し、相手の攻撃をかわしやすい。' }),
  'small-gem': Object.freeze({ description: '宝箱のふりをして獲物を待つ、小さな魔物。きらきらした物なら、罠にするのも大好きだ。', combatStyle: '宝珠を使って、相手の行動を遅らせる。' }),
  'small-blessing': Object.freeze({ description: '悪知恵だけは一丁前の、小さな悪魔。追い詰められた仲間へ、都合よく手を貸す。', combatStyle: '仲間のHPを回復する。' }),
  'small-fortune': Object.freeze({ description: '幸運を振りまく、小さな妖精。危ない目に遭うほど、なぜか機嫌がよくなる。', combatStyle: '運により、会心やさまざまな判定を有利にする。' }),
  'small-fire': Object.freeze({ description: '火の粉をまとって岩場を歩く、陽気なトカゲの魔物。通った後には、なかなか消えない熱が残る。', combatStyle: '炎を付与し、時間とともにダメージを与える。' }),
  'small-water': Object.freeze({ description: '水辺から這い出す、ぬるりとした半魚人。濡れた足場へ誘い込み、狙いを狂わせる。', combatStyle: '水を付与し、相手の攻撃を失敗しやすくする。' }),
  'small-vitality': Object.freeze({ description: '引き抜かれても、しぶとく根を張ろうとする不思議な植物。土があれば、まだまだ元気だ。', combatStyle: '行動後に、運がよければHPを回復する。' }),
  'small-area': Object.freeze({ description: '三つの頭で、獲物の逃げ道をふさぐ番犬。ひとつを避けても、別の頭が待っている。', combatStyle: '広い範囲へ攻撃を行う。' }),
  'medium-vitality': Object.freeze({ description: '長い年月で根を深く張った、歩く樹の魔物。倒れかけても、最後に新しい芽を残そうとする。', combatStyle: 'HPが0になると、マンドラゴラを最大2体召喚する。' }),
  'large-vitality': Object.freeze({ description: '森そのものが歩き出したような、巨大な世界樹。倒れても根から次の命を呼び、戦場を埋め尽くそうとする。', combatStyle: 'HPが0になると、トレントを最大2体召喚する。マンドラゴラに回復されるとかなり厄介。' }),
  'medium-gem': Object.freeze({ description: '全身を結晶で覆った、鈍く光るゴーレム。砕けた欠片さえ、いつの間にか宝珠へ変わっている。', combatStyle: 'ダメージを受けると、50%で宝石タグ1の宝珠を倉庫へ1個落とす。' }),
  'large-gem': Object.freeze({ description: '財宝の山を寝床にする、宝石鱗の竜。傷つくほど宝珠をばらまき、倉庫をきらびやかに散らかしていく。', combatStyle: 'ダメージを受けると、50%で宝石タグ2の宝珠を倉庫へ2個落とす。倉庫の空きに注意。' }),
});

export function getEnemyDetail(enemy) {
  const id = typeof enemy === 'string' ? enemy : enemy?.definition?.id;
  return ENEMY_DETAILS[id] ?? null;
}
