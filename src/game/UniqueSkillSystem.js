import { LARGE_ENEMY_SLOT_SPAN } from './HeroSlotLayout.js';
import { UNIQUE_SKILL_TRIGGER } from './UniqueSkillTrigger.js';
import { getTriggeredIntrinsicUniqueSkill } from './UniqueSkillHookResolver.js';
import { isEntityOnBoard } from './CombatParticipant.js';

const INNER_TO_OUTER_SLOT_ORDER = Object.freeze([3, 4, 2, 5, 1, 6]);

export default class UniqueSkillSystem {
  constructor({ board, controller, enemyFactory, random = Math.random } = {}) {
    Object.assign(this, { board, controller, enemyFactory, random });
  }

  resolveOnDefeated(enemy) {
    const skill = getTriggeredIntrinsicUniqueSkill(enemy, UNIQUE_SKILL_TRIGGER.entityDefeated);
    if (!skill) return Object.freeze({ skill: null, summons: Object.freeze([]) });
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

  resolveOnDamaged(enemy) {
    const skill = getTriggeredIntrinsicUniqueSkill(enemy, UNIQUE_SKILL_TRIGGER.damageReceived);
    if (!skill || skill.id !== 'gem-orb-rain' || this.random() >= skill.levelDetail.chance) {
      return Object.freeze({ skill, drops: Object.freeze([]) });
    }
    const drops = Array.from({ length: skill.levelDetail.dropCount }, () => Object.freeze({
      weapon: 'orb',
      tags: Object.freeze(Array.from({ length: skill.levelDetail.tagCount }, () => 'gem')),
    }));
    return Object.freeze({ skill, drops: Object.freeze(drops) });
  }

  resolveOnAction(enemy, { reservedSlots = [] } = {}) {
    const skill = getTriggeredIntrinsicUniqueSkill(enemy, UNIQUE_SKILL_TRIGGER.actionCompleted);
    if (!skill || skill.id !== 'area-head-rush') return Object.freeze({ skill: null, heads: Object.freeze([]) });
    const heads = this.getAvailableSummonSlots(null, reservedSlots)
      .slice(0, skill.levelDetail.headCount)
      .map((slotPosition) => this.enemyFactory.createAreaHead({ source: enemy, slotPosition }));
    return Object.freeze({ skill, heads: Object.freeze(heads) });
  }

  getAvailableSummonSlots(excludedEnemy = null, reservedSlots = []) {
    const occupied = new Set(reservedSlots);
    const enemies = this.controller?.getEnemies?.() ?? [];
    enemies.filter((enemy) => enemy !== excludedEnemy && isEntityOnBoard(this.board, enemy)).forEach((enemy) => {
      const span = enemy.definition.size === 'large' ? LARGE_ENEMY_SLOT_SPAN : 1;
      for (let index = 0; index < span; index += 1) occupied.add(enemy.slotPosition + index);
    });
    return INNER_TO_OUTER_SLOT_ORDER.filter((slotPosition) => !occupied.has(slotPosition));
  }
}
