import { entityText, logText } from './LocalizedLog.js';
import { logUniqueSkill, skillText, tagText, termText } from './UniqueSkillLog.js';
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
      if (knockback) this.knockbackSystem?.queueIronCounterblow({ ...knockback, skill });
      if (retaliationAttribute) {
        const recipient = retaliationAttribute.actor;
        const previous = recipient.attributes?.[retaliationAttribute.attribute] ?? 0;
        this.attributeSystem?.applyAttribute(target, recipient, retaliationAttribute.attribute, retaliationAttribute.value);
        if (this.gameLog && (recipient.attributes?.[retaliationAttribute.attribute] ?? 0) > previous) {
          logUniqueSkill(this.gameLog, this.textRepository, 'logFireRetaliation', { actor: entityText(target), skill: skillText(skill), target: entityText(recipient), attribute: tagText(retaliationAttribute.attribute) });
        }
      }
      if (actionGaugeAbsorption) {
        const opponents = this.getOpponents(target, damageEvent.participants);
        const stolen = this.actionGaugeSystem?.stealCurrentGauge(target, opponents, actionGaugeAbsorption.currentGaugeStealRate) ?? 0;
        if (stolen > 0) {
          opponents.forEach((opponent) => this.effects?.lightningPropagation(opponent, target));
          if (this.gameLog) logUniqueSkill(this.gameLog, this.textRepository, 'logThunderDrain', { actor: entityText(target), skill: skillText(skill), gauge: termText('action-gauge') });
        }
      }
      if (drops.length === 0) return;
      const droppedItems = drops.map((drop) => {
        const position = this.getWarehouseDropPosition();
        const item = this.itemFactory.createWeapon({ weapon: drop.weapon, tags: drop.tags, x: position.x, y: position.y });
        this.controller?.addToWarehouse?.(item);
        return item;
      });
      logText(this.gameLog, this.textRepository, 'logOrb', { actor: entityText(target), skill: { kind: 'unique-skill', id: skill.id }, item: { kind: 'item', id: droppedItems[0].type }, count: droppedItems.length }, { subject: 'enemy', level: 'info', channel: 'battle' });
    });
  }

  getOpponents(target, participants = []) {
    return participants.filter((candidate) => candidate !== target && isHeroCombatant(candidate) !== isHeroCombatant(target));
  }
}
