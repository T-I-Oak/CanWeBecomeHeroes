export const STATUS_DETAILS = Object.freeze({
  power: Object.freeze({ name: 'パワー', description: '物理攻撃の基礎ダメージに影響する。武勇・鉄タグを装備すると増える。' }),
  magic: Object.freeze({ name: '魔力', description: '魔法攻撃の基礎ダメージに影響する。魔導・布タグを装備すると増える。' }),
  speed: Object.freeze({ name: 'スピード', description: 'アクションゲージの最大量を減らし、行動間隔を短くする。軽業・羽タグを装備すると増える。' }),
  negotiation: Object.freeze({ name: '交渉力', description: 'ショップで販売品に交換できるタグ数へ影響する。信用・宝石タグを装備すると増える。' }),
  luck: Object.freeze({ name: '運', description: '幸運度の基礎となり、会心や各種の運判定へ影響する。加護・幸運タグを装備すると増える。' }),
  stamina: Object.freeze({ name: 'スタミナ', description: 'Heroの耐久値。0になると装備を失って準備エリアへ帰還する。準備エリアでは時間とともに回復する。' }),
  hp: Object.freeze({ name: 'HP', description: 'Enemyの耐久値。0になると撃破される。' }),
});

export function getStatusDetail(status) {
  const detail = STATUS_DETAILS[status];
  if (!detail) throw new RangeError(`Unknown status detail: ${status}`);
  return detail;
}
