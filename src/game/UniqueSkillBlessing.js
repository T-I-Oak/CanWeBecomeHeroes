import { UNIQUE_SKILL_CATALOG } from './UniqueSkillCatalog.js';

export const BLESSING_RANDOM_SKILL_ID = 'blessing-random';
export const BLESSING_RANDOM_SKILL_GRANT_RATE = 0.07;

function getIntrinsicSkillDefinitions(entity) {
  if (Array.isArray(entity.uniqueSkills)) return entity.uniqueSkills;
  return entity.uniqueSkill ? [entity.uniqueSkill] : [];
}

export function getBlessingSkillLevel(entity) {
  return getIntrinsicSkillDefinitions(entity).find((skill) => skill.id === BLESSING_RANDOM_SKILL_ID)?.level ?? null;
}

export function rollBlessingSkills(level, random = Math.random) {
  return Object.values(UNIQUE_SKILL_CATALOG)
    .filter((skill) => skill.id !== BLESSING_RANDOM_SKILL_ID && skill.levels[level])
    .filter(() => random() < BLESSING_RANDOM_SKILL_GRANT_RATE)
    .map((skill) => Object.freeze({ id: skill.id, level }));
}
