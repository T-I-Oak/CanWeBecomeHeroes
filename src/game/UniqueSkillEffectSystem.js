import { LARGE_ENEMY_SLOT_SPAN } from './HeroSlotLayout.js';
import { UNIQUE_SKILL_TRIGGER } from './UniqueSkillTrigger.js';
import { getEquipmentItems, isEntityOnBoard } from './CombatParticipant.js';

const INNER_TO_OUTER_SLOT_ORDER = Object.freeze([3, 4, 2, 5, 1, 6]);

export default class UniqueSkillEffectSystem {
  constructor({ board, controller, enemyFactory, uniqueSkillSystem, random = Math.random }) {
    Object.assign(this, { board, controller, enemyFactory, uniqueSkillSystem, random });
  }

  resolve(entity, trigger, context = {}) {
    return this.uniqueSkillSystem.getTriggeredSkills(entity, trigger)
      .map((skill) => this.resolveSkill(entity, skill, context))
      .filter((effect) => effect !== null);
  }

  resolveSkill(entity, skill, context) {
    switch (skill.id) {
      case 'vitality-summon': return this.resolveVitalitySummon(entity, skill);
      case 'gem-orb-rain': return this.resolveGemOrbRain(skill);
      case 'area-head-rush': return this.resolveAreaHeadRush(entity, skill, context);
      case 'shadow-fingertips': return this.resolveShadowFingertips(entity, skill, context);
      case 'battle-frenzy': return this.resolveBattleFrenzy(skill);
      case 'iron-counterblow': return this.resolveIronCounterblow(skill, context);
      case 'arcane-reflection': return this.resolveArcaneReflection(skill, context);
      case 'cloth-night-familiars': return this.resolveClothNightFamiliars(skill);
      case 'water-deep-sea-surge': return this.resolveWaterDeepSeaSurge(entity, skill);
      case 'fire-retaliation-ember': return this.resolveFireRetaliationEmber(entity, skill, context);
      case 'lightning-thunder-drain': return this.resolveLightningThunderDrain(skill, context);
      case 'reputation-bewildering-words': return this.resolveReputationBewilderingWords(entity, skill, context);
      default: throw new RangeError(`Unsupported unique skill effect: ${skill.id}`);
    }
  }

  resolveVitalitySummon(enemy, skill) {
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

  resolveGemOrbRain(skill) {
    if (this.random() >= skill.levelDetail.chance) return Object.freeze({ skill, drops: Object.freeze([]) });
    const drops = Array.from({ length: skill.levelDetail.dropCount }, () => Object.freeze({
      weapon: 'orb',
      tags: Object.freeze(Array.from({ length: skill.levelDetail.tagCount }, () => 'gem')),
    }));
    return Object.freeze({ skill, drops: Object.freeze(drops) });
  }

  resolveAreaHeadRush(enemy, skill, { reservedSlots = [] } = {}) {
    const heads = this.getAvailableSummonSlots(null, reservedSlots)
      .slice(0, skill.levelDetail.headCount)
      .map((slotPosition) => this.enemyFactory.createAreaHead({ source: enemy, slotPosition }));
    return Object.freeze({ skill, heads: Object.freeze(heads) });
  }

  resolveShadowFingertips(actor, skill, { target = null } = {}) {
    if (!target || this.random() >= actor.getLuckDegree()) return Object.freeze({ skill, tagRemoval: null });
    const sourceTags = getEquipmentItems(target).flatMap((item) => item.tags.map((tag, tagIndex) => ({ item, tag, tagIndex })));
    const sourceTag = sourceTags[Math.floor(this.random() * sourceTags.length)];
    if (!sourceTag) return Object.freeze({ skill, tagRemoval: null });
    const destinationItems = skill.levelDetail.transfersTag
      ? getEquipmentItems(actor).filter((item) => item.category !== 'destination' && item.tags.length < 3)
      : [];
    const destinationItem = destinationItems[Math.floor(this.random() * destinationItems.length)] ?? null;
    return Object.freeze({ skill, tagRemoval: Object.freeze({ sourceItem: sourceTag.item, tagIndex: sourceTag.tagIndex, tag: sourceTag.tag, destinationItem }) });
  }

  resolveBattleFrenzy(skill) {
    return Object.freeze({ skill, twoEdgedSwordMultiplier: skill.levelDetail.twoEdgedSwordMultiplier });
  }

  resolveIronCounterblow(skill, { damageEvent } = {}) {
    if (!damageEvent?.actor || damageEvent.damage <= 0) return Object.freeze({ skill, knockback: null });
    return Object.freeze({ skill, knockback: Object.freeze({
      actor: damageEvent.actor,
      target: damageEvent.target,
      damage: damageEvent.damage,
      level: skill.level,
    }) });
  }

  resolveArcaneReflection(skill, { attributeEvent } = {}) {
    if (!attributeEvent?.actor || !attributeEvent.attribute || attributeEvent.value <= 0) return Object.freeze({ skill, attributeReflection: null });
    return Object.freeze({ skill, attributeReflection: Object.freeze({ reductionRate: skill.levelDetail.reductionRate }) });
  }

  resolveClothNightFamiliars(skill) {
    return Object.freeze({ skill, familiarCount: skill.levelDetail.familiarCount });
  }

  resolveWaterDeepSeaSurge(actor, skill) {
    return Object.freeze({ skill, selfAttribute: Object.freeze({ attribute: 'water', value: actor.getTagCount('water') }), waterDamageBonusRate: skill.levelDetail.waterDamageBonusRate });
  }

  resolveFireRetaliationEmber(owner, skill, { damageEvent } = {}) {
    const isDirectAttack = damageEvent?.category === 'physical' || damageEvent?.category === 'magic';
    const value = owner.getTagCount('fire') * skill.levelDetail.fireAttributeRate;
    if (!isDirectAttack || !damageEvent.actor || damageEvent.damage <= 0 || value <= 0) return Object.freeze({ skill, retaliationAttribute: null });
    return Object.freeze({
      skill,
      retaliationAttribute: Object.freeze({
        actor: damageEvent.actor,
        attribute: 'fire',
        value,
      }),
    });
  }

  resolveLightningThunderDrain(skill, { damageEvent } = {}) {
    const isDirectAttack = damageEvent?.category === 'physical' || damageEvent?.category === 'magic';
    const lightningValue = damageEvent?.actor?.attributes?.lightning ?? 0;
    if (!isDirectAttack || lightningValue <= 0 || damageEvent.damage <= 0) return Object.freeze({ skill, actionGaugeAbsorption: null });
    return Object.freeze({ skill, actionGaugeAbsorption: Object.freeze({ currentGaugeStealRate: skill.levelDetail.currentGaugeStealRate }) });
  }

  resolveReputationBewilderingWords(actor, skill, { target = null } = {}) {
    if (!target || this.random() >= actor.getLuckDegree() * skill.levelDetail.luckRateMultiplier) return Object.freeze({ skill, bewildermentTarget: null });
    return Object.freeze({ skill, bewildermentTarget: target });
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
