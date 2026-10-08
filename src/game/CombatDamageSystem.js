import { isHeroCombatant } from './CombatParticipant.js';
import { roundDamage } from './Durability.js';

const MINIMUM_DAMAGE = 0.01;
const KNOCKBACK_TILT_MAX_RADIANS = Math.PI / 12;

export default class CombatDamageSystem {
  constructor({ random = Math.random, effects = null, onDamage = null, onDamageApplied = null, recordDamage = null, recordMisfortune = null, recordDefeat = null, onHeroDepleted = null, onEnemyDefeated = null, onDamageResolved = null, conditionSystem = null } = {}) {
    Object.assign(this, { random, effects, onDamage, onDamageApplied, recordDamage, recordMisfortune, recordDefeat, onHeroDepleted, onEnemyDefeated, onDamageResolved, conditionSystem });
  }

  applyPhysicalDamage(actor, target, type, damage, critical, participants, { propagate, record = true } = {}) {
    const criticalDamage = this.resolveCriticalDamage(actor, target, damage, critical);
    const targetDamage = this.resolveMisfortuneDamage(actor, criticalDamage, critical, participants);
    const absorbed = Math.min(target.physicalDamageReduction, targetDamage);
    this.setPhysicalDamageReduction(target, Math.max(0, target.physicalDamageReduction - absorbed));
    const afterProtection = Math.max(0, targetDamage - absorbed * 0.5);
    const reflected = afterProtection * target.getTagSkillLevel('iron') * 0.2;
    const dealt = Math.max(0, afterProtection - reflected);
    this.applyDamage(actor, target, type, dealt, critical, { criticalDamageResolved: true, category: 'physical', participants, resolveMisfortune: false, record });
    const selfDepleted = actor === target && (isHeroCombatant(target) ? target.stamina <= 0 : target.hp <= 0);
    if (reflected >= MINIMUM_DAMAGE && !selfDepleted) {
      this.applyDamage(target, actor, 'reflection', reflected);
      propagate?.(target, actor, 'reflection', reflected, participants);
    }
    return dealt;
  }

  setPhysicalDamageReduction(target, value) {
    target.physicalDamageReduction = value;
    target.chip.physicalDamageReduction = value;
  }

  applyDamage(actor, target, type, damage, critical = false, { criticalDamageResolved = false, category = null, participants = [], resolveMisfortune = true, record = true } = {}) {
    if (target.isPhantomHead) return 0;
    const unroundedDamage = criticalDamageResolved ? damage : this.resolveCriticalDamage(actor, target, damage, critical);
    const targetDamage = resolveMisfortune ? this.resolveMisfortuneDamage(actor, unroundedDamage, critical, participants) : unroundedDamage;
    const resolvedDamage = roundDamage(targetDamage);
    if (resolvedDamage < MINIMUM_DAMAGE) return 0;
    this.applyKnockbackTilt(target, resolvedDamage);
    this.effects?.damage(target, resolvedDamage, critical);
    if (record && actor) this.recordDamage?.(actor, target, resolvedDamage, critical);
    if (isHeroCombatant(target)) return this.applyHeroDamage(actor, target, type, resolvedDamage, critical, category, participants);
    return this.applyEnemyDamage(actor, target, type, resolvedDamage, critical, category, participants);
  }

  resolveCriticalDamage(actor, target, damage, critical) {
    return critical ? damage * (this.conditionSystem?.getCriticalDamageMultiplier(actor, target) ?? 1) : damage;
  }

  resolveMisfortuneDamage(actor, damage, critical, participants) {
    const selfDamageRate = critical ? this.conditionSystem?.getMisfortuneDamageRate(actor) ?? 0 : 0;
    if (selfDamageRate <= 0) return damage;
    const selfDamage = this.applyDamage(actor, actor, 'misfortune', damage * selfDamageRate, true, {
      criticalDamageResolved: true,
      category: 'misfortune',
      participants,
      resolveMisfortune: false,
      record: false,
    });
    if (selfDamage > 0) this.recordMisfortune?.(actor, selfDamage);
    return damage * (1 - selfDamageRate);
  }

  applyHeroDamage(actor, target, type, damage, critical, category, participants) {
    target.stamina = Math.max(0, target.stamina - damage);
    this.onDamageApplied?.({ actor, target, type, damage, critical, category, participants });
    this.onDamage?.({ actor, target, type, damage, critical, category, participants });
    this.conditionSystem?.clearTwoEdgedSword(target);
    if (target.stamina > 0) this.onDamageResolved?.(target);
    if (target.stamina === 0) this.onHeroDepleted?.(target);
    return damage;
  }

  applyEnemyDamage(actor, target, type, damage, critical, category, participants) {
    target.hp = Math.max(0, target.hp - damage);
    this.onDamageApplied?.({ actor, target, type, damage, critical, category, participants });
    this.onDamage?.({ actor, target, type, damage, critical, category, participants });
    this.conditionSystem?.clearTwoEdgedSword(target);
    if (target.hp > 0) this.onDamageResolved?.(target);
    if (target.hp === 0) {
      if (actor) this.recordDefeat?.(actor, target);
      this.onEnemyDefeated?.(target);
    }
    return damage;
  }

  applyKnockbackTilt(target, damage) {
    const amount = Math.min(damage * 100, 100) / 100 * KNOCKBACK_TILT_MAX_RADIANS;
    target.chip.tilt += this.random() < 0.5 ? -amount : amount;
  }
}
