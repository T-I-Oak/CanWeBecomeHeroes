const BASE_CRITICAL_DAMAGE_MULTIPLIER = 1;

export default class CombatConditionSystem {
  constructor() {
    this.twoEdgedSwordMultipliers = new WeakMap();
  }

  reset() {
    this.twoEdgedSwordMultipliers = new WeakMap();
  }

  clearCombatant(combatant) {
    this.clearTwoEdgedSword(combatant);
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
}
