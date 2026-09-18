import { entityText, logText } from './LocalizedLog.js';

export default class CombatDamageReactionSystem {
  constructor({ controller, itemFactory, uniqueSkillSystem, getWarehouseDropPosition, gameLog = null, textRepository = null }) {
    Object.assign(this, { controller, itemFactory, uniqueSkillSystem, getWarehouseDropPosition, gameLog, textRepository });
  }

  resolveEnemyDamage(enemy) {
    const { skill, drops } = this.uniqueSkillSystem.resolveOnDamaged(enemy);
    if (drops.length === 0) return;
    drops.forEach((drop) => {
      const position = this.getWarehouseDropPosition();
      const item = this.itemFactory.createWeapon({ weapon: drop.weapon, tags: drop.tags, x: position.x, y: position.y });
      this.controller?.addToWarehouse?.(item);
    });
    logText(this.gameLog, this.textRepository, 'logOrb', { actor: entityText(enemy), skill: { kind: 'unique-skill', id: skill.id }, count: drops.length }, { subject: 'enemy', level: 'info', channel: 'battle' });
  }
}
