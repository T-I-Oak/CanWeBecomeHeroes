import { UNIQUE_SKILL_TRIGGER } from './UniqueSkillTrigger.js';

const VITALITY_SUMMON = Object.freeze({
  id: 'vitality-summon',
  affinityTag: 'vitality',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.entityDefeated]),
  levels: Object.freeze({
    1: Object.freeze({ summonEnemyDefinitionId: 'small-vitality', summonCount: 2 }),
    2: Object.freeze({ summonEnemyDefinitionId: 'medium-vitality', summonCount: 2 }),
  }),
});

const GEM_ORB_RAIN = Object.freeze({
  id: 'gem-orb-rain',
  affinityTag: 'gem',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.damageReceived]),
  levels: Object.freeze({
    1: Object.freeze({ dropCount: 1, tagCount: 1 }),
    2: Object.freeze({ dropCount: 2, tagCount: 2 }),
  }),
});

const AREA_HEAD_RUSH = Object.freeze({
  id: 'area-head-rush',
  affinityTag: 'area',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.actionCompleted]),
  levels: Object.freeze({
    1: Object.freeze({ headCount: 1 }),
    2: Object.freeze({ headCount: 2 }),
  }),
});

export const UNIQUE_SKILL_CATALOG = Object.freeze({
  [VITALITY_SUMMON.id]: VITALITY_SUMMON,
  [GEM_ORB_RAIN.id]: GEM_ORB_RAIN,
  [AREA_HEAD_RUSH.id]: AREA_HEAD_RUSH,
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
