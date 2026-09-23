import { entityText, logText } from './LocalizedLog.js';
import { UNIQUE_SKILL_TRIGGER } from './UniqueSkillTrigger.js';
import { isHeroCombatant } from './CombatParticipant.js';

export default class CombatDamageReactionSystem {
  constructor({ controller, itemFactory, uniqueSkillEffectSystem, attributeSystem = null, actionGaugeSystem = null, getWarehouseDropPosition, knockbackSystem = null, conditionSystem = null, effects = null, gameLog = null, textRepository = null }) {
    Object.assign(this, { controller, itemFactory, uniqueSkillEffectSystem, attributeSystem, actionGaugeSystem, getWarehouseDropPosition, knockbackSystem, conditionSystem, effects, gameLog, textRepository });
  }

  resolve(damageEvent) {
    const { target } = damageEvent;
    if (this.conditionSystem?.removeNightFamiliar(target)) this.effects?.removeNightFamiliar(target);
    this.uniqueSkillEffectSystem.resolve(target, UNIQUE_SKILL_TRIGGER.damageReceived, { damageEvent }).forEach(({ skill, drops = [], knockback = null, retaliationAttribute = null, actionGaugeAbsorption = null }) => {
      if (knockback) this.knockbackSystem?.queueIronCounterblow(knockback);
      if (retaliationAttribute) this.attributeSystem?.applyAttribute(target, retaliationAttribute.actor, retaliationAttribute.attribute, retaliationAttribute.value);
      if (actionGaugeAbsorption) this.actionGaugeSystem?.stealCurrentGauge(target, this.getOpponents(target, damageEvent.participants), actionGaugeAbsorption.currentGaugeStealRate);
      if (drops.length === 0) return;
      drops.forEach((drop) => {
        const position = this.getWarehouseDropPosition();
        const item = this.itemFactory.createWeapon({ weapon: drop.weapon, tags: drop.tags, x: position.x, y: position.y });
        this.controller?.addToWarehouse?.(item);
      });
      logText(this.gameLog, this.textRepository, 'logOrb', { actor: entityText(target), skill: { kind: 'unique-skill', id: skill.id }, count: drops.length }, { subject: 'enemy', level: 'info', channel: 'battle' });
    });
  }

  getOpponents(target, participants = []) {
    return participants.filter((candidate) => candidate !== target && isHeroCombatant(candidate) !== isHeroCombatant(target));
  }
}
