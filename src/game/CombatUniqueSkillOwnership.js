import { getUniqueSkillLevelDetail } from './UniqueSkillCatalog.js';
import { hasUniqueSkillTrigger } from './UniqueSkillTrigger.js';
import { BLESSING_RANDOM_SKILL_ID, getBlessingSkillLevel, rollBlessingSkills } from './UniqueSkillBlessing.js';

function getIntrinsicSkillDefinitions(entity) {
  if (Array.isArray(entity.uniqueSkills)) return entity.uniqueSkills;
  return entity.uniqueSkill ? [entity.uniqueSkill] : [];
}

export default class CombatUniqueSkillOwnership {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.temporarySkills = new WeakMap();
    this.initializedEntities = new WeakSet();
  }

  reset() {
    this.temporarySkills = new WeakMap();
    this.initializedEntities = new WeakSet();
  }

  initialize(entity) {
    if (this.initializedEntities.has(entity)) return;
    this.initializedEntities.add(entity);
    this.refreshBlessingSkills(entity);
  }

  refreshBlessingSkills(entity) {
    const level = getBlessingSkillLevel(entity);
    if (level === null) return;
    this.replaceTemporarySkills(entity, rollBlessingSkills(level, this.random));
  }

  replaceTemporarySkills(entity, skills) {
    this.temporarySkills.set(entity, skills.map(({ id, level }) => Object.freeze({ id, level })));
  }

  getTriggeredSkills(entity, trigger) {
    const intrinsicSkills = getIntrinsicSkillDefinitions(entity).filter((skill) => skill.id !== BLESSING_RANDOM_SKILL_ID);
    const temporarySkills = this.temporarySkills.get(entity) ?? [];
    const skillsById = new Map(temporarySkills.map((skill) => [skill.id, skill]));
    intrinsicSkills.forEach((skill) => skillsById.set(skill.id, skill));
    return [...skillsById.values()]
      .map((skill) => getUniqueSkillLevelDetail(skill))
      .filter((skill) => hasUniqueSkillTrigger(skill, trigger));
  }
}
