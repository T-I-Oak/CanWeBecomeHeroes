import { isHeroCombatant } from './CombatParticipant.js';

const MINIMUM_DAMAGE = 0.01;
const KNOCKBACK_TILT_MAX_RADIANS = Math.PI / 12;

export default class CombatDamageSystem {
  constructor({ random = Math.random, effects = null, onDamage = null, onDamageApplied = null, recordDamage = null, recordDefeat = null, onHeroDepleted = null, onEnemyDefeated = null, onDamageResolved = null, conditionSystem = null } = {}) {
    Object.assign(this, { random, effects, onDamage, onDamageApplied, recordDamage, recordDefeat, onHeroDepleted, onEnemyDefeated, onDamageResolved, conditionSystem });
  }

  applyPhysicalDamage(actor, target, type, damage, critical, participants, { propagate } = {}) {
    const criticalDamage = this.resolveCriticalDamage(actor, target, damage, critical);
    const absorbed = Math.min(target.physicalDamageReduction, criticalDamage);
    this.setPhysicalDamageReduction(target, Math.max(0, target.physicalDamageReduction - absorbed));
    const afterProtection = Math.max(0, criticalDamage - absorbed * 0.5);
    const reflected = afterProtection * target.getTagSkillLevel('iron') * 0.2;
    const dealt = Math.max(0, afterProtection - reflected);
    this.applyDamage(actor, target, type, dealt, critical, { criticalDamageResolved: true });
    if (reflected >= MINIMUM_DAMAGE) {
      this.applyDamage(target, actor, 'reflection', reflected);
      propagate?.(target, actor, 'reflection', reflected, participants);
    }
    return dealt;
  }

  setPhysicalDamageReduction(target, value) {
    target.physicalDamageReduction = value;
    target.chip.physicalDamageReduction = value;
  }

  applyDamage(actor, target, type, damage, critical = false, { criticalDamageResolved = false } = {}) {
    if (target.isPhantomHead || damage < MINIMUM_DAMAGE) return 0;
    const resolvedDamage = criticalDamageResolved ? damage : this.resolveCriticalDamage(actor, target, damage, critical);
    this.applyKnockbackTilt(target, resolvedDamage);
    this.effects?.damage(target, resolvedDamage, critical);
    if (actor) this.recordDamage?.(actor, target, resolvedDamage, critical);
    if (isHeroCombatant(target)) return this.applyHeroDamage(actor, target, type, resolvedDamage, critical);
    return this.applyEnemyDamage(actor, target, type, resolvedDamage, critical);
  }

  resolveCriticalDamage(actor, target, damage, critical) {
    return critical ? damage * (this.conditionSystem?.getCriticalDamageMultiplier(actor, target) ?? 1) : damage;
  }

  applyHeroDamage(actor, target, type, damage, critical) {
    target.stamina = Math.max(0, target.stamina - damage);
    this.onDamageApplied?.({ actor, target, type, damage, critical });
    this.onDamage?.({ actor, target, type, damage, critical });
    this.conditionSystem?.clearTwoEdgedSword(target);
    if (target.stamina > 0) this.onDamageResolved?.(target);
    if (target.stamina === 0) this.onHeroDepleted?.(target);
    return damage;
  }

  applyEnemyDamage(actor, target, type, damage, critical) {
    target.hp = Math.max(0, target.hp - damage);
    this.onDamageApplied?.({ actor, target, type, damage, critical });
    this.onDamage?.({ actor, target, type, damage, critical });
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
