import { entityText, logText } from './LocalizedLog.js';
import { logUniqueSkill, skillText, tagText, termText } from './UniqueSkillLog.js';
import { isEntityOnBoard, isHeroCombatant } from './CombatParticipant.js';
import { WEAPON_ATTACKS, getAttackDamage, getRandomModifier } from './CombatWeaponAttack.js';
import { UNIQUE_SKILL_TRIGGER } from './UniqueSkillTrigger.js';

const NIGHT_FAMILIAR_ATTACK = Object.freeze(['power', 1 / 8]);

export default class CombatActionResolutionSystem {
  constructor({ board, targetingSystem, attributeSystem, weaponEffectSystem, damageSystem, actionGaugeSystem, actionLog, projectionSystem, uniqueSkillSystem, uniqueSkillEffectSystem, conditionSystem, knockbackSystem = null, gustSystem = null, effects = null, gameLog = null, textRepository = null, random = Math.random }) {
    Object.assign(this, { board, targetingSystem, attributeSystem, weaponEffectSystem, damageSystem, actionGaugeSystem, actionLog, projectionSystem, uniqueSkillSystem, uniqueSkillEffectSystem, conditionSystem, knockbackSystem, gustSystem, effects, gameLog, textRepository, random });
  }

  resolve(actor, target, participants, { preserveGaugePresentation = false } = {}) {
    const targets = this.targetingSystem.rangeTargets(actor, target, participants);
    this.knockbackSystem?.beginAction();
    this.actionLog.begin();
    this.effects?.attack(actor, actor.getTagCount('area'), { showGaugeAtMaximum: !preserveGaugePresentation });
    this.effects?.beginAction(actor);
    this.resolveNightFamiliarAttacks(actor, participants);
    const actionModifiers = this.resolveActionStartedUniqueSkill(actor, target, participants);
    targets.forEach(({ target: rangeTarget, coefficient }) => this.attributeSystem.applyAttributes(actor, rangeTarget, coefficient));
    this.attackTypes(actor).forEach((type) => this.resolveWeapon(actor, target, type, participants, actionModifiers));
    this.resolveVitality(actor);
    this.effects?.endAction();
    this.actionLog.flush();
    actor.luckBonus = 0;
    if (actor.isPhantomHead) this.projectionSystem.returnAreaHead(actor);
    else {
      this.resolveActionUniqueSkill(actor, participants);
      this.uniqueSkillSystem.refreshBlessingSkills(actor);
    }
    this.conditionSystem.clearTwoEdgedSword(actor);
    this.conditionSystem.clearBewilderment(actor);
    this.conditionSystem.clearMisfortune(actor);
    this.knockbackSystem?.resolveAction()?.forEach(({ actor: attacker, defender, skill }) => {
      if (!skill) return;
      logUniqueSkill(this.gameLog, this.textRepository, 'logIronCounterblow', { actor: entityText(defender), skill: skillText(skill), target: entityText(attacker) });
    });
    actionModifiers.gustTargets.forEach((gust) => {
      const gustTarget = gust.target ?? gust;
      if (!this.gustSystem?.begin(gustTarget) || !gust.skill) return;
      logUniqueSkill(this.gameLog, this.textRepository, 'logGust', { actor: entityText(actor), skill: skillText(gust.skill), target: entityText(gustTarget) });
    });
  }

  resolveActionStartedUniqueSkill(actor, target, participants) {
    let waterDamageBonusRate = 0;
    const gustTargets = [];
    this.uniqueSkillEffectSystem.resolve(actor, UNIQUE_SKILL_TRIGGER.actionStarted, { target }).forEach(({ skill, tagRemoval, twoEdgedSwordMultiplier, selfAttribute = null, waterDamageBonusRate: effectWaterDamageBonusRate = 0, bewildermentTarget = null, misfortuneTarget = null, gustTarget = null }) => {
      if (twoEdgedSwordMultiplier) {
        participants.forEach((combatant) => this.conditionSystem.applyTwoEdgedSword(combatant, twoEdgedSwordMultiplier));
        if (this.gameLog) logUniqueSkill(this.gameLog, this.textRepository, 'logTwoEdgedSword', { actor: entityText(actor), skill: skillText(skill), condition: termText('two-edged-sword') });
      }
      if (selfAttribute) {
        const previous = actor.attributes?.[selfAttribute.attribute] ?? 0;
        this.attributeSystem.applySelfAttribute(actor, selfAttribute.attribute, selfAttribute.value);
        if (this.gameLog && (actor.attributes?.[selfAttribute.attribute] ?? 0) > previous) {
          logUniqueSkill(this.gameLog, this.textRepository, 'logWaterSurge', { actor: entityText(actor), skill: skillText(skill), attribute: tagText(selfAttribute.attribute) });
        }
      }
      if (bewildermentTarget) {
        this.conditionSystem.applyBewilderment(bewildermentTarget);
        if (this.gameLog) logUniqueSkill(this.gameLog, this.textRepository, 'logBewilderment', { actor: entityText(actor), skill: skillText(skill), target: entityText(bewildermentTarget), condition: termText('bewilderment') });
      }
      if (misfortuneTarget) {
        this.conditionSystem.applyMisfortune(misfortuneTarget.target, misfortuneTarget.damageRate);
        if (this.gameLog) logUniqueSkill(this.gameLog, this.textRepository, 'logMisfortune', { actor: entityText(actor), skill: skillText(skill), target: entityText(misfortuneTarget.target), condition: termText('misfortune') });
      }
      if (gustTarget) gustTargets.push({ target: gustTarget, skill });
      waterDamageBonusRate = Math.max(waterDamageBonusRate, effectWaterDamageBonusRate);
      if (!tagRemoval) return;
      const tag = tagRemoval.sourceItem.removeTagAt(tagRemoval.tagIndex);
      if (!tag) return;
      tagRemoval.destinationItem?.addTag(tag);
      target.refreshDerivedValues?.();
      actor.refreshDerivedValues?.();
      this.actionGaugeSystem?.updateMaximum(target);
      this.actionGaugeSystem?.updateMaximum(actor);
      this.effects?.tagTransfer(target, actor, tag);
      if (this.gameLog) logUniqueSkill(this.gameLog, this.textRepository, tagRemoval.destinationItem ? 'logShadowSteal' : 'logShadowErase', { actor: entityText(actor), skill: skillText(skill), target: entityText(target), tag: tagText(tag) });
    });
    return Object.freeze({ waterDamageBonusRate, gustTargets: Object.freeze(gustTargets) });
  }

  attackTypes(actor) {
    if (isHeroCombatant(actor)) {
      return [actor.equipment.rightHand, actor.equipment.leftHand].map((item) => item?.category === 'weapon' ? item.type : 'unarmed');
    }
    const weapons = actor.equipment.filter((item) => item.category === 'weapon').map((item) => item.type);
    return weapons.length ? weapons : ['unarmed'];
  }

  isAttackMiss(actor, target) {
    const evade = this.random() * Math.max(0, target.getLuckDegree() + target.getTagSkillLevel('feather') * 0.1);
    const accuracy = this.random() * Math.max(0, actor.getLuckDegree() - actor.attributes.water * 0.1 * (1 - actor.getTagSkillLevel('cloth') * 0.1));
    return evade > accuracy;
  }

  resolveVitality(actor) {
    const tagCount = actor.getTagCount('vitality');
    if (!tagCount || this.random() >= actor.getLuckDegree()) return 0;
    const recovery = tagCount * 0.2;
    if (isHeroCombatant(actor)) {
      const previous = actor.stamina;
      actor.stamina = Math.min(actor.maximums.stamina, actor.stamina + recovery);
      return actor.stamina - previous;
    }
    const previous = actor.hp;
    actor.hp = Math.min(actor.maximumHp, actor.hp + recovery);
    return actor.hp - previous;
  }

  resolveNightFamiliarAttacks(actor, participants) {
    const familiarCount = this.conditionSystem.consumeNightFamiliars(actor);
    if (familiarCount === 0) return;
    this.effects?.consumeNightFamiliars(actor);
    const damageByTarget = new Map();
    for (let index = 0; index < familiarCount; index += 1) {
      const opponents = this.targetingSystem.getOpponents(actor, participants);
      if (opponents.length === 0) break;
      const target = opponents[Math.floor(this.random() * opponents.length)];
      const damage = getAttackDamage(actor, NIGHT_FAMILIAR_ATTACK) * getRandomModifier(this.random);
      this.effects?.launchNightFamiliar(actor, target, index, familiarCount);
      const dealt = this.damageSystem.applyPhysicalDamage(actor, target, 'night-familiar', damage, false, participants, { propagate: (...args) => this.propagate(...args), record: false });
      if (dealt > 0) damageByTarget.set(target, (damageByTarget.get(target) ?? 0) + dealt);
    }
    if (!this.gameLog) return;
    damageByTarget.forEach((damage, familiarTarget) => {
      logUniqueSkill(this.gameLog, this.textRepository, 'logFamiliarDamage', { actor: entityText(actor), familiar: termText('familiar'), target: entityText(familiarTarget), damage: Math.round(damage * 100) });
    });
  }

  resolveWeapon(actor, target, type, participants, { waterDamageBonusRate = 0 } = {}) {
    if (!isEntityOnBoard(this.board, target)) return;
    this.weaponEffectSystem.applySupportEffect(actor, type, participants);
    if (this.isAttackMiss(actor, target)) {
      this.effects?.miss(target);
      this.actionLog.recordMiss(actor, target);
      return;
    }
    const attack = WEAPON_ATTACKS[type];
    this.targetingSystem.rangeTargets(actor, target, participants).forEach(({ target: rangeTarget, coefficient }) => {
      const statTag = attack[0] === 'magic' ? 'arcane' : 'valor';
      const skillLevel = actor.getTagSkillLevel(statTag);
      const tagCritical = skillLevel > 0 && this.random() < actor.getLuckDegree() + actor.luckBonus;
      const waterValue = waterDamageBonusRate > 0 ? actor.attributes.water : 0;
      const waterCritical = waterValue > 0;
      const critical = tagCritical || waterCritical;
      const damage = getAttackDamage(actor, attack) * coefficient * getRandomModifier(this.random)
        * (tagCritical ? 1 + skillLevel ** 2 * 0.1 : 1) * (1 + waterValue * waterDamageBonusRate);
      if (type === 'orb') this.weaponEffectSystem.applyOrb(actor, rangeTarget, coefficient);
      if (type === 'claw') this.weaponEffectSystem.resolveTheft(actor, rangeTarget);
      const dealt = attack[0] === 'power'
        ? this.damageSystem.applyPhysicalDamage(actor, rangeTarget, type, damage, critical, participants, { propagate: (...args) => this.propagate(...args) })
        : this.damageSystem.applyDamage(actor, rangeTarget, type, damage, critical, { category: 'magic', participants });
      this.propagate(actor, rangeTarget, type, dealt, participants);
    });
  }

  propagate(actor, target, type, damage, participants) { this.attributeSystem.propagate(actor, target, type, damage, participants); }

  resolveActionUniqueSkill(enemy, participants = []) {
    const reservedSlots = this.projectionSystem.areaHeads.map((head) => head.slotPosition);
    this.uniqueSkillEffectSystem.resolve(enemy, UNIQUE_SKILL_TRIGGER.actionCompleted, { reservedSlots }).forEach(({ skill, heads = [], familiarCount = 0 }) => {
      if (familiarCount > 0) {
        this.conditionSystem.summonNightFamiliars(enemy, familiarCount);
        this.effects?.summonNightFamiliars(enemy, familiarCount);
        if (this.gameLog) logUniqueSkill(this.gameLog, this.textRepository, 'logNightFamiliars', { actor: entityText(enemy), skill: skillText(skill), familiar: termText('familiar'), count: familiarCount });
      }
      heads.forEach((head) => this.projectionSystem.launchAreaHead(enemy, head));
      const cooperatingMinions = skill.id === 'area-head-rush'
        ? participants.filter((actor) => actor !== enemy && !isHeroCombatant(actor) && !actor.isPhantomHead && isEntityOnBoard(this.board, actor)
          && (actor.rank === 'regular' || (skill.level === 2 && actor.rank === 'midBoss')))
        : [];
      cooperatingMinions.forEach((actor) => {
        const target = this.targetingSystem.findTarget(actor, participants);
        if (target) this.resolve(actor, target, participants, { preserveGaugePresentation: true });
      });
      if (heads.length > 0 || cooperatingMinions.length > 0) {
        logText(this.gameLog, this.textRepository, heads.length > 0 ? (cooperatingMinions.length > 0 ? 'logHeadsMinions' : 'logHeads') : 'logMinions', { actor: entityText(enemy), skill: skillText(skill), head: { kind: 'enemy', id: 'phantom-area-head' }, count: heads.length, minions: cooperatingMinions.length }, { subject: 'enemy', level: 'info', channel: 'battle' });
      }
    });
  }
}
