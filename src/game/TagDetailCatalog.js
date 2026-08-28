const skill = (requiredCount, name) => Object.freeze({ requiredCount, name });

const STATUS_DETAILS = Object.freeze({
  valor: Object.freeze({ name: '武勇', status: 'power', statusName: 'パワー', effect: '物理攻撃会心率', skills: [skill(1, '勘所'), skill(3, '急所見切り'), skill(5, '一撃必殺'), skill(7, '英雄の一閃')] }),
  iron: Object.freeze({ name: '鉄', status: 'power', statusName: 'パワー', effect: '物理攻撃反射', skills: [skill(1, '身構え'), skill(3, '受け流し'), skill(5, '不動の構え'), skill(7, '聖騎士の誓約')] }),
  arcane: Object.freeze({ name: '魔導', status: 'magic', statusName: '魔力', effect: '魔法攻撃会心率', skills: [skill(1, 'おまじない'), skill(3, '魔力励起'), skill(5, '術式強化'), skill(7, '大賢者の秘術')] }),
  cloth: Object.freeze({ name: '布', status: 'magic', statusName: '魔力', effect: '属性耐性', skills: [skill(1, '護りの布'), skill(3, '祈りの衣'), skill(5, '守護結界'), skill(7, '聖者の法衣')] }),
  dexterity: Object.freeze({ name: '軽業', status: 'speed', statusName: 'スピード', effect: '盗み成功率', skills: [skill(1, '指先の悪戯'), skill(3, 'すり抜け'), skill(5, '盗人の手練れ'), skill(7, '盗賊の極意')] }),
  feather: Object.freeze({ name: '羽', status: 'speed', statusName: 'スピード', effect: '回避率', skills: [skill(1, '身かわし'), skill(3, '風読み'), skill(5, '風走り'), skill(7, '疾風の残像')] }),
  reputation: Object.freeze({ name: '信用', status: 'negotiation', statusName: '交渉力', effect: 'ライセンス延長量増加', skills: [skill(1, '挨拶上手'), skill(3, '口利き'), skill(5, '信頼の証'), skill(7, '信用の極致')] }),
  gem: Object.freeze({ name: '宝石', status: 'negotiation', statusName: '交渉力', effect: '購入品強化', skills: [skill(1, '掘り出し物'), skill(3, '目利き'), skill(5, '秘蔵の鑑定眼'), skill(7, '黄金の審美眼')] }),
  blessing: Object.freeze({ name: '加護', status: 'luck', statusName: '運', effect: '低スタミナ時運アップ', skills: [skill(1, '神頼み'), skill(3, '守りの加護'), skill(5, '奇跡の灯火'), skill(7, '神恩の極み')] }),
  fortune: Object.freeze({ name: '幸運', status: 'luck', statusName: '運', effect: '高スタミナ時運アップ', skills: [skill(1, '小さな兆し'), skill(3, '時流の巡り'), skill(5, '星々の導き'), skill(7, '天運の寵児')] }),
});

const ATTRIBUTE_DETAILS = Object.freeze({
  fire: Object.freeze({ name: '炎', description: '継続ダメージを付与する。タグ数が多いほど継続時間が増える。' }),
  water: Object.freeze({ name: '水', description: '攻撃失敗率を上げる。タグ数が多いほど失敗率が増える。' }),
  lightning: Object.freeze({ name: '雷', description: '物理・魔法攻撃を連続した範囲へ伝搬させる。タグ数が多いほど伝搬量が増える。' }),
  area: Object.freeze({ name: '範囲', description: '攻撃と属性付与の範囲を広げる。タグ数が多いほど範囲と効果が増える。' }),
  vitality: Object.freeze({ name: '活力', description: '行動終了後、運によりスタミナ（EnemyはHP）を回復する。タグ数が多いほど回復量が増える。' }),
});

export const TAG_DETAILS = Object.freeze({ ...STATUS_DETAILS, ...ATTRIBUTE_DETAILS });

export function getTagDetail(tag) {
  const detail = TAG_DETAILS[tag];
  if (!detail) throw new RangeError(`Unknown tag detail: ${tag}`);
  return detail;
}
