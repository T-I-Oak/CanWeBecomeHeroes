import { getUniqueSkillLevelDetail } from './UniqueSkillCatalog.js';
import { hasUniqueSkillTrigger } from './UniqueSkillTrigger.js';

export function getTriggeredIntrinsicUniqueSkill(entity, trigger) {
  if (!entity.uniqueSkill) return null;
  const skill = getUniqueSkillLevelDetail(entity.uniqueSkill);
  return hasUniqueSkillTrigger(skill, trigger) ? skill : null;
}
