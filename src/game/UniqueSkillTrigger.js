export const UNIQUE_SKILL_TRIGGER = Object.freeze({
  actionCompleted: 'action-completed',
  damageReceived: 'damage-received',
  entityDefeated: 'entity-defeated',
});

export const UNIQUE_SKILL_ACTIVATION_RATE = 0.07;

export function hasUniqueSkillTrigger(skill, trigger) {
  return skill.triggers.includes(trigger);
}

export function shouldActivateUniqueSkill(skill, trigger, random = Math.random) {
  return hasUniqueSkillTrigger(skill, trigger) && random() < UNIQUE_SKILL_ACTIVATION_RATE;
}
