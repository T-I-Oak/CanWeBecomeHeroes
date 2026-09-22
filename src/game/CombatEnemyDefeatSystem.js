import { entityText, logText } from './LocalizedLog.js';
import { createTrendEquipmentSet } from './TrendEquipmentGenerator.js';
import { isEntityOnBoard } from './CombatParticipant.js';
import { UNIQUE_SKILL_TRIGGER } from './UniqueSkillTrigger.js';

const ENEMY_DROP_SETS = Object.freeze({
  regular: Object.freeze({ setCount: 1, tagBudget: 5 }),
  midBoss: Object.freeze({ setCount: 2, tagBudget: 10 }),
  boss: Object.freeze({ setCount: 3, tagBudget: 15 }),
});

export default class CombatEnemyDefeatSystem {
  constructor({ board, controller, itemFactory, uniqueSkillEffectSystem, projectionSystem, getWarehouseDropPosition, random = Math.random, gameLog = null, textRepository = null }) {
    Object.assign(this, { board, controller, itemFactory, uniqueSkillEffectSystem, projectionSystem, getWarehouseDropPosition, random, gameLog, textRepository });
  }

  createEnemyDrops(enemy) {
    const config = ENEMY_DROP_SETS[enemy.rank] ?? ENEMY_DROP_SETS.regular;
    return Array.from({ length: config.setCount }, () => createTrendEquipmentSet({
      trendTag: enemy.mainTag,
      tagBudget: config.tagBudget,
      itemFactory: this.itemFactory,
      random: this.random,
      placePart: () => this.getWarehouseDropPosition(),
    }).map(({ item }) => item)).flat();
  }

  resolve(enemy) {
    if (!isEntityOnBoard(this.board, enemy)) return 0;
    const summonEffects = this.uniqueSkillEffectSystem.resolve(enemy, UNIQUE_SKILL_TRIGGER.entityDefeated);
    const summons = summonEffects.flatMap((effect) => effect.summons ?? []);
    this.projectionSystem.returnAreaHeadsFrom(enemy);
    if (this.controller?.destroy) this.controller.destroy(enemy, { includeRelated: true });
    else {
      this.board.removeChip(enemy.chip);
      this.controller?.remove(enemy);
    }
    this.createEnemyDrops(enemy).forEach((item) => this.controller?.addToWarehouse(item));
    summons.forEach((summon) => {
      summon.chip.beginDrop();
      this.controller?.add(summon);
    });
    summonEffects.filter((effect) => effect.summons?.length > 0).forEach(({ skill, summons: effectSummons }) => logText(this.gameLog, this.textRepository, 'logSummon', { actor: entityText(enemy), skill: { kind: 'unique-skill', id: skill.id }, target: entityText(effectSummons[0]), count: effectSummons.length }, { subject: 'enemy', level: 'info', channel: 'battle' }));
    return enemy.contributionPoints;
  }
}
