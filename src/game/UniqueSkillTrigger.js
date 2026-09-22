export const UNIQUE_SKILL_TRIGGER = Object.freeze({
  actionStarted: 'action-started',
  actionCompleted: 'action-completed',
  damageReceived: 'damage-received',
  entityDefeated: 'entity-defeated',
});

export function hasUniqueSkillTrigger(skill, trigger) {
  return skill.triggers.includes(trigger);
}

