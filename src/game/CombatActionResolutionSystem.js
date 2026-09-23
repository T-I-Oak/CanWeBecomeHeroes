import { entityText, logText } from './LocalizedLog.js';
import { isEntityOnBoard, isHeroCombatant } from './CombatParticipant.js';
import { WEAPON_ATTACKS, getAttackDamage, getRandomModifier } from './CombatWeaponAttack.js';
import { UNIQUE_SKILL_TRIGGER } from './UniqueSkillTrigger.js';

const NIGHT_FAMILIAR_ATTACK = Object.freeze(['power', 1 / 8]);

export default class CombatActionResolutionSystem {
  constructor({ board, targetingSystem, attributeSystem, weaponEffectSystem, damageSystem, actionGaugeSystem, actionLog, projectionSystem, uniqueSkillSystem, uniqueSkillEffectSystem, conditionSystem, knockbackSystem = null, effects = null, gameLog = null, textRepository = null, random = Math.random }) {
    Object.assign(this, { board, targetingSystem, attributeSystem, weaponEffectSystem, damageSystem, actionGaugeSystem, actionLog, projectionSystem, uniqueSkillSystem, uniqueSkillEffectSystem, conditionSystem, knockbackSystem, effects, gameLog, textRepository, random });
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
    this.knockbackSystem?.resolveAction();
  }

  resolveActionStartedUniqueSkill(actor, target, participants) {
    let waterDamageBonusRate = 0;
    this.uniqueSkillEffectSystem.resolve(actor, UNIQUE_SKILL_TRIGGER.actionStarted, { target }).forEach(({ tagRemoval, twoEdgedSwordMultiplier, selfAttribute = null, waterDamageBonusRate: effectWaterDamageBonusRate = 0 }) => {
      if (twoEdgedSwordMultiplier) participants.forEach((combatant) => this.conditionSystem.applyTwoEdgedSword(combatant, twoEdgedSwordMultiplier));
      if (selfAttribute) this.attributeSystem.applySelfAttribute(actor, selfAttribute.attribute, selfAttribute.value);
      waterDamageBonusRate = Math.max(waterDamageBonusRate, effectWaterDamageBonusRate);
      if (!tagRemoval) return;
      const tag = tagRemoval.sourceItem.removeTagAt(tagRemoval.tagIndex);
      if (!tag) return;
      tagRemoval.destinationItem?.addTag(tag);
      target.refreshDerivedValues?.();
      actor.refreshDerivedValues?.();
      this.actionGaugeSystem?.updateMaximum(target);
      this.actionGaugeSystem?.updateMaximum(actor);
    });
    return Object.freeze({ waterDamageBonusRate });
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
    for (let index = 0; index < familiarCount; index += 1) {
      const opponents = this.targetingSystem.getOpponents(actor, participants);
      if (opponents.length === 0) return;
      const target = opponents[Math.floor(this.random() * opponents.length)];
      const damage = getAttackDamage(actor, NIGHT_FAMILIAR_ATTACK) * getRandomModifier(this.random);
      this.effects?.launchNightFamiliar(actor, target, index, familiarCount);
      this.damageSystem.applyPhysicalDamage(actor, target, 'night-familiar', damage, false, participants, { propagate: (...args) => this.propagate(...args) });
    }
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
        : this.damageSystem.applyDamage(actor, rangeTarget, type, damage, critical, { category: 'magic' });
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
        logText(this.gameLog, this.textRepository, heads.length > 0 ? (cooperatingMinions.length > 0 ? 'logHeadsMinions' : 'logHeads') : 'logMinions', { actor: entityText(enemy), skill: { kind: 'unique-skill', id: skill.id }, count: heads.length, minions: cooperatingMinions.length }, { subject: 'enemy', level: 'info', channel: 'battle' });
      }
    });
  }
}
