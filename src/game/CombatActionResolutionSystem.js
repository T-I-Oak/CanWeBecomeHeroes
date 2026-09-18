import { entityText, logText } from './LocalizedLog.js';
import { isEntityOnBoard, isHeroCombatant } from './CombatParticipant.js';
import { WEAPON_ATTACKS, getAttackDamage, getRandomModifier } from './CombatWeaponAttack.js';
import { UNIQUE_SKILL_TRIGGER } from './UniqueSkillTrigger.js';

export default class CombatActionResolutionSystem {
  constructor({ board, targetingSystem, attributeSystem, weaponEffectSystem, damageSystem, actionLog, projectionSystem, uniqueSkillSystem, uniqueSkillEffectSystem, effects = null, gameLog = null, textRepository = null, random = Math.random }) {
    Object.assign(this, { board, targetingSystem, attributeSystem, weaponEffectSystem, damageSystem, actionLog, projectionSystem, uniqueSkillSystem, uniqueSkillEffectSystem, effects, gameLog, textRepository, random });
  }

  resolve(actor, target, participants, { preserveGaugePresentation = false } = {}) {
    const targets = this.targetingSystem.rangeTargets(actor, target, participants);
    this.actionLog.begin();
    this.effects?.attack(actor, actor.getTagCount('area'), { showGaugeAtMaximum: !preserveGaugePresentation });
    this.effects?.beginAction(actor);
    targets.forEach(({ target: rangeTarget, coefficient }) => this.attributeSystem.applyAttributes(actor, rangeTarget, coefficient));
    this.attackTypes(actor).forEach((type) => this.resolveWeapon(actor, target, type, participants));
    this.resolveVitality(actor);
    this.effects?.endAction();
    this.actionLog.flush();
    actor.luckBonus = 0;
    if (actor.isPhantomHead) this.projectionSystem.returnAreaHead(actor);
    else {
      this.resolveActionUniqueSkill(actor, participants);
      this.uniqueSkillSystem.refreshBlessingSkills(actor);
    }
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

  resolveWeapon(actor, target, type, participants) {
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
      const critical = skillLevel > 0 && this.random() < actor.getLuckDegree() + actor.luckBonus;
      const damage = getAttackDamage(actor, attack) * coefficient * getRandomModifier(this.random) * (critical ? 1 + skillLevel ** 2 * 0.1 : 1);
      if (type === 'orb') this.weaponEffectSystem.applyOrb(actor, rangeTarget, coefficient);
      if (type === 'claw') this.weaponEffectSystem.resolveTheft(actor, rangeTarget);
      const dealt = attack[0] === 'power'
        ? this.damageSystem.applyPhysicalDamage(actor, rangeTarget, type, damage, critical, participants, { propagate: (...args) => this.propagate(...args) })
        : this.damageSystem.applyDamage(actor, rangeTarget, type, damage, critical);
      this.propagate(actor, rangeTarget, type, dealt, participants);
    });
  }

  propagate(actor, target, type, damage, participants) { this.attributeSystem.propagate(actor, target, type, damage, participants); }

  resolveActionUniqueSkill(enemy, participants = []) {
    const reservedSlots = this.projectionSystem.areaHeads.map((head) => head.slotPosition);
    this.uniqueSkillEffectSystem.resolve(enemy, UNIQUE_SKILL_TRIGGER.actionCompleted, { reservedSlots }).forEach(({ skill, heads = [] }) => {
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
