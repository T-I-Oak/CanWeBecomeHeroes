export const UNIQUE_SKILL_TRIGGER = Object.freeze({
  actionCompleted: 'action-completed',
  damageReceived: 'damage-received',
  entityDefeated: 'entity-defeated',
});

export const BLESSING_RANDOM_SKILL_HOOK_ENTRY_RATE = 0.07;

export function hasUniqueSkillTrigger(skill, trigger) {
  return skill.triggers.includes(trigger);
}

