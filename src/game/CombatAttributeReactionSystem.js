import { UNIQUE_SKILL_TRIGGER } from './UniqueSkillTrigger.js';

export default class CombatAttributeReactionSystem {
  constructor({ uniqueSkillEffectSystem }) {
    this.uniqueSkillEffectSystem = uniqueSkillEffectSystem;
  }

  resolve(attributeEvent) {
    return this.uniqueSkillEffectSystem
      .resolve(attributeEvent.target, UNIQUE_SKILL_TRIGGER.attributeReceived, { attributeEvent })
      .map(({ attributeReflection = null }) => attributeReflection)
      .filter((attributeReflection) => attributeReflection !== null);
  }
}
