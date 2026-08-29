import { LARGE_ENEMY_SLOT_SPAN } from './HeroSlotLayout.js';
import { getUniqueSkillLevelDetail } from './UniqueSkillCatalog.js';

const INNER_TO_OUTER_SLOT_ORDER = Object.freeze([3, 4, 2, 5, 1, 6]);

const onBoard = (board, entity) => board.chips.includes(entity.chip);

export default class UniqueSkillSystem {
  constructor({ board, controller, enemyFactory, random = Math.random } = {}) {
    Object.assign(this, { board, controller, enemyFactory, random });
  }

  resolveOnDefeated(enemy) {
    if (!enemy.uniqueSkill) return Object.freeze({ skill: null, summons: Object.freeze([]) });
    const skill = getUniqueSkillLevelDetail(enemy.uniqueSkill);
    if (skill.trigger !== 'defeated') return Object.freeze({ skill, summons: Object.freeze([]) });
    if (skill.id !== 'vitality-summon') return Object.freeze({ skill, summons: Object.freeze([]) });
    const summons = this.getAvailableSummonSlots(enemy).slice(0, skill.levelDetail.summonCount).map((slotPosition) => this.enemyFactory.createFromDefinition({
      enemyDefinitionId: skill.levelDetail.summonEnemyDefinitionId,
      slotPosition,
      maximumHp: enemy.maximumHp,
      totalTagCount: enemy.totalTagCount,
      maximums: enemy.maximums,
      weaponCount: enemy.weaponCount,
      contributionMultiplier: enemy.contributionMultiplier,
      random: this.random,
    }));
    return Object.freeze({ skill, summons: Object.freeze(summons) });
  }

  getAvailableSummonSlots(defeatedEnemy) {
    const occupied = new Set();
    const enemies = this.controller?.getEnemies?.() ?? [];
    enemies.filter((enemy) => enemy !== defeatedEnemy && onBoard(this.board, enemy)).forEach((enemy) => {
      const span = enemy.definition.size === 'large' ? LARGE_ENEMY_SLOT_SPAN : 1;
      for (let index = 0; index < span; index += 1) occupied.add(enemy.slotPosition + index);
    });
    return INNER_TO_OUTER_SLOT_ORDER.filter((slotPosition) => !occupied.has(slotPosition));
  }
}
