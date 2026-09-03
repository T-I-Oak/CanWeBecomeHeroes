const VITALITY_SUMMON = Object.freeze({
  id: 'vitality-summon',
  name: '最後の芽吹き',
  affinityTag: 'vitality',
  trigger: 'defeated',
  description: 'HPが0になったとき、空きスロットへ眷属を召喚する。',
  levels: Object.freeze({
    1: Object.freeze({ summonEnemyDefinitionId: 'small-vitality', summonCount: 2, description: 'マンドラゴラを最大2体召喚' }),
    2: Object.freeze({ summonEnemyDefinitionId: 'medium-vitality', summonCount: 2, description: 'トレントを最大2体召喚' }),
  }),
});

const GEM_ORB_RAIN = Object.freeze({
  id: 'gem-orb-rain',
  name: '宝珠の雨',
  affinityTag: 'gem',
  trigger: 'damaged',
  description: 'ダメージを受けたとき、運により倉庫へ宝珠を落とす。',
  levels: Object.freeze({
    1: Object.freeze({ chance: 0.5, dropCount: 1, tagCount: 1, description: '50%で宝石タグ1の宝珠を1個落とす' }),
    2: Object.freeze({ chance: 0.5, dropCount: 2, tagCount: 2, description: '50%で宝石タグ2の宝珠を2個落とす' }),
  }),
});

export const UNIQUE_SKILL_CATALOG = Object.freeze({
  [VITALITY_SUMMON.id]: VITALITY_SUMMON,
  [GEM_ORB_RAIN.id]: GEM_ORB_RAIN,
});

export function getUniqueSkillDetail(id) {
  const detail = UNIQUE_SKILL_CATALOG[id];
  if (!detail) throw new RangeError(`Unknown unique skill: ${id}`);
  return detail;
}

export function getUniqueSkillLevelDetail(uniqueSkill) {
  if (!uniqueSkill) return null;
  const detail = getUniqueSkillDetail(uniqueSkill.id);
  const level = detail.levels[uniqueSkill.level];
  if (!level) throw new RangeError(`Unsupported unique skill level: ${uniqueSkill.id} Lv${uniqueSkill.level}`);
  return Object.freeze({ ...detail, level: uniqueSkill.level, levelDetail: level });
}
