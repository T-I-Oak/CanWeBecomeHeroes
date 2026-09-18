import { getUniqueSkillLevelDetail } from './UniqueSkillCatalog.js';
import { hasUniqueSkillTrigger } from './UniqueSkillTrigger.js';

function getIntrinsicSkillDefinitions(entity) {
  if (Array.isArray(entity.uniqueSkills)) return entity.uniqueSkills;
  return entity.uniqueSkill ? [entity.uniqueSkill] : [];
}

export default class CombatUniqueSkillOwnership {
  constructor() { this.temporarySkills = new WeakMap(); }

  reset() { this.temporarySkills = new WeakMap(); }

  replaceTemporarySkills(entity, skills) {
    this.temporarySkills.set(entity, skills.map(({ id, level }) => Object.freeze({ id, level })));
  }

  getTriggeredSkills(entity, trigger) {
    const intrinsicSkills = getIntrinsicSkillDefinitions(entity);
    const temporarySkills = this.temporarySkills.get(entity) ?? [];
    const skillsById = new Map(temporarySkills.map((skill) => [skill.id, skill]));
    intrinsicSkills.forEach((skill) => skillsById.set(skill.id, skill));
    return [...skillsById.values()]
      .map((skill) => getUniqueSkillLevelDetail(skill))
      .filter((skill) => hasUniqueSkillTrigger(skill, trigger));
  }
}
