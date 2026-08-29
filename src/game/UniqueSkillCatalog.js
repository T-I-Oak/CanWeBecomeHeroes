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

export const UNIQUE_SKILL_CATALOG = Object.freeze({
  [VITALITY_SUMMON.id]: VITALITY_SUMMON,
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
