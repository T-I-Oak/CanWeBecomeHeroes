const ITEM_DETAILS = Object.freeze({
  sword: Object.freeze({ name: '剣', description: '物理攻撃力が高い武器。' }),
  shield: Object.freeze({ name: '盾', description: '仲間へ物理攻撃軽減を付与する武器。' }),
  staff: Object.freeze({ name: '杖', description: '魔法攻撃力が高い武器。' }),
  'holy-book': Object.freeze({ name: '聖書', description: '仲間の属性付与値を軽減する武器。' }),
  claw: Object.freeze({ name: '爪', description: '相手の装備を盗む武器。' }),
  bow: Object.freeze({ name: '弓', description: 'アクションゲージを短縮する武器。' }),
  banner: Object.freeze({ name: '旗', description: '仲間のアクションゲージを進める武器。' }),
  orb: Object.freeze({ name: '宝珠', description: '相手の装備に宝石タグを付与する武器。' }),
  'holy-symbol': Object.freeze({ name: '聖印', description: '仲間のスタミナまたはHPを回復する武器。' }),
  'tarot-cards': Object.freeze({ name: 'タロット', description: '仲間の運ボーナスを付与する武器。' }),
  'shopping-bag': Object.freeze({ name: '買い物袋', description: '最大3個のアイテムを入れてショップへ向かう行き先アイテム。' }),
  'hero-license': Object.freeze({ name: '勇者免許', description: '訓練場へ向かう行き先アイテム。' }),
  'renewal-form': Object.freeze({ name: '更新申請書', description: 'ギルドへ向かう行き先アイテム。' }),
  'head-1': Object.freeze({ name: '兜' }),
  'head-2': Object.freeze({ name: 'とんがり帽' }),
  'head-3': Object.freeze({ name: 'フード' }),
  'head-4': Object.freeze({ name: '冠' }),
  'head-5': Object.freeze({ name: '羽根帽' }),
  'torso-1': Object.freeze({ name: '鎧' }),
  'torso-2': Object.freeze({ name: 'ローブ' }),
  'torso-3': Object.freeze({ name: 'ベスト' }),
  'torso-4': Object.freeze({ name: 'ジャケット' }),
  'torso-5': Object.freeze({ name: 'コート' }),
  'feet-1': Object.freeze({ name: 'グリーヴ' }),
  'feet-2': Object.freeze({ name: 'ブーツ' }),
  'feet-3': Object.freeze({ name: 'シューズ' }),
  'feet-4': Object.freeze({ name: 'ローファー' }),
  'feet-5': Object.freeze({ name: 'ファーブーツ' }),
});

export function getItemDetail(type) {
  return ITEM_DETAILS[type] ?? Object.freeze({ name: type, description: '' });
}
