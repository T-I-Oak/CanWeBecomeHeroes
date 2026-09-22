const BASE_CRITICAL_DAMAGE_MULTIPLIER = 1;

export default class CombatConditionSystem {
  constructor() {
    this.twoEdgedSwordMultipliers = new WeakMap();
    this.nightFamiliarCounts = new WeakMap();
  }

  reset() {
    this.twoEdgedSwordMultipliers = new WeakMap();
    this.nightFamiliarCounts = new WeakMap();
  }

  clearCombatant(combatant) {
    this.clearTwoEdgedSword(combatant);
    this.nightFamiliarCounts.delete(combatant);
  }

  applyTwoEdgedSword(combatant, multiplier) {
    const currentMultiplier = this.getTwoEdgedSwordMultiplier(combatant);
    this.twoEdgedSwordMultipliers.set(combatant, Math.max(currentMultiplier, multiplier));
  }

  clearTwoEdgedSword(combatant) {
    this.twoEdgedSwordMultipliers.delete(combatant);
  }

  getTwoEdgedSwordMultiplier(combatant) {
    return this.twoEdgedSwordMultipliers.get(combatant) ?? BASE_CRITICAL_DAMAGE_MULTIPLIER;
  }

  getCriticalDamageMultiplier(attacker, target) {
    return Math.max(
      this.getTwoEdgedSwordMultiplier(attacker),
      this.getTwoEdgedSwordMultiplier(target),
    );
  }

  summonNightFamiliars(combatant, count) {
    this.nightFamiliarCounts.set(combatant, count);
  }

  getNightFamiliarCount(combatant) {
    return this.nightFamiliarCounts.get(combatant) ?? 0;
  }

  consumeNightFamiliars(combatant) {
    const count = this.getNightFamiliarCount(combatant);
    this.nightFamiliarCounts.delete(combatant);
    return count;
  }

  removeNightFamiliar(combatant) {
    const count = this.getNightFamiliarCount(combatant);
    if (count === 0) return false;
    if (count === 1) this.nightFamiliarCounts.delete(combatant);
    else this.nightFamiliarCounts.set(combatant, count - 1);
    return true;
  }
}
