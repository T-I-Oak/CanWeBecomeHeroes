import { entityText, logText } from './LocalizedLog.js';
import { UNIQUE_SKILL_TRIGGER } from './UniqueSkillTrigger.js';

export default class CombatDamageReactionSystem {
  constructor({ controller, itemFactory, uniqueSkillEffectSystem, getWarehouseDropPosition, gameLog = null, textRepository = null }) {
    Object.assign(this, { controller, itemFactory, uniqueSkillEffectSystem, getWarehouseDropPosition, gameLog, textRepository });
  }

  resolve(damageEvent) {
    const { target } = damageEvent;
    this.uniqueSkillEffectSystem.resolve(target, UNIQUE_SKILL_TRIGGER.damageReceived, { damageEvent }).forEach(({ skill, drops = [] }) => {
      if (drops.length === 0) return;
      drops.forEach((drop) => {
        const position = this.getWarehouseDropPosition();
        const item = this.itemFactory.createWeapon({ weapon: drop.weapon, tags: drop.tags, x: position.x, y: position.y });
        this.controller?.addToWarehouse?.(item);
      });
      logText(this.gameLog, this.textRepository, 'logOrb', { actor: entityText(target), skill: { kind: 'unique-skill', id: skill.id }, count: drops.length }, { subject: 'enemy', level: 'info', channel: 'battle' });
    });
  }
}
