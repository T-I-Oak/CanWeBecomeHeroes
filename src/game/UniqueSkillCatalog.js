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
    1: Object.freeze({ chance: 0.5, dropCount: 1, tagCount: 1 }),
    2: Object.freeze({ chance: 0.5, dropCount: 2, tagCount: 2 }),
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

const SHADOW_FINGERTIPS = Object.freeze({
  id: 'shadow-fingertips',
  affinityTag: 'dexterity',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.actionStarted]),
  levels: Object.freeze({
    1: Object.freeze({ transfersTag: false }),
    2: Object.freeze({ transfersTag: true }),
  }),
});

const BATTLE_FRENZY = Object.freeze({
  id: 'battle-frenzy',
  affinityTag: 'valor',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.actionStarted]),
  levels: Object.freeze({
    1: Object.freeze({ twoEdgedSwordMultiplier: 2 }),
    2: Object.freeze({ twoEdgedSwordMultiplier: 4 }),
  }),
});

const IRON_COUNTERBLOW = Object.freeze({
  id: 'iron-counterblow',
  affinityTag: 'iron',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.damageReceived]),
  levels: Object.freeze({
    1: Object.freeze({ knockbackDistanceMultiplier: 1 }),
    2: Object.freeze({ knockbackDistanceMultiplier: 2 }),
  }),
});

const ARCANE_REFLECTION = Object.freeze({
  id: 'arcane-reflection',
  affinityTag: 'arcane',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.attributeReceived]),
  levels: Object.freeze({
    1: Object.freeze({ reductionRate: 0.5 }),
    2: Object.freeze({ reductionRate: 0.75 }),
  }),
});

const CLOTH_NIGHT_FAMILIARS = Object.freeze({
  id: 'cloth-night-familiars',
  affinityTag: 'cloth',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.actionCompleted]),
  levels: Object.freeze({
    1: Object.freeze({ familiarCount: 3 }),
    2: Object.freeze({ familiarCount: 6 }),
  }),
});

const WATER_DEEP_SEA_SURGE = Object.freeze({
  id: 'water-deep-sea-surge',
  affinityTag: 'water',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.actionStarted]),
  levels: Object.freeze({
    1: Object.freeze({ waterDamageBonusRate: 0.5 }),
    2: Object.freeze({ waterDamageBonusRate: 1 }),
  }),
});

const FIRE_RETALIATION_EMBER = Object.freeze({
  id: 'fire-retaliation-ember',
  affinityTag: 'fire',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.damageReceived]),
  levels: Object.freeze({
    1: Object.freeze({ fireAttributeRate: 0.5 }),
    2: Object.freeze({ fireAttributeRate: 1 }),
  }),
});

const LIGHTNING_THUNDER_DRAIN = Object.freeze({
  id: 'lightning-thunder-drain',
  affinityTag: 'lightning',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.damageReceived]),
  levels: Object.freeze({
    1: Object.freeze({ currentGaugeStealRate: 0.1 }),
    2: Object.freeze({ currentGaugeStealRate: 0.2 }),
  }),
});

const REPUTATION_BEWILDERING_WORDS = Object.freeze({
  id: 'reputation-bewildering-words',
  affinityTag: 'reputation',
  triggers: Object.freeze([UNIQUE_SKILL_TRIGGER.actionStarted]),
  levels: Object.freeze({
    1: Object.freeze({ luckRateMultiplier: 0.5 }),
    2: Object.freeze({ luckRateMultiplier: 1 }),
  }),
});

export const UNIQUE_SKILL_CATALOG = Object.freeze({
  [VITALITY_SUMMON.id]: VITALITY_SUMMON,
  [GEM_ORB_RAIN.id]: GEM_ORB_RAIN,
  [AREA_HEAD_RUSH.id]: AREA_HEAD_RUSH,
  [SHADOW_FINGERTIPS.id]: SHADOW_FINGERTIPS,
  [BATTLE_FRENZY.id]: BATTLE_FRENZY,
  [IRON_COUNTERBLOW.id]: IRON_COUNTERBLOW,
  [ARCANE_REFLECTION.id]: ARCANE_REFLECTION,
  [CLOTH_NIGHT_FAMILIARS.id]: CLOTH_NIGHT_FAMILIARS,
  [WATER_DEEP_SEA_SURGE.id]: WATER_DEEP_SEA_SURGE,
  [FIRE_RETALIATION_EMBER.id]: FIRE_RETALIATION_EMBER,
  [LIGHTNING_THUNDER_DRAIN.id]: LIGHTNING_THUNDER_DRAIN,
  [REPUTATION_BEWILDERING_WORDS.id]: REPUTATION_BEWILDERING_WORDS,
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
